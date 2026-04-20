import {
  processLesionImage,
  serializeLesionResult,
  summarizeLesionDataset,
} from '../src/lesionPipeline.js';

const MAX_EDGE = 1600;
const DATASET_PAGE_SIZE = 120;
const DATASET_RENDER_BATCH = 25;
const DATASET_SUMMARY_BATCH = 50;
const DATASET_YIELD_BATCH = 8;

const singleFile = document.getElementById('single-file');
const sourceCanvas = document.getElementById('source-canvas');
const cropCanvas = document.getElementById('crop-canvas');
const singleReport = document.getElementById('single-report');
const useAutoBtn = document.getElementById('use-auto');
const clearManualBtn = document.getElementById('clear-manual');
const downloadSingleBtn = document.getElementById('download-single');

const datasetFiles = document.getElementById('dataset-files');
const datasetFolder = document.getElementById('dataset-folder');
const exportDatasetBtn = document.getElementById('export-dataset');
const datasetProgress = document.getElementById('dataset-progress');
const datasetSummary = document.getElementById('dataset-summary');
const datasetGrid = document.getElementById('dataset-grid');
const datasetStatusFilter = document.getElementById('dataset-status-filter');
const datasetSortBy = document.getElementById('dataset-sort-by');
const datasetSortOrder = document.getElementById('dataset-sort-order');
const datasetApplyViewBtn = document.getElementById('dataset-apply-view');

const state = {
  single: {
    fileName: null,
    imageData: null,
    result: null,
    manualRoi: null,
    dragging: false,
    dragStart: null,
    dragRect: null,
  },
  dataset: [],
  datasetView: {
    status: 'all',
    sortBy: 'score',
    sortOrder: 'desc',
    visibleLimit: DATASET_PAGE_SIZE,
    order: null,
    pending: false,
  },
};

singleFile.addEventListener('change', async (event) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageData = await fileToImageData(file);
    state.single.fileName = file.name;
    state.single.imageData = imageData;
    state.single.manualRoi = null;
    state.single.dragRect = null;
    await processSingle();
  } catch (error) {
    showSingleError(error);
  }
});

useAutoBtn.addEventListener('click', () => {
  const auto = state.single.result?.metadata?.roi?.auto;
  if (!auto || !state.single.imageData) return;
  state.single.manualRoi = cloneRoi(auto);
  state.single.dragRect = bboxToRect(auto.bbox, sourceCanvas);
  processSingle().catch(showSingleError);
});

clearManualBtn.addEventListener('click', () => {
  if (!state.single.imageData) return;
  state.single.manualRoi = null;
  state.single.dragRect = null;
  processSingle().catch(showSingleError);
});

downloadSingleBtn.addEventListener('click', exportSingleResult);

sourceCanvas.addEventListener('pointerdown', (event) => {
  if (!state.single.imageData) return;
  sourceCanvas.setPointerCapture(event.pointerId);
  state.single.dragging = true;
  state.single.dragStart = canvasPoint(event, sourceCanvas);
  state.single.dragRect = null;
});

sourceCanvas.addEventListener('pointermove', (event) => {
  if (!state.single.dragging) return;
  const end = canvasPoint(event, sourceCanvas);
  state.single.dragRect = rectFromPoints(state.single.dragStart, end);
  renderSingleImages();
});

sourceCanvas.addEventListener('pointerup', (event) => {
  if (!state.single.dragging) return;
  sourceCanvas.releasePointerCapture(event.pointerId);
  state.single.dragging = false;
  if (!state.single.dragRect || state.single.dragRect.w < 4 || state.single.dragRect.h < 4) {
    state.single.dragRect = null;
    renderSingleImages();
    return;
  }
  state.single.manualRoi = { type: 'bbox', bbox: rectToBbox(state.single.dragRect, sourceCanvas) };
  processSingle().catch(showSingleError);
});

datasetFiles.addEventListener('change', (event) => {
  processDatasetFiles(Array.from(event.target.files ?? [])).catch(showDatasetError);
});

datasetFolder.addEventListener('change', (event) => {
  processDatasetFiles(Array.from(event.target.files ?? [])).catch(showDatasetError);
});

exportDatasetBtn.addEventListener('click', () => {
  exportDataset().catch(showDatasetError);
});

datasetStatusFilter.addEventListener('change', () => {
  markDatasetViewPending('Filter geaendert. Klicke Ansicht aktualisieren.');
});

