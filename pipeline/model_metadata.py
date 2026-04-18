import onnxruntime as ort
from dataclasses import dataclass
from typing import Optional
from utils_helpers import load_json_if_exists
from utils_numpy import infer_input_layout, infer_square_size_from_shape
from image_preprocessing import ModelMetadata


DEFAULT_CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]


def load_model_metadata(
    model_path: str,
    session: ort.InferenceSession,
    preprocess_json: Optional[str] = None,
    classes_json: Optional[str] = None,
    report_json: Optional[str] = None,
) -> ModelMetadata:
    """Lade Modellerkennung von ONNX-Session und JSON-Dateien"""
    input_meta = session.get_inputs()[0]
    input_shape = input_meta.shape
    input_layout = infer_input_layout(input_shape)

    preprocess_data = load_json_if_exists(preprocess_json)
    classes_data = load_json_if_exists(classes_json)
    report_data = load_json_if_exists(report_json)

    input_size = None
    mean = None
    std = None

    if preprocess_data:
        if "input_size" in preprocess_data and len(preprocess_data["input_size"]) == 3:
            input_size = int(preprocess_data["input_size"][-1])
        mean = preprocess_data.get("mean")
        std = preprocess_data.get("std")

    if report_data:
        preprocess_block = report_data.get("preprocess", {})

        if input_size is None:
            chw = preprocess_block.get("input_size_CHW")
            if chw and len(chw) == 3:
                input_size = int(chw[-1])

        if mean is None:
            mean = preprocess_block.get("mean_RGB")
        if std is None:
            std = preprocess_block.get("std_RGB")

        onnx_inputs = report_data.get("onnx", {}).get("inputs", [])
        if onnx_inputs:
            input_layout = onnx_inputs[0].get("layout_hint") or input_layout

    if input_size is None:
        input_size = infer_square_size_from_shape(input_shape, input_layout)

    if input_size is None:
        input_size = 224
    if mean is None:
        mean = [0.5, 0.5, 0.5]
    if std is None:
        std = [0.5, 0.5, 0.5]

    if isinstance(classes_data, list) and classes_data:
        class_names = [str(x) for x in classes_data]
    elif isinstance(classes_data, dict) and "classes" in classes_data:
        class_names = [str(x) for x in classes_data["classes"]]
    else:
        class_names = list(DEFAULT_CLASS_NAMES)

    return ModelMetadata(
        input_size=int(input_size),
        mean=[float(x) for x in mean],
        std=[float(x) for x in std],
        class_names=class_names,
        input_layout=input_layout,
    )