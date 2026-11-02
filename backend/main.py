import base64
from io import BytesIO

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from enhancement import enhance_image, get_device
from detection import detect_objects, draw_trash_boxes
from segmentation import segment_image
from explainability import generate_explainability_heatmap, generate_gradcam
from analytics import compute_comprehensive_analytics
from auth import router as auth_router


app = FastAPI(title="Aqua Scope API")

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 15 * 1024 * 1024


@app.get("/")
def home():
    return {
        "message": "Aqua Scope backend is running",
        "models": {
            "enhancement": "NSGA-Net / NU2Net",
            "detection": "YOLOv8",
            "segmentation": "YOLOv12",
            "explainability": "Grad-CAM & Eigen-CAM Multi-Scale Heatmaps",
        },
        "features": [
            "Image Enhancement",
            "Pollution Detection",
            "Trash Segmentation",
            "Grad-CAM Attention Heatmaps",
            "Total Object Count & Census",
            "Marine Pollution Severity Index (PSI)",
            "Water Quality & Clarity Gain Assessment",
            "Debris Surface Area Coverage Percentage",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": "Aqua Scope",
        "device": get_device(),
    }


async def read_image(file: UploadFile):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file.",
        )

    contents = await file.read(MAX_FILE_SIZE + 1)

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 15 MB.",
        )

    image_array = np.frombuffer(contents, dtype=np.uint8)
    image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image_bgr is None:
        raise HTTPException(
            status_code=400,
            detail="Could not read this image. Try a JPG or PNG file.",
        )

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    return image_rgb, len(contents)


def image_to_data_url(image_rgb):
    if image_rgb is None:
        return None
    image = Image.fromarray(image_rgb)
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=False)

    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return f"data:image/png;base64,{encoded}"


def run_segmentation_if_needed(image_rgb, trash_detections):
    if not trash_detections:
        return {
            "segmentation_image": None,
            "segments": [],
            "segmentation_status": "skipped_no_trash_detected",
            "segmentation_error": None,
        }

    try:
        overlay, segments = segment_image(image_rgb)

        return {
            "segmentation_image": image_to_data_url(overlay),
            "segments": segments,
            "segmentation_status": "completed",
            "segmentation_error": None,
        }

    except Exception as exc:
        return {
            "segmentation_image": None,
            "segments": [],
            "segmentation_status": "failed",
            "segmentation_error": str(exc),
        }


def run_explainability(image_rgb, trash_detections):
    try:
        overlay, raw_heat, metrics = generate_explainability_heatmap(
            image_rgb,
            trash_detections,
        )

        return {
            "explainability_heatmap": image_to_data_url(overlay),
            "explainability_raw_heatmap": image_to_data_url(raw_heat),
            "explainability_metrics": metrics,
            "explainability_status": "completed",
            "explainability_error": None,
        }

    except Exception as exc:
        return {
            "explainability_heatmap": None,
            "explainability_raw_heatmap": None,
            "explainability_metrics": None,
            "explainability_status": "failed",
            "explainability_error": str(exc),
        }


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    image_rgb, size_bytes = await read_image(file)

    return {
        "success": True,
        "message": "Image received successfully.",
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": size_bytes,
        "width": int(image_rgb.shape[1]),
        "height": int(image_rgb.shape[0]),
    }


@app.post("/enhance")
async def enhance_endpoint(file: UploadFile = File(...)):
    image_rgb, _ = await read_image(file)

    try:
        enhanced_rgb = enhance_image(image_rgb)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Image enhancement failed: {exc}",
        ) from exc

    return {
        "success": True,
        "message": "Image enhancement completed.",
        "original_image": image_to_data_url(image_rgb),
        "enhanced_image": image_to_data_url(enhanced_rgb),
        "device": get_device(),
    }


@app.post("/detect")
async def detect_endpoint(file: UploadFile = File(...)):
    image_rgb, _ = await read_image(file)

    try:
        trash, non_trash = detect_objects(image_rgb)
        detection_image = draw_trash_boxes(image_rgb, trash)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Pollution detection failed: {exc}",
        ) from exc

    return {
        "success": True,
        "message": (
            "Trash detected."
            if trash
            else "No trash detected by the model."
        ),
        "trash_detections": trash,
        "non_trash_objects": non_trash,
        "trash_detected": bool(trash),
        "detection_image": image_to_data_url(detection_image),
    }


@app.post("/segment")
async def segment_endpoint(file: UploadFile = File(...)):
    image_rgb, _ = await read_image(file)

    try:
        overlay, segments = segment_image(image_rgb)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Segmentation failed: {exc}",
        ) from exc

    return {
        "success": True,
        "message": "Segmentation completed.",
        "segmentation_image": image_to_data_url(overlay),
        "segments": segments,
    }


@app.post("/explain")
async def explain_endpoint(file: UploadFile = File(...)):
    image_rgb, _ = await read_image(file)

    try:
        trash, non_trash = detect_objects(image_rgb)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Detection for explainability failed: {exc}",
        ) from exc

    explainability_result = run_explainability(
        image_rgb,
        trash,
    )

    return {
        "success": True,
        "message": (
            "Visual explanation generated using Grad-CAM."
            if explainability_result["explainability_status"] == "completed"
            else "Visual explanation could not be generated."
        ),
        "trash_detections": trash,
        "non_trash_objects": non_trash,
        "trash_detected": bool(trash),
        **explainability_result,
    }


@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    image_rgb, _ = await read_image(file)

    try:
        # Stage 1: Enhance the input using NSGA-Net / NU2Net.
        enhanced_rgb = enhance_image(image_rgb)

        # Stage 2: Detect pollution on the original image (YOLOv8).
        trash, non_trash = detect_objects(image_rgb)

        # Use the same detections for both image views.
        original_detection = draw_trash_boxes(image_rgb, trash)
        enhanced_detection = draw_trash_boxes(enhanced_rgb, trash)

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Enhancement or detection failed. Check the model "
                f"weights and dependencies. Details: {exc}"
            ),
        ) from exc

    # Stage 3: Run segmentation (YOLOv12) only when trash is detected.
    segmentation_result = run_segmentation_if_needed(
        image_rgb,
        trash,
    )

    # Stage 4: Generate a visual explanation of the detections (Grad-CAM & Eigen-CAM).
    explainability_result = run_explainability(
        image_rgb,
        trash,
    )

    # Stage 5: Capstone Analytics (Total Object Census, PSI, Water Quality, Debris Coverage)
    analytics_result = compute_comprehensive_analytics(
        image_rgb,
        enhanced_rgb,
        trash,
        non_trash,
        segmentation_result.get("segments", []),
    )

    return {
        "success": True,
        "message": (
            "Enhancement, detection, segmentation, visual explanation, and analytics completed."
            if (
                segmentation_result["segmentation_status"] == "completed"
                and explainability_result["explainability_status"] == "completed"
            )
            else "Image analysis completed. Check each stage status for details."
        ),
        "original_image": image_to_data_url(image_rgb),
        "enhanced_image": image_to_data_url(enhanced_rgb),
        "original_detection_image": image_to_data_url(original_detection),
        "enhanced_detection_image": image_to_data_url(enhanced_detection),
        "trash_detections": trash,
        "non_trash_objects": non_trash,
        "trash_detected": bool(trash),
        "device": get_device(),
        "analytics": analytics_result,
        **segmentation_result,
        **explainability_result,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

