import { clamp, toGrayscaleArray } from './imageUtils.js';

/**
 * Apply conservative enhancements based on quality issues.
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {{issues:string[],features:Object}} quality
 * @param {{maxActions?:number}} [options]
 */
export function applyEnhancements(imageData, quality, options = {}) {
  const issues = quality?.issues ?? [];
  const features = quality?.features ?? {};
  const maxActions = options.maxActions ?? 3;
  const policy = options.policy ?? 'conditional';
  const allowBorderline = policy === 'conditional' && options.allowBorderline !== false;
  const roi = options.roi ?? null;

  let current = cloneImageData(imageData);
  const applied = [];

  const addAction = (action) => {
    if (applied.length >= maxActions) return false;
    applied.push(action);
    return true;
  };

  if (issues.includes('too_dark') || issues.includes('center_underexposed')) {
    const scale = brightnessScaleFromMean(features.meanBrightness ?? 0.5, 0.52);
    if (Math.abs(scale - 1) >= 0.01) {
      current = adjustBrightnessScale(current, scale);
      const reason = issues.includes('too_dark') ? 'too_dark' : 'center_underexposed';
      addAction({ name: 'brightness_scale', reason, category: 'safe', params: { scale: roundValue(scale, 3) } });
    }
  }

  if (issues.includes('too_bright') || issues.includes('center_overexposed')) {
    const scale = brightnessScaleFromMean(features.meanBrightness ?? 0.5, 0.48);
    if (Math.abs(scale - 1) >= 0.01) {
      current = adjustBrightnessScale(current, scale);
      const reason = issues.includes('too_bright') ? 'too_bright' : 'center_overexposed';
      addAction({ name: 'brightness_scale', reason, category: 'safe', params: { scale: roundValue(scale, 3) } });
    }
  }

  if (issues.includes('high_noise') && (features.noiseEstimate ?? 0) > 0.03) {
    const strength = 0.3;
    current = denoiseLuminance(current, 1, strength);
    addAction({ name: 'denoise_luminance', reason: 'high_noise', category: 'safe', params: { radius: 1, strength } });
  }

  if (issues.includes('hair_occlusion') && roi) {
    const result = suppressHair(current, roi, { thresholdMin: 0.07, maxCoverage: 0.12 });
    if (result.applied) {
      current = result.imageData;
      addAction({
        name: 'hair_suppression',
        reason: 'hair_occlusion',
        category: 'safe',
        params: { coverage: roundValue(result.coverage, 3) },
      });
    }
  }

  if (allowBorderline &&
    (issues.includes('low_contrast') || issues.includes('lesion_low_contrast')) &&
    !issues.includes('high_noise') &&
    ((features.dynamicRange ?? 1) < 0.5 || (features.contrast ?? 1) < 0.14)) {
    const clipLimit = 1.6;
    const tiles = 8;
    current = applyClaheLuminance(current, { clipLimit, tiles });
    const reason = issues.includes('lesion_low_contrast') ? 'lesion_low_contrast' : 'low_contrast';
    addAction({ name: 'clahe_luminance', reason, category: 'borderline', params: { clipLimit, tiles } });
  }

  if (allowBorderline &&
    issues.includes('too_blurry') &&
    !issues.includes('high_noise') &&
    (features.sharpnessGradient ?? 0) < 0.12) {
    const amount = 0.2;
    const radius = 1;
    current = unsharpMask(current, amount, radius);
    addAction({ name: 'unsharp_mask', reason: 'too_blurry', category: 'borderline', params: { amount, radius } });
  }

  return { imageData: current, applied };
}

function cloneImageData(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

function brightnessScaleFromMean(mean, target) {
  const safeMean = clamp(mean, 0.1, 0.9);
  const scale = clamp(target / safeMean, 0.9, 1.1);
  return scale;
}

function adjustBrightnessScale(imageData, scale) {
  if (Math.abs(scale - 1) < 0.01) return imageData;
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = clamp(Math.round(out.data[i] * scale), 0, 255);
    out.data[i + 1] = clamp(Math.round(out.data[i + 1] * scale), 0, 255);
    out.data[i + 2] = clamp(Math.round(out.data[i + 2] * scale), 0, 255);
  }
  return out;
}

function denoiseBox(imageData, radius) {
  const out = cloneImageData(imageData);
  const { width, height } = imageData;
  const src = imageData.data;
  const dst = out.data;
  const size = radius * 2 + 1;
  const area = size * size;

  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        for (let ky = -radius; ky <= radius; ky += 1) {
          const rowOffset = (y + ky) * width;
          for (let kx = -radius; kx <= radius; kx += 1) {
            const nIdx = (rowOffset + x + kx) * 4 + c;
            sum += src[nIdx];
          }
        }
        dst[idx + c] = Math.round(sum / area);
      }
      dst[idx + 3] = 255;
    }
  }

  return out;
}

