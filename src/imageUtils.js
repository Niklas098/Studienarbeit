// Shared image helpers for browser + Node (ImageData-like objects).

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert RGBA buffer to grayscale array (0..1).
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @returns {Float32Array}
 */
export function toGrayscaleArray(data, width, height) {
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[j] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  return gray;
}

/**
 * Compute linear luminance (0..1) from RGB in 0..1.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function computeLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute simple saturation (0..1) from RGB in 0..1.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function computeSaturation(r, g, b) {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  return maxC - minC;
}

/**
 * Resize ImageData-like object with nearest-neighbor sampling.
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {number} targetW
 * @param {number} targetH
 */
export function resizeImageData(imageData, targetW, targetH) {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  const scaleX = width / targetW;
  const scaleY = height / targetH;

  for (let y = 0; y < targetH; y += 1) {
    const srcY = Math.min(height - 1, Math.floor(y * scaleY));
    for (let x = 0; x < targetW; x += 1) {
      const srcX = Math.min(width - 1, Math.floor(x * scaleX));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3] ?? 255;
    }
  }

  return { width: targetW, height: targetH, data: out };
}

/**
 * Downscale image to fit maxEdge (keeps aspect ratio).
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {number} maxEdge
 */
export function downscaleImageData(imageData, maxEdge) {
  const { width, height } = imageData;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  if (targetW === width && targetH === height) {
    return { imageData, scale: 1 };
  }
  return { imageData: resizeImageData(imageData, targetW, targetH), scale };
}

/**
 * Normalize ImageData-like object to float RGB array (0..1).
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @returns {{width:number,height:number,data:Float32Array}}
 */
export function normalizeImageData(imageData) {
  const { width, height, data } = imageData;
  const out = new Float32Array(width * height * 3);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 3) {
    out[p] = data[i] / 255;
    out[p + 1] = data[i + 1] / 255;
    out[p + 2] = data[i + 2] / 255;
  }
  return { width, height, data: out };
}

/**
 * Crop ImageData-like object to ROI (bbox or polygon bounds).
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {{type:'bbox'|'polygon',bbox?:[number,number,number,number],points?:Array<[number,number]>}} roi
 * @param {number} [padding] - normalized padding added around bbox
 * @returns {{width:number,height:number,data:Uint8ClampedArray}}
 */
export function cropImageDataToRoi(imageData, roi, padding = 0) {
  if (!roi) return imageData;
  const { width, height, data } = imageData;
  let bbox = roi.bbox;
  if (!bbox && roi.points && roi.points.length >= 3) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const [x, y] of roi.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    bbox = [minX, minY, maxX - minX, maxY - minY];
  }
  if (!bbox) return imageData;
  const [nx, ny, nw, nh] = bbox;
  const pad = Math.max(0, padding);
  const x0 = clamp(Math.floor((nx - pad) * width), 0, width - 1);
  const y0 = clamp(Math.floor((ny - pad) * height), 0, height - 1);
  const x1 = clamp(Math.ceil((nx + nw + pad) * width), 1, width);
  const y1 = clamp(Math.ceil((ny + nh + pad) * height), 1, height);
  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);
  const out = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y += 1) {
    const srcRow = (y0 + y) * width;
    const dstRow = y * cropW;
    for (let x = 0; x < cropW; x += 1) {
      const srcIdx = (srcRow + x0 + x) * 4;
      const dstIdx = (dstRow + x) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3] ?? 255;
    }
  }
  return { width: cropW, height: cropH, data: out };
}

// --- Color conversion helpers (sRGB D65) ---

function srgbToLinear(c) {
  if (c <= 0.04045) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function fLab(t) {
  const delta = 6 / 29;
  if (t > Math.pow(delta, 3)) return Math.cbrt(t);
  return t / (3 * delta * delta) + 4 / 29;
}

/**
 * Convert sRGB (0..1) to CIE Lab.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
export function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const fx = fLab(x);
  const fy = fLab(y);
  const fz = fLab(z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [L, a, bVal];
}

/**
 * Delta E (CIE76) between two Lab vectors.
 * @param {[number, number, number]} lab1
 * @param {[number, number, number]} lab2
 */
export function deltaE(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const dA = lab1[1] - lab2[1];
  const dB = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}
