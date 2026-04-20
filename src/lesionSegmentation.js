import {
  clamp,
  computeLuminance,
  computeSaturation,
  deltaE,
  downscaleImageData,
  rgbToLab,
  toGrayscaleArray,
} from './imageUtils.js';

/**
 * @typedef {Object} Roi
 * @property {'bbox'|'polygon'} type
 * @property {[number, number, number, number]} [bbox] - [x,y,w,h] normalized
 * @property {Array<[number, number]>} [points] - normalized polygon points
 */

/**
 * @typedef {Object} LesionSegmentation
 * @property {Uint8Array} mask
 * @property {number} width
 * @property {number} height
 * @property {number} areaRatio
 * @property {[number, number, number, number]} bbox - normalized
 * @property {[number, number]} centroid - normalized
 * @property {number} borderTouchRatio
 * @property {number} contrastDeltaE
 * @property {number} edgeSharpness
 * @property {number} hairScore
 * @property {number} specularScore
 * @property {'auto'|'roi'} method
 * @property {boolean} valid
 */

/**
 * Segment lesion (auto) or use provided ROI to build a mask and extract features.
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {{roi?:Roi,maxEdge?:number,borderFrac?:number}} [options]
 * @returns {LesionSegmentation}
 */
export function segmentLesion(imageData, options = {}) {
  const { roi, maxEdge = 384, borderFrac = 0.05 } = options;
  const { imageData: small, scale } = downscaleImageData(imageData, maxEdge);

  let mask;
  let method = 'auto';

  if (roi) {
    mask = maskFromRoi(roi, small.width, small.height);
    method = 'roi';
  } else {
    mask = autoSegment(small, borderFrac);
  }

  if (!mask) {
    return emptySegmentation(small.width, small.height, method);
  }

  const stats = computeMaskStats(mask, small.width, small.height);
  if (!stats.valid) {
    return emptySegmentation(small.width, small.height, method);
  }

  const gray = toGrayscaleArray(small.data, small.width, small.height);

  const ringMask = buildRingMask(mask, small.width, small.height, 2);
  const lesionLab = meanLabInMask(small.data, small.width, small.height, mask);
  const ringLab = meanLabInMask(small.data, small.width, small.height, ringMask);

  const contrastDeltaE = lesionLab && ringLab ? deltaE(lesionLab, ringLab) : 0;
  const edgeSharpness = computeEdgeSharpness(gray, mask, small.width, small.height);

  const hairScore = computeHairScore(gray, mask, small.width, small.height);
  const specularScore = computeSpecularScore(small.data, mask, small.width, small.height);

  return {
    mask,
    width: small.width,
    height: small.height,
    areaRatio: stats.areaRatio,
    bbox: stats.bbox,
    centroid: stats.centroid,
    borderTouchRatio: stats.borderTouchRatio,
    contrastDeltaE,
    edgeSharpness,
    hairScore,
    specularScore,
    method,
    valid: true,
    scale,
  };
}

function emptySegmentation(width, height, method) {
  return {
    mask: new Uint8Array(width * height),
    width,
    height,
    areaRatio: 0,
    bbox: [0, 0, 0, 0],
    centroid: [0.5, 0.5],
    borderTouchRatio: 0,
    contrastDeltaE: 0,
    edgeSharpness: 0,
    hairScore: 0,
    specularScore: 0,
    method,
    valid: false,
  };
}

