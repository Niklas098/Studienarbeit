# =========================
# Datei: plot_evaluation.py
# =========================

import os
import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def with_model_title(base_title, model_name):
    if model_name:
        return f"{base_title} - {model_name}"
    return base_title


def plot_confusion_matrix(cm_df, output_path, model_name=""):
    values = cm_df.values.astype(float)
    row_sums = values.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    cm_norm = values / row_sums

    fig, ax = plt.subplots(figsize=(9, 7))
    im = ax.imshow(cm_norm, interpolation="nearest", cmap="Blues", vmin=0.0, vmax=1.0)
    cbar = fig.colorbar(im, ax=ax)
    cbar.set_label("Row-normalized")

    ax.set_xticks(np.arange(len(cm_df.columns)))
    ax.set_yticks(np.arange(len(cm_df.index)))
    ax.set_xticklabels(cm_df.columns, rotation=45, ha="right")
    ax.set_yticklabels(cm_df.index)
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_title(with_model_title("Confusion Matrix (row-normalized)", model_name))

    for i in range(cm_norm.shape[0]):
        for j in range(cm_norm.shape[1]):
            text_color = "white" if cm_norm[i, j] > 0.5 else "black"
            ax.text(
                j,
                i,
                f"{cm_norm[i, j]:.2f}",
                ha="center",
                va="center",
                color=text_color,
                fontsize=8,
            )

    fig.tight_layout()
    fig.savefig(output_path, dpi=220)
    plt.close(fig)


def plot_per_class_metrics(per_class_df, output_path, model_name=""):
    plot_df = per_class_df.copy().sort_values("support", ascending=False)

    labels = plot_df["label"].tolist()
    x = np.arange(len(labels))
    width = 0.24

    fig, ax = plt.subplots(figsize=(11, 6))
    ax.bar(x - width, plot_df["precision"], width=width, label="Precision")
    ax.bar(x, plot_df["recall"], width=width, label="Recall")
    ax.bar(x + width, plot_df["f1"], width=width, label="F1")

    for i, support in enumerate(plot_df["support"].tolist()):
        ax.text(x[i], 1.02, f"n={int(support)}", ha="center", va="bottom", fontsize=8)

    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.08)
    ax.set_ylabel("Score")
    ax.set_title(with_model_title("Per-class Precision / Recall / F1", model_name))
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    fig.tight_layout()
    fig.savefig(output_path, dpi=220)
    plt.close(fig)


def plot_key_metrics(summary_df, output_path, model_name=""):
    keep = [
        ("multiclass", "accuracy", "Multiclass Accuracy"),
        ("multiclass", "balanced_accuracy", "Balanced Accuracy"),
        ("multiclass", "macro_f1", "Macro F1"),
        ("malignant_vs_benign", "sensitivity_recall", "Sensitivity (Recall)"),
        ("malignant_vs_benign", "specificity", "Specificity"),
        ("malignant_vs_benign", "precision_ppv", "Precision (PPV)"),
        ("malignant_vs_benign", "npv", "NPV"),
        ("malignant_vs_benign", "f1", "F1 (malignant)"),
        ("malignant_vs_benign", "roc_auc", "ROC-AUC"),
    ]

    rows = []
    for group, metric, label in keep:
        hit = summary_df[(summary_df["group"] == group) & (summary_df["metric"] == metric)]
        if not hit.empty and pd.notna(hit.iloc[0]["value"]):
            rows.append((label, float(hit.iloc[0]["value"])))

    if not rows:
        return

    labels = [r[0] for r in rows]
    values = [r[1] for r in rows]

    fig, ax = plt.subplots(figsize=(10, 5.5))
    bars = ax.barh(labels, values)
    ax.set_xlim(0, 1)
    ax.set_xlabel("Score")
    ax.set_title(with_model_title("Key Evaluation Metrics", model_name))
    ax.grid(axis="x", alpha=0.3)

    for bar, val in zip(bars, values):
        ax.text(
            val + 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"{val:.3f}",
            va="center",
            fontsize=9,
        )

    fig.tight_layout()
    fig.savefig(output_path, dpi=220)
    plt.close(fig)


def plot_malignant_confusion(summary_df, output_path, model_name=""):
    def get_value(metric_name):
        hit = summary_df[
            (summary_df["group"] == "malignant_vs_benign")
            & (summary_df["metric"] == metric_name)
        ]
        if hit.empty:
            return None
        return float(hit.iloc[0]["value"])

    tp = get_value("tp")
    tn = get_value("tn")
    fp = get_value("fp")
    fn = get_value("fn")

    if None in (tp, tn, fp, fn):
        return

    labels = ["TP", "FN", "FP", "TN"]
    values = [tp, fn, fp, tn]
    colors = ["#2e7d32", "#c62828", "#ef6c00", "#1565c0"]

    fig, ax = plt.subplots(figsize=(7, 4.5))
    bars = ax.bar(labels, values, color=colors)
    ax.set_title(with_model_title("Malignant vs Benign: Confusion Counts", model_name))
    ax.set_ylabel("Count")
    ax.grid(axis="y", alpha=0.3)

    for b, v in zip(bars, values):
        ax.text(
            b.get_x() + b.get_width() / 2,
            b.get_height(),
            f"{int(v)}",
            ha="center",
            va="bottom",
        )

    fig.tight_layout()
    fig.savefig(output_path, dpi=220)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--per_class_csv", default="per_class_metrics.csv")
    parser.add_argument("--metrics_csv", default="metrics_summary.csv")
    parser.add_argument("--confusion_csv", default="confusion_matrix.csv")
    parser.add_argument("--plots_dir", default="evaluation_plots")
    parser.add_argument("--model_name", default="")
    args = parser.parse_args()

    per_class_df = pd.read_csv(args.per_class_csv)
    summary_df = pd.read_csv(args.metrics_csv)
    cm_df = pd.read_csv(args.confusion_csv, index_col=0)

    ensure_dir(args.plots_dir)

    plot_confusion_matrix(
        cm_df,
        os.path.join(args.plots_dir, "confusion_matrix_heatmap.png"),
        model_name=args.model_name,
    )
    plot_per_class_metrics(
        per_class_df,
        os.path.join(args.plots_dir, "per_class_metrics.png"),
        model_name=args.model_name,
    )
    plot_key_metrics(
        summary_df,
        os.path.join(args.plots_dir, "key_metrics.png"),
        model_name=args.model_name,
    )
    plot_malignant_confusion(
        summary_df,
        os.path.join(args.plots_dir, "malignant_confusion_counts.png"),
        model_name=args.model_name,
    )

    print("Plots geschrieben nach:", args.plots_dir)


if __name__ == "__main__":
    main()