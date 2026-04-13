import os
import argparse
from typing import Optional

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


# ============================================================
# Helpers
# ============================================================

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def sanitize_filename(name: str) -> str:
    keep = []
    for c in name:
        if c.isalnum() or c in ("-", "_", "."):
            keep.append(c)
        else:
            keep.append("_")
    return "".join(keep)


def read_csv_if_exists(path: str) -> Optional[pd.DataFrame]:
    if path and os.path.exists(path):
        return pd.read_csv(path)
    return None


def find_file_with_suffix(model_dir: str, suffix: str) -> Optional[str]:
    if not os.path.isdir(model_dir):
        return None

    matches = []
    for fname in os.listdir(model_dir):
        if fname.endswith(suffix):
            matches.append(os.path.join(model_dir, fname))

    if not matches:
        return None

    matches.sort()
    return matches[0]


def save_figure(fig, output_path: str, dpi: int = 200):
    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi, bbox_inches="tight")
    plt.close(fig)


def annotate_bars(ax, bars, fmt="{:.3f}", rotation=0, fontsize=9):
    for bar in bars:
        height = bar.get_height()
        ax.annotate(
            fmt.format(height),
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=fontsize,
            rotation=rotation,
        )


# ============================================================
# Plot functions
# ============================================================

def plot_confusion_matrix(confusion_csv: str, output_path: str, title: str):
    df = pd.read_csv(confusion_csv, index_col=0)

    cm = df.values
    labels = list(df.columns)

    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, aspect="auto")

    ax.set_title(title)
    ax.set_xlabel("Predicted class")
    ax.set_ylabel("True class")
    ax.set_xticks(np.arange(len(labels)))
    ax.set_yticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=9)

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    save_figure(fig, output_path)


def plot_summary_metrics(metrics_csv: str, output_path: str, title: str):
    df = pd.read_csv(metrics_csv)

    wanted = [
        ("multiclass", "accuracy"),
        ("multiclass", "balanced_accuracy"),
        ("multiclass", "macro_precision"),
        ("multiclass", "macro_recall"),
        ("multiclass", "macro_f1"),
        ("multiclass", "micro_precision"),
        ("multiclass", "micro_recall"),
        ("multiclass", "micro_f1"),
        ("malignant_vs_benign", "sensitivity_recall"),
        ("malignant_vs_benign", "specificity"),
        ("malignant_vs_benign", "precision_ppv"),
        ("malignant_vs_benign", "npv"),
        ("malignant_vs_benign", "f1"),
        ("malignant_vs_benign", "roc_auc"),
        ("malignant_vs_benign", "pr_auc"),
        ("malignant_vs_benign", "brier_score"),
    ]

    rows = []
    for group, metric in wanted:
        sub = df[(df["group"] == group) & (df["metric"] == metric)]
        if not sub.empty:
            rows.append({
                "label": f"{group}\n{metric}",
                "metric": metric,
                "group": group,
                "value": float(sub.iloc[0]["value"]),
            })

    plot_df = pd.DataFrame(rows)
    if plot_df.empty:
        return

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(plot_df["label"], plot_df["value"])

    ax.set_title(title)
    ax.set_ylabel("Value")
    ax.set_ylim(0, max(1.0, float(plot_df["value"].max()) * 1.15))
    ax.tick_params(axis="x", rotation=45)

    annotate_bars(ax, bars, fmt="{:.3f}", rotation=90, fontsize=8)
    save_figure(fig, output_path)


