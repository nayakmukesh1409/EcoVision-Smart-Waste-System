
import os
import uuid
import cv2
from flask import Flask, request, jsonify, render_template, url_for
from ultralytics import YOLO

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
RESULT_DIR = os.path.join(BASE_DIR, "static", "results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# Load trained model
if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(
        f"best.pt is missing at: {MODEL_PATH}"
    )

model = YOLO(MODEL_PATH)
# Separate person detection model
person_model = YOLO("yolo11n.pt")

print("PERSON MODEL LOADED")

print("\nMODEL LOADED:", MODEL_PATH)
print("MODEL CLASSES:", model.names)

# Class ID mapping from your trained dataset
CLASS_NAME_MAP = {
    "glass": "Glass",
    "metal": "Metal",
    "organic waste": "Organic Waste",
    "paper and cardboard": "Paper and Cardboard",
    "plastic": "Plastic"
}

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():

    if "image" not in request.files:
        return jsonify({"error": "Image field missing"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No image selected"}), 400

    image_id = uuid.uuid4().hex

    input_path = os.path.join(
        UPLOAD_DIR, image_id + ".jpg"
    )

    output_path = os.path.join(
        RESULT_DIR, image_id + "_annotated.jpg"
    )

    try:
        file.save(input_path)

        image = cv2.imread(input_path)

        if image is None:
            return jsonify({"error": "Invalid image"}), 400

        # AI prediction
        results = model.predict(
            source=image,
            conf=0.02,
            iou=0.45,
            imgsz=640,
            max_det=300,
            verbose=False
        )
            # Detect people separately
        person_results = person_model.predict(
            source=image,
            classes=[0],
            conf=0.35,
            verbose=False
        )

        person_boxes = []

        for box in person_results[0].boxes:
            px1, py1, px2, py2 = map(
                int, box.xyxy[0].tolist()
            )
            person_boxes.append((px1, py1, px2, py2))

        people_count = len(person_boxes)

        print("PEOPLE DETECTED:", people_count)
        print("PERSON BOXES:", person_boxes)
        result = results[0]

        counts = {
    "Glass": 0,
    "Metal": 0,
    "Organic Waste": 0,
    "Paper and Cardboard": 0,
    "Plastic": 0
}

        detections = []

        print("\n----- AI DETECTION -----")
        print("Model classes:", model.names)
        print("Boxes found:", len(result.boxes))

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            # Use trained class ID directly
            model_class_name = str(model.names[class_id]).strip().lower()

            category = CLASS_NAME_MAP.get(model_class_name)

            print(
                "Detected:",
                model.names[class_id],
                "Confidence:",
                round(confidence, 3)
            )

            if category is None:
                continue

            x1, y1, x2, y2 = map(
                int, box.xyxy[0].tolist()
            )
 # Check whether detection is inside a person
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2

            inside_person = any(
                     px1 <= cx <= px2 and py1 <= cy <= py2
                    for px1, py1, px2, py2 in person_boxes
)

            if inside_person:
                 continue
        

            counts[category] += 1

            detections.append({
                "class": category,
                "confidence": round(confidence * 100, 2),
                "box": [x1, y1, x2, y2]
            })

            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                3
            )

            cv2.putText(
                image,
                f"{category} {confidence:.2f}",
                (x1, max(y1 - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

        total = len(detections)

        percentages = {
            category: round(count / total * 100, 2)
            if total else 0
            for category, count in counts.items()
        }

        cv2.imwrite(output_path, image)

        print("TOTAL WASTE:", total)
        print("----------------------\n")

        return jsonify({
            "success": True,
            "total": total,
            "people_count": people_count,
            "categories_detected": sum(
                count > 0 for count in counts.values()
            ),
            "counts": counts,
            "percentages": percentages,
            "detections": detections,
            "annotated_image": url_for(
                "static",
                filename="results/" + image_id + "_annotated.jpg"
            )
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)