function unsharpMask(imageData, amount, radius) {
  const blurred = denoiseBox(imageData, radius);
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = imageData.data[i + c];
      const b = blurred.data[i + c];
      const sharp = v + amount * (v - b);
      out.data[i + c] = clamp(Math.round(sharp), 0, 255);
    }
  }
  return out;
}

function denoiseLuminance(imageData, radius, strength) {
  const gray = toGrayscaleArray(imageData.data, imageData.width, imageData.height);
  const blurred = boxBlurGray(gray, imageData.width, imageData.height, radius);
  const out = cloneImageData(imageData);
  for (let i = 0, p = 0; i < out.data.length; i += 4, p += 1) {
    const g = gray[p];
    const b = blurred[p];
    const ratio = clamp(((b + 1e-4) / (g + 1e-4)) * strength + (1 - strength), 0.95, 1.05);
    out.data[i] = clamp(Math.round(out.data[i] * ratio), 0, 255);
    out.data[i + 1] = clamp(Math.round(out.data[i + 1] * ratio), 0, 255);
    out.data[i + 2] = clamp(Math.round(out.data[i + 2] * ratio), 0, 255);
  }
  return out;
}

function suppressHair(imageData, roi, options) {
  const width = imageData.width;
  const height = imageData.height;
  const gray = toGrayscaleArray(imageData.data, width, height);
  const smooth = boxBlurGray(gray, width, height, 1);
  const closed = erodeGray(dilateGray(smooth, width, height), width, height);
  const hairMask = new Uint8Array(width * height);
  const roiMask = roi ? maskFromRoi(roi, width, height) : null;

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < gray.length; i += 1) {
    if (roiMask && !roiMask[i]) continue;
    const val = closed[i] - smooth[i];
    sum += val;
    sumSq += val * val;
    count += 1;
  }
  if (count === 0) return { applied: false, imageData, coverage: 0 };
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const std = Math.sqrt(variance);
  const threshold = Math.max(options.thresholdMin ?? 0.07, mean + 2 * std);

  let hairCount = 0;
  for (let i = 0; i < gray.length; i += 1) {
    if (roiMask && !roiMask[i]) continue;
    const val = closed[i] - smooth[i];
    if (val > threshold) {
      hairMask[i] = 1;
      hairCount += 1;
    }
  }

  const roiCount = roiMask ? roiMask.reduce((a, b) => a + b, 0) : gray.length;
  const coverage = hairCount / Math.max(1, roiCount);
  if (coverage === 0 || coverage > (options.maxCoverage ?? 0.12)) {
    return { applied: false, imageData, coverage };
  }

  const out = cloneImageData(imageData);
  const radius = 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!hairMask[idx]) continue;
      const rgb = medianNeighborColor(out.data, width, height, x, y, hairMask, radius);
      const outIdx = idx * 4;
      if (rgb) {
        out.data[outIdx] = rgb[0];
        out.data[outIdx + 1] = rgb[1];
        out.data[outIdx + 2] = rgb[2];
      }
    }
  }
  return { applied: true, imageData: out, coverage };
}

function medianNeighborColor(data, width, height, x, y, mask, radius) {
  const rs = [];
  const gs = [];
  const bs = [];
  for (let ky = -radius; ky <= radius; ky += 1) {
    const ny = y + ky;
    if (ny < 0 || ny >= height) continue;
    for (let kx = -radius; kx <= radius; kx += 1) {
      const nx = x + kx;
      if (nx < 0 || nx >= width) continue;
      const idx = ny * width + nx;
      if (mask[idx]) continue;
      const base = idx * 4;
      rs.push(data[base]);
      gs.push(data[base + 1]);
      bs.push(data[base + 2]);
    }
  }
  if (!rs.length) return null;
  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);
  const mid = Math.floor(rs.length / 2);
  return [rs[mid], gs[mid], bs[mid]];
}

function maskFromRoi(roi, width, height) {
  if (!roi) return null;
  const mask = new Uint8Array(width * height);
  if (roi.type === 'bbox' && roi.bbox) {
    const [nx, ny, nw, nh] = roi.bbox;
    const x0 = clamp(Math.floor(nx * width), 0, width - 1);
    const y0 = clamp(Math.floor(ny * height), 0, height - 1);
    const x1 = clamp(Math.ceil((nx + nw) * width), 0, width);
    const y1 = clamp(Math.ceil((ny + nh) * height), 0, height);
    for (let y = y0; y < y1; y += 1) {
      const rowOffset = y * width;
      for (let x = x0; x < x1; x += 1) {
        mask[rowOffset + x] = 1;
      }
    }
    return mask;
  }
  if (roi.type === 'polygon' && roi.points && roi.points.length >= 3) {
    const pts = roi.points.map(([px, py]) => [px * width, py * height]);
    const bounds = polygonBounds(pts, width, height);
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (pointInPolygon(x + 0.5, y + 0.5, pts)) {
          mask[y * width + x] = 1;
        }
      }
    }
    return mask;
  }
  return null;
}