def plot_per_class_metrics(per_class_csv: str, output_path: str, title: str):
    df = pd.read_csv(per_class_csv)

    wanted_cols = [
        "precision_ppv",
        "recall_sensitivity",
        "specificity",
        "npv",
        "f1",
    ]
    available_cols = [c for c in wanted_cols if c in df.columns]

    if "label" not in df.columns or not available_cols:
        return

    labels = df["label"].astype(str).tolist()
    x = np.arange(len(labels))
    width = 0.15 if len(available_cols) >= 4 else 0.2

    fig, ax = plt.subplots(figsize=(12, 6))

    offsets = np.linspace(
        -width * (len(available_cols) - 1) / 2,
        width * (len(available_cols) - 1) / 2,
        len(available_cols)
    )

    for col, offset in zip(available_cols, offsets):
        bars = ax.bar(x + offset, df[col].values, width=width, label=col)
        annotate_bars(ax, bars, fmt="{:.2f}", rotation=90, fontsize=7)

    ax.set_title(title)
    ax.set_ylabel("Value")
    ax.set_xlabel("Class")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_ylim(0, 1.1)
    ax.legend()

    save_figure(fig, output_path)


def plot_calibration_curve(calibration_csv: str, output_path: str, title: str):
    df = pd.read_csv(calibration_csv)

    if not {"mean_predicted_probability", "observed_event_rate", "count"}.issubset(df.columns):
        return

    valid = df["count"] > 0
    df = df[valid].copy()

    if df.empty:
        return

    x = df["mean_predicted_probability"].values
    y = df["observed_event_rate"].values
    sizes = df["count"].values

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.plot([0, 1], [0, 1], linestyle="--", label="Perfect calibration")
    ax.plot(x, y, marker="o", label="Model calibration")
    ax.scatter(x, y, s=np.maximum(30, sizes * 3))

    for _, row in df.iterrows():
        ax.annotate(
            f"n={int(row['count'])}",
            (row["mean_predicted_probability"], row["observed_event_rate"]),
            textcoords="offset points",
            xytext=(4, 4),
            fontsize=8,
        )

    ax.set_title(title)
    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed event rate")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.legend()

    save_figure(fig, output_path)


def plot_ci_metrics(ci_csv: str, output_path: str, title: str):
    df = pd.read_csv(ci_csv)

    if not {"metric", "ci95_low", "ci95_high"}.issubset(df.columns):
        return

    wanted_order = [
        "accuracy",
        "sensitivity_recall",
        "specificity",
        "precision_ppv",
        "npv",
        "f1",
        "roc_auc",
        "pr_auc",
        "brier_score",
    ]

    df["metric"] = pd.Categorical(df["metric"], categories=wanted_order, ordered=True)
    df = df.sort_values("metric").reset_index(drop=True)

    valid = df["ci95_low"].notna() & df["ci95_high"].notna()
    df = df[valid].copy()

    if df.empty:
        return

    centers = (df["ci95_low"].values + df["ci95_high"].values) / 2.0
    lower_err = centers - df["ci95_low"].values
    upper_err = df["ci95_high"].values - centers

    y = np.arange(len(df))

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.errorbar(
        centers,
        y,
        xerr=[lower_err, upper_err],
        fmt="o",
        capsize=4,
    )

    ax.set_yticks(y)
    ax.set_yticklabels(df["metric"].astype(str).tolist())
    ax.set_title(title)
    ax.set_xlabel("95% confidence interval")
    ax.grid(True, axis="x", alpha=0.3)

    # x-axis robust for brier + others
    min_x = float(np.nanmin(df["ci95_low"].values))
    max_x = float(np.nanmax(df["ci95_high"].values))
    pad = max(0.02, 0.05 * (max_x - min_x if max_x > min_x else 1.0))
    ax.set_xlim(max(0.0, min_x - pad), min(1.05, max_x + pad) if max_x <= 1.0 else max_x + pad)

    save_figure(fig, output_path)


