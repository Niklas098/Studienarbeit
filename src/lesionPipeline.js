import { analyzeLesionQuality } from './lesionQuality.js';
import { applyEnhancements } from './lesionEnhancement.js';
import { extractQualityFeatures } from './imageQuality.js';
import { clamp, cropImageDataToRoi, normalizeImageData } from './imageUtils.js';
import { segmentLesion } from './lesionSegmentation.js';

export const LESION_PIPELINE_DEFAULTS = Object.freeze({
  autoRoiMinConfidence: 0.45,
  cropPadding: 0.03,
  cropRelativePadding: 0.16,
  okScore: 0.75,
  rejectScore: 0.6,
  minCropEdgePx: 224,
  minLesionEdgePx: 96,
  minCropMarginRatio: 0.045,
  minLesionFillRatio: 0.16,
  maxLesionFillRatio: 0.82,
  maxCropAreaRatio: 0.75,
  weights: {
    technical: 0.05,
    roi: 0.2,
    crop: 0.75,
  },
});

const DECISION_LABELS_DE = {
  ok: 'OK',
  warning: 'OK mit Warnung',
  reject: 'zu schlecht',
};

const PIPELINE_ISSUE_TEXTS_DE = {
  no_roi: 'Keine Laesion/ROI verfuegbar',
  auto_roi_needs_review: 'Auto-ROI unsicher: bitte Markierung pruefen',
  crop_missing: 'Laesions-Crop konnte nicht erzeugt werden',
  crop_too_small: 'Crop-Aufloesung zu niedrig',
  lesion_crop_too_small: 'Laesion im Crop zu klein',
  crop_too_tight: 'Crop ist zu eng gesetzt',
  crop_too_loose: 'Crop enthaelt zu viel Umfeld',
  crop_near_image_border: 'Crop liegt am Bildrand; Rand eventuell unvollstaendig',
  poor_crop_visibility: 'Laesion im Crop schlecht sichtbar',
  weak_crop_contrast: 'Laesionskontrast im Crop zu schwach',
  weak_crop_edge: 'Laesionsrand im Crop zu unscharf',
  crop_artifacts: 'Artefakte im Crop (Haare oder Glanzstellen)',
  crop_quality_low: 'Crop-Bildqualitaet insgesamt zu schwach',
  crop_too_dark: 'Crop zu dunkel',
  crop_too_bright: 'Crop ueberbelichtet',
  crop_low_dynamic_range: 'Crop-Dynamikbereich zu gering',
  crop_blurry: 'Crop unscharf',
  crop_noisy: 'Crop rauscht zu stark',
  crop_color_cast: 'Crop mit deutlichem Farbstich',
  uneven_crop_lighting: 'Crop ungleichmaessig beleuchtet',
  hard_no_roi: 'Hard-Reject: keine verwertbare ROI/Laesion',
  hard_crop_missing: 'Hard-Reject: kein Laesions-Crop erzeugbar',
  hard_roi_reject: 'Hard-Reject: ROI-/Laesionsbewertung unbrauchbar',
  hard_crop_unusable: 'Hard-Reject: Crop-Qualitaet unter Mindestgrenze',
  hard_original_unusable: 'Hard-Reject: Originalaufnahme extrem unbrauchbar',
};

const IMPORTANT_CAPTURE_ISSUES = new Set([
  'too_dark',
  'too_bright',
  'low_contrast',
  'high_noise',
  'too_blurry',
  'too_low_resolution',
  'uneven_lighting',
  'strong_color_cast',
  'center_underexposed',
  'center_overexposed',
  'lesion_low_contrast',
  'lesion_edge_blur',
  'hair_occlusion',
  'specular_highlights',
]);

/**
 * Create an auto ROI suggestion that the UI can show and the user can correct.
 * Coordinates are normalized to 0..1 and can be passed back as options.roi.
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {Object} [options]
 */
export function createRoiCorrectionState(imageData, options = {}) {
  const initial = analyzeLesionQuality(imageData, qualityOptions(options, null));
  const confidence = initial.features?.lesionConfidence ?? 0;
  const autoRoi = initial.lesion?.valid ? { type: 'bbox', bbox: initial.lesion.bbox } : null;
  const autoCropRoi = autoRoi ? expandRoiWithTolerance(autoRoi, options) : null;
  const reviewReasons = [];

  if (!autoRoi) {
    reviewReasons.push('no_roi');
  }
  if (initial.issues.includes('needs_manual_roi')) {
    reviewReasons.push('auto_roi_needs_review');
  }
  if (autoRoi && confidence < (options.autoRoiMinConfidence ?? LESION_PIPELINE_DEFAULTS.autoRoiMinConfidence)) {
    reviewReasons.push('auto_roi_needs_review');
  }

  return {
    initial,
    autoRoi,
    autoCropRoi,
    confidence,
    needsManualCorrection: reviewReasons.length > 0,
    reviewReasons: unique(reviewReasons),
  };
}

/**
 * Main reusable pipeline.
 *
 * Input: ImageData-like object (+ optional corrected ROI).
 * Output: metadata with score/status/reasons plus cropped lesion image.
 * The final score weights the cropped-lesion evaluation more strongly.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray}} imageData
 * @param {{id?:string,roi?:Object,allowWarningForModel?:boolean}} [options]
 */
