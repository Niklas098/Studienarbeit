import os
import json
import argparse
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
from PIL import Image
import onnxruntime as ort
import tkinter as tk
from tkinter import filedialog


DEFAULT_CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
DEFAULT_MALIGNANT_LABELS = ["akiec", "bcc", "mel"]


# ============================================================
# Helpers
# ============================================================

def safe_div(numerator, denominator):
    return float(numerator) / float(denominator) if denominator else 0.0


def parse_comma_list(value, default_values):
    if value is None:
        return list(default_values)
    values = [v.strip() for v in value.split(",") if v.strip()]
    return values if values else list(default_values)


def build_image_path(images_dir, image_id):
    return os.path.join(images_dir, f"{image_id}.jpg")


def softmax_np(logits):
    logits = logits - np.max(logits, axis=-1, keepdims=True)
    exp_logits = np.exp(logits)
    return exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)


def convert_outputs_to_probabilities(raw_output):
    arr = np.asarray(raw_output)

    if arr.ndim != 2 or arr.shape[1] < 2:
        raise RuntimeError(
            f"Dieses Skript erwartet Multi-Class-Outputs mit Form [N, C], C>=2. "
            f"Erhalten: shape={arr.shape}"
        )

    row_sums = arr.sum(axis=1)
    looks_like_probs = (
        np.all(arr >= 0.0)
        and np.all(arr <= 1.0)
        and np.allclose(row_sums, 1.0, atol=1e-3)
    )

    if looks_like_probs:
        return arr.astype(np.float32)

    return softmax_np(arr.astype(np.float32))


def load_json_if_exists(path: Optional[str]):
    if not path:
        return None
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def infer_input_layout(input_shape):
    if len(input_shape) == 4:
        if input_shape[1] == 3:
            return "NCHW"
        if input_shape[-1] == 3:
            return "NHWC"
    return "NCHW"


def infer_square_size_from_shape(input_shape, layout):
    if len(input_shape) != 4:
        return None

    if layout == "NCHW":
        h, w = input_shape[2], input_shape[3]
    else:
        h, w = input_shape[1], input_shape[2]

    if isinstance(h, int) and isinstance(w, int) and h == w:
        return int(h)
    return None


def create_hidden_tk_root():
    root = tk.Tk()
    root.withdraw()
    root.update()
    return root


def pick_directory_dialog(title, initial_path=None, required=True):
    root = create_hidden_tk_root()
    initialdir = initial_path if initial_path and os.path.isdir(initial_path) else None

    path = filedialog.askdirectory(
        title=title,
        initialdir=initialdir
    )
    root.destroy()

    if required and not path:
        raise RuntimeError(f"Ordnerauswahl abgebrochen: {title}")
    return path or None


def pick_file_dialog(title, filetypes, initial_path=None, required=True):
    root = create_hidden_tk_root()

    initialdir = None
    if initial_path:
        if os.path.isdir(initial_path):
            initialdir = initial_path
        elif os.path.isfile(initial_path):
            initialdir = os.path.dirname(initial_path)

    path = filedialog.askopenfilename(
        title=title,
        filetypes=filetypes,
        initialdir=initialdir
    )
    root.destroy()

    if required and not path:
        raise RuntimeError(f"Dateiauswahl abgebrochen: {title}")
    return path or None


def find_single_file_by_extensions(folder: str, extensions: tuple[str, ...]) -> Optional[str]:
    matches = []
    for fname in os.listdir(folder):
        if fname.lower().endswith(extensions):
            matches.append(os.path.join(folder, fname))

    if not matches:
        return None

    matches.sort()
    if len(matches) > 1:
        print(f"[WARN] Mehrere Dateien mit Endung {extensions} gefunden. Verwende: {os.path.basename(matches[0])}")
    return matches[0]


def find_single_json_by_keywords(folder: str, keywords: list[str]) -> Optional[str]:
    matches = []
    for fname in os.listdir(folder):
        lower = fname.lower()
        if lower.endswith(".json") and all(k in lower for k in keywords):
            matches.append(os.path.join(folder, fname))

    if not matches:
        return None

    matches.sort(key=lambda p: (len(os.path.basename(p)), os.path.basename(p)))
    if len(matches) > 1:
        print(f"[WARN] Mehrere JSON-Dateien für {keywords} gefunden. Verwende: {os.path.basename(matches[0])}")
    return matches[0]


