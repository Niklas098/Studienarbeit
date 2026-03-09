# Skin Cancer Screening PWA (Offline)

Offline-first progressive web app for on-device ONNX inference with an EfficientNet-Lite1 model.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Place your model file:

`public/models/efficientnet_lite1.onnx`

3. Update model metadata if needed:

`public/model-config.json`

If `efficientnet_lite1_report.json` exists in project root, `public/model-config.json` is auto-generated from it on:
- `npm run dev`
- `npm run build`

4. Run development server:

```bash
npm run dev
```

5. Build production bundle:

```bash
npm run build
npm run preview
```

## Offline Behavior

- Service worker caches app shell, model, and runtime assets.
- ONNX Runtime wasm files are copied to `public/ort` during `npm install`.
- After first successful load, the app runs without internet.

## Required Model Metadata

You must confirm these values for correct predictions:

- `inputSize` (current default: 240)
- `inputName` and `outputName` from your ONNX graph
- class order in `labels` (current default: `["akiec","bcc","bkl","df","mel","nv","vasc"]`)
- `positiveLabels` for risk aggregation (current default: `["akiec","bcc","mel"]`)
- preprocessing (`mean`, `std`, `scale`)
- threshold for high/low risk flag

## Medical Safety

This app is only a technical screening aid and not a diagnostic medical device.