export function processLesionImage(imageData, options = {}) {
  const correction = createRoiCorrectionState(imageData, options);
  const roiSource = options.roi ? 'manual' : correction.autoRoi ? 'auto' : 'none';
  const selectedRoi = normalizeRoi(options.roi ?? correction.autoRoi);
  const cropRoi = selectedRoi ? expandRoiWithTolerance(selectedRoi, options) : null;
  const croppedImage = cropRoi ? cropImageDataToRoi(imageData, cropRoi, 0) : null;

  const roiAnalysis = selectedRoi
    ? analyzeLesionQuality(imageData, qualityOptions(options, selectedRoi))
    : correction.initial;
  const cropEvaluation = croppedImage
    ? evaluateCroppedLesion(imageData, croppedImage, selectedRoi, cropRoi, roiAnalysis, options)
    : missingCropEvaluation();

  const scoreParts = computePipelineScore(correction, roiAnalysis, cropEvaluation, roiSource, options);
  const hardRejects = computeHardRejects(correction, roiAnalysis, cropEvaluation, roiSource);
  const hardRejectTexts = hardRejects.map((issue) => PIPELINE_ISSUE_TEXTS_DE[issue] ?? issue);
  const decision = derivePipelineDecision(correction, roiAnalysis, cropEvaluation, scoreParts, hardRejects, roiSource, options);
  const issueCodes = collectIssueCodes(correction, roiAnalysis, cropEvaluation, decision, roiSource);
  const issueTexts = issueCodes.map((issue) => issueText(issue, roiAnalysis));
  const warnings = deriveWarnings(correction, cropEvaluation, decision, roiSource).map((issue) =>
    PIPELINE_ISSUE_TEXTS_DE[issue] ?? issue
  );
  const reasons = buildReasons(scoreParts, roiAnalysis, cropEvaluation, issueTexts, hardRejectTexts, roiSource);
  const requiresManualReview = decision === 'warning' && roiSource === 'auto' && correction.needsManualCorrection;
  const usableForModel = decision === 'ok' ||
    (decision === 'warning' && !requiresManualReview && options.allowWarningForModel !== false);

  const metadata = {
    id: options.id ?? null,
    score: round(scoreParts.finalScore),
    status: decision,
    statusLabel: DECISION_LABELS_DE[decision],
    accepted: decision !== 'reject',
    usableForModel,
    requiresManualReview,
    roiSource,
    roi: {
      selected: selectedRoi,
      crop: cropRoi,
      auto: correction.autoRoi,
      autoWithTolerance: correction.autoCropRoi,
      confidence: round(correction.confidence),
    },
    issues: issueCodes,
    issueTexts,
    warnings,
    hardRejects,
    hardRejectTexts,
    reasons,
    recommendations: unique([
      ...(roiAnalysis.recommendations ?? []),
      ...(correction.needsManualCorrection && roiSource === 'auto' ? ['annotate_roi'] : []),
    ]),
    recommendationTexts: unique([
      ...(roiAnalysis.recommendationTexts ?? []),
      ...(correction.needsManualCorrection && roiSource === 'auto'
        ? ['Laesion manuell markieren (ROI setzen)']
        : []),
    ]),
    metrics: {
      finalScore: round(scoreParts.finalScore),
      technicalScore: round(scoreParts.technicalScore),
      roiScore: round(scoreParts.roiScore),
      cropScore: round(scoreParts.cropScore),
      penalties: scoreParts.penalties,
      weights: scoreParts.weights,
      crop: cropEvaluation.features,
      lesion: {
        areaRatio: round(roiAnalysis.features?.lesionAreaRatio ?? 0),
        contrastDeltaE: round(roiAnalysis.features?.lesionContrastDeltaE ?? 0),
        edgeSharpness: round(roiAnalysis.features?.lesionEdgeSharpness ?? 0),
        visibilityScore: round(roiAnalysis.features?.lesionVisibilityScore ?? 0),
        confidence: round(roiAnalysis.features?.lesionConfidence ?? 0),
        hairScore: round(roiAnalysis.features?.lesionHairScore ?? 0),
        specularScore: round(roiAnalysis.features?.lesionSpecularScore ?? 0),
      },
      image: {
        width: imageData.width,
        height: imageData.height,
        croppedWidth: croppedImage?.width ?? 0,
        croppedHeight: croppedImage?.height ?? 0,
      },
    },
  };

  const includeModelInput = options.includeModelInput !== false;
  const modelInput = includeModelInput && metadata.usableForModel && croppedImage
    ? {
        original: imageData,
        cropped: croppedImage,
        normalizedCropped: normalizeImageData(croppedImage),
        roi: selectedRoi,
        cropRoi,
      }
    : null;

  return {
    id: metadata.id,
    metadata,
    croppedImage,
    analysis: {
      initial: correction.initial,
      roi: roiAnalysis,
      crop: cropEvaluation,
    },
    correction,
    modelInput,
  };
}

/**
 * Process a list of images. The core stays IO-free, so callers can load images
 * from browser File objects, Node adapters, or app-native image buffers.
 * @param {Array<{id?:string,imageData:Object,roi?:Object}|Object>} items
 * @param {Object} [options]
 */