function polygonBounds(points, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of points) {
    minX = Math.min(minX, Math.floor(x));
    minY = Math.min(minY, Math.floor(y));
    maxX = Math.max(maxX, Math.ceil(x));
    maxY = Math.max(maxY, Math.ceil(y));
  }
  return {
    minX: clamp(minX, 0, width - 1),
    minY: clamp(minY, 0, height - 1),
    maxX: clamp(maxX, 0, width - 1),
    maxY: clamp(maxY, 0, height - 1),
  };
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-6) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function boxBlurGray(gray, width, height, radius) {
  const out = new Float32Array(gray.length);
  const size = radius * 2 + 1;
  const area = size * size;
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      let sum = 0;
      for (let ky = -radius; ky <= radius; ky += 1) {
        const rowOffset = (y + ky) * width;
        for (let kx = -radius; kx <= radius; kx += 1) {
          sum += gray[rowOffset + x + kx];
        }
      }
      out[y * width + x] = sum / area;
    }
  }
  return out;
}

function dilateGray(gray, width, height) {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      let maxV = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        const rowOffset = (y + ky) * width;
        for (let kx = -1; kx <= 1; kx += 1) {
          const v = gray[rowOffset + (x + kx)];
          if (v > maxV) maxV = v;
        }
      }
      out[idx] = maxV;
    }
  }
  return out;
}

function erodeGray(gray, width, height) {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      let minV = 1;
      for (let ky = -1; ky <= 1; ky += 1) {
        const rowOffset = (y + ky) * width;
        for (let kx = -1; kx <= 1; kx += 1) {
          const v = gray[rowOffset + (x + kx)];
          if (v < minV) minV = v;
        }
      }
      out[idx] = minV;
    }
  }
  return out;
}
function applyClaheLuminance(imageData, options) {
  const { width, height, data } = imageData;
  const tiles = clamp(options.tiles ?? 8, 4, 12);
  const tileW = Math.max(24, Math.floor(width / tiles));
  const tileH = Math.max(24, Math.floor(height / tiles));
  const gridX = Math.ceil(width / tileW);
  const gridY = Math.ceil(height / tileH);
  const clipLimit = clamp(options.clipLimit ?? 1.8, 1.2, 2.5);

  const luma = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    luma[p] = clamp(Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b), 0, 255);
  }

  const maps = new Array(gridY);
  for (let ty = 0; ty < gridY; ty += 1) {
    maps[ty] = new Array(gridX);
    const y0 = ty * tileH;
    const y1 = Math.min(height, y0 + tileH);
    for (let tx = 0; tx < gridX; tx += 1) {
      const x0 = tx * tileW;
      const x1 = Math.min(width, x0 + tileW);
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y += 1) {
        const rowOffset = y * width;
        for (let x = x0; x < x1; x += 1) {
          hist[luma[rowOffset + x]] += 1;
        }
      }

      const area = (x1 - x0) * (y1 - y0);
      const limit = Math.max(1, Math.floor((clipLimit * area) / 256));
      let excess = 0;
      for (let i = 0; i < hist.length; i += 1) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const add = Math.floor(excess / 256);
      let rem = excess % 256;
      for (let i = 0; i < hist.length; i += 1) {
        hist[i] += add;
        if (rem > 0) {
          hist[i] += 1;
          rem -= 1;
        }
      }

      const map = new Uint8Array(256);
      let cumulative = 0;
      for (let i = 0; i < hist.length; i += 1) {
        cumulative += hist[i];
        map[i] = clamp(Math.round((cumulative / area) * 255), 0, 255);
      }
      maps[ty][tx] = map;
    }
  }

  const out = cloneImageData(imageData);
  for (let y = 0; y < height; y += 1) {
    const ty = Math.floor(y / tileH);
    const ty1 = Math.min(ty + 1, gridY - 1);
    const yRatio = clamp((y - ty * tileH) / tileH, 0, 1);
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      const tx = Math.floor(x / tileW);
      const tx1 = Math.min(tx + 1, gridX - 1);
      const xRatio = clamp((x - tx * tileW) / tileW, 0, 1);
      const idx = rowOffset + x;
      const value = luma[idx];
      const map00 = maps[ty][tx][value];
      const map10 = maps[ty][tx1][value];
      const map01 = maps[ty1][tx][value];
      const map11 = maps[ty1][tx1][value];
      const top = map00 * (1 - xRatio) + map10 * xRatio;
      const bottom = map01 * (1 - xRatio) + map11 * xRatio;
      const newL = top * (1 - yRatio) + bottom * yRatio;
      const ratio = clamp(newL / (value + 1), 0.9, 1.1);
      const outIdx = idx * 4;
      out.data[outIdx] = clamp(Math.round(out.data[outIdx] * ratio), 0, 255);
      out.data[outIdx + 1] = clamp(Math.round(out.data[outIdx + 1] * ratio), 0, 255);
      out.data[outIdx + 2] = clamp(Math.round(out.data[outIdx + 2] * ratio), 0, 255);
    }
  }

  return out;
}

function roundValue(value, digits = 3) {
  return Number.parseFloat(value.toFixed(digits));
}
