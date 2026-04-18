import os
import numpy as np
import pandas as pd
import onnxruntime as ort
from utils_helpers import build_image_path
from utils_numpy import convert_outputs_to_probabilities
from image_preprocessing import preprocess_image
from model_metadata import load_model_metadata


def run_inference_for_model(
    model_path,
    preprocess_json,
    classes_json,
    report_json,
    csv_path,
    images_dir,
    resize_mode,
    batch_size,
):
    """Führe Inference für einzelnes Modell durch"""
    print(f"Lade ONNX-Modell: {model_path}")
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    input_meta = session.get_inputs()[0]
    input_name = input_meta.name

    meta = load_model_metadata(
        model_path=model_path,
        session=session,
        preprocess_json=preprocess_json,
        classes_json=classes_json,
        report_json=report_json,
    )

    print("Automatisch erkannte Metadaten:")
    print(f"  Inputgröße:   {meta.input_size}")
    print(f"  Layout:       {meta.input_layout}")
    print(f"  Mean:         {meta.mean}")
    print(f"  Std:          {meta.std}")
    print(f"  Klassen:      {meta.class_names}")
    print(f"  Resize-Modus: {resize_mode}")

    df = pd.read_csv(csv_path)

    if not {"image_id", "dx"}.issubset(df.columns):
        raise ValueError("CSV muss Spalten 'image_id' und 'dx' enthalten")

    df["image_path"] = df["image_id"].apply(lambda x: build_image_path(images_dir, x))
    exists = df["image_path"].apply(os.path.exists)
    df_ok = df[exists].reset_index(drop=True)

    if len(df_ok) == 0:
        raise RuntimeError("Keine Bilder gefunden.")

    missing_count = int((~exists).sum())
    if missing_count > 0:
        print(f"[WARN] {missing_count} Bilder aus der CSV wurden nicht gefunden und ignoriert.")

    print(f"{len(df_ok)} Bilder gefunden.")
    print("Starte Prediction...")

    paths = df_ok["image_path"].tolist()
    all_probs = []

    for i in range(0, len(paths), batch_size):
        batch_paths = paths[i:i + batch_size]
        images = [preprocess_image(p, meta, resize_mode=resize_mode) for p in batch_paths]

        x = np.stack(images).astype(np.float32)

        if meta.input_layout == "NCHW":
            x = np.transpose(x, (0, 3, 1, 2))

        outputs = session.run(None, {input_name: x})
        probs = convert_outputs_to_probabilities(outputs[0])
        all_probs.append(probs)

    preds = np.concatenate(all_probs, axis=0)
    class_names = meta.class_names

    if preds.ndim != 2 or preds.shape[1] <= 1:
        raise RuntimeError(
            "Dieses Evaluationsskript erwartet Multi-Class-Outputs mit mindestens 2 Klassen."
        )

    if preds.shape[1] != len(class_names):
        raise ValueError(
            f"Anzahl Klassen stimmt nicht: Modell liefert {preds.shape[1]}, "
            f"Metadaten enthalten {len(class_names)} Klassen."
        )

    out = df_ok.copy()
    out["pred_class_idx"] = preds.argmax(axis=1)
    out["pred_conf"] = preds.max(axis=1)
    out["pred_dx"] = out["pred_class_idx"].apply(lambda idx: class_names[int(idx)])

    for i in range(preds.shape[1]):
        out[f"p_{i}"] = preds[:, i]

    for i, label in enumerate(class_names):
        out[f"p_{label}"] = preds[:, i]

    return out, preds, class_names, meta