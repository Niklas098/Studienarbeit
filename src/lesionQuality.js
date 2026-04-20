import {
  extractQualityFeatures,
  evaluateGeneralIssues,
  GENERAL_WEIGHTS,
  scoreIssues,
} from './imageQuality.js';
import { clamp, downscaleImageData } from './imageUtils.js';
import { segmentLesion } from './lesionSegmentation.js';

export const LESION_THRESHOLDS = {
  minAreaRatio: 0.015,
  maxAreaRatio: 0.75,
  borderTouchRatio: 0.03,
  contrastDeltaE: 6,
  edgeSharpness: 0.015,
  centerDistance: 0.6,
  hairScore: 0.05,
  specularScore: 0.02,
};

export const LESION_WEIGHTS = {
  needs_manual_roi: 0.15,
  lesion_not_found: 0.5,
  lesion_too_small: 0.15,
  lesion_too_large: 0.1,
  lesion_cutoff: 0.25,
  lesion_low_contrast: 0.12,
  lesion_edge_blur: 0.12,
  lesion_off_center: 0.04,
  hair_occlusion: 0.08,
  specular_highlights: 0.06,
};

export const DERMOSCOPY_GENERAL_REPORT_THRESHOLDS = {
  minWidth: 360,
  minHeight: 360,
  lowContrast: 0.045,
  dynamicRangeLow: 0.2,
  sharpnessLap: 0.0003,
  sharpnessGrad: 0.032,
  colorCast: 0.2,
  unevenLighting: 0.24,
  centerUnder: 0.16,
  centerOver: 0.86,
};

const ISSUE_TEXTS_DE = {
  too_dark: 'Bild zu dunkel',
  too_bright: 'Bild ueberbelichtet',
  low_contrast: 'Kontrast zu gering',
  high_noise: 'Rauschen zu hoch',
  too_blurry: 'Bild unscharf',
  too_low_resolution: 'Aufloesung zu niedrig',
  uneven_lighting: 'Ungleichmaessige Beleuchtung',
  strong_color_cast: 'Starker Farbstich (Farbverfaelschung)',
  possible_shadow_issue: 'Schatten oder Vignettierung',
  subject_too_small: 'Motiv im Zentrum zu klein',
  center_underexposed: 'Zentrum unterbelichtet',
  center_overexposed: 'Zentrum ueberbelichtet',
  needs_manual_roi: 'Auto-ROI unsicher: bitte Laesion manuell markieren',
  lesion_not_found: 'Laesion nicht erkannt',
  lesion_too_small: 'Laesion zu klein im Bild',
  lesion_too_large: 'Laesion zu gross im Bild',
  lesion_cutoff: 'Laesion am Rand abgeschnitten',
  lesion_low_contrast: 'Laesion hebt sich zu wenig ab',
  lesion_edge_blur: 'Laesionsrand unscharf',
  lesion_off_center: 'Laesion zu randnah',
  hair_occlusion: 'Haare ueber der Laesion',
  specular_highlights: 'Spiegelungen oder Glanzstellen',
};

const STATUS_LABELS_DE = {
  usable: 'OK',
  critical: 'kritisch',
  reject: 'unbrauchbar',
};

const RECOMMENDATION_TEXTS_DE = {
  adjust_brightness_up: 'Helligkeit leicht erhoehen',
  adjust_brightness_down: 'Helligkeit leicht senken',
  boost_contrast: 'Kontrast selektiv erhoehen (CLAHE, vorsichtig)',
  reduce_noise: 'Sehr mildes Denoising (Luminanz)',
  mild_sharpen: 'Vorsichtig schaerfen',
  retake_neutral_light: 'Neu aufnehmen: neutrales Licht, kein Farbstich',
  retake_lighting: 'Neu aufnehmen: gleichmaessige Beleuchtung',
  lesion_contrast_boost: 'Laesionskontrast selektiv erhoehen (CLAHE)',
  annotate_roi: 'Laesion manuell markieren (ROI setzen)',
  hair_suppression: 'Haare vorsichtig reduzieren (nur ROI)',
};
/**
 * @typedef {Object} LesionQualityResult
 * @property {number} score
 * @property {'usable'|'critical'|'reject'} status
 * @property {string[]} issues
 * @property {Object} features
 * @property {Object} lesion
 * @property {string[]} recommendations
 */

/**
 * Analyze lesion image quality (general + lesion-specific).
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {{roi?:Object,generalMaxEdge?:number,lesionMaxEdge?:number,borderFrac?:number,generalReportThresholds?:Object}} [options]
 * @returns {LesionQualityResult}
 */
