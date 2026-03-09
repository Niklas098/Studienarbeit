import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const REPORT_CANDIDATES = [
  "efficientnet_lite1_report.json",
  "model_report.json",
  "model-report.json"
];

const MODEL_CONFIG_PATH = path.resolve("public/model-config.json");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadJsonIfExists(filePath) {
  if (!(await exists(filePath))) return null;
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function inferInputSize(report, fallback) {
  const chw = report?.preprocess?.input_size_CHW;
  if (Array.isArray(chw) && typeof chw[1] === "number" && typeof chw[2] === "number") {
    return Number(chw[1]);
  }

  const input0 = report?.onnx?.inputs?.[0] ?? report?.onnxruntime?.inputs?.[0];
  const shape = input0?.shape;
  if (Array.isArray(shape)) {
    const numeric = shape.filter((value) => typeof value === "number");
    if (numeric.length >= 2) return Number(numeric[numeric.length - 1]);
  }

  return fallback;
}

function inferLayout(report, fallback) {
  const hint = report?.onnx?.inputs?.[0]?.layout_hint;
  if (typeof hint === "string" && /^(NCHW|NHWC)$/i.test(hint)) {
    return hint.toUpperCase();
  }
  return fallback;
}

function inferColorOrder(report, fallback) {
  const value = report?.preprocess?.color_order;
  if (typeof value === "string") {
    if (value.toUpperCase().includes("RGB")) return "RGB";
    if (value.toUpperCase().includes("BGR")) return "BGR";
  }
  return fallback;
}

function inferScale(report, fallback) {
  const value = report?.preprocess?.scale;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    if (value.includes("255")) return 255;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function inferLabels(report, fallback) {
  const list = report?.classes?.classes;
  if (Array.isArray(list) && list.length > 0) return list.map(String);

  const indexToClass = report?.classes?.index_to_class;
  if (indexToClass && typeof indexToClass === "object") {
    const sorted = Object.entries(indexToClass)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, label]) => String(label));
    if (sorted.length > 0) return sorted;
  }

  return fallback;
}

function inferPositiveLabels(labels, fallback) {
  if (Array.isArray(fallback) && fallback.length > 0) return fallback;
  const inferred = labels.filter((label) => /(mel|bcc|akiec|malig|cancer|melanoma)/i.test(label));
  return inferred.length > 0 ? inferred : [];
}

function inferModelPath(report, fallback) {
  const reportPath = report?.onnx?.path;
  if (typeof reportPath === "string" && reportPath.trim().length > 0) {
    const fileName = path.basename(reportPath);
    if (fileName.toLowerCase().endsWith(".onnx")) {
      return `/models/${fileName}`;
    }
  }
  return fallback;
}

function buildConfig(report, existingConfig) {
  const base = existingConfig ?? {};

  const labels = inferLabels(report, base.labels ?? ["benign", "malignant"]);
  const mean = report?.preprocess?.mean_RGB ?? base?.normalization?.mean ?? [0.5, 0.5, 0.5];
  const std = report?.preprocess?.std_RGB ?? base?.normalization?.std ?? [0.5, 0.5, 0.5];

  return {
    modelPath: inferModelPath(report, base.modelPath ?? "/models/efficientnet_lite1.onnx"),
    inputSize: inferInputSize(report, base.inputSize ?? 224),
    inputLayout: inferLayout(report, base.inputLayout ?? "NCHW"),
    colorOrder: inferColorOrder(report, base.colorOrder ?? "RGB"),
    inputName:
      report?.onnx?.inputs?.[0]?.name ??
      report?.onnxruntime?.inputs?.[0]?.name ??
      base.inputName ??
      "input",
    outputName:
      report?.onnx?.outputs?.[0]?.name ??
      report?.onnxruntime?.outputs?.[0]?.name ??
      base.outputName ??
      "output",
    labels,
    positiveLabels: inferPositiveLabels(labels, base.positiveLabels),
    normalization: {
      scale: inferScale(report, base?.normalization?.scale ?? 255),
      mean,
      std
    },
    threshold: base.threshold ?? 0.5
  };
}

async function main() {
  let selectedReportPath = null;
  for (const candidate of REPORT_CANDIDATES) {
    const fullPath = path.resolve(candidate);
    if (await exists(fullPath)) {
      selectedReportPath = fullPath;
      break;
    }
  }

  if (!selectedReportPath) {
    console.log("No report JSON found. Skipping model-config sync.");
    return;
  }

  const [report, existingConfig] = await Promise.all([
    loadJsonIfExists(selectedReportPath),
    loadJsonIfExists(MODEL_CONFIG_PATH)
  ]);
  if (!report) {
    console.log("Report file exists but could not be parsed. Skipping model-config sync.");
    return;
  }

  const nextConfig = buildConfig(report, existingConfig);
  await writeFile(MODEL_CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  console.log(`Synced public/model-config.json from ${path.basename(selectedReportPath)}`);
}

main().catch((error) => {
  console.warn("Failed to sync model-config from report:", error.message);
});
