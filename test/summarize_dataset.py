#!/usr/bin/env python3
"""Summarize lesion pipeline metadata exports.

Usage:
  python3 test/summarize_dataset.py lesion_dataset_output.zip
  python3 test/summarize_dataset.py metadata.json --out summary.json
  python3 test/summarize_dataset.py metadata.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize lesion pipeline metadata.")
    parser.add_argument("input", help="metadata.json, metadata.csv, export ZIP, or folder")
    parser.add_argument("--out", help="Optional JSON output path")
    args = parser.parse_args()

    items = load_items(Path(args.input))
    summary = summarize(items)
    text = json.dumps(summary, indent=2, ensure_ascii=False)
    print(text)

    if args.out:
      Path(args.out).write_text(text + "\n", encoding="utf-8")


def load_items(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(path)
    if path.is_dir():
        return load_from_directory(path)
    if path.suffix.lower() == ".zip":
        return load_from_zip(path)
    if path.suffix.lower() == ".csv":
        return load_csv(path.read_text(encoding="utf-8"))
    return load_json(path.read_text(encoding="utf-8"))


def load_from_directory(path: Path) -> list[dict[str, Any]]:
    metadata_json = path / "metadata.json"
    metadata_csv = path / "metadata.csv"
    if metadata_json.exists():
        return load_json(metadata_json.read_text(encoding="utf-8"))
    if metadata_csv.exists():
        return load_csv(metadata_csv.read_text(encoding="utf-8"))

    items: list[dict[str, Any]] = []
    for file_path in sorted(path.rglob("*.json")):
        data = json.loads(file_path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "score" in data:
            items.append(data)
    return items


def load_from_zip(path: Path) -> list[dict[str, Any]]:
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        if "metadata.json" in names:
            with archive.open("metadata.json") as handle:
                return load_json(handle.read().decode("utf-8"))
        if "metadata.csv" in names:
            with archive.open("metadata.csv") as handle:
                return load_csv(handle.read().decode("utf-8"))
    raise ValueError("ZIP contains neither metadata.json nor metadata.csv")


def load_json(text: str) -> list[dict[str, Any]]:
    data = json.loads(text)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return [item for item in data["items"] if isinstance(item, dict)]
    if isinstance(data, dict) and "score" in data:
        return [data]
    raise ValueError("JSON does not contain pipeline items")


def load_csv(text: str) -> list[dict[str, Any]]:
    rows = csv.DictReader(text.splitlines())
    items: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        item["score"] = to_float(item.get("score"))
        item["accepted"] = str(item.get("accepted", "")).lower() == "true"
        item["issues"] = split_pipe(item.get("issues"))
        item["warnings"] = split_pipe(item.get("warnings"))
        item["hardRejects"] = split_pipe(item.get("hardRejects"))
        item["hardRejectTexts"] = split_pipe(item.get("hardRejectTexts"))
        items.append(item)
    return items


def summarize(items: list[dict[str, Any]]) -> dict[str, Any]:
    scores = [to_float(item.get("score")) for item in items]
    scores = [score for score in scores if score is not None]
    statuses = Counter(str(item.get("status", "unknown")) for item in items)
    roi_sources = Counter(str(item.get("roiSource", "unknown")) for item in items)
    issue_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()
    hard_reject_counts: Counter[str] = Counter()

    for item in items:
        issue_counts.update(as_list(item.get("issues")))
        warning_counts.update(as_list(item.get("warnings")))
        hard_reject_counts.update(as_list(item.get("hardRejects")))

    accepted = statuses.get("ok", 0) + statuses.get("warning", 0)
    rejected = statuses.get("reject", 0)

    return {
        "count": len(items),
        "accepted": accepted,
        "rejected": rejected,
        "acceptedRatio": round_float(accepted / len(items)) if items else 0,
        "statusCounts": dict(sorted(statuses.items())),
        "roiSourceCounts": dict(sorted(roi_sources.items())),
        "score": score_stats(scores),
        "scoreBands": score_bands(scores),
        "issueCounts": dict(issue_counts.most_common()),
        "warningCounts": dict(warning_counts.most_common()),
        "hardRejectCounts": dict(hard_reject_counts.most_common()),
    }


def score_stats(scores: list[float]) -> dict[str, float]:
    if not scores:
        return {
            "mean": 0,
            "median": 0,
            "min": 0,
            "max": 0,
            "p05": 0,
            "p25": 0,
            "p50": 0,
            "p75": 0,
            "p95": 0,
        }
    sorted_scores = sorted(scores)
    return {
        "mean": round_float(statistics.fmean(sorted_scores)),
        "median": round_float(statistics.median(sorted_scores)),
        "min": round_float(sorted_scores[0]),
        "max": round_float(sorted_scores[-1]),
        "p05": round_float(percentile(sorted_scores, 0.05)),
        "p25": round_float(percentile(sorted_scores, 0.25)),
        "p50": round_float(percentile(sorted_scores, 0.50)),
        "p75": round_float(percentile(sorted_scores, 0.75)),
        "p95": round_float(percentile(sorted_scores, 0.95)),
    }


def score_bands(scores: list[float]) -> list[dict[str, Any]]:
    bands = [
        ("0.00-0.20", 0.0, 0.2),
        ("0.20-0.40", 0.2, 0.4),
        ("0.40-0.60", 0.4, 0.6),
        ("0.60-0.75", 0.6, 0.75),
        ("0.75-1.00", 0.75, 1.000001),
    ]
    result = []
    for label, low, high in bands:
        result.append({
            "label": label,
            "count": sum(1 for score in scores if low <= score < high),
        })
    return result


def percentile(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0
    pos = max(0.0, min(1.0, p)) * (len(sorted_values) - 1)
    lo = int(pos)
    hi = min(len(sorted_values) - 1, lo + 1)
    if lo == hi:
        return sorted_values[lo]
    fraction = pos - lo
    return sorted_values[lo] * (1 - fraction) + sorted_values[hi] * fraction


def as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    return split_pipe(str(value))


def split_pipe(value: Any) -> list[str]:
    if not value:
        return []
    return [part for part in str(value).split("|") if part]


def to_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def round_float(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


if __name__ == "__main__":
    main()