def resolve_input_paths(args):
    """
    Neues Verhalten:
    1) ONNX-Ordner auswählen oder per --model_dir übergeben
    2) darin automatisch ONNX + JSON-Dateien finden
    3) danach separat CSV und Bilderordner auswählen
    """
    model_dir = args.model_dir
    if not model_dir:
        model_dir = pick_directory_dialog("ONNX-Modellordner auswählen", required=True)

    if not os.path.isdir(model_dir):
        raise ValueError(f"Ungültiger Modellordner: {model_dir}")

    model_path = args.model_path or find_single_file_by_extensions(model_dir, (".onnx",))
    if not model_path:
        raise FileNotFoundError(f"Keine .onnx-Datei im Ordner gefunden: {model_dir}")

    preprocess_json = args.preprocess_json or find_single_json_by_keywords(model_dir, ["preprocess"])
    classes_json = args.classes_json or find_single_json_by_keywords(model_dir, ["class"])
    report_json = args.report_json or find_single_json_by_keywords(model_dir, ["report"])

    csv_path = args.csv_path
    if not csv_path:
        csv_path = pick_file_dialog(
            title="CSV-Datei auswählen",
            filetypes=[("CSV-Dateien", "*.csv"), ("Alle Dateien", "*.*")],
            initial_path=model_dir,
            required=True,
        )

    images_dir = args.images_dir
    if not images_dir:
        images_dir = pick_directory_dialog(
            title="Bilderordner auswählen",
            initial_path=os.path.dirname(csv_path) if csv_path else model_dir,
            required=True,
        )

    args.model_dir = model_dir
    args.model_path = model_path
    args.preprocess_json = preprocess_json
    args.classes_json = classes_json
    args.report_json = report_json
    args.csv_path = csv_path
    args.images_dir = images_dir
    return args


# ============================================================
# Metadata
# ============================================================

@dataclass
class ModelMetadata:
    input_size: int
    mean: list[float]
    std: list[float]
    class_names: list[str]
    input_layout: str = "NCHW"


def load_model_metadata(
    model_path: str,
    session: ort.InferenceSession,
    preprocess_json: Optional[str] = None,
    classes_json: Optional[str] = None,
    report_json: Optional[str] = None,
):
    input_meta = session.get_inputs()[0]
    input_shape = input_meta.shape
    input_layout = infer_input_layout(input_shape)

    preprocess_data = load_json_if_exists(preprocess_json)
    classes_data = load_json_if_exists(classes_json)
    report_data = load_json_if_exists(report_json)

    input_size = None
    mean = None
    std = None

    # 1) bevorzugt aus preprocess.json
    if preprocess_data:
        if "input_size" in preprocess_data and len(preprocess_data["input_size"]) == 3:
            input_size = int(preprocess_data["input_size"][-1])

        mean = preprocess_data.get("mean")
        std = preprocess_data.get("std")

    # 2) fallback report.json
    if report_data:
        preprocess_block = report_data.get("preprocess", {})

        if input_size is None:
            chw = preprocess_block.get("input_size_CHW")
            if chw and len(chw) == 3:
                input_size = int(chw[-1])

        if mean is None:
            mean = preprocess_block.get("mean_RGB")
        if std is None:
            std = preprocess_block.get("std_RGB")

        onnx_inputs = report_data.get("onnx", {}).get("inputs", [])
        if onnx_inputs:
            input_layout = onnx_inputs[0].get("layout_hint") or input_layout

    # 3) fallback ONNX-Shape
    if input_size is None:
        input_size = infer_square_size_from_shape(input_shape, input_layout)

    # 4) letzte Defaults
    if input_size is None:
        input_size = 224
    if mean is None:
        mean = [0.5, 0.5, 0.5]
    if std is None:
        std = [0.5, 0.5, 0.5]

    # Klassen
    if isinstance(classes_data, list) and classes_data:
        class_names = [str(x) for x in classes_data]
    elif isinstance(classes_data, dict) and "classes" in classes_data:
        class_names = [str(x) for x in classes_data["classes"]]
    else:
        class_names = list(DEFAULT_CLASS_NAMES)

    return ModelMetadata(
        input_size=int(input_size),
        mean=[float(x) for x in mean],
        std=[float(x) for x in std],
        class_names=class_names,
        input_layout=input_layout,
    )