export function analyzeLesionQuality(imageData, options = {}) {
  const generalMaxEdge = options.generalMaxEdge ?? 1024;
  const lesionMaxEdge = options.lesionMaxEdge ?? 384;

  const { imageData: generalInput } = downscaleImageData(imageData, generalMaxEdge);
  const generalFeatures = extractQualityFeatures(generalInput);
  generalFeatures.width = imageData.width;
  generalFeatures.height = imageData.height;

  const scoringGeneralIssues = evaluateGeneralIssues(generalFeatures);
  const generalIssues = calibrateGeneralReportIssues(
    scoringGeneralIssues,
    generalFeatures,
    options.generalReportThresholds
  );
  const generalScore = scoreIssues(scoringGeneralIssues, GENERAL_WEIGHTS);

  const lesion = segmentLesion(imageData, {
    roi: options.roi,
    maxEdge: lesionMaxEdge,
    borderFrac: options.borderFrac ?? 0.05,
  });

  const lesionConfidence = computeLesionConfidence(lesion, LESION_THRESHOLDS);
  const lesionIssues = evaluateLesionIssues(lesion, LESION_THRESHOLDS, {
    method: lesion.method,
    confidence: lesionConfidence,
    hasRoi: Boolean(options.roi),
  });
  const issues = [...generalIssues, ...lesionIssues];
  const scoringIssues = [...scoringGeneralIssues, ...lesionIssues];

  const lesionScore = scoreIssues(lesionIssues, LESION_WEIGHTS);
  let score = 0.45 * generalScore + 0.55 * lesionScore;
  const scoreNotes = ['Score bewertet nur die technische Eignung, keine Diagnose.'];
  const hardCount = countHardIssues(scoringIssues);
  if (generalScore < 0.45 && hardCount >= 3) {
    score = Math.min(score, 0.35);
    scoreNotes.push('Score reduziert: starke allgemeine Qualitaetsprobleme.');
  }
  if (issues.includes('strong_color_cast')) {
    scoreNotes.push('Keine automatische Farbkorrektur, um Farbinformationen zu schuetzen.');
  }
  if (lesionIssues.includes('needs_manual_roi')) {
    score = Math.min(score, 0.65);
    scoreNotes.push('Score nur vorlaeufig: Auto-ROI unsicher, bitte manuell markieren.');
  }
  const status = deriveStatus(score, generalScore, lesionScore, scoringIssues, lesion, hardCount);
  const recommendations = recommendationsFromIssues(issues);
  const issueTexts = issues.map((issue) => ISSUE_TEXTS_DE[issue] ?? issue);
  const recommendationTexts = recommendations.map((rec) => RECOMMENDATION_TEXTS_DE[rec] ?? rec);

  const features = {
    ...generalFeatures,
    lesionAreaRatio: lesion.areaRatio,
    lesionContrastDeltaE: lesion.contrastDeltaE,
    lesionEdgeSharpness: lesion.edgeSharpness,
    lesionCenterDistance: centerDistance(lesion.centroid),
    lesionBorderTouchRatio: lesion.borderTouchRatio,
    lesionHairScore: lesion.hairScore,
    lesionSpecularScore: lesion.specularScore,
    lesionVisibilityScore: computeVisibilityScore(lesion),
    generalScore,
    technicalScore: generalScore,
    lesionScore,
    lesionConfidence,
    generalReportIssues: generalIssues,
    generalScoringIssues: scoringGeneralIssues,
    capturePenaltyIssues: scoringIssues,
    scoreNotes,
  };

  return {
    score,
    status,
    statusLabel: STATUS_LABELS_DE[status] ?? status,
    issues,
    issueTexts,
    features,
    lesion,
    recommendations,
    recommendationTexts,
  };
}

function calibrateGeneralReportIssues(issues, features, overrides = {}) {
  const thresholds = {
    ...DERMOSCOPY_GENERAL_REPORT_THRESHOLDS,
    ...overrides,
  };
  const colorCastMagnitude = Math.max(
    Math.abs(features.colorCastR ?? 0),
    Math.abs(features.colorCastG ?? 0),
    Math.abs(features.colorCastB ?? 0)
  );
  const reportIssues = [];

  for (const issue of issues) {
    if (issue === 'too_low_resolution' && features.width >= thresholds.minWidth && features.height >= thresholds.minHeight) {
      continue;
    }
    if (issue === 'low_contrast' &&
      (features.contrast ?? 0) >= thresholds.lowContrast &&
      (features.dynamicRange ?? 0) >= thresholds.dynamicRangeLow) {
      continue;
    }
    if (issue === 'too_blurry' &&
      ((features.sharpnessLaplacian ?? 0) >= thresholds.sharpnessLap ||
        (features.sharpnessGradient ?? 0) >= thresholds.sharpnessGrad)) {
      continue;
    }
    if (issue === 'strong_color_cast' && colorCastMagnitude <= thresholds.colorCast) {
      continue;
    }
    if (issue === 'uneven_lighting' &&
      Math.abs((features.centerBrightness ?? 0.5) - (features.edgeBrightness ?? 0.5)) <= thresholds.unevenLighting) {
      continue;
    }
    if (issue === 'center_underexposed' && (features.centerBrightness ?? 0.5) >= thresholds.centerUnder) {
      continue;
    }
    if (issue === 'center_overexposed' && (features.centerBrightness ?? 0.5) <= thresholds.centerOver) {
      continue;
    }
    reportIssues.push(issue);
  }

  return reportIssues;
}

