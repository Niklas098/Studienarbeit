import argparse
import pandas as pd
from utils_helpers import ensure_dir, get_model_name_from_path, parse_comma_list
from path_resolver import resolve_global_input_paths, resolve_model_files
from inference import run_inference_for_model
from evaluation_output import evaluate_and_save_model_outputs


DEFAULT_CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
DEFAULT_MALIGNANT_LABELS = ["akiec", "bcc", "mel"]


def main():
    parser = argparse.ArgumentParser(
        description="ONNX-Modell-Evaluierung für dermaskopische Hautbilder"
    )

    parser.add_argument(
        "--model_dirs",
        nargs="*",
        default=None,
        help="Mehrere Modellordner mit .onnx + JSON-Dateien"
    )
    parser.add_argument(
        "--model_paths",
        nargs="*",
        default=None,
        help="Alternativ direkte Pfade zu mehreren .onnx-Dateien"
    )

    parser.add_argument("--csv_path", default=None, help="Pfad zur CSV-Datei mit image_id und dx")
    parser.add_argument("--images_dir", default=None, help="Verzeichnis mit Bilddateien")

    parser.add_argument(
        "--resize_mode",
        default="resize",
        choices=["pad", "center_crop", "resize"],
        help="Image-Resize-Strategie"
    )
    parser.add_argument("--batch_size", type=int, default=32, help="Batch-Größe für Inference")

    parser.add_argument(
        "--malignant_labels",
        type=str,
        default=",".join(DEFAULT_MALIGNANT_LABELS),
        help="Kommagetrennte Labels, die als maligne gelten."
    )

    parser.add_argument(
        "--output_root",
        type=str,
        default="model_evaluation_outputs",
        help="Oberordner für alle Modellergebnisse"
    )

    parser.add_argument(
        "--bootstrap_samples",
        type=int,
        default=1000,
        help="Anzahl Bootstrap-Samples für 95%-Konfidenzintervalle"
    )

    parser.add_argument(
        "--disable_bootstrap_ci",
        action="store_true",
        help="Falls gesetzt, werden keine Bootstrap-Konfidenzintervalle berechnet"
    )

    args = parser.parse_args()
    args = resolve_global_input_paths(args)

    malignant_labels = set(parse_comma_list(args.malignant_labels, DEFAULT_MALIGNANT_LABELS))
    ensure_dir(args.output_root)

    # Sammle alle Modellspezifikationen
    model_specs = []

    if args.model_dirs:
        for model_dir in args.model_dirs:
            resolved = resolve_model_files(model_dir=model_dir, model_path=None)
            model_specs.append(resolved)

    if args.model_paths:
        for model_path in args.model_paths:
            resolved = resolve_model_files(model_dir=None, model_path=model_path)
            model_specs.append(resolved)

    if not model_specs:
        raise RuntimeError("Keine Modelle gefunden.")

    # Deduplizierung nach Modellpfad
    seen_model_paths = set()
    unique_model_specs = []
    for spec in model_specs:
        if spec["model_path"] not in seen_model_paths:
            unique_model_specs.append(spec)
            seen_model_paths.add(spec["model_path"])

    print("=== Globale Eingaben ===")
    print(f"CSV:            {args.csv_path}")
    print(f"Bilderordner:   {args.images_dir}")
    print(f"Output-Root:    {args.output_root}")
    print(f"Anzahl Modelle: {len(unique_model_specs)}")
    print("")

    all_result_rows = []

    for idx, spec in enumerate(unique_model_specs, start=1):
        model_name = get_model_name_from_path(spec["model_path"])

        print("============================================================")
        print(f"[{idx}/{len(unique_model_specs)}] Verarbeite Modell: {model_name}")
        print(f"Modellordner:    {spec['model_dir']}")
        print(f"ONNX-Modell:     {spec['model_path']}")
        print(f"preprocess.json: {spec['preprocess_json']}")
        print(f"classes.json:    {spec['classes_json']}")
        print(f"report.json:     {spec['report_json']}")
        print("")

        out_df, preds, class_names, meta = run_inference_for_model(
            model_path=spec["model_path"],
            preprocess_json=spec["preprocess_json"],
            classes_json=spec["classes_json"],
            report_json=spec["report_json"],
            csv_path=args.csv_path,
            images_dir=args.images_dir,
            resize_mode=args.resize_mode,
            batch_size=args.batch_size,
        )

        saved_paths = evaluate_and_save_model_outputs(
            out_df=out_df,
            preds=preds,
            class_names=class_names,
            model_name=model_name,
            output_root=args.output_root,
            malignant_labels=malignant_labels,
            bootstrap_samples=args.bootstrap_samples,
            enable_bootstrap_ci=not args.disable_bootstrap_ci,
        )

        all_result_rows.append({
            "model_name": model_name,
            "model_path": spec["model_path"],
            "model_dir": spec["model_dir"],
            "predictions_csv": saved_paths["predictions_csv"],
            "confusion_csv": saved_paths["confusion_csv"],
            "per_class_csv": saved_paths["per_class_csv"],
            "metrics_csv": saved_paths["metrics_csv"],
            "ci_csv": saved_paths["ci_csv"],
            "calibration_csv": saved_paths["calibration_csv"],
        })

    overview_csv = f"{args.output_root}/all_models_overview.csv"
    pd.DataFrame(all_result_rows).to_csv(overview_csv, index=False)

    print("")
    print("============================================================")
    print("Fertig.")
    print(f"Gesamtübersicht: {overview_csv}")


if __name__ == "__main__":
    main()