def plot_model_overview(
    model_name: str,
    confusion_csv: Optional[str],
    metrics_csv: Optional[str],
    per_class_csv: Optional[str],
    calibration_csv: Optional[str],
    output_path: str,
):
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle(f"Model overview: {model_name}", fontsize=16)

    # 1 confusion matrix
    ax = axes[0, 0]
    if confusion_csv and os.path.exists(confusion_csv):
        df = pd.read_csv(confusion_csv, index_col=0)
        cm = df.values
        labels = list(df.columns)
        im = ax.imshow(cm, aspect="auto")
        ax.set_title("Confusion matrix")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_xticks(np.arange(len(labels)))
        ax.set_yticks(np.arange(len(labels)))
        ax.set_xticklabels(labels, rotation=45, ha="right")
        ax.set_yticklabels(labels)
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=8)
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "No confusion matrix found", ha="center", va="center")

    # 2 summary metrics
    ax = axes[0, 1]
    if metrics_csv and os.path.exists(metrics_csv):
        df = pd.read_csv(metrics_csv)
        wanted = [
            ("multiclass", "accuracy"),
            ("multiclass", "balanced_accuracy"),
            ("multiclass", "macro_f1"),
            ("malignant_vs_benign", "sensitivity_recall"),
            ("malignant_vs_benign", "specificity"),
            ("malignant_vs_benign", "precision_ppv"),
            ("malignant_vs_benign", "npv"),
            ("malignant_vs_benign", "f1"),
            ("malignant_vs_benign", "roc_auc"),
            ("malignant_vs_benign", "pr_auc"),
            ("malignant_vs_benign", "brier_score"),
        ]

        rows = []
        for group, metric in wanted:
            sub = df[(df["group"] == group) & (df["metric"] == metric)]
            if not sub.empty:
                rows.append({"label": metric, "value": float(sub.iloc[0]["value"])})

        plot_df = pd.DataFrame(rows)
        if not plot_df.empty:
            bars = ax.bar(plot_df["label"], plot_df["value"])
            ax.set_title("Key metrics")
            ax.tick_params(axis="x", rotation=45)
            ymax = max(1.0, float(plot_df["value"].max()) * 1.15)
            ax.set_ylim(0, ymax)
            for bar in bars:
                h = bar.get_height()
                ax.annotate(
                    f"{h:.3f}",
                    (bar.get_x() + bar.get_width() / 2, h),
                    textcoords="offset points",
                    xytext=(0, 4),
                    ha="center",
                    va="bottom",
                    fontsize=8,
                    rotation=90,
                )
        else:
            ax.axis("off")
            ax.text(0.5, 0.5, "No metrics found", ha="center", va="center")
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "No metrics file found", ha="center", va="center")

    # 3 per-class
    ax = axes[1, 0]
    if per_class_csv and os.path.exists(per_class_csv):
        df = pd.read_csv(per_class_csv)
        if "label" in df.columns and "f1" in df.columns:
            bars = ax.bar(df["label"].astype(str), df["f1"].values)
            ax.set_title("Per-class F1")
            ax.set_ylim(0, 1.1)
            ax.tick_params(axis="x", rotation=45)
            for bar in bars:
                h = bar.get_height()
                ax.annotate(
                    f"{h:.2f}",
                    (bar.get_x() + bar.get_width() / 2, h),
                    textcoords="offset points",
                    xytext=(0, 4),
                    ha="center",
                    va="bottom",
                    fontsize=8,
                    rotation=90,
                )
        else:
            ax.axis("off")
            ax.text(0.5, 0.5, "No per-class data found", ha="center", va="center")
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "No per-class metrics file found", ha="center", va="center")

    # 4 calibration
    ax = axes[1, 1]
    if calibration_csv and os.path.exists(calibration_csv):
        df = pd.read_csv(calibration_csv)
        valid = df["count"] > 0 if "count" in df.columns else pd.Series([], dtype=bool)
        df = df[valid].copy() if len(valid) else pd.DataFrame()

        if not df.empty:
            x = df["mean_predicted_probability"].values
            y = df["observed_event_rate"].values
            ax.plot([0, 1], [0, 1], linestyle="--", label="Perfect")
            ax.plot(x, y, marker="o", label="Observed")
            ax.set_title("Calibration")
            ax.set_xlabel("Predicted probability")
            ax.set_ylabel("Observed event rate")
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.legend()
        else:
            ax.axis("off")
            ax.text(0.5, 0.5, "No calibration data found", ha="center", va="center")
    else:
        ax.axis("off")
        ax.text(0.5, 0.5, "No calibration file found", ha="center", va="center")

    save_figure(fig, output_path)


# ============================================================
# Model directory processing
# ============================================================