function maskFromRoi(roi, width, height) {
  if (!roi || (!roi.bbox && !roi.points)) return null;
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

function autoSegment(imageData, borderFrac) {
  const { width, height, data } = imageData;
  const border = Math.max(2, Math.round(Math.min(width, height) * borderFrac));
  const { labL, labA, labB } = computeLabArrays(data, width, height);
  const skinLab = medianLabFromBorder(labL, labA, labB, width, height, border);
  if (!skinLab) return null;

  const dist = new Float32Array(width * height);
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 0; i < dist.length; i += 1) {
    const dL = labL[i] - skinLab[0];
    const dA = labA[i] - skinLab[1];
    const dB = labB[i] - skinLab[2];
    const d = Math.sqrt(dL * dL + dA * dA + dB * dB);
    dist[i] = d;
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist < 1e-3) return null;
  const hist = new Uint32Array(256);
  for (let i = 0; i < dist.length; i += 1) {
    const bin = clamp(Math.round((dist[i] / maxDist) * 255), 0, 255);
    hist[bin] += 1;
  }

  let threshold = otsuThreshold(hist) / 255;
  let mask = buildMask(dist, maxDist, threshold);
  let areaRatio = maskAreaRatio(mask);

  if (areaRatio < 0.005 || areaRatio > 0.7) {
    const fallback = kmeansSegmentation(labL, labA, labB, width, height, skinLab, maxIdx);
    if (fallback) {
      mask = fallback;
      areaRatio = maskAreaRatio(mask);
    } else if (areaRatio > 0.6) {
      const p85 = percentileFromHist(hist, dist.length, 0.85) / 255;
      threshold = Math.max(threshold, p85, 0.08);
      mask = buildMask(dist, maxDist, threshold);
    } else {
      threshold = Math.max(0.04, threshold * 0.7);
      mask = buildMask(dist, maxDist, threshold);
    }
  }

  const cleaned = cleanMask(mask, width, height, 1);
  const selected = selectBestComponent(cleaned, width, height);
  return selected;
}

function computeLabArrays(data, width, height) {
  const total = width * height;
  const labL = new Float32Array(total);
  const labA = new Float32Array(total);
  const labB = new Float32Array(total);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const lab = rgbToLab(r, g, b);
    labL[p] = lab[0];
    labA[p] = lab[1];
    labB[p] = lab[2];
  }
  return { labL, labA, labB };
}

function medianLabFromBorder(labL, labA, labB, width, height, border) {
  const lVals = [];
  const aVals = [];
  const bVals = [];
  for (let y = 0; y < height; y += 1) {
    const isBorderY = y < border || y >= height - border;
    for (let x = 0; x < width; x += 1) {
      const isBorder = isBorderY || x < border || x >= width - border;
      if (!isBorder) continue;
      const idx = y * width + x;
      lVals.push(labL[idx]);
      aVals.push(labA[idx]);
      bVals.push(labB[idx]);
    }
  }
  if (!lVals.length) return null;
  return [medianValue(lVals), medianValue(aVals), medianValue(bVals)];
}

function medianValue(values) {
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
}

function kmeansSegmentation(labL, labA, labB, width, height, skinLab, seedIdx) {
  const total = labL.length;
  const c0 = [skinLab[0], skinLab[1], skinLab[2]];
  const c1 = [labL[seedIdx], labA[seedIdx], labB[seedIdx]];
  const maxIter = 6;

  for (let iter = 0; iter < maxIter; iter += 1) {
    const sum0 = [0, 0, 0];
    const sum1 = [0, 0, 0];
    let count0 = 0;
    let count1 = 0;
    for (let i = 0; i < total; i += 1) {
      const d0 = distSq(labL[i], labA[i], labB[i], c0);
      const d1 = distSq(labL[i], labA[i], labB[i], c1);
      if (d0 <= d1) {
        sum0[0] += labL[i];
        sum0[1] += labA[i];
        sum0[2] += labB[i];
        count0 += 1;
      } else {
        sum1[0] += labL[i];
        sum1[1] += labA[i];
        sum1[2] += labB[i];
        count1 += 1;
      }
    }
    if (count0 === 0 || count1 === 0) break;
    c0[0] = sum0[0] / count0;
    c0[1] = sum0[1] / count0;
    c0[2] = sum0[2] / count0;
    c1[0] = sum1[0] / count1;
    c1[1] = sum1[1] / count1;
    c1[2] = sum1[2] / count1;
  }

  const labels = new Uint8Array(total);
  const count = [0, 0];
  const sumX = [0, 0];
  const sumY = [0, 0];
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      const idx = rowOffset + x;
      const d0 = distSq(labL[idx], labA[idx], labB[idx], c0);
      const d1 = distSq(labL[idx], labA[idx], labB[idx], c1);
      const label = d0 <= d1 ? 0 : 1;
      labels[idx] = label;
      count[label] += 1;
      sumX[label] += x;
      sumY[label] += y;
    }
  }

  const centers = [c0, c1];
  const scores = [0, 0];
  for (let k = 0; k < 2; k += 1) {
    if (count[k] === 0) continue;
    const areaRatio = count[k] / total;
    const centroid = [sumX[k] / count[k] / width, sumY[k] / count[k] / height];
    const centerDist = Math.sqrt(Math.pow(centroid[0] - 0.5, 2) + Math.pow(centroid[1] - 0.5, 2));
    const delta = deltaE(centers[k], skinLab);
    const deltaScore = clamp(delta / 20, 0, 1);
    const areaScore = clamp(1 - Math.abs(areaRatio - 0.12) / 0.35, 0, 1);
    const centerScore = clamp(1 - centerDist / 0.6, 0, 1);
    scores[k] = deltaScore * areaScore * centerScore;
  }

  const bestLabel = scores[1] > scores[0] ? 1 : 0;
  if (scores[bestLabel] < 0.1) return null;
  const mask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    mask[i] = labels[i] === bestLabel ? 1 : 0;
  }
  return mask;
}

