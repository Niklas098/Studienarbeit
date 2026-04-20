// Offline image quality analysis core module.
// Works in Node (ImageData-like objects) and the browser (CanvasRenderingContext2D.getImageData()).
// Uses classical CV heuristics only (no ML) to keep the pipeline deterministic and offline-friendly.

import { toGrayscaleArray } from './imageUtils.js';

/**
 * ImageData-like input.
 * @typedef {Object} ImageDataLike
 * @property {Uint8ClampedArray} data - RGBA data, length = width * height * 4.
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} QualityFeatures
 * @property {number} width
 * @property {number} height
 * @property {number} meanBrightness
 * @property {number} brightnessVariance
 * @property {number} contrast
 * @property {number} dynamicRange
 * @property {number} sharpnessLaplacian
 * @property {number} sharpnessGradient
 * @property {number} [noiseEstimate]
 * @property {number} [colorCastR]
 * @property {number} [colorCastG]
 * @property {number} [colorCastB]
 * @property {number} [saturation]
 * @property {number} [centerBrightness]
 * @property {number} [edgeBrightness]
 * @property {number} [centerContrast]
 * @property {number} [edgeContrast]
 */

/**
 * @typedef {'too_dark'|'too_bright'|'low_contrast'|'high_noise'|'too_blurry'|'too_low_resolution'|'uneven_lighting'|'strong_color_cast'|'possible_shadow_issue'|'subject_too_small'|'center_underexposed'|'center_overexposed'} QualityIssue
 */

/**
 * @typedef {Object} QualityResult
 * @property {number} score
 * @property {QualityIssue[]} issues
 * @property {QualityFeatures} features
 */

/**
 * Analyze a given ImageData-like object and return features + issues.
 * @param {ImageDataLike} imageData
 * @returns {QualityResult}
 */
export function analyzeImageQuality(imageData) {
  const features = extractQualityFeatures(imageData);
  return ruleBasedQualityScore(features);
}

/**
 * Extract features only (no scoring).
 * @param {ImageDataLike} imageData
 * @returns {QualityFeatures}
 */
export function extractQualityFeatures(imageData) {
  const { data, width, height } = imageData;
  if (!data || !width || !height) {
    throw new Error('Invalid ImageData input');
  }

  const grayscale = toGrayscaleArray(data, width, height);
  const brightness = brightnessFeatures(grayscale, width, height);
  const sharpness = sharpnessFeatures(grayscale, width, height);
  const noiseEstimate = estimateNoise(grayscale, width, height);
  const color = colorFeatures(data, width, height);

  return {
    width,
    height,
    meanBrightness: brightness.meanBrightness,
    brightnessVariance: brightness.variance,
    contrast: brightness.contrast,
    dynamicRange: brightness.dynamicRange,
    sharpnessLaplacian: sharpness.laplacianVar,
    sharpnessGradient: sharpness.gradientMean,
    noiseEstimate,
    colorCastR: color.colorCastR,
    colorCastG: color.colorCastG,
    colorCastB: color.colorCastB,
    saturation: color.saturation,
    centerBrightness: brightness.centerBrightness,
    edgeBrightness: brightness.edgeBrightness,
    centerContrast: brightness.centerContrast,
    edgeContrast: brightness.edgeContrast,
  };
}

export const GENERAL_THRESHOLDS = {
  dark: 0.25,
  bright: 0.75,
  lowContrast: 0.08,
  dynamicRangeLow: 0.35,
  sharpnessLap: 0.0008,
  sharpnessGrad: 0.08,
  minWidth: 800,
  minHeight: 800,
  noise: 0.03,
  colorCast: 0.08,
  unevenLighting: 0.18,
  shadow: 0.22,
  subjectContrastRatio: 0.5,
  centerUnder: 0.2,
  centerOver: 0.82,
};

export const GENERAL_WEIGHTS = {
  too_dark: 0.15,
  too_bright: 0.15,
  low_contrast: 0.15,
  high_noise: 0.1,
  too_blurry: 0.25,
  too_low_resolution: 0.25,
  uneven_lighting: 0.1,
  strong_color_cast: 0.1,
  possible_shadow_issue: 0.05,
  subject_too_small: 0.05,
  center_underexposed: 0.05,
  center_overexposed: 0.05,
};

