import os
import json
from typing import Optional


def safe_div(numerator, denominator):
    """Sichere Division mit Fallback auf 0.0"""
    return float(numerator) / float(denominator) if denominator else 0.0


def parse_comma_list(value, default_values):
    """Parse kommagetrennte Liste mit Fallback"""
    if value is None:
        return list(default_values)
    values = [v.strip() for v in value.split(",") if v.strip()]
    return values if values else list(default_values)


def build_image_path(images_dir, image_id):
    """Konstruiere Pfad zu Bildatei"""
    return os.path.join(images_dir, f"{image_id}.jpg")


def load_json_if_exists(path: Optional[str]):
    """Lade JSON-Datei, wenn sie existiert"""
    if not path:
        return None
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def sanitize_filename(name: str) -> str:
    """Sanitize Dateinamen für sichere Verwendung"""
    keep = []
    for c in name:
        if c.isalnum() or c in ("-", "_", "."):
            keep.append(c)
        else:
            keep.append("_")
    return "".join(keep)


def get_model_name_from_path(model_path: str) -> str:
    """Extrahiere und sanitize Modellnamen aus Pfad"""
    return sanitize_filename(os.path.splitext(os.path.basename(model_path))[0])


def ensure_dir(path):
    """Stelle sicher, dass Verzeichnis existiert"""
    os.makedirs(path, exist_ok=True)