export function processLesionDataset(items, options = {}) {
  const results = items.map((item, index) => {
    const imageData = item.imageData ?? item;
    const id = item.id ?? (options.idPrefix ? `${options.idPrefix}_${index + 1}` : `image_${index + 1}`);
    return processLesionImage(imageData, { includeModelInput: false, ...options, id, roi: item.roi ?? options.roi });
  });
  return {
    items: results,
    summary: summarizeLesionDataset(results),
  };
}

/**
 * Summarize pipeline metadata for a processed dataset.
 * @param {Array<{metadata:Object}|Object>} results
 */
export function summarizeLesionDataset(results) {
  const metadata = results.map((item) => item.metadata ?? item).filter(Boolean);
  const scores = metadata.map((item) => Number(item.score)).filter((score) => Number.isFinite(score));
  const statusCounts = { ok: 0, warning: 0, reject: 0 };
  const issueCounts = {};
  const hardRejectCounts = {};
  const roiSourceCounts = {};

  for (const item of metadata) {
    if (statusCounts[item.status] === undefined) statusCounts[item.status] = 0;
    statusCounts[item.status] += 1;
    roiSourceCounts[item.roiSource] = (roiSourceCounts[item.roiSource] ?? 0) + 1;
    for (const issue of item.issues ?? []) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
    for (const hardReject of item.hardRejects ?? []) {
      hardRejectCounts[hardReject] = (hardRejectCounts[hardReject] ?? 0) + 1;
    }
  }

  const accepted = (statusCounts.ok ?? 0) + (statusCounts.warning ?? 0);
  return {
    count: metadata.length,
    accepted,
    rejected: statusCounts.reject ?? 0,
    acceptedRatio: metadata.length ? round(accepted / metadata.length) : 0,
    statusCounts,
    roiSourceCounts,
    score: summarizeScores(scores),
    scoreBands: scoreBands(scores),
    issueCounts,
    hardRejectCounts,
  };
}

/**
 * JSON-safe result without the raw RGBA buffers.
 * @param {{metadata:Object,croppedImage?:Object}} result
 */
export function serializeLesionResult(result) {
  const croppedWidth = result.croppedImage?.width ?? result.metadata?.metrics?.image?.croppedWidth ?? 0;
  const croppedHeight = result.croppedImage?.height ?? result.metadata?.metrics?.image?.croppedHeight ?? 0;
  return {
    ...result.metadata,
    image: {
      croppedWidth,
      croppedHeight,
    },
  };
}

/**
 * Expand bbox/polygon bounds with a small tolerance so the crop keeps a rim of skin.
 * @param {{type:'bbox'|'polygon',bbox?:number[],points?:Array<[number,number]>}} roi
 * @param {Object} [options]
 */
export function expandRoiWithTolerance(roi, options = {}) {
  const bbox = roiToBbox(roi);
  if (!bbox) return null;
  const padding = options.cropPadding ?? LESION_PIPELINE_DEFAULTS.cropPadding;
  const relative = options.cropRelativePadding ?? LESION_PIPELINE_DEFAULTS.cropRelativePadding;
  const padX = Math.max(padding, bbox[2] * relative);
  const padY = Math.max(padding, bbox[3] * relative);
  const x0 = clamp(bbox[0] - padX, 0, 1);
  const y0 = clamp(bbox[1] - padY, 0, 1);
  const x1 = clamp(bbox[0] + bbox[2] + padX, 0, 1);
  const y1 = clamp(bbox[1] + bbox[3] + padY, 0, 1);
  return {
    type: 'bbox',
    bbox: [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)],
  };
}

/**
 * Backwards-compatible wrapper for the earlier API.
 * Prefer processLesionImage for new integration work.
 */
export function preprocessLesionImage(imageData, options = {}) {
  const processed = processLesionImage(imageData, options);
  const before = processed.analysis.initial;
  const final = processed.analysis.roi;
  const correctionTest = runCorrectionTest(imageData, before, qualityOptions(options, null), options);

  return {
    before,
    final,
    decision: processed.metadata.status === 'warning' ? 'borderline' : processed.metadata.status,
    initialDecision: mapLegacyDecision(before.status),
    correctionTest,
    sendToModel: processed.metadata.usableForModel,
    modelInput: processed.modelInput,
    croppedImage: processed.croppedImage,
    metadata: processed.metadata,
    correction: processed.correction,
  };
}