function distSq(l, a, b, c) {
  const dL = l - c[0];
  const dA = a - c[1];
  const dB = b - c[2];
  return dL * dL + dA * dA + dB * dB;
}

function otsuThreshold(hist) {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let sum = 0;
  for (let i = 0; i < hist.length; i += 1) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 0;

  for (let i = 0; i < hist.length; i += 1) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const betweenVar = wB * wF * (mB - mF) * (mB - mF);
    if (betweenVar > maxVar) {
      maxVar = betweenVar;
      threshold = i;
    }
  }

  return threshold;
}

function buildMask(dist, maxDist, threshold) {
  const mask = new Uint8Array(dist.length);
  for (let i = 0; i < dist.length; i += 1) {
    const norm = dist[i] / maxDist;
    mask[i] = norm >= threshold ? 1 : 0;
  }
  return mask;
}

function maskAreaRatio(mask) {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) count += 1;
  }
  return count / mask.length;
}

function percentileFromHist(hist, total, p) {
  const target = clamp(p, 0, 1) * total;
  let cumulative = 0;
  for (let i = 0; i < hist.length; i += 1) {
    cumulative += hist[i];
    if (cumulative >= target) return i;
  }
  return 255;
}

function cleanMask(mask, width, height, iterations) {
  let out = mask;
  for (let i = 0; i < iterations; i += 1) {
    out = dilateMask(erodeMask(out, width, height), width, height);
    out = erodeMask(dilateMask(out, width, height), width, height);
  }
  return out;
}

function erodeMask(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      let keep = 1;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          if (mask[idx + ky * width + kx] === 0) {
            keep = 0;
            ky = 2;
            break;
          }
        }
      }
      out[idx] = keep;
    }
  }
  return out;
}

function dilateMask(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      let any = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          if (mask[idx + ky * width + kx] === 1) {
            any = 1;
            ky = 2;
            break;
          }
        }
      }
      out[idx] = any;
    }
  }
  return out;
}