datasetSortBy.addEventListener('change', () => {
  markDatasetViewPending('Sortierung geaendert. Klicke Ansicht aktualisieren.');
});

datasetSortOrder.addEventListener('change', () => {
  markDatasetViewPending('Sortierung geaendert. Klicke Ansicht aktualisieren.');
});

datasetApplyViewBtn.addEventListener('click', () => {
  applyDatasetView();
});

async function processSingle() {
  const { imageData, fileName, manualRoi } = state.single;
  if (!imageData) return;
  state.single.result = processLesionImage(imageData, {
    id: fileName,
    roi: manualRoi,
    includeModelInput: false,
  });
  renderSingleImages();
  renderSingleReport();
  useAutoBtn.disabled = !state.single.result.metadata.roi.auto;
  clearManualBtn.disabled = !manualRoi;
  downloadSingleBtn.disabled = !state.single.result.croppedImage;
}

function renderSingleImages() {
  const { imageData, result, manualRoi, dragRect } = state.single;
  if (!imageData || !result) return;

  drawImageData(sourceCanvas, imageData);
  const ctx = sourceCanvas.getContext('2d');
  drawResultRois(ctx, sourceCanvas, result, manualRoi, dragRect);

  if (result.croppedImage) {
    drawImageData(cropCanvas, result.croppedImage);
  } else {
    clearCanvas(cropCanvas, 'Kein Crop');
  }
}

function drawResultRois(ctx, canvas, result, manualRoi, dragRect) {
  const auto = result.metadata.roi.auto;
  const crop = result.metadata.roi.crop;

  if (crop?.bbox) {
    drawBbox(ctx, canvas, crop.bbox, '#0f766e', [8, 5], 3);
  }
  if (auto?.bbox) {
    drawBbox(ctx, canvas, auto.bbox, '#b45309', [5, 4], 2);
  }
  if (manualRoi?.bbox) {
    drawBbox(ctx, canvas, manualRoi.bbox, '#0c1116', [], 3);
  }
  if (dragRect) {
    ctx.save();
    ctx.strokeStyle = '#0c1116';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
    ctx.restore();
  }
}

function renderSingleReport() {
  const result = state.single.result;
  if (!result) {
    singleReport.innerHTML = '';
    return;
  }
  const meta = result.metadata;
  singleReport.innerHTML = '';
  singleReport.appendChild(scoreHeader(meta));
  singleReport.appendChild(reasonList(meta.reasons));
  singleReport.appendChild(metricGrid(meta));

  const details = document.createElement('pre');
  details.textContent = JSON.stringify(serializeLesionResult(result), null, 2);
  singleReport.appendChild(details);
}

function scoreHeader(meta) {
  const row = document.createElement('div');
  row.className = 'score-row';

  const status = document.createElement('span');
  status.className = `pill ${meta.status}`;
  status.textContent = meta.statusLabel;

  const score = document.createElement('span');
  score.className = 'pill';
  score.textContent = `Score ${meta.score.toFixed(3)}`;

  const accepted = document.createElement('span');
  accepted.className = `pill ${meta.accepted ? 'ok' : 'reject'}`;
  accepted.textContent = meta.accepted ? 'besteht' : 'faellt durch';

  const roi = document.createElement('span');
  roi.className = 'pill';
  roi.textContent = `ROI ${meta.roiSource}`;

  row.append(status, score, accepted, roi);
  if (meta.hardRejectTexts?.length) {
    const hardReject = document.createElement('span');
    hardReject.className = 'pill reject';
    hardReject.textContent = `Hard-Reject: ${meta.hardRejectTexts.join('; ')}`;
    row.appendChild(hardReject);
  }
  return row;
}

function reasonList(reasons) {
  const list = document.createElement('ul');
  list.className = 'reason-list';
  for (const reason of reasons ?? []) {
    const item = document.createElement('li');
    item.textContent = reason;
    list.appendChild(item);
  }
  return list;
}