function evaluateCroppedLesion(fullImage, croppedImage, selectedRoi, cropRoi, roiAnalysis, options) {
  const selectedBbox = roiToBbox(selectedRoi);
  const cropBbox = roiToBbox(cropRoi);
  if (!selectedBbox || !cropBbox) return missingCropEvaluation();

  const minCropEdgePx = options.minCropEdgePx ?? LESION_PIPELINE_DEFAULTS.minCropEdgePx;
  const minLesionEdgePx = options.minLesionEdgePx ?? LESION_PIPELINE_DEFAULTS.minLesionEdgePx;
  const minCropMarginRatio = options.minCropMarginRatio ?? LESION_PIPELINE_DEFAULTS.minCropMarginRatio;
  const minLesionFillRatio = options.minLesionFillRatio ?? LESION_PIPELINE_DEFAULTS.minLesionFillRatio;
  const maxLesionFillRatio = options.maxLesionFillRatio ?? LESION_PIPELINE_DEFAULTS.maxLesionFillRatio;
  const maxCropAreaRatio = options.maxCropAreaRatio ?? LESION_PIPELINE_DEFAULTS.maxCropAreaRatio;

  const cropQuality = extractQualityFeatures(croppedImage);
  const cropLocalRoi = roiInCrop(selectedBbox, cropBbox);
  const cropLesion = cropLocalRoi
    ? segmentLesion(croppedImage, {
        roi: cropLocalRoi,
        maxEdge: options.lesionMaxEdge ?? 384,
        borderFrac: options.borderFrac ?? 0.05,
      })
    : null;

  const cropMinEdge = Math.min(croppedImage.width, croppedImage.height);
  const lesionWidthPx = selectedBbox[2] * fullImage.width;
  const lesionHeightPx = selectedBbox[3] * fullImage.height;
  const lesionMinEdgePx = Math.min(lesionWidthPx, lesionHeightPx);
  const cropAreaPx = Math.max(1, croppedImage.width * croppedImage.height);
  const lesionBoxAreaPx = Math.max(1, lesionWidthPx * lesionHeightPx);
  const lesionFillRatio = clamp(lesionBoxAreaPx / cropAreaPx, 0, 1);
  const cropAreaRatio = clamp(cropBbox[2] * cropBbox[3], 0, 1);
  const margins = cropMargins(selectedBbox, cropBbox);
  const minMarginRatio = Math.min(margins.left, margins.top, margins.right, margins.bottom);
  const touchesImageBorder = cropBbox[0] <= 0 || cropBbox[1] <= 0 ||
    cropBbox[0] + cropBbox[2] >= 1 || cropBbox[1] + cropBbox[3] >= 1;

  const cropEdgeScore = Math.pow(clamp(cropMinEdge / minCropEdgePx, 0, 1), 1.15);
  const lesionPixelScore = Math.pow(clamp(lesionMinEdgePx / minLesionEdgePx, 0, 1), 1.2);
  const resolutionScore = clamp(0.35 * cropEdgeScore + 0.65 * lesionPixelScore, 0, 1);
  const marginScore = clamp(minMarginRatio / minCropMarginRatio, 0, 1);
  const fillTarget = 0.52;
  const fillScore = clamp(1 - Math.abs(lesionFillRatio - fillTarget) / 0.36, 0, 1);

  const brightnessScore = scoreAround(cropQuality.meanBrightness ?? 0.5, 0.5, 0.28);
  const dynamicRangeScore = clamp((cropQuality.dynamicRange ?? 0) / 0.42, 0, 1);
  const cropContrastScore = clamp((cropQuality.contrast ?? 0) / 0.14, 0, 1);
  const sharpnessScore = clamp(
    0.65 * ((cropQuality.sharpnessGradient ?? 0) / 0.13) +
      0.35 * ((cropQuality.sharpnessLaplacian ?? 0) / 0.0016),
    0,
    1
  );
  const noiseScore = clamp(1 - Math.max(0, (cropQuality.noiseEstimate ?? 0) - 0.015) / 0.045, 0, 1);
  const backgroundLighting = cropBackgroundLighting(croppedImage, cropLocalRoi);
  const lightingScore = backgroundLighting.score;
  const colorCastMagnitude = Math.max(
    Math.abs(cropQuality.colorCastR ?? 0),
    Math.abs(cropQuality.colorCastG ?? 0),
    Math.abs(cropQuality.colorCastB ?? 0)
  );
  const colorScore = clamp(1 - Math.max(0, colorCastMagnitude - 0.05) / 0.12, 0, 1);
  const cropTechnicalScore = clamp(
    0.18 * brightnessScore +
      0.2 * dynamicRangeScore +
      0.14 * cropContrastScore +
      0.22 * sharpnessScore +
      0.13 * noiseScore +
      0.09 * lightingScore +
      0.04 * colorScore,
    0,
    1
  );

  const lesionContrastDeltaE = cropLesion?.contrastDeltaE ?? roiAnalysis.features?.lesionContrastDeltaE ?? 0;
  const lesionEdgeSharpness = cropLesion?.edgeSharpness ?? roiAnalysis.features?.lesionEdgeSharpness ?? 0;
  const lesionHairScore = cropLesion?.hairScore ?? roiAnalysis.features?.lesionHairScore ?? 0;
  const lesionSpecularScore = cropLesion?.specularScore ?? roiAnalysis.features?.lesionSpecularScore ?? 0;
  const lesionContrastScore = clamp(lesionContrastDeltaE / 16, 0, 1);
  const lesionEdgeScore = clamp(lesionEdgeSharpness / 0.075, 0, 1);
  const visibilityScore = clamp(
    0.3 * fillScore +
      0.3 * lesionContrastScore +
      0.3 * lesionEdgeScore +
      0.1 * marginScore,
    0,
    1
  );
  const hairPenalty = clamp(lesionHairScore / 0.1, 0, 1);
  const specularPenalty = clamp(lesionSpecularScore / 0.055, 0, 1);
  const artifactScore = clamp(1 - 0.6 * hairPenalty - 0.4 * specularPenalty, 0, 1);

  const score = clamp(
    (0.2 * cropTechnicalScore +
      0.19 * resolutionScore +
      0.1 * marginScore +
      0.08 * fillScore +
      0.14 * lesionContrastScore +
      0.15 * lesionEdgeScore +
      0.08 * artifactScore +
      0.05 * visibilityScore) *
      (0.88 + 0.12 * resolutionScore),
    0,
    1
  );

  const issues = [];
  if (cropMinEdge < minCropEdgePx * 0.82) issues.push('crop_too_small');
  if (lesionMinEdgePx < minLesionEdgePx * 0.82) issues.push('lesion_crop_too_small');
  if (minMarginRatio < minCropMarginRatio * 0.65) issues.push('crop_too_tight');
  if (touchesImageBorder && minMarginRatio < minCropMarginRatio * 0.8) issues.push('crop_near_image_border');
  if (lesionFillRatio < minLesionFillRatio * 0.75 || cropAreaRatio > Math.min(0.88, maxCropAreaRatio + 0.1)) issues.push('crop_too_loose');
  if (lesionFillRatio > Math.min(0.88, maxLesionFillRatio + 0.04)) issues.push('crop_too_tight');
  if (cropTechnicalScore < 0.55) issues.push('crop_quality_low');
  if ((cropQuality.meanBrightness ?? 0.5) < 0.22) issues.push('crop_too_dark');
  if ((cropQuality.meanBrightness ?? 0.5) > 0.82) issues.push('crop_too_bright');
  if (dynamicRangeScore < 0.42 && cropContrastScore < 0.52) issues.push('crop_low_dynamic_range');
  if (sharpnessScore < 0.45) issues.push('crop_blurry');
  if (noiseScore < 0.45) issues.push('crop_noisy');
  if (colorScore < 0.12) issues.push('crop_color_cast');
  if (lightingScore < 0.45) issues.push('uneven_crop_lighting');
  if (visibilityScore < 0.4) issues.push('poor_crop_visibility');
  if (lesionContrastScore < 0.42 && visibilityScore < 0.7) issues.push('weak_crop_contrast');
  if (lesionEdgeScore < 0.18 && visibilityScore < 0.55) issues.push('weak_crop_edge');
  if (artifactScore < 0.6) issues.push('crop_artifacts');

  return {
    score,
    status: score >= 0.8 && issues.length === 0 ? 'usable' : score >= 0.6 ? 'critical' : 'reject',
    issues: unique(issues),
    issueTexts: unique(issues).map((issue) => PIPELINE_ISSUE_TEXTS_DE[issue] ?? issue),
    features: {
      resolutionScore: round(resolutionScore),
      cropEdgeScore: round(cropEdgeScore),
      lesionPixelScore: round(lesionPixelScore),
      marginScore: round(marginScore),
      fillScore: round(fillScore),
      visibilityScore: round(visibilityScore),
      cropTechnicalScore: round(cropTechnicalScore),
      brightnessScore: round(brightnessScore),
      dynamicRangeScore: round(dynamicRangeScore),
      cropContrastScore: round(cropContrastScore),
      sharpnessScore: round(sharpnessScore),
      noiseScore: round(noiseScore),
      lightingScore: round(lightingScore),
      colorScore: round(colorScore),
      lesionContrastScore: round(lesionContrastScore),
      lesionEdgeScore: round(lesionEdgeScore),
      contrastScore: round(lesionContrastScore),
      edgeScore: round(lesionEdgeScore),
      artifactScore: round(artifactScore),
      meanBrightness: round(cropQuality.meanBrightness ?? 0),
      dynamicRange: round(cropQuality.dynamicRange ?? 0),
      contrast: round(cropQuality.contrast ?? 0),
      sharpnessGradient: round(cropQuality.sharpnessGradient ?? 0),
      noiseEstimate: round(cropQuality.noiseEstimate ?? 0),
      backgroundLightingDelta: round(backgroundLighting.delta),
      colorCastMagnitude: round(colorCastMagnitude),
      lesionContrastDeltaE: round(lesionContrastDeltaE),
      lesionEdgeSharpness: round(lesionEdgeSharpness),
      lesionHairScore: round(lesionHairScore),
      lesionSpecularScore: round(lesionSpecularScore),
      cropMinEdgePx: Math.round(cropMinEdge),
      lesionMinEdgePx: Math.round(lesionMinEdgePx),
      lesionFillRatio: round(lesionFillRatio),
      cropAreaRatio: round(cropAreaRatio),
      minMarginRatio: round(minMarginRatio),
      touchesImageBorder,
    },
  };
}

