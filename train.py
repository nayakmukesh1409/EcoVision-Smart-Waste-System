"""
Train a custom YOLO object detector.
Before running, prepare a correctly labeled YOLO detection dataset and edit data.yaml.
"""
from ultralytics import YOLO

# Start from pretrained weights (transfer learning).
model = YOLO("yolo26n.pt")

model.train(
    data="data.yaml",
    epochs=100,
    imgsz=640,
    batch=8,       # Reduce to 4 or 2 if GPU memory is insufficient.
    patience=20,
    workers=2,
    project="training_runs",
    name="smart_waste",
    pretrained=True
)

# Validate the best checkpoint after training.
best_model = YOLO("training_runs/smart_waste/weights/best.pt")
metrics = best_model.val(data="data.yaml", imgsz=640)
print(metrics)