function selectBestComponent(mask, width, height) {
  const labels = new Uint32Array(mask.length);
  let label = 0;
  const stats = [];
  const queue = new Int32Array(mask.length);

  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i] || labels[i] !== 0) continue;
    label += 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    labels[i] = label;
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let borderCount = 0;

    while (head < tail) {
      const idx = queue[head++];
      count += 1;
      const x = idx % width;
      const y = Math.floor(idx / width);
      sumX += x;
      sumY += y;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        borderCount += 1;
      }

      const neighbors = [
        idx - 1,
        idx + 1,
        idx - width,
        idx + width,
      ];

      if (x === 0) neighbors[0] = -1;
      if (x === width - 1) neighbors[1] = -1;
      if (y === 0) neighbors[2] = -1;
      if (y === height - 1) neighbors[3] = -1;

      for (const nIdx of neighbors) {
        if (nIdx < 0 || nIdx >= mask.length) continue;
        if (mask[nIdx] && labels[nIdx] === 0) {
          labels[nIdx] = label;
          queue[tail++] = nIdx;
        }
      }
    }

    const areaRatio = count / (width * height);
    const centroid = [sumX / count / width, sumY / count / height];
    const centerDist = Math.sqrt(Math.pow(centroid[0] - 0.5, 2) + Math.pow(centroid[1] - 0.5, 2));
    const borderRatio = borderCount / count;
    let score = areaRatio * clamp(1 - centerDist / 0.6, 0, 1) * clamp(1 - borderRatio * 2, 0, 1);
    if (areaRatio < 0.004 || areaRatio > 0.75) score *= 0.2;
    stats[label] = { score, count };
  }

  if (label === 0) return null;
  let bestLabel = 1;
  for (let i = 2; i <= label; i += 1) {
    if ((stats[i]?.score ?? 0) > (stats[bestLabel]?.score ?? 0)) bestLabel = i;
  }

  if ((stats[bestLabel]?.score ?? 0) <= 0) return null;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    out[i] = labels[i] === bestLabel ? 1 : 0;
  }
  return out;
}

function computeMaskStats(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  let borderCount = 0;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += 1) {
      const idx = rowOffset + x;
      if (!mask[idx]) continue;
      count += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        borderCount += 1;
      }
    }
  }

  if (count === 0) {
    return { valid: false, areaRatio: 0, bbox: [0, 0, 0, 0], centroid: [0.5, 0.5], borderTouchRatio: 0 };
  }

  const areaRatio = count / (width * height);
  const bbox = [
    minX / width,
    minY / height,
    (maxX - minX + 1) / width,
    (maxY - minY + 1) / height,
  ];
  const centroid = [sumX / count / width, sumY / count / height];
  const borderTouchRatio = borderCount / count;
  return { valid: true, areaRatio, bbox, centroid, borderTouchRatio };
}

function buildRingMask(mask, width, height, radius) {
  let dilated = mask;
  for (let i = 0; i < radius; i += 1) {
    dilated = dilateMask(dilated, width, height);
  }
  const ring = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    ring[i] = dilated[i] && !mask[i] ? 1 : 0;
  }
  return ring;
}

function meanLabInMask(data, width, height, mask) {
  let sum = [0, 0, 0];
  let count = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!mask[p]) continue;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const lab = rgbToLab(r, g, b);
    sum[0] += lab[0];
    sum[1] += lab[1];
    sum[2] += lab[2];
    count += 1;
  }
  if (count === 0) return null;
  return [sum[0] / count, sum[1] / count, sum[2] / count];
}

function computeEdgeSharpness(gray, mask, width, height) {
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      if (!mask[idx]) continue;
      const onBoundary =
        !mask[idx - 1] || !mask[idx + 1] || !mask[idx - width] || !mask[idx + width];
      if (!onBoundary) continue;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      sum += Math.sqrt(gx * gx + gy * gy);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function computeHairScore(gray, mask, width, height) {
  if (!mask) return 0;
  const smooth = boxBlurGray(gray, width, height, 1);
  const closed = erodeGray(dilateGray(smooth, width, height), width, height);
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  const blackhatValues = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i += 1) {
    if (!mask[i]) continue;
    const blackhat = closed[i] - smooth[i];
    blackhatValues[i] = blackhat;
    sum += blackhat;
    sumSq += blackhat * blackhat;
    count += 1;
  }
  if (count === 0) return 0;
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const std = Math.sqrt(variance);
  const threshold = Math.max(0.08, mean + 2 * std);
  let hair = 0;
  for (let i = 0; i < blackhatValues.length; i += 1) {
    if (!mask[i]) continue;
    if (blackhatValues[i] > threshold) hair += 1;
  }
  return hair / count;
}

function computeSpecularScore(data, mask, width, height) {
  let count = 0;
  let spec = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!mask[p]) continue;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const lum = computeLuminance(r, g, b);
    const sat = computeSaturation(r, g, b);
    count += 1;
    if (lum > 0.9 && sat < 0.15) spec += 1;
  }
  return count === 0 ? 0 : spec / count;
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
