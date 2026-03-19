#Beispielaufruf: python evaluate_onnx.py  --model_path "/home/fabio/AIApplication/Studienarbeit/ISIC_NEW/EfficientNet Light/Lite3/efficientnet_lite3.onnx"   --csv_path /home/fabio/AIApplication/test.csv   --images_dir /home/fabio/AIApplication/test   --model_type efficientnet   --output_csv predictions.csv   --metrics_csv metrics_summary.csv   --confusion_csv confusion_matrix.csv   --per_class_csv per_class_metrics.csv --resize_mode resize
#danach plot_evaluation.py laufen lassen für auswertung
import os
import argparse
import numpy as np
import pandas as pd
from PIL import Image
import onnxruntime as ort


DEFAULT_CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
DEFAULT_MALIGNANT_LABELS = ["akiec", "bcc", "mel"]


def build_image_path(images_dir, image_id):
    return os.path.join(images_dir, f"{image_id}.jpg")


def safe_div(numerator, denominator):
    return float(numerator) / float(denominator) if denominator else 0.0


def parse_comma_list(value, default_values):
    if value is None:
        return list(default_values)
    values = [v.strip() for v in value.split(",") if v.strip()]
    if not values:
        return list(default_values)
    return values


def get_preprocess_mode(model_type, override=None):
    if override is not None:
        return override

    if model_type == "efficientnet":
        return "0_1"
    if model_type == "mobilenet":
        return "minus1_1"
    if model_type == "custom":
        raise ValueError(
            "Für --model_type custom musst du zusätzlich --preprocess_mode angeben."
        )

    raise ValueError(f"Unbekannter model_type: {model_type}")


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


def preprocess_image(path, img_size, preprocess_mode="0_1", resize_mode="pad"):
    img = Image.open(path).convert("RGB")

    if resize_mode == "pad":
        img = resize_with_padding(img, img_size)
    elif resize_mode == "center_crop":
        img = resize_and_center_crop(img, img_size)
    elif resize_mode == "resize":
        img = img.resize((img_size, img_size), Image.BILINEAR)
    else:
        raise ValueError(f"Unbekannter resize_mode: {resize_mode}")

    x = np.asarray(img, dtype=np.float32)

    if preprocess_mode == "none":
        pass
    elif preprocess_mode == "0_1":
        x = x / 255.0
    elif preprocess_mode == "minus1_1":
        x = (x / 127.5) - 1.0
    else:
        raise ValueError(f"Unbekannter preprocess_mode: {preprocess_mode}")

    return x.astype(np.float32)


def infer_input_layout(input_shape):
    if len(input_shape) == 4:
        if input_shape[1] == 3:
            return "NCHW"
        if input_shape[-1] == 3:
            return "NHWC"
    return "NCHW"


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", required=True)
    parser.add_argument("--csv_path", required=True)
    parser.add_argument("--images_dir", required=True)
    parser.add_argument("--model_type", required=True, choices=["efficientnet", "mobilenet", "custom"])
    parser.add_argument("--preprocess_mode", default=None, choices=["none", "0_1", "minus1_1"])
    parser.add_argument("--resize_mode", default="pad", choices=["pad", "center_crop", "resize"])
    parser.add_argument("--img_size", type=int, default=300)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--output_csv", default="predictions.csv")
    parser.add_argument("--metrics_csv", default="metrics_summary.csv")
    parser.add_argument("--confusion_csv", default="confusion_matrix.csv")
    parser.add_argument("--per_class_csv", default="per_class_metrics.csv")
    parser.add_argument(
        "--class_names",
        type=str,
        default=",".join(DEFAULT_CLASS_NAMES),
        help="Kommagetrennte Klassenreihenfolge des Modellausgangs",
    )
    parser.add_argument(
        "--malignant_labels",
        type=str,
        default=",".join(DEFAULT_MALIGNANT_LABELS),
        help="Kommagetrennte Labels, die als maligne gelten.",
    )

    args = parser.parse_args()

    class_names = parse_comma_list(args.class_names, DEFAULT_CLASS_NAMES)
    malignant_labels = set(parse_comma_list(args.malignant_labels, DEFAULT_MALIGNANT_LABELS))
    preprocess_mode = get_preprocess_mode(args.model_type, args.preprocess_mode)

    print("Lade ONNX-Modell...")
    session = ort.InferenceSession(args.model_path, providers=["CPUExecutionProvider"])

    input_meta = session.get_inputs()[0]
    input_name = input_meta.name
    input_shape = input_meta.shape
    input_layout = infer_input_layout(input_shape)

    print("Input-Shape:", input_shape)
    print("Input-Layout:", input_layout)
    print("Model-Type:", args.model_type)
    print("Preprocessing:", preprocess_mode)
    print("Resize-Modus:", args.resize_mode)

    df = pd.read_csv(args.csv_path)

    if not {"image_id", "dx"}.issubset(df.columns):
        raise ValueError("CSV muss Spalten 'image_id' und 'dx' enthalten")

    df["image_path"] = df["image_id"].apply(lambda x: build_image_path(args.images_dir, x))

    exists = df["image_path"].apply(os.path.exists)
    df_ok = df[exists].reset_index(drop=True)

    if len(df_ok) == 0:
        raise RuntimeError("Keine Bilder gefunden.")

    print(f"{len(df_ok)} Bilder gefunden.")

    paths = df_ok["image_path"].tolist()
    all_probs = []

    print("Starte Prediction...")
    for i in range(0, len(paths), args.batch_size):
        batch_paths = paths[i : i + args.batch_size]

        images = [
            preprocess_image(
                path=p,
                img_size=args.img_size,
                preprocess_mode=preprocess_mode,
                resize_mode=args.resize_mode,
            )
            for p in batch_paths
        ]

        x = np.stack(images).astype(np.float32)

        if input_layout == "NCHW":
            x = np.transpose(x, (0, 3, 1, 2))

        outputs = session.run(None, {input_name: x})
        probs = convert_outputs_to_probabilities(outputs[0])
        all_probs.append(probs)

    preds = np.concatenate(all_probs, axis=0)

    out = df_ok.copy()

    if preds.ndim == 2 and preds.shape[1] > 1:
        if preds.shape[1] != len(class_names):
            raise ValueError(
                f"Anzahl Klassen stimmt nicht: Modell liefert {preds.shape[1]}, "
                f"--class_names hat {len(class_names)} Einträge."
            )

        out["pred_class_idx"] = preds.argmax(axis=1)
        out["pred_conf"] = preds.max(axis=1)
        out["pred_dx"] = out["pred_class_idx"].apply(lambda i: class_names[int(i)])

        for i in range(preds.shape[1]):
            out[f"p_{i}"] = preds[:, i]

        for i, label in enumerate(class_names):
            out[f"p_{label}"] = preds[:, i]
    else:
        out["pred"] = preds.reshape(-1)
        raise RuntimeError(
            "Dieses Evaluationsskript erwartet Multi-Class-Outputs mit mindestens 2 Klassen "
            "(Form: [N, C])."
        )

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
        raise ValueError("Keine malignen Labels in --class_names gefunden.")

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