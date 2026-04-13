import os
import numpy as np
import pandas as pd
from utils_helpers import ensure_dir, sanitize_filename
from metrics_multiclass import compute_multiclass_metrics, build_confusion_matrix_df
from metrics_binary import (
    compute_malignant_metrics,
    bootstrap_binary_metrics,
    calibration_table,
)


def evaluate_and_save_model_outputs(
    out_df,
    preds,
    class_names,
    model_name,
    output_root,
    malignant_labels,
    bootstrap_samples=1000,
    enable_bootstrap_ci=True,
):
    """Evaluiere Modell und speichere alle Ergebnisse"""
    model_output_dir = os.path.join(output_root, sanitize_filename(model_name))
    ensure_dir(model_output_dir)

    predictions_csv = os.path.join(model_output_dir, f"{model_name}_predictions.csv")
    confusion_csv = os.path.join(model_output_dir, f"{model_name}_confusion_matrix.csv")
    per_class_csv = os.path.join(model_output_dir, f"{model_name}_per_class_metrics.csv")
    metrics_csv = os.path.join(model_output_dir, f"{model_name}_metrics_summary.csv")
    ci_csv = os.path.join(model_output_dir, f"{model_name}_metrics_ci95.csv")
    calibration_csv = os.path.join(model_output_dir, f"{model_name}_calibration_table.csv")

    out_df.to_csv(predictions_csv, index=False)

    y_true = out_df["dx"].astype(str).tolist()
    y_pred = out_df["pred_dx"].astype(str).tolist()

    cm_df = build_confusion_matrix_df(y_true, y_pred, class_names)
    cm_df.to_csv(confusion_csv)

    multiclass_metrics, per_class_df = compute_multiclass_metrics(y_true, y_pred, class_names)
    per_class_df.to_csv(per_class_csv, index=False)

    malignant_indices = [i for i, c in enumerate(class_names) if c in malignant_labels]
    if not malignant_indices:
        raise ValueError("Keine malignen Labels in class_names gefunden.")

    y_prob_malignant = preds[:, malignant_indices].sum(axis=1)
    malignant_metrics, y_true_bin, y_pred_bin = compute_malignant_metrics(
        y_true=y_true,
        y_pred=y_pred,
        y_prob_malignant=y_prob_malignant,
        malignant_labels=malignant_labels,
    )

    calib_df = calibration_table(y_true_bin, y_prob_malignant, n_bins=10)
    calib_df.to_csv(calibration_csv, index=False)

    summary_rows = []
    for key, val in multiclass_metrics.items():
        summary_rows.append({
            "group": "multiclass",
            "metric": key,
            "value": val
        })

    for key, val in malignant_metrics.items():
        summary_rows.append({
            "group": "malignant_vs_benign",
            "metric": key,
            "value": val
        })

    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(metrics_csv, index=False)

    if enable_bootstrap_ci:
        ci_df = bootstrap_binary_metrics(
            y_true_bin=np.asarray(y_true_bin, dtype=int),
            y_pred_bin=np.asarray(y_pred_bin, dtype=int),
            y_prob=np.asarray(y_prob_malignant, dtype=float),
            n_bootstrap=bootstrap_samples,
            seed=42,
        )
        ci_df.to_csv(ci_csv, index=False)
    else:
        ci_df = pd.DataFrame(columns=["metric", "ci95_low", "ci95_high", "n_bootstrap_valid"])
        ci_df.to_csv(ci_csv, index=False)

    print("")
    print("=== Relevante Kennzahlen ===")
    print(f"Modell:                         {model_name}")
    print(f"Accuracy:                       {multiclass_metrics['accuracy']:.4f}")
    print(f"Balanced Accuracy:              {multiclass_metrics['balanced_accuracy']:.4f}")
    print(f"Macro Precision:                {multiclass_metrics['macro_precision']:.4f}")
    print(f"Macro Recall:                   {multiclass_metrics['macro_recall']:.4f}")
    print(f"Macro F1:                       {multiclass_metrics['macro_f1']:.4f}")
    print(f"Micro Precision:                {multiclass_metrics['micro_precision']:.4f}")
    print(f"Micro Recall:                   {multiclass_metrics['micro_recall']:.4f}")
    print(f"Micro F1:                       {multiclass_metrics['micro_f1']:.4f}")
    print("")
    print("Maligne vs. Benign:")
    print(f"Sensitivität (Recall):          {malignant_metrics['sensitivity_recall']:.4f}")
    print(f"Spezifität:                     {malignant_metrics['specificity']:.4f}")
    print(f"PPV (Precision):                {malignant_metrics['precision_ppv']:.4f}")
    print(f"NPV:                            {malignant_metrics['npv']:.4f}")
    print(f"F1:                             {malignant_metrics['f1']:.4f}")
    print(f"Brier Score:                    {malignant_metrics['brier_score']:.4f}")

    if malignant_metrics["roc_auc"] is not None:
        print(f"ROC-AUC:                        {malignant_metrics['roc_auc']:.4f}")
    else:
        print("ROC-AUC:                        nicht berechenbar (nur eine Klasse vorhanden)")

    if malignant_metrics["pr_auc"] is not None:
        print(f"PR-AUC:                         {malignant_metrics['pr_auc']:.4f}")
    else:
        print("PR-AUC:                         nicht berechenbar (keine positive Klasse vorhanden)")

    print(
        f"TP/TN/FP/FN:                    "
        f"{malignant_metrics['tp']}/{malignant_metrics['tn']}/"
        f"{malignant_metrics['fp']}/{malignant_metrics['fn']}"
    )
    print("")
    print("Gespeichert in:")
    print(f"  {model_output_dir}")

    return {
        "model_name": model_name,
        "model_output_dir": model_output_dir,
        "predictions_csv": predictions_csv,
        "confusion_csv": confusion_csv,
        "per_class_csv": per_class_csv,
        "metrics_csv": metrics_csv,
        "ci_csv": ci_csv,
        "calibration_csv": calibration_csv,
    }