/**
 * Evaluate general (non-domain-specific) quality issues.
 * @param {QualityFeatures} features
 * @param {typeof GENERAL_THRESHOLDS} [thresholds]
 * @returns {QualityIssue[]}
 */
export function evaluateGeneralIssues(features, thresholds = GENERAL_THRESHOLDS) {
  const issues = [];
  const { meanBrightness, contrast, dynamicRange, sharpnessLaplacian, sharpnessGradient } = features;

  if (meanBrightness < thresholds.dark) {
    issues.push('too_dark');
  } else if (meanBrightness > thresholds.bright) {
    issues.push('too_bright');
  }

  if (contrast < thresholds.lowContrast || dynamicRange < thresholds.dynamicRangeLow) {
    issues.push('low_contrast');
  }

  if (sharpnessLaplacian < thresholds.sharpnessLap || sharpnessGradient < thresholds.sharpnessGrad) {
    issues.push('too_blurry');
  }

  if (features.width < thresholds.minWidth || features.height < thresholds.minHeight) {
    issues.push('too_low_resolution');
  }

  if ((features.noiseEstimate ?? 0) > thresholds.noise) {
    issues.push('high_noise');
  }

  const colorCastMagnitude = Math.max(
    Math.abs(features.colorCastR ?? 0),
    Math.abs(features.colorCastG ?? 0),
    Math.abs(features.colorCastB ?? 0)
  );
  if (colorCastMagnitude > thresholds.colorCast) {
    issues.push('strong_color_cast');
  }

  const centerBrightness = features.centerBrightness ?? meanBrightness;
  const edgeBrightness = features.edgeBrightness ?? meanBrightness;
  const centerContrast = features.centerContrast ?? contrast;
  const edgeContrast = features.edgeContrast ?? contrast;

  if (Math.abs(centerBrightness - edgeBrightness) > thresholds.unevenLighting) {
    issues.push('uneven_lighting');
  }

  if (centerBrightness - edgeBrightness > thresholds.shadow && edgeContrast < centerContrast) {
    issues.push('possible_shadow_issue');
  }

  if (centerContrast < thresholds.subjectContrastRatio * edgeContrast && edgeContrast > thresholds.lowContrast) {
    issues.push('subject_too_small');
  }

  if (centerBrightness < thresholds.centerUnder) {
    issues.push('center_underexposed');
  }

  if (centerBrightness > thresholds.centerOver) {
    issues.push('center_overexposed');
  }

  return issues;
}

/**
 * Score a set of issues using the provided weights.
 * @param {QualityIssue[]} issues
 * @param {Record<string, number>} weights
 */
export function scoreIssues(issues, weights = GENERAL_WEIGHTS) {
  const rawScore = issues.reduce((score, issue) => score - (weights[issue] ?? 0), 1);
  return clamp(rawScore, 0, 1);
}

/**
 * Rule-based scoring on top of the feature vector.
 * @param {QualityFeatures} features
 * @returns {QualityResult}
 */
export function ruleBasedQualityScore(features) {
  const issues = evaluateGeneralIssues(features, GENERAL_THRESHOLDS);
  const score = scoreIssues(issues, GENERAL_WEIGHTS);
  return { score, issues, features };
}

// --- Feature helpers ---

function brightnessFeatures(gray, width, height) {
  const hist = new Uint32Array(256);
  let sum = 0;
  let sumSq = 0;
  let minVal = 1;
  let maxVal = 0;

  const cx0 = Math.floor(width * 0.25);
  const cx1 = Math.ceil(width * 0.75);
  const cy0 = Math.floor(height * 0.25);
  const cy1 = Math.ceil(height * 0.75);

  let centerSum = 0;
  let centerSumSq = 0;
  let centerCount = 0;

  const totalCount = width * height;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width;
    const inCenterY = y >= cy0 && y < cy1;
    for (let x = 0; x < width; x += 1) {
      const idx = rowOffset + x;
      const v = gray[idx];
      sum += v;
      sumSq += v * v;
      minVal = Math.min(minVal, v);
      maxVal = Math.max(maxVal, v);
      const bin = Math.min(255, Math.max(0, Math.round(v * 255)));
      hist[bin] += 1;

      const inCenter = inCenterY && x >= cx0 && x < cx1;
      if (inCenter) {
        centerSum += v;
        centerSumSq += v * v;
        centerCount += 1;
      }
    }
  }

  const mean = sum / totalCount;
  const variance = Math.max(0, sumSq / totalCount - mean * mean);
  const contrast = Math.sqrt(variance);

  const dynamicRange = percentile(hist, totalCount, 0.95) - percentile(hist, totalCount, 0.05);

  const edgeCount = Math.max(1, totalCount - centerCount);
  const edgeSum = sum - centerSum;
  const edgeSumSq = sumSq - centerSumSq;

  const centerMean = centerCount > 0 ? centerSum / centerCount : mean;
  const centerVar = Math.max(0, centerCount > 0 ? centerSumSq / centerCount - centerMean * centerMean : variance);
  const centerContrast = Math.sqrt(centerVar);

  const edgeMean = edgeSum / edgeCount;
  const edgeVar = Math.max(0, edgeSumSq / edgeCount - edgeMean * edgeMean);
  const edgeContrast = Math.sqrt(edgeVar);

  return {
    meanBrightness: mean,
    variance,
    contrast,
    dynamicRange,
    minBrightness: minVal,
    maxBrightness: maxVal,
    centerBrightness: centerMean,
    edgeBrightness: edgeMean,
    centerContrast,
    edgeContrast,
  };
}