function missingCropEvaluation() {
  return {
    score: 0,
    status: 'reject',
    issues: ['crop_missing'],
    issueTexts: [PIPELINE_ISSUE_TEXTS_DE.crop_missing],
    features: {
      resolutionScore: 0,
      cropEdgeScore: 0,
      lesionPixelScore: 0,
      marginScore: 0,
      fillScore: 0,
      visibilityScore: 0,
      cropTechnicalScore: 0,
      brightnessScore: 0,
      dynamicRangeScore: 0,
      cropContrastScore: 0,
      sharpnessScore: 0,
      noiseScore: 0,
      lightingScore: 0,
      colorScore: 0,
      lesionContrastScore: 0,
      lesionEdgeScore: 0,
      contrastScore: 0,
      edgeScore: 0,
      artifactScore: 0,
      meanBrightness: 0,
      dynamicRange: 0,
      contrast: 0,
      sharpnessGradient: 0,
      noiseEstimate: 0,
      backgroundLightingDelta: 0,
      colorCastMagnitude: 0,
      lesionContrastDeltaE: 0,
      lesionEdgeSharpness: 0,
      lesionHairScore: 0,
      lesionSpecularScore: 0,
      cropMinEdgePx: 0,
      lesionMinEdgePx: 0,
      lesionFillRatio: 0,
      cropAreaRatio: 0,
      minMarginRatio: 0,
      touchesImageBorder: false,
    },
  };
}