function metricGrid(meta) {
  const grid = document.createElement('div');
  grid.className = 'metrics';
  const values = [
    ['Crop', meta.metrics.cropScore],
    ['ROI', meta.metrics.roiScore],
    ['Technik', meta.metrics.technicalScore],
    ['Crop-Technik', meta.metrics.crop.cropTechnicalScore],
    ['Schaerfe', meta.metrics.crop.sharpnessScore],
    ['Rauschen', meta.metrics.crop.noiseScore],
    ['DeltaE', meta.metrics.crop.lesionContrastDeltaE],
    ['Sichtbarkeit', meta.metrics.crop.visibilityScore],
    ['Hard-Reject', meta.hardRejectTexts?.length ? meta.hardRejectTexts.join('; ') : 'nein'],
    ['Crop-Kante', `${meta.metrics.image.croppedWidth} x ${meta.metrics.image.croppedHeight}`],
  ];
  for (const [label, value] of values) {
    const box = document.createElement('div');
    box.className = 'metric';
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const small = document.createElement('span');
    small.textContent = label;
    box.append(strong, small);
    grid.appendChild(box);
  }
  return grid;
}

async function processDatasetFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
  revokeDatasetUrls();
  state.dataset = [];
  state.datasetView.status = datasetStatusFilter.value;
  state.datasetView.sortBy = datasetSortBy.value;
  state.datasetView.sortOrder = datasetSortOrder.value;
  state.datasetView.visibleLimit = DATASET_PAGE_SIZE;
  state.datasetView.order = [];
  state.datasetView.pending = false;
  datasetApplyViewBtn.classList.remove('attention');
  datasetGrid.innerHTML = '';
  datasetSummary.innerHTML = '';
  exportDatasetBtn.disabled = true;

  if (!imageFiles.length) {
    datasetProgress.textContent = 'Keine Bilddateien gefunden.';
    return;
  }

  let failed = 0;
  for (let i = 0; i < imageFiles.length; i += 1) {
    const file = imageFiles[i];
    const id = file.webkitRelativePath || file.name;
    datasetProgress.textContent = `${i + 1}/${imageFiles.length}: ${id}`;

    try {
      const imageData = await fileToImageData(file);
      const result = processLesionImage(imageData, { id, includeModelInput: false });
      const { blob: croppedBlob, fileName: croppedFileName } = await croppedBlobForFile(result, file, id);
      const record = {
        id,
        file,
        imageData: null,
        manualRoi: null,
        result: lightResult(result),
        originalUrl: null,
        croppedBlob,
        croppedUrl: null,
        croppedFileName,
        cropFile: null,
        editing: false,
        dragging: false,
        dragStart: null,
        dragRect: null,
      };

      state.dataset.push(record);
      if (i === 0 || (i + 1) % DATASET_RENDER_BATCH === 0 || i === imageFiles.length - 1) {
        renderDatasetGrid({ rebuild: true });
      }
      if (i === 0 || (i + 1) % DATASET_SUMMARY_BATCH === 0 || i === imageFiles.length - 1) {
        renderDatasetSummary();
      }
      if ((i + 1) % DATASET_YIELD_BATCH === 0) {
        await yieldToBrowser();
      }
    } catch (error) {
      failed += 1;
      console.error(`Datensatzbild konnte nicht verarbeitet werden: ${id}`, error);
      datasetProgress.textContent = `Fehler bei ${id}: ${memoryFriendlyErrorMessage(error)}`;
      await yieldToBrowser();
    }
  }

  renderDatasetGrid({ rebuild: true });
  renderDatasetSummary();
  datasetProgress.textContent = failed
    ? `${imageFiles.length - failed}/${imageFiles.length} Bilder verarbeitet, ${failed} Fehler.`
    : `${imageFiles.length} Bilder verarbeitet.`;
  exportDatasetBtn.disabled = state.dataset.length === 0;
}

