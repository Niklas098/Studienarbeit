import * as ort from "onnxruntime-web";
import "./styles.css";
import { registerServiceWorker } from "./pwa.js";
import ortWasmJsepMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasmJsepWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url";

const DEFAULT_CONFIG = {
  modelPath: "/models/efficientnet_lite1.onnx",
  inputSize: 240,
  inputLayout: "NCHW",
  colorOrder: "RGB",
  inputName: "input",
  outputName: "logits",
  labels: ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"],
  positiveLabels: ["akiec", "bcc", "mel"],
  normalization: {
    scale: 255,
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5]
  },
  threshold: 0.5
};

const state = {
  config: DEFAULT_CONFIG,
  session: null,
  previewObjectUrl: null
};

const imageInput = document.querySelector("#imageInput");
const preview = document.querySelector("#preview");
const statusEl = document.querySelector("#status");
const predictionsEl = document.querySelector("#predictions");
const riskEl = document.querySelector("#risk");
const onlineStateEl = document.querySelector("#onlineState");

ort.env.wasm.proxy = false;
ort.env.wasm.simd = true;
ort.env.wasm.wasmPaths = {
  mjs: ortWasmJsepMjsUrl,
  wasm: ortWasmJsepWasmUrl
};

bootstrap();

async function bootstrap() {
  await registerServiceWorker();
  syncOnlineState();
  window.addEventListener("online", syncOnlineState);
  window.addEventListener("offline", syncOnlineState);
  initialize().catch((error) => {
    setStatus(`Initialization failed: ${error.message}`);
  });
}

imageInput.addEventListener("change", async (event) => {
  const [file] = event.target.files ?? [];
  if (!file) return;
  if (!state.session) {
    setStatus("Model is not ready yet.");
    return;
  }

  try {
    setStatus("Loading image...");
    const imageEl = await loadPreviewImage(file);

    setStatus("Running ONNX inference...");
    const output = await runInference(imageEl);
    renderOutput(output);
    setStatus("Prediction complete.");
  } catch (error) {
    setStatus(`Prediction failed: ${error.message}`);
  }
});

window.addEventListener("beforeunload", () => {
  if (state.previewObjectUrl) {
    URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = null;
  }
});

async function initialize() {
  setStatus("Loading model config...");
  state.config = await loadConfig();
  await verifyRuntimeAssets();
  setStatus(`Loading model: ${state.config.modelPath}`);
  state.session = await ort.InferenceSession.create(state.config.modelPath, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all"
  });
  setStatus("Model loaded. Select an image.");
}

