import numpy as np


def softmax_np(logits):
    """Berechne Softmax über Logits"""
    logits = logits - np.max(logits, axis=-1, keepdims=True)
    exp_logits = np.exp(logits)
    return exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)


def convert_outputs_to_probabilities(raw_output):
    """Konvertiere Rohdaten zu Wahrscheinlichkeiten via Softmax"""
    arr = np.asarray(raw_output)

    if arr.ndim != 2 or arr.shape[1] < 2:
        raise RuntimeError(
            f"Dieses Skript erwartet Multi-Class-Outputs mit Form [N, C], C>=2. "
            f"Erhalten: shape={arr.shape}"
        )

    row_sums = arr.sum(axis=1)
    looks_like_probs = (
        np.all(arr >= 0.0)
        and np.all(arr <= 1.0)
        and np.allclose(row_sums, 1.0, atol=1e-3)
    )

    if looks_like_probs:
        return arr.astype(np.float32)

    return softmax_np(arr.astype(np.float32))


def infer_input_layout(input_shape):
    """Inferiere Input-Layout (NCHW vs NHWC)"""
    if len(input_shape) == 4:
        if input_shape[1] == 3:
            return "NCHW"
        if input_shape[-1] == 3:
            return "NHWC"
    return "NCHW"


def infer_square_size_from_shape(input_shape, layout):
    """Inferiere quadratische Input-Größe aus Shape"""
    if len(input_shape) != 4:
        return None

    if layout == "NCHW":
        h, w = input_shape[2], input_shape[3]
    else:
        h, w = input_shape[1], input_shape[2]

    if isinstance(h, int) and isinstance(w, int) and h == w:
        return int(h)
    return None


def rankdata_average_ties(x):
    """Ranking mit Durchschnittswert bei Ties (für ROC-AUC)"""
    order = np.argsort(x, kind="mergesort")
    ranks = np.empty(len(x), dtype=float)

    i = 0
    while i < len(x):
        j = i
        while j + 1 < len(x) and x[order[j + 1]] == x[order[i]]:
            j += 1
        avg_rank = (i + j + 2) / 2.0
        ranks[order[i:j + 1]] = avg_rank
        i = j + 1
    return ranks


def percentile_ci(values, alpha=0.95):
    """Berechne Konfidenzintervall via Perzentil"""
    if len(values) == 0:
        return (None, None)
    lower_q = (1.0 - alpha) / 2.0
    upper_q = 1.0 - lower_q
    return (
        float(np.quantile(values, lower_q)),
        float(np.quantile(values, upper_q))
    )