function sharpnessFeatures(gray, width, height) {
  if (width < 3 || height < 3) {
    return { laplacianVar: 0, gradientMean: 0 };
  }

  let lapSum = 0;
  let lapSumSq = 0;
  let gradSum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const center = gray[idx];
      const top = gray[idx - width];
      const bottom = gray[idx + width];
      const left = gray[idx - 1];
      const right = gray[idx + 1];
      const tl = gray[idx - width - 1];
      const tr = gray[idx - width + 1];
      const bl = gray[idx + width - 1];
      const br = gray[idx + width + 1];

      const lap = -8 * center + top + bottom + left + right + tl + tr + bl + br;
      lapSum += lap;
      lapSumSq += lap * lap;

      const gx = (tr + 2 * right + br) - (tl + 2 * left + bl);
      const gy = (bl + 2 * bottom + br) - (tl + 2 * top + tr);
      const gradMag = Math.sqrt(gx * gx + gy * gy);
      gradSum += gradMag;

      count += 1;
    }
  }

  const lapMean = lapSum / count;
  const lapVar = Math.max(0, lapSumSq / count - lapMean * lapMean);
  const gradientMean = gradSum / count;

  return { laplacianVar: lapVar, gradientMean };
}

function estimateNoise(gray, width, height) {
  if (width < 3 || height < 3) {
    return 0;
  }

  let sumSqAll = 0;
  let countAll = 0;
  let sumSqFlat = 0;
  let countFlat = 0;
  const gradThreshold = 0.05; // Focus on low-gradient areas to avoid counting edges as noise.

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      let localSum = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        const rowOffset = (y + ky) * width;
        for (let kx = -1; kx <= 1; kx += 1) {
          localSum += gray[rowOffset + (x + kx)];
        }
      }
      const localMean = localSum / 9;
      const diff = gray[idx] - localMean;

      // Simple gradient magnitude to detect textured areas.
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      const gradMag = Math.sqrt(gx * gx + gy * gy);

      sumSqAll += diff * diff;
      countAll += 1;

      if (gradMag < gradThreshold) {
        sumSqFlat += diff * diff;
        countFlat += 1;
      }
    }
  }

  const enoughFlat = countFlat > 0.01 * width * height;
  const variance = enoughFlat
    ? sumSqFlat / countFlat
    : countAll > 0
      ? sumSqAll / countAll
      : 0;
  return Math.sqrt(variance);
}

function colorFeatures(data, width, height) {
  const totalCount = width * height;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let satSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    sumR += r;
    sumG += g;
    sumB += b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    satSum += maxC - minC;
  }

  const meanR = sumR / totalCount;
  const meanG = sumG / totalCount;
  const meanB = sumB / totalCount;
  const meanRGB = (meanR + meanG + meanB) / 3;

  return {
    colorCastR: meanR - meanRGB,
    colorCastG: meanG - meanRGB,
    colorCastB: meanB - meanRGB,
    saturation: satSum / totalCount,
  };
}

function percentile(hist, totalCount, p) {
  const target = Math.max(0, Math.min(1, p)) * totalCount;
  let cumulative = 0;
  for (let i = 0; i < hist.length; i += 1) {
    cumulative += hist[i];
    if (cumulative >= target) {
      return i / 255;
    }
  }
  return 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