function computePipelineScore(correction, roiAnalysis, cropEvaluation, roiSource, options) {
  const weights = normalizeWeights(options.weights ?? LESION_PIPELINE_DEFAULTS.weights);
  const technicalScore = clamp(correction.initial.features?.generalScore ?? correction.initial.score ?? 0, 0, 1);
  const roiScore = clamp(roiAnalysis.features?.lesionScore ?? roiAnalysis.score ?? 0, 0, 1);
  const cropScore = clamp(cropEvaluation.score ?? 0, 0, 1);
  const capturePenalty = captureIssuePenalty(roiAnalysis.features?.capturePenaltyIssues ?? roiAnalysis.issues);
  const cropTechnicalPenalty = (cropEvaluation.features?.cropTechnicalScore ?? 1) < 0.62 ? 0.03 : 0;
  let finalScore = weights.technical * technicalScore + weights.roi * roiScore + weights.crop * cropScore;
  finalScore -= capturePenalty;
  finalScore -= cropTechnicalPenalty;

  return {
    finalScore: clamp(finalScore, 0, 1),
    technicalScore,
    roiScore,
    cropScore,
    penalties: {
      capture: round(capturePenalty),
      cropTechnical: round(cropTechnicalPenalty),
    },
    weights,
  };
}

function computeHardRejects(correction, roiAnalysis, cropEvaluation, roiSource) {
  const hardRejects = [];
  const generalScore = correction.initial.features?.generalScore ?? 1;
  const cropMissing = cropEvaluation.issues.includes('crop_missing');

  if (roiSource === 'none') hardRejects.push('hard_no_roi');
  if (cropMissing) hardRejects.push('hard_crop_missing');
  if (roiAnalysis.status === 'reject' && hasCriticalRoiIssue(roiAnalysis.issues)) {
    hardRejects.push('hard_roi_reject');
  }
  if (!cropMissing && cropEvaluation.status === 'reject' && (cropEvaluation.score ?? 0) < 0.58) {
    hardRejects.push('hard_crop_unusable');
  }
  if (generalScore < 0.15) hardRejects.push('hard_original_unusable');

  return unique(hardRejects);
}

function derivePipelineDecision(correction, roiAnalysis, cropEvaluation, scoreParts, hardRejects, roiSource, options) {
  const okScore = options.okScore ?? LESION_PIPELINE_DEFAULTS.okScore;
  const rejectScore = options.rejectScore ?? LESION_PIPELINE_DEFAULTS.rejectScore;
  const finalScore = scoreParts.finalScore;

  if (hardRejects.length > 0) return 'reject';
  if (finalScore < rejectScore) return 'reject';
  if (finalScore < okScore) return 'warning';
  return 'ok';
}

function collectIssueCodes(correction, roiAnalysis, cropEvaluation, decision, roiSource) {
  const issues = [
    ...(roiAnalysis.issues ?? []),
    ...(cropEvaluation.issues ?? []),
  ];
  if (roiSource === 'none') issues.push('no_roi');
  if (roiSource === 'auto' && correction.needsManualCorrection) issues.push(...correction.reviewReasons);
  if (decision === 'warning' && issues.length === 0) issues.push('auto_roi_needs_review');
  return unique(issues);
}

function deriveWarnings(correction, cropEvaluation, decision, roiSource) {
  if (decision === 'reject') return [];
  const warnings = [];
  if (roiSource === 'auto' && correction.needsManualCorrection) warnings.push(...correction.reviewReasons);
  warnings.push(...cropEvaluation.issues);
  return unique(warnings);
}

function buildReasons(scoreParts, roiAnalysis, cropEvaluation, issueTexts, hardRejectTexts, roiSource) {
  const reasons = [
    `Endscore ${round(scoreParts.finalScore)}: Crop ${round(scoreParts.cropScore)} zaehlt ${Math.round(scoreParts.weights.crop * 100)} %, ROI ${round(scoreParts.roiScore)} zaehlt ${Math.round(scoreParts.weights.roi * 100)} %, Original-Technik ${round(scoreParts.technicalScore)} zaehlt ${Math.round(scoreParts.weights.technical * 100)} %.`,
    `ROI-Quelle: ${roiSource}. Laesionskontrast DeltaE ${round(roiAnalysis.features?.lesionContrastDeltaE ?? 0)}, Rand-Schaerfe ${round(roiAnalysis.features?.lesionEdgeSharpness ?? 0)}, Sichtbarkeit ${round(roiAnalysis.features?.lesionVisibilityScore ?? 0)}.`,
    `Crop: ${cropEvaluation.features.cropMinEdgePx} px kleinste Kante, Laesion ${cropEvaluation.features.lesionMinEdgePx} px kleinste Kante, Rand ${round(cropEvaluation.features.minMarginRatio)}.`,
    `Crop-Bildqualitaet: Technik ${round(cropEvaluation.features.cropTechnicalScore)}, Schaerfe ${round(cropEvaluation.features.sharpnessScore)}, Dynamik ${round(cropEvaluation.features.dynamicRangeScore)}, Rauschen ${round(cropEvaluation.features.noiseScore)}, Farbstabilitaet ${round(cropEvaluation.features.colorScore)}.`,
  ];
  if (hardRejectTexts.length) {
    reasons.push(`Hard-Reject-Grund: ${hardRejectTexts.join('; ')}.`);
  }
  if (issueTexts.length) {
    reasons.push(`Auffaellig: ${issueTexts.join('; ')}.`);
  } else {
    reasons.push('Keine harten technischen Auffaelligkeiten gefunden.');
  }
  reasons.push('Bewertung ist technische Bildqualitaet, keine medizinische Diagnose.');
  return reasons;
}

