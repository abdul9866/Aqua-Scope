
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO


MODEL_PATH = Path(__file__).resolve().parent / "models" / "best.pt"

TRASH_CLASSES = {
    "trash_clothing",
    "trash_pipe",
    "trash_bottle",
    "trash_bag",
    "trash_snack_wrapper",
    "trash_can",
    "trash_cup",
    "trash_container",
    "trash_unknown_instance",
    "trash_branch",
    "trash_wreckage",
    "trash_tarp",
    "trash_rope",
    "trash_net",
}

NON_TRASH_CLASSES = {
    "rov",
    "plant",
    "animal_fish",
    "animal_starfish",
    "animal_shells",
    "animal_crab",
    "animal_eel",
    "animal_etc",
}

_detection_model = None


def get_detection_model():
    global _detection_model

    if _detection_model is None:
        if not MODEL_PATH.is_file() or MODEL_PATH.stat().st_size == 0:
            raise FileNotFoundError(
                f"YOLO model weights not found or empty: {MODEL_PATH}"
            )

        _detection_model = YOLO(str(MODEL_PATH))

    return _detection_model


def detect_objects(image_rgb):
    model = get_detection_model()

    results = model.predict(
        source=image_rgb,
        conf=0.10,
        verbose=False,
        device="cpu",
    )

    trash_detections = []
    non_trash_names = []

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            class_name = model.names[class_id]

            if class_name in TRASH_CLASSES:
                x1, y1, x2, y2 = map(
                    int, box.xyxy[0].cpu().numpy()
                )

                trash_detections.append({
                    "class_name": class_name,
                    "confidence": confidence,
                    "box": (x1, y1, x2, y2),
                })

            elif class_name in NON_TRASH_CLASSES:
                if class_name not in non_trash_names:
                    non_trash_names.append(class_name)

    return trash_detections, non_trash_names


def draw_trash_boxes(image_rgb, detections):
    output = image_rgb.copy()

    for detection in detections:
        x1, y1, x2, y2 = detection["box"]
        class_name = detection["class_name"]
        confidence = detection["confidence"]

        cv2.rectangle(
            output,
            (x1, y1),
            (x2, y2),
            (255, 0, 255),
            3,
        )

        label = f"TRASH: {class_name} {confidence:.2f}"

        cv2.putText(
            output,
            label,
            (x1, max(y1 - 10, 25)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 0, 255),
            2,
            cv2.LINE_AA,
        )

    return output
