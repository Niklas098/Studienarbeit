import numpy as np
import pandas as pd
from utils_helpers import safe_div


def compute_multiclass_metrics(y_true, y_pred, class_names):
    """Berechne Multi-Klassen-Metriken (pro Klasse und aggregiert)"""
    labels = list(class_names)
    rows = []

    correct = sum(t == p for t, p in zip(y_true, y_pred))
    total = len(y_true)

    tp_micro = 0
    fp_micro = 0
    fn_micro = 0

    recalls = []
    precisions = []
    f1s = []

    for label in labels:
        tp = sum((t == label) and (p == label) for t, p in zip(y_true, y_pred))
        fp = sum((t != label) and (p == label) for t, p in zip(y_true, y_pred))
        fn = sum((t == label) and (p != label) for t, p in zip(y_true, y_pred))
        tn = sum((t != label) and (p != label) for t, p in zip(y_true, y_pred))
        support = sum(t == label for t in y_true)

        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, tp + fn)
        specificity = safe_div(tn, tn + fp)
        npv = safe_div(tn, tn + fn)
        f1 = safe_div(2 * precision * recall, precision + recall)

        tp_micro += tp
        fp_micro += fp
        fn_micro += fn

        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

        rows.append(
            {
                "label": label,
                "support": int(support),
                "tp": int(tp),
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "precision_ppv": precision,
                "recall_sensitivity": recall,
                "specificity": specificity,
                "npv": npv,
                "f1": f1,
            }
        )

    micro_precision = safe_div(tp_micro, tp_micro + fp_micro)
    micro_recall = safe_div(tp_micro, tp_micro + fn_micro)
    micro_f1 = safe_div(2 * micro_precision * micro_recall, micro_precision + micro_recall)

    metrics = {
        "accuracy": safe_div(correct, total),
        "balanced_accuracy": float(np.mean(recalls)) if recalls else 0.0,
        "macro_precision": float(np.mean(precisions)) if precisions else 0.0,
        "macro_recall": float(np.mean(recalls)) if recalls else 0.0,
        "macro_f1": float(np.mean(f1s)) if f1s else 0.0,
        "micro_precision": micro_precision,
        "micro_recall": micro_recall,
        "micro_f1": micro_f1,
    }

    return metrics, pd.DataFrame(rows)


def build_confusion_matrix_df(y_true, y_pred, class_names):
    """Erstelle Confusion-Matrix als DataFrame"""
    cm = pd.DataFrame(0, index=class_names, columns=class_names, dtype=int)

    for t, p in zip(y_true, y_pred):
        if t in cm.index and p in cm.columns:
            cm.loc[t, p] += 1

    cm.index.name = "true_dx"
    cm.columns.name = "pred_dx"
    return cm