function issueText(issue, roiAnalysis) {
  const index = roiAnalysis.issues?.indexOf(issue) ?? -1;
  if (index >= 0 && roiAnalysis.issueTexts?.[index]) return roiAnalysis.issueTexts[index];
  return PIPELINE_ISSUE_TEXTS_DE[issue] ?? issue;
}

function roiToBbox(roi) {
  if (!roi) return null;
  if (roi.type === 'bbox' && roi.bbox && roi.bbox.length === 4) {
    const [x, y, w, h] = roi.bbox.map(Number);
    if (![x, y, w, h].every(Number.isFinite)) return null;
    const x0 = clamp(x, 0, 1);
    const y0 = clamp(y, 0, 1);
    const x1 = clamp(x + Math.max(0, w), 0, 1);
    const y1 = clamp(y + Math.max(0, h), 0, 1);
    return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
  }
  if (roi.type === 'polygon' && roi.points?.length >= 3) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const [px, py] of roi.points) {
      minX = Math.min(minX, clamp(Number(px), 0, 1));
      minY = Math.min(minY, clamp(Number(py), 0, 1));
      maxX = Math.max(maxX, clamp(Number(px), 0, 1));
      maxY = Math.max(maxY, clamp(Number(py), 0, 1));
    }
    return [minX, minY, Math.max(0, maxX - minX), Math.max(0, maxY - minY)];
  }
  return null;
}

function normalizeRoi(roi) {
  if (!roi) return null;
  if (roi.type === 'bbox') {
    const bbox = roiToBbox(roi);
    return bbox ? { type: 'bbox', bbox } : null;
  }
  if (roi.type === 'polygon' && roi.points?.length >= 3) {
    return {
      type: 'polygon',
      points: roi.points.map(([x, y]) => [clamp(Number(x), 0, 1), clamp(Number(y), 0, 1)]),
    };
  }
  return null;
}

function roiInCrop(selectedBbox, cropBbox) {
  if (!selectedBbox || !cropBbox || cropBbox[2] <= 0 || cropBbox[3] <= 0) return null;
  return {
    type: 'bbox',
    bbox: [
      clamp((selectedBbox[0] - cropBbox[0]) / cropBbox[2], 0, 1),
      clamp((selectedBbox[1] - cropBbox[1]) / cropBbox[3], 0, 1),
      clamp(selectedBbox[2] / cropBbox[2], 0, 1),
      clamp(selectedBbox[3] / cropBbox[3], 0, 1),
    ],
  };
}

function cropMargins(selectedBbox, cropBbox) {
  const left = cropBbox[2] > 0 ? (selectedBbox[0] - cropBbox[0]) / cropBbox[2] : 0;
  const top = cropBbox[3] > 0 ? (selectedBbox[1] - cropBbox[1]) / cropBbox[3] : 0;
  const right = cropBbox[2] > 0
    ? (cropBbox[0] + cropBbox[2] - selectedBbox[0] - selectedBbox[2]) / cropBbox[2]
    : 0;
  const bottom = cropBbox[3] > 0
    ? (cropBbox[1] + cropBbox[3] - selectedBbox[1] - selectedBbox[3]) / cropBbox[3]
    : 0;
  return {
    left: clamp(left, 0, 1),
    top: clamp(top, 0, 1),
    right: clamp(right, 0, 1),
    bottom: clamp(bottom, 0, 1),
  };
}

function scoreAround(value, target, tolerance) {
  return clamp(1 - Math.abs(value - target) / tolerance, 0, 1);
}

function cropBackgroundLighting(imageData, roi) {
  if (!roi?.bbox) return { score: 1, delta: 0 };
  const { width, height, data } = imageData;
  const [rx, ry, rw, rh] = roi.bbox;
  const x0 = Math.floor(rx * width);
  const y0 = Math.floor(ry * height);
  const x1 = Math.ceil((rx + rw) * width);
  const y1 = Math.ceil((ry + rh) * height);
  const sums = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const quadrant = (y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0);
      const idx = (y * width + x) * 4;
      const lum = (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255;
      sums[quadrant] += lum;
      counts[quadrant] += 1;
    }
  }

  const means = [];
  for (let i = 0; i < sums.length; i += 1) {
    if (counts[i] > 0) means.push(sums[i] / counts[i]);
  }
  if (means.length < 2) return { score: 1, delta: 0 };

  const delta = Math.max(...means) - Math.min(...means);
  return {
    score: clamp(1 - delta / 0.22, 0, 1),
    delta,
  };
}

