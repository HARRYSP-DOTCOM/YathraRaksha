"""One-time download of YOLOv8n weights into backend/models/yolov8n-road.pt."""

from pathlib import Path

from ultralytics import YOLO

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
dest = MODELS_DIR / "yolov8n-road.pt"

print("Downloading YOLOv8n pretrained weights...")
model = YOLO("yolov8n.pt")
model.save(str(dest))
print(f"Model saved to {dest}")
