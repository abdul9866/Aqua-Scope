
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

_segmentation_model = None


def get_segmentation_model():
    global _segmentation_model

    if _segmentation_model is None:
        if not MODEL_PATH.is_file() or MODEL_PATH.stat().st_size == 0:
            raise FileNotFoundError(
                f"Segmentation model not found or empty: {MODEL_PATH}"
            )

        model = YOLO(str(MODEL_PATH))

        if model.task != "segment":
            raise ValueError(
                f"Expected a segmentation model, got: {model.task}"
            )

        _segmentation_model = model

    return _segmentation_model


def segment_image(image_rgb):
    if (
        not isinstance(image_rgb, np.ndarray)
        or image_rgb.ndim != 3
        or image_rgb.shape[2] != 3
        or image_rgb.size == 0
    ):
        raise ValueError("Expected a valid RGB image.")

    model = get_segmentation_model()

    result = model.predict(
        source=image_rgb,
        imgsz=640,
        conf=0.25,
        device="cpu",
        verbose=False,
    )[0]

    segmented_rgb = image_rgb.copy()
    segments = []

    if result.masks is None or result.boxes is None:
        return segmented_rgb, segments

    masks = result.masks.data.cpu().numpy()

    for index, mask in enumerate(masks):
        class_id = int(result.boxes.cls[index].item())
        class_name = model.names[class_id]
        confidence = float(result.boxes.conf[index].item())

        if class_name not in TRASH_CLASSES:
            continue

        mask = cv2.resize(
            mask.astype(np.float32),
            (image_rgb.shape[1], image_rgb.shape[0]),
            interpolation=cv2.INTER_NEAREST,
        )

        binary_mask = mask > 0.5

        if not np.any(binary_mask):
            continue

        overlay = segmented_rgb.copy()
        overlay[binary_mask] = (255, 0, 0)

        segmented_rgb = cv2.addWeighted(
            segmented_rgb,
            0.6,
            overlay,
            0.4,
            0,
        )

        contours, _ = cv2.findContours(
            binary_mask.astype(np.uint8),
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )

        cv2.drawContours(
            segmented_rgb,
            contours,
            -1,
            (0, 0, 0),
            2,
        )

        segments.append({
            "class_name": class_name,
            "confidence": round(confidence, 4),
        })

    return segmented_rgb, segments