function captureIssuePenalty(issues = []) {
  let penalty = 0;
  for (const issue of issues) {
    if (!IMPORTANT_CAPTURE_ISSUES.has(issue)) continue;
    penalty += issue === 'strong_color_cast' ? 0.01 : 0.025;
  }
  return Math.min(0.06, penalty);
}

function countImportantCaptureIssues(issues = []) {
  return issues.filter((issue) => IMPORTANT_CAPTURE_ISSUES.has(issue)).length;
}

function hasCriticalRoiIssue(issues = []) {
  const critical = new Set(['lesion_not_found', 'lesion_cutoff']);
  return issues.some((issue) => critical.has(issue));
}

function qualityOptions(options, roi) {
  return {
    roi,
    generalMaxEdge: options.generalMaxEdge,
    lesionMaxEdge: options.lesionMaxEdge,
    borderFrac: options.borderFrac,
    generalReportThresholds: options.generalReportThresholds,
  };
}

function normalizeWeights(weights) {
  const technical = Math.max(0, weights.technical ?? 0);
  const roi = Math.max(0, weights.roi ?? 0);
  const crop = Math.max(0, weights.crop ?? 0);
  const sum = technical + roi + crop || 1;
  return {
    technical: technical / sum,
    roi: roi / sum,
    crop: crop / sum,
  };
}

function summarizeScores(scores) {
  if (!scores.length) {
    return {
      mean: 0,
      min: 0,
      max: 0,
      p05: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0,
    };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, score) => acc + score, 0);
  return {
    mean: round(sum / sorted.length),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    p05: round(percentile(sorted, 0.05)),
    p25: round(percentile(sorted, 0.25)),
    p50: round(percentile(sorted, 0.5)),
    p75: round(percentile(sorted, 0.75)),
    p95: round(percentile(sorted, 0.95)),
  };
}

function scoreBands(scores) {
  const bands = [
    { label: '0.00-0.20', min: 0, max: 0.2, count: 0 },
    { label: '0.20-0.40', min: 0.2, max: 0.4, count: 0 },
    { label: '0.40-0.60', min: 0.4, max: 0.6, count: 0 },
    { label: '0.60-0.75', min: 0.6, max: 0.75, count: 0 },
    { label: '0.75-1.00', min: 0.75, max: 1.000001, count: 0 },
  ];
  for (const score of scores) {
    const band = bands.find((item) => score >= item.min && score < item.max);
    if (band) band.count += 1;
  }
  return bands.map(({ label, count }) => ({ label, count }));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const pos = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return 0;
  return Number.parseFloat(value.toFixed(digits));
}

function mapLegacyDecision(status) {
  if (status === 'usable') return 'ok';
  if (status === 'critical') return 'borderline';
  return 'reject';
}

function runCorrectionTest(imageData, before, autoOptions, options) {
  if (before.status !== 'critical' && !options.forceEnhancement) return null;
  if (before.status === 'reject') return null;

  const hasQualityIssues = before.issues.some((issue) => issue !== 'needs_manual_roi');
  if (!hasQualityIssues && !options.forceEnhancement) return null;

  const allowBorderline = shouldAllowBorderline(before);
  const enhancementPolicy = allowBorderline ? 'conditional' : 'safe_only';
  const roiForEnhancement = options.roi ?? deriveAutoRoi(before);

  const { imageData: correctedImage, applied } = applyEnhancements(imageData, before, {
    ...options.enhancementOptions,
    policy: enhancementPolicy,
    allowBorderline,
    roi: roiForEnhancement,
  });

  const after = analyzeLesionQuality(correctedImage, autoOptions);
  const delta = after.score - before.score;
  const comparison = compareMetrics(before, after);
  const improvedToOk = before.status === 'critical' && after.status === 'usable';
  const recoverable = improvedToOk && delta > 0;

  return {
    after,
    applied,
    delta,
    comparison,
    improvedToOk,
    recoverable,
    enhancementPolicy,
    imageData: correctedImage,
  };
}

function shouldAllowBorderline(before) {
  if (before.issues.includes('needs_manual_roi')) return false;
  const general = before.features?.generalScore ?? 0;
  const visibility = before.features?.lesionVisibilityScore ?? 0;
  const lowContrast = before.issues.includes('low_contrast') || before.issues.includes('lesion_low_contrast');
  const blurry = before.issues.includes('too_blurry');
  return (general < 0.55 || visibility < 0.5) && (lowContrast || blurry);
}

function deriveAutoRoi(before) {
  if (!before?.lesion?.valid) return null;
  if (before.issues.includes('needs_manual_roi')) return null;
  const confidence = before.features?.lesionConfidence ?? 0;
  if (confidence < 0.45) return null;
  return { type: 'bbox', bbox: before.lesion.bbox };
}

function compareMetrics(before, after) {
  if (!before || !after) return null;
  const metrics = [
    'meanBrightness',
    'contrast',
    'dynamicRange',
    'sharpnessGradient',
    'noiseEstimate',
    'lesionContrastDeltaE',
    'lesionEdgeSharpness',
    'lesionVisibilityScore',
  ];
  const rows = [];
  for (const key of metrics) {
    const b = before.features?.[key];
    const a = after.features?.[key];
    if (typeof b !== 'number' || typeof a !== 'number') continue;
    rows.push({ key, before: b, after: a, delta: a - b });
  }
  return rows;
}
