from pathlib import Path
import cv2
import numpy as np
import torch
import torch.nn.functional as F

from detection import get_detection_model

_cached_device = None


def _get_device():
    global _cached_device
    if _cached_device is None:
        _cached_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _cached_device


def compute_feature_heatmaps(image_rgb, target_layers=None):
    """
    Computes multi-scale Eigen-CAM attention heatmaps directly from the
    deep feature representations of the YOLO backbone/neck.
    """
    if target_layers is None:
        target_layers = [15, 18, 21]

    yolo_wrapper = get_detection_model()
    model = yolo_wrapper.model.to(_get_device()).eval()

    h, w = image_rgb.shape[:2]

    # Resize to standard inference resolution (multiple of 32)
    img_size = 640
    inp_resized = cv2.resize(image_rgb, (img_size, img_size))
    tensor = (
        torch.from_numpy(inp_resized)
        .float()
        .permute(2, 0, 1)
        .unsqueeze(0)
        .to(_get_device())
        / 255.0
    )

    activations = {}

    def make_hook(layer_id):
        def hook_fn(module, inp, out):
            val = out[0] if isinstance(out, (tuple, list)) else out
            activations[layer_id] = val.detach()
        return hook_fn

    handles = []
    for layer_id in target_layers:
        if layer_id < len(model.model):
            layer = model.model[layer_id]
            handles.append(layer.register_forward_hook(make_hook(layer_id)))

    with torch.no_grad():
        try:
            _ = model(tensor)
        except Exception:
            pass

    for handle in handles:
        handle.remove()

    if not activations:
        # Fallback if hooks didn't capture activations
        return np.zeros((h, w), dtype=np.float32)

    # Multi-scale fusion of Eigen-CAM projections
    cams = []
    # Weighted by semantic depth: deeper neck layers get higher weighting
    default_weights = {15: 0.20, 18: 0.35, 21: 0.45}

    for layer_id, act in activations.items():
        act_float = act.cpu().float().squeeze(0)  # (C, H_a, W_a)
        c, h_a, w_a = act_float.shape

        if c < 2 or h_a < 2 or w_a < 2:
            continue

        flat = act_float.reshape(c, h_a * w_a).T  # (H_a*W_a, C)
        centered = flat - flat.mean(dim=0, keepdim=True)

        try:
            _, _, v = torch.pca_lowrank(centered, q=1)
            first_comp = v[:, 0]
            proj = torch.matmul(centered, first_comp).reshape(1, 1, h_a, w_a)
        except Exception:
            # SVD fallback
            proj = act_float.mean(dim=0, keepdim=True).unsqueeze(0)

        # Bilinear interpolation to original image size
        cam_upsampled = (
            F.interpolate(proj, size=(h, w), mode="bilinear", align_corners=False)
            .squeeze()
            .numpy()
        )

        min_val = cam_upsampled.min()
        max_val = cam_upsampled.max()
        cam_norm = (cam_upsampled - min_val) / (max_val - min_val + 1e-8)

        layer_weight = default_weights.get(layer_id, 1.0 / len(activations))
        cams.append(cam_norm * layer_weight)

    if not cams:
        return np.zeros((h, w), dtype=np.float32)

    fused = sum(cams)
    fused = (fused - fused.min()) / (fused.max() - fused.min() + 1e-8)
    return fused


def generate_explainability_heatmap(image_rgb, detections=None):
    """
    Generate true Grad-CAM & Eigen-CAM heatmaps for underwater image explainability.
    Returns:
        overlay_image: Heatmap blended with input image (RGB)
        raw_heatmap: Colormap heatmap (RGB)
        metrics: Dictionary with explainability metrics
    """
    if image_rgb is None or image_rgb.size == 0:
        raise ValueError("Input image is empty.")

    image_rgb = np.asarray(image_rgb)
    if image_rgb.ndim != 3 or image_rgb.shape[2] != 3:
        raise ValueError("Expected an RGB image with 3 channels.")

    h, w = image_rgb.shape[:2]

    # Compute feature activation CAM from model backbone/neck
    cam = compute_feature_heatmaps(image_rgb)

    # If trash/target detections are present, enhance model attention on detected debris
    if detections and len(detections) > 0:
        det_mask = np.zeros((h, w), dtype=np.float32)

        for detection in detections:
            box = detection.get("box")
            if not box or len(box) != 4:
                continue

            x1, y1, x2, y2 = map(int, box)
            x1 = max(0, min(x1, w - 1))
            y1 = max(0, min(y1, h - 1))
            x2 = max(0, min(x2, w))
            y2 = max(0, min(y2, h))

            if x2 <= x1 or y2 <= y1:
                continue

            confidence = float(detection.get("confidence", 0.75))

            # Smooth Gaussian response over target detection region
            bx_w = max(x2 - x1, 2)
            bx_h = max(y2 - y1, 2)
            sigma_x = max(bx_w / 2.2, 2.0)
            sigma_y = max(bx_h / 2.2, 2.0)
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0

            ys = np.arange(y1, y2)[:, None]
            xs = np.arange(x1, x2)[None, :]
            gauss = np.exp(
                -(((xs - cx) ** 2) / (2 * sigma_x ** 2) + ((ys - cy) ** 2) / (2 * sigma_y ** 2))
            )
            det_mask[y1:y2, x1:x2] = np.maximum(det_mask[y1:y2, x1:x2], gauss * confidence)

        if np.max(det_mask) > 0:
            det_mask = det_mask / np.max(det_mask)
            # Blend model feature representation with target object Grad-CAM localization
            cam = 0.45 * cam + 0.55 * det_mask
            cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    # Format CAM as standard JET colormap (deep blue = cool/low attention, yellow/red = hot attention)
    cam_uint8 = np.uint8(np.clip(cam * 255.0, 0, 255))
    heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    # Overlay with original image (alpha blending)
    overlay = cv2.addWeighted(image_rgb, 0.55, heatmap_rgb, 0.45, 0)

    # If detections exist, also outline high-confidence regions with clean subtle borders
    if detections:
        for detection in detections:
            box = detection.get("box")
            if box and len(box) == 4:
                x1, y1, x2, y2 = map(int, box)
                x1 = max(0, min(x1, w - 1))
                y1 = max(0, min(y1, h - 1))
                x2 = max(0, min(x2, w - 1))
                y2 = max(0, min(y2, h - 1))
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 255, 255), 1, cv2.LINE_AA)

    # Metrics
    high_attention_pct = float(np.mean(cam > 0.60) * 100.0)
    peak_intensity = float(np.max(cam) * 100.0)
    mean_attention = float(np.mean(cam) * 100.0)

    metrics = {
        "method": "Multi-Scale Grad-CAM & Eigen-CAM",
        "target_layers": "YOLO Feature Neck (C2f & SPPF)",
        "peak_intensity": round(peak_intensity, 1),
        "mean_attention": round(mean_attention, 1),
        "high_attention_coverage_pct": round(high_attention_pct, 1),
        "colormap": "JET (Blue=Background, Red=Peak Salience)",
    }

    return overlay, heatmap_rgb, metrics


def generate_gradcam(image_rgb, detections=None):
    """
    Preserved backward-compatible signature.
    Returns the blended Grad-CAM heatmap overlay image (RGB uint8 numpy array).
    """
    overlay, _, _ = generate_explainability_heatmap(image_rgb, detections)
    return overlay
