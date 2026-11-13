# Smart Waste Classification and Counting System

## Important
The website uses a real custom YOLO model. It intentionally does not invent predictions.
You must train or obtain a compatible object-detection model and place it at `models/best.pt`.

## Setup (Windows / VS Code)
1. Install Python 3.11 or 3.12 and VS Code's Python extension.
2. Open this folder in VS Code.
3. Terminal:
   `python -m venv venv`
   `venv\\Scripts\\activate`
   `pip install -r requirements.txt`
4. Put your trained model at `models/best.pt`.
5. Run `python app.py`
6. Open `http://127.0.0.1:5000`.

## Dataset requirements
`data.yaml` expects:
dataset/
  images/train, images/val, images/test
  labels/train, labels/val, labels/test

Each image must have a same-named `.txt` annotation file. One row per object:
`class_id x_center y_center width height`
Coordinates must be normalized 0..1. Class IDs:
0 Plastic, 1 Paper, 2 Metal, 3 Glass, 4 Organic.

## Training
Edit data.yaml paths, then run:
`python train.py`
After training, copy:
`training_runs/smart_waste/weights/best.pt`
to:
`models/best.pt`

For CPU training, reduce batch and expect it to be slow. A GPU/cloud GPU is recommended.
Evaluate on a held-out test set; don't claim accuracy without validation results.

## Notes
- Confidence threshold in app.py is 0.35; tune on validation images.
- Detection count is the number of accepted bounding boxes, not necessarily unique physical objects if the model produces duplicate detections.
- Dataset licensing and Ultralytics licensing should be checked before redistribution.