async function verifyRuntimeAssets() {
  const response = await fetch(ortWasmJsepWasmUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`WASM asset request failed (${response.status}) at ${ortWasmJsepWasmUrl}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x00 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d
  ) {
    throw new Error(
      `WASM asset is invalid (not binary wasm) at ${ortWasmJsepWasmUrl}. Clear site data/service workers and reload.`
    );
  }
}

async function loadConfig() {
  try {
    const response = await fetch("/model-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const userConfig = await response.json();
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    normalization: {
      ...base.normalization,
      ...(override?.normalization ?? {})
    }
  };
}

function setStatus(text) {
  statusEl.textContent = text;
}

function syncOnlineState() {
  if (navigator.onLine) {
    onlineStateEl.textContent = "Network: online";
    onlineStateEl.className = "badge online";
  } else {
    onlineStateEl.textContent = "Network: offline";
    onlineStateEl.className = "badge offline";
  }
}

async function loadPreviewImage(file) {
  const nextUrl = URL.createObjectURL(file);
  const previousUrl = state.previewObjectUrl;
  state.previewObjectUrl = nextUrl;
  preview.src = nextUrl;

  try {
    await waitForImageDecode(preview);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    return preview;
  } catch {
    URL.revokeObjectURL(nextUrl);
    state.previewObjectUrl = previousUrl ?? null;
    if (previousUrl) preview.src = previousUrl;
    throw new Error("Could not decode selected image.");
  }
}

function waitForImageDecode(imageEl) {
  if (imageEl.complete && imageEl.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      imageEl.removeEventListener("load", onLoad);
      imageEl.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Image load failed"));
    };

    imageEl.addEventListener("load", onLoad, { once: true });
    imageEl.addEventListener("error", onError, { once: true });
  });
}

async function runInference(image) {
  const { inputSize, normalization, inputName, outputName, inputLayout, colorOrder } = state.config;
  const { data, dims } = preprocessImage(image, inputSize, normalization, inputLayout, colorOrder);
  const inputTensor = new ort.Tensor("float32", data, dims);

  const outputs = await state.session.run({ [inputName]: inputTensor });
  const outputTensor = outputs[outputName] ?? outputs[Object.keys(outputs)[0]];
  if (!outputTensor) throw new Error("Model returned no output tensor.");

  return tensorToProbabilities(outputTensor, state.config.labels);
}

function preprocessImage(image, inputSize, normalization, inputLayout = "NCHW", colorOrder = "RGB") {
  const canvas = document.createElement("canvas");
  canvas.width = inputSize;
  canvas.height = inputSize;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, inputSize, inputSize);
  const { data } = ctx.getImageData(0, 0, inputSize, inputSize);

  const mean = normalizeTriplet(normalization.mean, [0.5, 0.5, 0.5]);
  const std = normalizeTriplet(normalization.std, [0.5, 0.5, 0.5]);
  const scale = Number(normalization.scale) > 0 ? Number(normalization.scale) : 255;
  const pixelCount = inputSize * inputSize;

  const layout = String(inputLayout ?? "NCHW").toUpperCase();
  const order = String(colorOrder ?? "RGB").toUpperCase();
  const tensor = new Float32Array(3 * pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    const r = data[offset] / scale;
    const g = data[offset + 1] / scale;
    const b = data[offset + 2] / scale;

    const channels = order === "BGR" ? [b, g, r] : [r, g, b];
    const c0 = (channels[0] - mean[0]) / std[0];
    const c1 = (channels[1] - mean[1]) / std[1];
    const c2 = (channels[2] - mean[2]) / std[2];

    if (layout === "NHWC") {
      const base = i * 3;
      tensor[base] = c0;
      tensor[base + 1] = c1;
      tensor[base + 2] = c2;
    } else {
      tensor[i] = c0;
      tensor[i + pixelCount] = c1;
      tensor[i + 2 * pixelCount] = c2;
    }
  }

  const dims = layout === "NHWC" ? [1, inputSize, inputSize, 3] : [1, 3, inputSize, inputSize];
  return { data: tensor, dims };
}

function normalizeTriplet(value, fallback) {
  if (!Array.isArray(value) || value.length < 3) return fallback;
  const out = value.slice(0, 3).map((item, index) => {
    return typeof item === "number" && Number.isFinite(item) ? item : fallback[index];
  });
  return out;
}

function tensorToProbabilities(outputTensor, labels) {
  const values = Array.from(outputTensor.data);
  if (values.length === 1) {
    const positive = sigmoid(values[0]);
    return normalizeResults([1 - positive, positive], labels);
  }

  const probs = softmax(values);
  return normalizeResults(probs, labels);
}

function normalizeResults(probabilities, labels) {
  return probabilities.map((probability, index) => {
    return {
      label: labels[index] ?? `class_${index}`,
      probability
    };
  });
}

function softmax(values) {
  const maxValue = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - maxValue));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map((value) => value / sum);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function renderOutput(results) {
  const sorted = [...results].sort((a, b) => b.probability - a.probability);
  predictionsEl.innerHTML = "";

  sorted.slice(0, 5).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.label}: ${(item.probability * 100).toFixed(2)}%`;
    predictionsEl.appendChild(li);
  });

  const malignantProbability = getPositiveProbability(results, state.config);
  if (malignantProbability === null) {
    riskEl.textContent = "Risk flag unavailable: configure malignant/positive class label in model-config.json.";
    riskEl.className = "risk";
    return;
  }

  const threshold = state.config.threshold ?? 0.5;
  if (malignantProbability >= threshold) {
    riskEl.textContent = `Model flag: higher risk (${(malignantProbability * 100).toFixed(2)}%).`;
    riskEl.className = "risk high";
  } else {
    riskEl.textContent = `Model flag: lower risk (${(malignantProbability * 100).toFixed(2)}%).`;
    riskEl.className = "risk low";
  }
}

function getPositiveProbability(results, config) {
  const configuredLabels = (config.positiveLabels ?? []).map((label) => String(label).toLowerCase());
  if (configuredLabels.length > 0) {
    const positiveSet = new Set(configuredLabels);
    const matches = results.filter((result) => positiveSet.has(result.label.toLowerCase()));
    if (matches.length === 0) return null;
    return matches.reduce((sum, result) => sum + result.probability, 0);
  }

  const fallbackMatches = results.filter((result) => {
    return /(malignan|cancer|positive|melanoma|^mel$|^bcc$|^akiec$)/i.test(result.label);
  });
  if (fallbackMatches.length === 0) return null;
  return fallbackMatches.reduce((sum, result) => sum + result.probability, 0);
}