# ============================================================
# Image preprocessing
# ============================================================

def resize_with_padding(img, size, pad_color=(0, 0, 0)):
    w, h = img.size
    scale = min(size / w, size / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    img = img.resize((new_w, new_h), Image.BILINEAR)

    canvas = Image.new("RGB", (size, size), pad_color)
    paste_x = (size - new_w) // 2
    paste_y = (size - new_h) // 2
    canvas.paste(img, (paste_x, paste_y))
    return canvas


def resize_and_center_crop(img, size):
    w, h = img.size
    scale = size / min(w, h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    img = img.resize((new_w, new_h), Image.BILINEAR)

    left = (new_w - size) // 2
    top = (new_h - size) // 2
    right = left + size
    bottom = top + size
    return img.crop((left, top, right, bottom))


def preprocess_image(path, meta: ModelMetadata, resize_mode="resize"):
    img = Image.open(path).convert("RGB")

    if resize_mode == "pad":
        img = resize_with_padding(img, meta.input_size)
    elif resize_mode == "center_crop":
        img = resize_and_center_crop(img, meta.input_size)
    elif resize_mode == "resize":
        img = img.resize((meta.input_size, meta.input_size), Image.BILINEAR)
    else:
        raise ValueError(f"Unbekannter resize_mode: {resize_mode}")

    x = np.asarray(img, dtype=np.float32) / 255.0

    mean = np.asarray(meta.mean, dtype=np.float32).reshape(1, 1, 3)
    std = np.asarray(meta.std, dtype=np.float32).reshape(1, 1, 3)
    x = (x - mean) / std

    return x.astype(np.float32)


# ============================================================
# Metrics
# ============================================================

def compute_multiclass_metrics(y_true, y_pred):
    labels = sorted(set(y_true) | set(y_pred))
    metrics = {}

    correct = sum(t == p for t, p in zip(y_true, y_pred))
    metrics["accuracy"] = safe_div(correct, len(y_true))

    recalls = []
    precisions = []
    f1s = []
    rows = []

    for label in labels:
        tp = sum((t == label) and (p == label) for t, p in zip(y_true, y_pred))
        fp = sum((t != label) and (p == label) for t, p in zip(y_true, y_pred))
        fn = sum((t == label) and (p != label) for t, p in zip(y_true, y_pred))
        support = sum(t == label for t in y_true)

        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, tp + fn)
        f1 = safe_div(2 * precision * recall, precision + recall)

        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

        rows.append(
            {
                "label": label,
                "support": int(support),
                "precision": precision,
                "recall": recall,
                "f1": f1,
            }
        )

    metrics["accuracy"] = safe_div(sum(t == p for t, p in zip(y_true, y_pred)), len(y_true))
    metrics["balanced_accuracy"] = float(np.mean(recalls)) if recalls else 0.0
    metrics["macro_precision"] = float(np.mean(precisions)) if precisions else 0.0
    metrics["macro_recall"] = float(np.mean(recalls)) if recalls else 0.0
    metrics["macro_f1"] = float(np.mean(f1s)) if f1s else 0.0

    return metrics, pd.DataFrame(rows)


def compute_malignant_metrics(y_true, y_pred, y_prob_malignant, malignant_labels):
    y_true_bin = np.array([1 if y in malignant_labels else 0 for y in y_true], dtype=int)
    y_pred_bin = np.array([1 if y in malignant_labels else 0 for y in y_pred], dtype=int)

    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    tn = int(np.sum((y_true_bin == 0) & (y_pred_bin == 0)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))

    sensitivity = safe_div(tp, tp + fn)
    specificity = safe_div(tn, tn + fp)
    precision = safe_div(tp, tp + fp)
    npv = safe_div(tn, tn + fn)
    f1 = safe_div(2 * precision * sensitivity, precision + sensitivity)
    accuracy = safe_div(tp + tn, tp + tn + fp + fn)

    auc = None
    if len(np.unique(y_true_bin)) == 2:
        order = np.argsort(y_prob_malignant)
        ranks = np.empty_like(order, dtype=float)
        ranks[order] = np.arange(1, len(y_prob_malignant) + 1, dtype=float)

        pos_ranks_sum = float(np.sum(ranks[y_true_bin == 1]))
        n_pos = int(np.sum(y_true_bin == 1))
        n_neg = int(np.sum(y_true_bin == 0))
        auc = safe_div(
            pos_ranks_sum - (n_pos * (n_pos + 1) / 2.0),
            n_pos * n_neg,
        )

    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": accuracy,
        "sensitivity_recall": sensitivity,
        "specificity": specificity,
        "precision_ppv": precision,
        "npv": npv,
        "f1": f1,
        "roc_auc": auc,
    }