function datasetCard(record, index) {
  const meta = record.result.metadata;
  const card = document.createElement('div');
  card.className = `dataset-item${record.editing ? ' editing' : ''}`;
  card.dataset.datasetIndex = String(index);

  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = record.id;

  const thumbs = document.createElement('div');
  thumbs.className = 'thumbs';
  const before = record.editing
    ? datasetEditCanvas(record, index)
    : document.createElement('img');
  before.alt = `${record.id} vorher`;
  if (!record.editing) before.src = ensureOriginalUrl(record);
  thumbs.appendChild(before);

  if (record.croppedUrl) {
    const after = document.createElement('img');
    after.alt = `${record.id} crop`;
    after.src = ensureCroppedUrl(record);
    thumbs.appendChild(after);
  } else if (record.croppedBlob) {
    const after = document.createElement('img');
    after.alt = `${record.id} crop`;
    after.src = ensureCroppedUrl(record);
    thumbs.appendChild(after);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty-thumb';
    empty.textContent = 'kein Crop';
    thumbs.appendChild(empty);
  }

  const score = scoreHeader(meta);
  const issues = document.createElement('p');
  issues.className = 'muted';
  issues.textContent = meta.issueTexts.length ? meta.issueTexts.join('; ') : 'Keine Auffaelligkeiten';

  const actions = document.createElement('div');
  actions.className = 'controls';
  actions.append(...datasetActionButtons(record, index));

  card.append(name, thumbs, score);
  if (record.editing) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.textContent = 'Im linken Bild ziehen, um die ROI fuer genau dieses Datensatzbild zu korrigieren.';
    card.appendChild(hint);
  }
  if (meta.hardRejectTexts?.length) {
    const hardRejects = document.createElement('p');
    hardRejects.className = 'muted';
    hardRejects.textContent = `Hard-Reject-Grund: ${meta.hardRejectTexts.join('; ')}`;
    card.appendChild(hardRejects);
  }
  card.append(actions, issues);
  return card;
}

function datasetEditCanvas(record, index) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dataset-edit-canvas';
  canvas.addEventListener('pointerdown', (event) => startDatasetDrag(event, canvas, index));
  canvas.addEventListener('pointermove', (event) => moveDatasetDrag(event, canvas, index));
  canvas.addEventListener('pointerup', (event) => {
    finishDatasetDrag(event, canvas, index).catch(showDatasetError);
  });
  canvas.addEventListener('pointercancel', () => cancelDatasetDrag(canvas, index));
  drawDatasetCanvas(canvas, record);
  return canvas;
}

function datasetActionButtons(record, index) {
  if (!record.editing) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = 'Direkt bearbeiten';
    edit.addEventListener('click', () => {
      startDatasetEdit(index).catch(showDatasetError);
    });
    return [edit];
  }

  const useAuto = document.createElement('button');
  useAuto.type = 'button';
  useAuto.className = 'secondary';
  useAuto.textContent = 'Auto-ROI fixieren';
  useAuto.disabled = !record.result.metadata.roi.auto;
  useAuto.addEventListener('click', () => {
    useDatasetAutoRoi(index).catch(showDatasetError);
  });

  const clearManual = document.createElement('button');
  clearManual.type = 'button';
  clearManual.className = 'secondary';
  clearManual.textContent = 'Manuelle ROI loeschen';
  clearManual.disabled = !record.manualRoi;
  clearManual.addEventListener('click', () => {
    clearDatasetManualRoi(index).catch(showDatasetError);
  });

  const done = document.createElement('button');
  done.type = 'button';
  done.textContent = 'Fertig';
  done.addEventListener('click', () => finishDatasetEdit(index));

  return [useAuto, clearManual, done];
}

function renderDatasetGrid(options = {}) {
  if (options.rebuild || !Array.isArray(state.datasetView.order)) {
    rebuildDatasetViewOrder();
  }
  datasetGrid.innerHTML = '';
  const allItems = appliedDatasetItems();
  const items = allItems.slice(0, state.datasetView.visibleLimit);
  if (!items.length && state.dataset.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Keine Bilder fuer diesen Filter.';
    datasetGrid.appendChild(empty);
    return;
  }
  items.forEach(({ record, index }) => {
    datasetGrid.appendChild(datasetCard(record, index));
  });
  if (items.length < allItems.length) {
    datasetGrid.appendChild(loadMoreDatasetButton(items.length, allItems.length));
  }
}

