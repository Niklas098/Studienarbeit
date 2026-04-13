import numpy as np
import pandas as pd
from utils_helpers import safe_div
from utils_numpy import rankdata_average_ties, percentile_ci


def binary_confusion_from_labels(y_true_bin, y_pred_bin):
    """Berechne TP/TN/FP/FN aus binären Labels"""
    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    tn = int(np.sum((y_true_bin == 0) & (y_pred_bin == 0)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))
    return tp, tn, fp, fn


def binary_metrics_from_confusion(tp, tn, fp, fn):
    """Berechne Metriken aus Confusion-Matrix"""
    sensitivity = safe_div(tp, tp + fn)
    specificity = safe_div(tn, tn + fp)
    precision = safe_div(tp, tp + fp)
    npv = safe_div(tn, tn + fn)
    f1 = safe_div(2 * precision * sensitivity, precision + sensitivity)
    accuracy = safe_div(tp + tn, tp + tn + fp + fn)

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
    }


def compute_roc_auc_binary(y_true_bin, y_score):
    """Berechne ROC-AUC für binäre Klassifikation"""
    y_true_bin = np.asarray(y_true_bin, dtype=int)
    y_score = np.asarray(y_score, dtype=float)

    n_pos = int(np.sum(y_true_bin == 1))
    n_neg = int(np.sum(y_true_bin == 0))
    if n_pos == 0 or n_neg == 0:
        return None

    ranks = rankdata_average_ties(y_score)
    pos_ranks_sum = float(np.sum(ranks[y_true_bin == 1]))
    auc = (pos_ranks_sum - (n_pos * (n_pos + 1) / 2.0)) / (n_pos * n_neg)
    return float(auc)


def compute_pr_auc_binary(y_true_bin, y_score):
    """Berechne Precision-Recall-AUC"""
    y_true_bin = np.asarray(y_true_bin, dtype=int)
    y_score = np.asarray(y_score, dtype=float)

    n_pos = int(np.sum(y_true_bin == 1))
    if n_pos == 0:
        return None

    order = np.argsort(-y_score, kind="mergesort")
    y_sorted = y_true_bin[order]
    score_sorted = y_score[order]

    tp = 0
    fp = 0

    precisions = [1.0]
    recalls = [0.0]

    i = 0
    n = len(y_sorted)
    while i < n:
        j = i
        while j + 1 < n and score_sorted[j + 1] == score_sorted[i]:
            j += 1

        block = y_sorted[i:j + 1]
        tp += int(np.sum(block == 1))
        fp += int(np.sum(block == 0))

        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, n_pos)

        precisions.append(precision)
        recalls.append(recall)

        i = j + 1

    precisions = np.asarray(precisions, dtype=float)
    recalls = np.asarray(recalls, dtype=float)

    auc = np.trapz(precisions, recalls)
    return float(auc)


def compute_brier_score(y_true_bin, y_prob):
    """Berechne Brier-Score"""
    y_true_bin = np.asarray(y_true_bin, dtype=float)
    y_prob = np.asarray(y_prob, dtype=float)
    return float(np.mean((y_prob - y_true_bin) ** 2))


def compute_malignant_metrics(y_true, y_pred, y_prob_malignant, malignant_labels):
    """Berechne alle binären Metriken für Maligne vs. Benign"""
    y_true_bin = np.array([1 if y in malignant_labels else 0 for y in y_true], dtype=int)
    y_pred_bin = np.array([1 if y in malignant_labels else 0 for y in y_pred], dtype=int)

    tp, tn, fp, fn = binary_confusion_from_labels(y_true_bin, y_pred_bin)
    metrics = binary_metrics_from_confusion(tp, tn, fp, fn)

    roc_auc = compute_roc_auc_binary(y_true_bin, y_prob_malignant)
    pr_auc = compute_pr_auc_binary(y_true_bin, y_prob_malignant)
    brier = compute_brier_score(y_true_bin, y_prob_malignant)

    metrics["roc_auc"] = roc_auc
    metrics["pr_auc"] = pr_auc
    metrics["brier_score"] = brier

    return metrics, y_true_bin, y_pred_bin


def bootstrap_binary_metrics(y_true_bin, y_pred_bin, y_prob, n_bootstrap=1000, seed=42):
    """Berechne Bootstrap-Konfidenzintervalle für binäre Metriken"""
    rng = np.random.default_rng(seed)
    n = len(y_true_bin)

    metric_store = {
        "accuracy": [],
        "sensitivity_recall": [],
        "specificity": [],
        "precision_ppv": [],
        "npv": [],
        "f1": [],
        "roc_auc": [],
        "pr_auc": [],
        "brier_score": [],
    }

    for _ in range(n_bootstrap):
        idx = rng.integers(0, n, size=n)
        yt = y_true_bin[idx]
        yp = y_pred_bin[idx]
        ys = y_prob[idx]

        tp, tn, fp, fn = binary_confusion_from_labels(yt, yp)
        m = binary_metrics_from_confusion(tp, tn, fp, fn)
        m["roc_auc"] = compute_roc_auc_binary(yt, ys)
        m["pr_auc"] = compute_pr_auc_binary(yt, ys)
        m["brier_score"] = compute_brier_score(yt, ys)

        for key in metric_store:
            if m[key] is not None:
                metric_store[key].append(m[key])

    rows = []
    for key, vals in metric_store.items():
        low, high = percentile_ci(vals, alpha=0.95)
        rows.append({
            "metric": key,
            "ci95_low": low,
            "ci95_high": high,
            "n_bootstrap_valid": len(vals),
        })

    return pd.DataFrame(rows)


def calibration_table(y_true_bin, y_prob, n_bins=10):
    """Erstelle Kalibrierungs-Tabelle"""
    y_true_bin = np.asarray(y_true_bin, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)

    bins = np.linspace(0.0, 1.0, n_bins + 1)
    rows = []

    for i in range(n_bins):
        left = bins[i]
        right = bins[i + 1]
        if i < n_bins - 1:
            mask = (y_prob >= left) & (y_prob < right)
        else:
            mask = (y_prob >= left) & (y_prob <= right)

        count = int(np.sum(mask))
        if count == 0:
            rows.append({
                "bin": i + 1,
                "bin_left": left,
                "bin_right": right,
                "count": 0,
                "mean_predicted_probability": np.nan,
                "observed_event_rate": np.nan,
            })
        else:
            rows.append({
                "bin": i + 1,
                "bin_left": left,
                "bin_right": right,
                "count": count,
                "mean_predicted_probability": float(np.mean(y_prob[mask])),
                "observed_event_rate": float(np.mean(y_true_bin[mask])),
            })

    return pd.DataFrame(rows)