def process_model_dir(model_dir: str, output_subdir_name: str = "visualizations"):
    model_name = os.path.basename(os.path.normpath(model_dir))
    vis_dir = os.path.join(model_dir, output_subdir_name)
    ensure_dir(vis_dir)

    confusion_csv = find_file_with_suffix(model_dir, "_confusion_matrix.csv")
    metrics_csv = find_file_with_suffix(model_dir, "_metrics_summary.csv")
    per_class_csv = find_file_with_suffix(model_dir, "_per_class_metrics.csv")
    ci_csv = find_file_with_suffix(model_dir, "_metrics_ci95.csv")
    calibration_csv = find_file_with_suffix(model_dir, "_calibration_table.csv")

    if confusion_csv:
        plot_confusion_matrix(
            confusion_csv=confusion_csv,
            output_path=os.path.join(vis_dir, f"{model_name}_confusion_matrix.png"),
            title=f"{model_name} - Confusion Matrix",
        )

    if metrics_csv:
        plot_summary_metrics(
            metrics_csv=metrics_csv,
            output_path=os.path.join(vis_dir, f"{model_name}_summary_metrics.png"),
            title=f"{model_name} - Summary Metrics",
        )

    if per_class_csv:
        plot_per_class_metrics(
            per_class_csv=per_class_csv,
            output_path=os.path.join(vis_dir, f"{model_name}_per_class_metrics.png"),
            title=f"{model_name} - Per-Class Metrics",
        )

    if calibration_csv:
        plot_calibration_curve(
            calibration_csv=calibration_csv,
            output_path=os.path.join(vis_dir, f"{model_name}_calibration_curve.png"),
            title=f"{model_name} - Calibration Curve",
        )

    if ci_csv:
        plot_ci_metrics(
            ci_csv=ci_csv,
            output_path=os.path.join(vis_dir, f"{model_name}_ci95.png"),
            title=f"{model_name} - 95% Confidence Intervals",
        )

    plot_model_overview(
        model_name=model_name,
        confusion_csv=confusion_csv,
        metrics_csv=metrics_csv,
        per_class_csv=per_class_csv,
        calibration_csv=calibration_csv,
        output_path=os.path.join(vis_dir, f"{model_name}_overview.png"),
    )

    print(f"[OK] Visualisierungen erstellt für: {model_name}")
    print(f"     Ausgabe: {vis_dir}")


def discover_model_dirs(results_root: str):
    model_dirs = []
    if not os.path.isdir(results_root):
        raise FileNotFoundError(f"Ordner nicht gefunden: {results_root}")

    for entry in os.listdir(results_root):
        full_path = os.path.join(results_root, entry)
        if not os.path.isdir(full_path):
            continue

        has_metrics = any(
            fname.endswith("_metrics_summary.csv") for fname in os.listdir(full_path)
        )
        if has_metrics:
            model_dirs.append(full_path)

    model_dirs.sort()
    return model_dirs


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Visualisiert Modell-Evaluationsergebnisse aus dem results-Ordner.")
    parser.add_argument(
        "--results_root",
        type=str,
        required=True,
        help="Oberordner mit den Modell-Ergebnissen"
    )
    parser.add_argument(
        "--model_dirs",
        nargs="*",
        default=None,
        help="Optional: einzelne Modell-Unterordner gezielt angeben"
    )
    parser.add_argument(
        "--output_subdir_name",
        type=str,
        default="visualizations",
        help="Name des Unterordners innerhalb jedes Modellordners"
    )

    args = parser.parse_args()

    if args.model_dirs:
        model_dirs = args.model_dirs
    else:
        model_dirs = discover_model_dirs(args.results_root)

    if not model_dirs:
        raise RuntimeError("Keine Modellordner mit *_metrics_summary.csv gefunden.")

    print(f"Gefundene Modellordner: {len(model_dirs)}")

    for model_dir in model_dirs:
        process_model_dir(model_dir, output_subdir_name=args.output_subdir_name)

    print("Fertig.")


if __name__ == "__main__":
    main()