function loadMoreDatasetButton(rendered, total) {
  const row = document.createElement('div');
  row.className = 'dataset-more';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Weitere ${Math.min(DATASET_PAGE_SIZE, total - rendered)} anzeigen`;
  button.addEventListener('click', () => {
    state.datasetView.visibleLimit += DATASET_PAGE_SIZE;
    renderDatasetGrid();
    renderDatasetSummary();
  });
  const text = document.createElement('span');
  text.className = 'muted';
  text.textContent = `${rendered}/${total} Treffer gerendert.`;
  row.append(button, text);
  return row;
}

async function startDatasetEdit(index) {
  const record = state.dataset[index];
  if (!record) return;
  datasetProgress.textContent = `Lade Bild zur Bearbeitung: ${record.id}`;
  await ensureDatasetImageData(record);
  record.editing = true;
  record.dragging = false;
  record.dragStart = null;
  record.dragRect = null;
  datasetProgress.textContent = `Bearbeite direkt: ${record.id}`;
  replaceDatasetCard(index);
}

function finishDatasetEdit(index) {
  const record = state.dataset[index];
  if (!record) return;
  record.editing = false;
  record.dragging = false;
  record.dragStart = null;
  record.dragRect = null;
  record.imageData = null;
  datasetProgress.textContent = `Bearbeitung beendet: ${record.id}`;
  replaceDatasetCard(index);
}

async function useDatasetAutoRoi(index) {
  const record = state.dataset[index];
  const auto = record?.result?.metadata?.roi?.auto;
  if (!record || !auto) return;
  await ensureDatasetImageData(record);
  record.manualRoi = cloneRoi(auto);
  record.dragRect = null;
  await reprocessDatasetRecord(index);
}

async function clearDatasetManualRoi(index) {
  const record = state.dataset[index];
  if (!record) return;
  await ensureDatasetImageData(record);
  record.manualRoi = null;
  record.dragRect = null;
  await reprocessDatasetRecord(index);
}

function startDatasetDrag(event, canvas, index) {
  const record = state.dataset[index];
  if (!record) return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  record.dragging = true;
  record.dragStart = canvasPoint(event, canvas);
  record.dragRect = null;
  drawDatasetCanvas(canvas, record);
}

function moveDatasetDrag(event, canvas, index) {
  const record = state.dataset[index];
  if (!record?.dragging) return;
  event.preventDefault();
  const end = canvasPoint(event, canvas);
  record.dragRect = rectFromPoints(record.dragStart, end);
  drawDatasetCanvas(canvas, record);
}

async function finishDatasetDrag(event, canvas, index) {
  const record = state.dataset[index];
  if (!record?.dragging) return;
  event.preventDefault();
  canvas.releasePointerCapture(event.pointerId);
  record.dragging = false;
  if (!record.dragRect || record.dragRect.w < 4 || record.dragRect.h < 4) {
    record.dragRect = null;
    drawDatasetCanvas(canvas, record);
    return;
  }
  record.manualRoi = { type: 'bbox', bbox: rectToBbox(record.dragRect, canvas) };
  record.dragRect = null;
  await reprocessDatasetRecord(index);
}

function cancelDatasetDrag(canvas, index) {
  const record = state.dataset[index];
  if (!record) return;
  record.dragging = false;
  record.dragRect = null;
  drawDatasetCanvas(canvas, record);
}

function drawDatasetCanvas(canvas, record) {
  if (!record.imageData) {
    clearCanvas(canvas, 'Bild wird geladen');
    return;
  }
  drawImageData(canvas, record.imageData);
  const ctx = canvas.getContext('2d');
  drawResultRois(ctx, canvas, record.result, record.manualRoi, record.dragRect);
}

async function reprocessDatasetRecord(index) {
  const record = state.dataset[index];
  if (!record) return;
  await ensureDatasetImageData(record);

  const result = processLesionImage(record.imageData, {
    id: record.id,
    roi: record.manualRoi,
    includeModelInput: false,
  });
  if (record.croppedUrl) URL.revokeObjectURL(record.croppedUrl);
  const { blob, fileName } = await croppedBlobForFile(result, record.file, record.id);
  record.result = lightResult(result);
  record.croppedBlob = blob;
  record.croppedFileName = fileName;
  record.croppedUrl = null;
  record.cropFile = null;

  replaceDatasetCard(index);
  renderDatasetSummary();
  markDatasetViewPending(`Aktualisiert: ${record.id}. Die Karte bleibt hier; Ansicht aktualisieren sortiert neu.`);
}

function replaceDatasetCard(index) {
  const current = datasetGrid.querySelector(`[data-dataset-index="${index}"]`);
  const record = state.dataset[index];
  if (!current || !record) return;
  current.replaceWith(datasetCard(record, index));
}

async function ensureDatasetImageData(record) {
  if (record.imageData) return record.imageData;
  record.imageData = await fileToImageData(record.file);
  return record.imageData;
}

function lightResult(result) {
  return { metadata: result.metadata };
}

function ensureOriginalUrl(record) {
  if (!record.originalUrl) {
    record.originalUrl = URL.createObjectURL(record.file);
  }
  return record.originalUrl;
}

function ensureCroppedUrl(record) {
  if (!record.croppedUrl && record.croppedBlob) {
    record.croppedUrl = URL.createObjectURL(record.croppedBlob);
  }
  return record.croppedUrl;
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function applyDatasetView() {
  state.datasetView.status = datasetStatusFilter.value;
  state.datasetView.sortBy = datasetSortBy.value;
  state.datasetView.sortOrder = datasetSortOrder.value;
  state.datasetView.visibleLimit = DATASET_PAGE_SIZE;
  rebuildDatasetViewOrder();
  state.datasetView.pending = false;
  datasetApplyViewBtn.classList.remove('attention');
  renderDatasetGrid();
  renderDatasetSummary();
  datasetProgress.textContent = `${state.datasetView.order.length} Treffer in der Ansicht.`;
}

function markDatasetViewPending(message) {
  state.datasetView.pending = true;
  datasetApplyViewBtn.classList.add('attention');
  datasetProgress.textContent = message;
}

function rebuildDatasetViewOrder() {
  const items = state.dataset
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => matchesDatasetFilter(record))
    .sort(compareDatasetItems);
  state.datasetView.order = items.map((item) => item.index);
}

function appliedDatasetItems() {
  if (!Array.isArray(state.datasetView.order)) rebuildDatasetViewOrder();
  return state.datasetView.order
    .map((index) => ({ record: state.dataset[index], index }))
    .filter((item) => Boolean(item.record));
}

function matchesDatasetFilter(record) {
  const meta = record.result.metadata;
  switch (state.datasetView.status) {
    case 'accepted':
      return meta.accepted;
    case 'rejected':
      return !meta.accepted;
    case 'ok':
      return meta.status === 'ok';
    case 'warning':
      return meta.status === 'warning';
    default:
      return true;
  }
}

function filteredDatasetCount() {
  if (!Array.isArray(state.datasetView.order)) rebuildDatasetViewOrder();
  return state.datasetView.order.length;
}

function compareDatasetItems(a, b) {
  const direction = state.datasetView.sortOrder === 'asc' ? 1 : -1;
  if (state.datasetView.sortBy === 'sourceOrder') {
    return direction * (a.index - b.index);
  }

  const left = datasetSortValue(a.record, a.index);
  const right = datasetSortValue(b.record, b.index);
  if (left === null && right === null) return a.index - b.index;
  if (left === null) return 1;
  if (right === null) return -1;
  if (left === right) return a.index - b.index;
  return direction * (left - right);
}

function datasetSortValue(record, index) {
  const meta = record.result.metadata;
  const metrics = meta.metrics ?? {};
  const crop = metrics.crop ?? {};
  switch (state.datasetView.sortBy) {
    case 'score':
      return numericValue(meta.score);
    case 'cropScore':
      return numericValue(metrics.cropScore);
    case 'roiScore':
      return numericValue(metrics.roiScore);
    case 'cropTechnicalScore':
      return numericValue(crop.cropTechnicalScore);
    case 'sharpnessScore':
      return numericValue(crop.sharpnessScore);
    case 'noiseScore':
      return numericValue(crop.noiseScore);
    case 'lesionContrastDeltaE':
      return numericValue(crop.lesionContrastDeltaE);
    case 'visibilityScore':
      return numericValue(crop.visibilityScore);
    case 'cropMinEdgePx':
      return numericValue(crop.cropMinEdgePx);
    case 'lesionMinEdgePx':
      return numericValue(crop.lesionMinEdgePx);
    case 'sourceOrder':
      return index;
    default:
      return numericValue(meta.score);
  }
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function renderDatasetSummary() {
  const summary = summarizeLesionDataset(state.dataset.map((record) => record.result));
  datasetSummary.innerHTML = '';
  const filteredCount = filteredDatasetCount();
  const renderedCount = Math.min(filteredCount, state.datasetView.visibleLimit);
  const values = [
    ['Bilder', summary.count],
    ['Filtertreffer', filteredCount],
    ['Gerendert', `${renderedCount}/${filteredCount}`],
    ['Bestanden', summary.accepted],
    ['Abgelehnt', summary.rejected],
    ['Mittelwert', summary.score.mean],
    ['5-95 %', `${summary.score.p05} bis ${summary.score.p95}`],
    ['OK/Warnung/Reject', `${summary.statusCounts.ok}/${summary.statusCounts.warning}/${summary.statusCounts.reject}`],
  ];
  for (const [label, value] of values) {
    const box = document.createElement('div');
    box.className = 'metric';
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const small = document.createElement('span');
    small.textContent = label;
    box.append(strong, small);
    datasetSummary.appendChild(box);
  }
}

async function exportSingleResult() {
  const result = state.single.result;
  if (!result?.croppedImage) return;
  const base = safeBaseName(state.single.fileName ?? 'lesion');
  const metadata = serializeLesionResult(result);
  metadata.cropFile = `crops/${base}.png`;

  const cropBytes = await imageDataToPngBytes(result.croppedImage);
  const zip = createZip([
    { name: 'metadata.json', data: JSON.stringify(metadata, null, 2) },
    { name: metadata.cropFile, data: cropBytes },
  ]);
  downloadBlob(zip, `${base}_pipeline_output.zip`);
}

async function exportDataset() {
  if (!state.dataset.length) return;
  const acceptedRecords = state.dataset.filter((record) => record.result.metadata.accepted && record.croppedBlob);
  if (!acceptedRecords.length) {
    datasetProgress.textContent = 'Kein bestandenes Bild fuer ZIP-Export.';
    return;
  }

  const usedCropNames = new Set();
  const cropPaths = new Map();
  for (const record of acceptedRecords) {
    const fileName = record.croppedFileName || `${safeBaseName(record.id)}.png`;
    const cropPath = uniqueZipPath(`accepted_crops/${fileName}`, usedCropNames);
    record.cropFile = cropPath;
    cropPaths.set(record, cropPath);
  }

  const results = state.dataset.map((record) => {
    const item = serializeLesionResult(record.result);
    item.sourceFile = record.id;
    item.cropFile = cropPaths.get(record) ?? null;
    return item;
  });
  const summary = summarizeLesionDataset(state.dataset.map((record) => record.result));
  const files = [
    { name: 'metadata.json', data: JSON.stringify({ summary, items: results }, null, 2) },
    { name: 'summary.json', data: JSON.stringify(summary, null, 2) },
    { name: 'metadata.csv', data: metadataCsv(results) },
  ];

  for (const record of acceptedRecords) {
    files.push({
      name: cropPaths.get(record),
      data: new Uint8Array(await record.croppedBlob.arrayBuffer()),
    });
  }

  const zip = createZip(files);
  downloadBlob(zip, 'lesion_dataset_accepted_crops.zip');
  datasetProgress.textContent = `${acceptedRecords.length} bestandene Crops als ZIP exportiert.`;
}

async function fileToImageData(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close?.();
  }
}

function drawImageData(canvas, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);
}

function clearCanvas(canvas, text) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#eef2f4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5f6872';
  ctx.textAlign = 'center';
  ctx.font = '18px Arial';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawBbox(ctx, canvas, bbox, color, dash, lineWidth) {
  const rect = bboxToRect(bbox, canvas);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function bboxToRect(bbox, canvas) {
  return {
    x: bbox[0] * canvas.width,
    y: bbox[1] * canvas.height,
    w: bbox[2] * canvas.width,
    h: bbox[3] * canvas.height,
  };
}

function rectToBbox(rect, canvas) {
  return [
    clamp(rect.x / canvas.width, 0, 1),
    clamp(rect.y / canvas.height, 0, 1),
    clamp(rect.w / canvas.width, 0, 1),
    clamp(rect.h / canvas.height, 0, 1),
  ];
}

function canvasPoint(event, canvas) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - bounds.left) / bounds.width) * canvas.width, 0, canvas.width),
    y: clamp(((event.clientY - bounds.top) / bounds.height) * canvas.height, 0, canvas.height),
  };
}

function rectFromPoints(a, b) {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

async function croppedBlobForFile(result, file, id) {
  if (!result.croppedImage) return { blob: null, fileName: null };
  const format = cropOutputFormat(file, id);
  let blob = await imageDataToBlob(result.croppedImage, format.mime, format.quality);
  let fileName = safeFileName(id, format.extension);

  if (!blob || (format.mime !== 'image/png' && blob.type !== format.mime)) {
    blob = await imageDataToBlob(result.croppedImage, 'image/png');
    fileName = `${safeBaseName(id)}.png`;
  }

  return { blob, fileName };
}

function cropOutputFormat(file, id) {
  const extension = fileExtension(id);
  if (file?.type === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg') {
    return { mime: 'image/jpeg', extension: extension === 'jpeg' ? 'jpeg' : 'jpg', quality: 0.95 };
  }
  if (file?.type === 'image/webp' || extension === 'webp') {
    return { mime: 'image/webp', extension: 'webp', quality: 0.95 };
  }
  return { mime: 'image/png', extension: 'png' };
}

function imageDataToBlob(imageData, type = 'image/png', quality) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function imageDataToPngBlob(imageData) {
  return imageDataToBlob(imageData, 'image/png');
}

async function imageDataToPngBytes(imageData) {
  const blob = await imageDataToPngBlob(imageData);
  return new Uint8Array(await blob.arrayBuffer());
}

function metadataCsv(items) {
  const columns = [
    'sourceFile',
    'cropFile',
    'status',
    'score',
    'accepted',
    'roiSource',
    'roiConfidence',
    'technicalScore',
    'roiScore',
    'cropScore',
    'cropTechnicalScore',
    'sharpnessScore',
    'noiseScore',
    'lesionContrastDeltaE',
    'croppedWidth',
    'croppedHeight',
    'issues',
    'warnings',
    'hardRejects',
    'hardRejectTexts',
  ];
  const rows = [columns.join(',')];
  for (const item of items) {
    const row = [
      item.sourceFile,
      item.cropFile ?? '',
      item.status,
      item.score,
      item.accepted,
      item.roiSource,
      item.roi?.confidence ?? '',
      item.metrics?.technicalScore ?? '',
      item.metrics?.roiScore ?? '',
      item.metrics?.cropScore ?? '',
      item.metrics?.crop?.cropTechnicalScore ?? '',
      item.metrics?.crop?.sharpnessScore ?? '',
      item.metrics?.crop?.noiseScore ?? '',
      item.metrics?.crop?.lesionContrastDeltaE ?? '',
      item.image?.croppedWidth ?? '',
      item.image?.croppedHeight ?? '',
      (item.issues ?? []).join('|'),
      (item.warnings ?? []).join('|'),
      (item.hardRejects ?? []).join('|'),
      (item.hardRejectTexts ?? []).join('|'),
    ];
    rows.push(row.map(csvCell).join(','));
  }
  return `${rows.join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosTimeDate(new Date());

  for (const file of files) {
    const nameBytes = textBytes(file.name);
    const data = toBytes(file.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    central.push(centralHeader);

    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const centralOffset = offset;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return textBytes(String(data));
}

function textBytes(text) {
  return new TextEncoder().encode(text);
}

function dosTimeDate(value) {
  const year = Math.max(1980, value.getFullYear());
  const time = (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2);
  const date = ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();
  return { time, date };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showSingleError(error) {
  console.error(error);
  singleReport.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'muted';
  message.textContent = `Fehler: ${memoryFriendlyErrorMessage(error)}`;
  singleReport.appendChild(message);
}

function showDatasetError(error) {
  console.error(error);
  datasetProgress.textContent = `Fehler: ${memoryFriendlyErrorMessage(error)}`;
}

function memoryFriendlyErrorMessage(error) {
  const message = error?.message ?? String(error);
  if (message.includes('Array buffer allocation failed') || error instanceof RangeError) {
    return 'Browser-Speicher reicht fuer dieses Bild/den aktuellen Datensatz nicht. Die Rohpixel werden jetzt sparsamer gehalten; lade die Seite neu, falls der Tab schon vollgelaufen ist.';
  }
  return message;
}

function safeBaseName(path) {
  const name = path.split(/[\\/]/).pop() || 'image';
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'image';
}

function safeFileName(path, fallbackExtension) {
  const name = path.split(/[\\/]/).pop() || `image.${fallbackExtension}`;
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  if (/\.[a-zA-Z0-9]+$/.test(cleaned)) return cleaned || `image.${fallbackExtension}`;
  return `${cleaned || 'image'}.${fallbackExtension}`;
}

function fileExtension(path) {
  const name = path.split(/[\\/]/).pop() || '';
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
}

function uniqueZipPath(path, used) {
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const file = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = file.lastIndexOf('.');
  const stem = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot) : '';
  let candidate = path;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${dir}${stem}_${index}${ext}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function cloneRoi(roi) {
  if (!roi?.bbox) return null;
  return { type: roi.type || 'bbox', bbox: [...roi.bbox] };
}

function revokeDatasetUrls() {
  for (const record of state.dataset) {
    if (record.originalUrl) URL.revokeObjectURL(record.originalUrl);
    if (record.croppedUrl) URL.revokeObjectURL(record.croppedUrl);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
