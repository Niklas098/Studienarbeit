import os
from typing import Optional
from utils_ui import pick_directory_dialog, pick_file_dialog


def find_single_file_by_extensions(folder: str, extensions: tuple[str, ...]) -> Optional[str]:
    """Finde einzelne Datei mit bestimmter Erweiterung"""
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
    """Finde einzelne JSON-Datei mit Schlüsselwörtern"""
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


def resolve_model_files(model_dir=None, model_path=None):
    """Löse Modelldateien auf und finde zugehörige JSON-Dateien"""
    if model_path is None:
        if model_dir is None or not os.path.isdir(model_dir):
            raise ValueError(f"Ungültiger Modellordner: {model_dir}")

        model_path = find_single_file_by_extensions(model_dir, (".onnx",))
        if not model_path:
            raise FileNotFoundError(f"Keine .onnx-Datei im Ordner gefunden: {model_dir}")
    else:
        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"Modell nicht gefunden: {model_path}")
        model_dir = os.path.dirname(model_path)

    preprocess_json = find_single_json_by_keywords(model_dir, ["preprocess"])
    classes_json = find_single_json_by_keywords(model_dir, ["class"])
    report_json = find_single_json_by_keywords(model_dir, ["report"])

    return {
        "model_dir": model_dir,
        "model_path": model_path,
        "preprocess_json": preprocess_json,
        "classes_json": classes_json,
        "report_json": report_json,
    }


def resolve_global_input_paths(args):
    """Löse fehlende globale Input-Pfade über Dialoge auf"""
    if not args.csv_path:
        args.csv_path = pick_file_dialog(
            title="CSV-Datei auswählen",
            filetypes=[("CSV-Dateien", "*.csv"), ("Alle Dateien", "*.*")],
            required=True,
        )

    if not args.images_dir:
        args.images_dir = pick_directory_dialog(
            title="Bilderordner auswählen",
            initial_path=os.path.dirname(args.csv_path) if args.csv_path else None,
            required=True,
        )

    if not args.model_dirs and not args.model_paths:
        chosen = pick_directory_dialog("Ersten Modellordner auswählen", required=True)
        args.model_dirs = [chosen]

    return args