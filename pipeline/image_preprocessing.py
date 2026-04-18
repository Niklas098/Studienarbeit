import numpy as np
from PIL import Image
from dataclasses import dataclass


@dataclass
class ModelMetadata:
    """Modellerkennung und Preprocessing-Metadaten"""
    input_size: int
    mean: list[float]
    std: list[float]
    class_names: list[str]
    input_layout: str = "NCHW"


def resize_with_padding(img, size, pad_color=(0, 0, 0)):
    """Resize mit Padding (letter-box)"""
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
    """Resize und Center-Crop"""
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
    """Vorverarbeite Bild: Resize, Normalisierung"""
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