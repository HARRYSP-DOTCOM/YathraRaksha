"""
YOLOv8 road defect detection for YatraRaksha /v1/ai/analyze.
Loads model once at import; uses fallback pretrained YOLOv8n when custom weights missing.
"""

from __future__ import annotations

import io
import time
from pathlib import Path
from typing import Any

from PIL import Image

DEFECT_LABELS = {
    0: "Pothole",
    1: "Surface Crack",
    2: "Waterlogging",
    3: "Edge Failure",
    4: "Faded Road Marking",
    5: "Uneven Surface",
}

SEVERITY_MAP = {
    "Pothole": 8,
    "Surface Crack": 6,
    "Waterlogging": 5,
    "Edge Failure": 7,
    "Faded Road Marking": 3,
    "Uneven Surface": 4,
}

RISK_MAP = {
    1: "Low",
    2: "Low",
    3: "Low",
    4: "Medium",
    5: "Medium",
    6: "High",
    7: "High",
    8: "Critical",
    9: "Critical",
    10: "Critical",
}

PRIORITY_MAP = {
    "Critical": "Immediate — close road and repair within 24 hours",
    "High": "Urgent — repair within 48 hours",
    "Medium": "Schedule repair within 1 week",
    "Low": "Monitor — repair within 1 month",
}

REPAIR_SUGGESTIONS = {
    "Pothole": ["Mill and fill patching", "Lane closure recommended"],
    "Surface Crack": ["Crack sealing with hot bitumen", "Surface treatment"],
    "Waterlogging": ["Drainage unblocking", "Camber correction"],
    "Edge Failure": ["Edge beam repair", "Shoulder reinforcement"],
    "Faded Road Marking": ["Thermoplastic re-marking", "Night visibility audit"],
    "Uneven Surface": ["Milling and resurfacing", "Compaction check"],
}

# COCO classes that indicate non-road scene when using fallback yolov8n
COCO_NON_ROAD = {0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 39, 41, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 72, 73}

_MODEL = None
_MODEL_PATH: Path | None = None


def _models_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "models"


def analyze_image_bytes(image_bytes: bytes) -> dict[str, Any]:
    """Mock YOLOv8 inference; vision is now handled client-side via TensorFlow.js."""
    import time
    
    label = "Pothole"
    conf = 0.95
    severity = SEVERITY_MAP.get(label, 5)
    risk = RISK_MAP.get(severity, "Medium")
    
    return {
        "rejected": False,
        "rejection_reason": None,
        "detection_id": f"RWAI-{int(time.time())}",
        "defect_class": label,
        "confidence": round(conf, 3),
        "severity_score": severity,
        "risk_level": risk,
        "repair_priority": PRIORITY_MAP.get(risk, "Schedule repair"),
        "damage_area_m2": 1.5,
        "avg_depth_cm": round(severity * 0.9, 1),
        "bounding_box": {
            "x": 100,
            "y": 100,
            "w": 50,
            "h": 50,
        },
        "model_version": "client-side-tfjs",
        "suggestions": REPAIR_SUGGESTIONS.get(label, []),
    }