def build_confusion_matrix_df(y_true, y_pred, class_names):
    cm = pd.DataFrame(0, index=class_names, columns=class_names, dtype=int)

    for t, p in zip(y_true, y_pred):
        if t in cm.index and p in cm.columns:
            cm.loc[t, p] += 1

    cm.index.name = "true_dx"
    cm.columns.name = "pred_dx"
    return cm


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()

    # Neuer zentraler Einstieg: nur Modellordner
    parser.add_argument("--model_dir", default=None, help="Ordner mit .onnx + JSON-Dateien")

    # Optional weiterhin direkt möglich
    parser.add_argument("--model_path", default=None)
    parser.add_argument("--csv_path", default=None)
    parser.add_argument("--images_dir", default=None)

    parser.add_argument("--preprocess_json", default=None)
    parser.add_argument("--classes_json", default=None)
    parser.add_argument("--report_json", default=None)

    parser.add_argument("--resize_mode", default="resize", choices=["pad", "center_crop", "resize"])
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--output_csv", default="predictions.csv")
    parser.add_argument("--metrics_csv", default="metrics_summary.csv")
    parser.add_argument("--confusion_csv", default="confusion_matrix.csv")
    parser.add_argument("--per_class_csv", default="per_class_metrics.csv")
    parser.add_argument(
        "--malignant_labels",
        type=str,
        default=",".join(DEFAULT_MALIGNANT_LABELS),
        help="Kommagetrennte Labels, die als maligne gelten.",
    )

    args = parser.parse_args()

    # Pfade auflösen:
    # 1) Modellordner
    # 2) daraus ONNX/JSONs
    # 3) separat CSV + Bilderordner
    args = resolve_input_paths(args)

    malignant_labels = set(parse_comma_list(args.malignant_labels, DEFAULT_MALIGNANT_LABELS))

    print("=== Erkannte Dateien ===")
    print(f"Modellordner:    {args.model_dir}")
    print(f"ONNX-Modell:     {args.model_path}")
    print(f"preprocess.json: {args.preprocess_json}")
    print(f"classes.json:    {args.classes_json}")
    print(f"report.json:     {args.report_json}")
    print(f"CSV:             {args.csv_path}")
    print(f"Bilderordner:    {args.images_dir}")
    print("")

    print("Lade ONNX-Modell...")
    session = ort.InferenceSession(args.model_path, providers=["CPUExecutionProvider"])

    input_meta = session.get_inputs()[0]
    input_name = input_meta.name

    meta = load_model_metadata(
        model_path=args.model_path,
        session=session,
        preprocess_json=args.preprocess_json,
        classes_json=args.classes_json,
        report_json=args.report_json,
    )

    print("Automatisch erkannte Metadaten:")
    print(f"  Inputgröße:   {meta.input_size}")
    print(f"  Layout:       {meta.input_layout}")
    print(f"  Mean:         {meta.mean}")
    print(f"  Std:          {meta.std}")
    print(f"  Klassen:      {meta.class_names}")
    print(f"  Resize-Modus: {args.resize_mode}")

    df = pd.read_csv(args.csv_path)

    if not {"image_id", "dx"}.issubset(df.columns):
        raise ValueError("CSV muss Spalten 'image_id' und 'dx' enthalten")

    df["image_path"] = df["image_id"].apply(lambda x: build_image_path(args.images_dir, x))
    exists = df["image_path"].apply(os.path.exists)
    df_ok = df[exists].reset_index(drop=True)

    if len(df_ok) == 0:
        raise RuntimeError("Keine Bilder gefunden.")

    missing_count = int((~exists).sum())
    if missing_count > 0:
        print(f"[WARN] {missing_count} Bilder aus der CSV wurden nicht gefunden und ignoriert.")

    print(f"{len(df_ok)} Bilder gefunden.")

    paths = df_ok["image_path"].tolist()
    all_probs = []

    print("Starte Prediction...")
    for i in range(0, len(paths), args.batch_size):
        batch_paths = paths[i:i + args.batch_size]
        images = [preprocess_image(p, meta, resize_mode=args.resize_mode) for p in batch_paths]

        x = np.stack(images).astype(np.float32)

        if meta.input_layout == "NCHW":
            x = np.transpose(x, (0, 3, 1, 2))

        outputs = session.run(None, {input_name: x})
        probs = convert_outputs_to_probabilities(outputs[0])
        all_probs.append(probs)

    preds = np.concatenate(all_probs, axis=0)
    class_names = meta.class_names

    out = df_ok.copy()

    if preds.ndim != 2 or preds.shape[1] <= 1:
        raise RuntimeError(
            "Dieses Evaluationsskript erwartet Multi-Class-Outputs mit mindestens 2 Klassen."
        )

    if preds.shape[1] != len(class_names):
        raise ValueError(
            f"Anzahl Klassen stimmt nicht: Modell liefert {preds.shape[1]}, "
            f"Metadaten enthalten {len(class_names)} Klassen."
        )

    out["pred_class_idx"] = preds.argmax(axis=1)
    out["pred_conf"] = preds.max(axis=1)
    out["pred_dx"] = out["pred_class_idx"].apply(lambda idx: class_names[int(idx)])

    for i in range(preds.shape[1]):
        out[f"p_{i}"] = preds[:, i]

    for i, label in enumerate(class_names):
        out[f"p_{label}"] = preds[:, i]

    out.to_csv(args.output_csv, index=False)

    print("Berechne Evaluation...")
    y_true = out["dx"].astype(str).tolist()
    y_pred = out["pred_dx"].astype(str).tolist()

    cm_df = build_confusion_matrix_df(y_true, y_pred, class_names)
    cm_df.to_csv(args.confusion_csv)

    multiclass_metrics, per_class_df = compute_multiclass_metrics(y_true, y_pred)
    per_class_df.to_csv(args.per_class_csv, index=False)

    malignant_indices = [i for i, c in enumerate(class_names) if c in malignant_labels]
    if not malignant_indices:
        raise ValueError("Keine malignen Labels in class_names gefunden.")

    y_prob_malignant = preds[:, malignant_indices].sum(axis=1)
    malignant_metrics = compute_malignant_metrics(
        y_true=y_true,
        y_pred=y_pred,
        y_prob_malignant=y_prob_malignant,
        malignant_labels=malignant_labels,
    )

    summary_rows = []
    for key, val in multiclass_metrics.items():
        summary_rows.append({"group": "multiclass", "metric": key, "value": val})
    for key, val in malignant_metrics.items():
        summary_rows.append({"group": "malignant_vs_benign", "metric": key, "value": val})

    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(args.metrics_csv, index=False)

    print("")
    print("=== Relevante Kennzahlen ===")
    print(f"Multiclass Accuracy:          {multiclass_metrics['accuracy']:.4f}")
    print(f"Multiclass Balanced Accuracy: {multiclass_metrics['balanced_accuracy']:.4f}")
    print(f"Macro F1:                     {multiclass_metrics['macro_f1']:.4f}")
    print("")
    print("Maligne vs. Benign:")
    print(f"Sensitivitaet (Recall):       {malignant_metrics['sensitivity_recall']:.4f}")
    print(f"Spezifitaet:                  {malignant_metrics['specificity']:.4f}")
    print(f"Precision (PPV):              {malignant_metrics['precision_ppv']:.4f}")
    print(f"NPV:                          {malignant_metrics['npv']:.4f}")
    print(f"F1:                           {malignant_metrics['f1']:.4f}")
    if malignant_metrics["roc_auc"] is not None:
        print(f"ROC-AUC:                      {malignant_metrics['roc_auc']:.4f}")
    else:
        print("ROC-AUC:                      nicht berechenbar (nur eine Klasse vorhanden)")
    print(
        f"TP/TN/FP/FN:                  "
        f"{malignant_metrics['tp']}/{malignant_metrics['tn']}/"
        f"{malignant_metrics['fp']}/{malignant_metrics['fn']}"
    )

    print("Fertig.")
    print("Output:", args.output_csv)
    print("Metrics:", args.metrics_csv)
    print("Confusion Matrix:", args.confusion_csv)
    print("Per-Class Metrics:", args.per_class_csv)


if __name__ == "__main__":
    main()