function evaluateLesionIssues(lesion, thresholds, context) {
  const issues = [];
  const method = context?.method ?? 'auto';
  const confidence = context?.confidence ?? 0;
  const hasRoi = context?.hasRoi ?? false;

  if (!lesion.valid || lesion.areaRatio === 0) {
    if (!hasRoi && method === 'auto') {
      issues.push('needs_manual_roi');
    } else {
      issues.push('lesion_not_found');
    }
    return issues;
  }

  if (!hasRoi && method === 'auto' && confidence < 0.35) {
    issues.push('needs_manual_roi');
    return issues;
  }

  if (!hasRoi && method === 'auto' && lesion.areaRatio < thresholds.minAreaRatio) {
    issues.push('needs_manual_roi');
    return issues;
  }

  if (!hasRoi && method === 'auto' && lesion.areaRatio > thresholds.maxAreaRatio) {
    issues.push('needs_manual_roi');
    return issues;
  }

  if (lesion.areaRatio < thresholds.minAreaRatio) {
    issues.push('lesion_too_small');
  }
  if (lesion.areaRatio > thresholds.maxAreaRatio) {
    issues.push('lesion_too_large');
  }
  if (lesion.borderTouchRatio > thresholds.borderTouchRatio) {
    issues.push('lesion_cutoff');
  }
  if (lesion.contrastDeltaE < thresholds.contrastDeltaE) {
    issues.push('lesion_low_contrast');
  }
  if (lesion.edgeSharpness < thresholds.edgeSharpness) {
    issues.push('lesion_edge_blur');
  }
  if (centerDistance(lesion.centroid) > thresholds.centerDistance) {
    issues.push('lesion_off_center');
  }
  if (lesion.hairScore > thresholds.hairScore) {
    issues.push('hair_occlusion');
  }
  if (lesion.specularScore > thresholds.specularScore) {
    issues.push('specular_highlights');
  }

  return issues;
}

function centerDistance(centroid) {
  if (!centroid) return 0;
  const dx = centroid[0] - 0.5;
  const dy = centroid[1] - 0.5;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeVisibilityScore(lesion) {
  if (!lesion.valid) return 0;
  const areaNorm = clamp(1 - Math.abs(lesion.areaRatio - 0.12) / 0.2, 0, 1);
  const contrastNorm = clamp(lesion.contrastDeltaE / 12, 0, 1);
  const edgeNorm = clamp(lesion.edgeSharpness / 0.05, 0, 1);
  return 0.35 * areaNorm + 0.35 * contrastNorm + 0.3 * edgeNorm;
}

function computeLesionConfidence(lesion, thresholds) {
  if (!lesion.valid) return 0;
  let areaScore = clamp(1 - Math.abs(lesion.areaRatio - 0.12) / 0.2, 0, 1);
  if (lesion.areaRatio < thresholds.minAreaRatio * 0.5 || lesion.areaRatio > thresholds.maxAreaRatio) {
    areaScore = 0;
  }
  const contrastScore = clamp(lesion.contrastDeltaE / 12, 0, 1);
  const edgeScore = clamp(lesion.edgeSharpness / 0.05, 0, 1);
  const centerScore = clamp(1 - centerDistance(lesion.centroid) / 0.7, 0, 1);
  return 0.3 * areaScore + 0.3 * contrastScore + 0.2 * edgeScore + 0.2 * centerScore;
}

function deriveStatus(score, generalScore, lesionScore, issues, lesion, hardCount) {
  if (generalScore < 0.45 && hardCount >= 3) return 'reject';
  if (generalScore < 0.25) return 'reject';
  if (issues.includes('lesion_not_found') && lesion.method === 'roi') return 'reject';
  if (issues.includes('lesion_cutoff') && lesion.method === 'roi') return 'reject';
  if (issues.includes('needs_manual_roi')) return 'critical';
  if (score < 0.6 || lesionScore < 0.45) return 'critical';
  return 'usable';
}

function countHardIssues(issues) {
  const hardGeneralIssues = ['too_dark', 'too_bright', 'low_contrast', 'too_blurry', 'too_low_resolution'];
  return issues.filter((issue) => hardGeneralIssues.includes(issue)).length;
}

function recommendationsFromIssues(issues) {
  const map = {
    too_dark: 'adjust_brightness_up',
    too_bright: 'adjust_brightness_down',
    low_contrast: 'boost_contrast',
    high_noise: 'reduce_noise',
    too_blurry: 'mild_sharpen',
    strong_color_cast: 'retake_neutral_light',
    uneven_lighting: 'retake_lighting',
    possible_shadow_issue: 'retake_lighting',
    center_underexposed: 'adjust_brightness_up',
    center_overexposed: 'adjust_brightness_down',
    lesion_low_contrast: 'lesion_contrast_boost',
    lesion_edge_blur: 'mild_sharpen',
    needs_manual_roi: 'annotate_roi',
    hair_occlusion: 'hair_suppression',
  };

  const recs = new Set();
  for (const issue of issues) {
    if (map[issue]) recs.add(map[issue]);
  }
  return Array.from(recs);
}
