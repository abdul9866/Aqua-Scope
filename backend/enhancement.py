
from pathlib import Path
import sys

import cv2
import numpy as np
import torch

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
NU2_ROOT = MODELS_DIR / "NU2Net_UIE"
NU2_CHECKPOINT = MODELS_DIR / "NU2Net.ckpt"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_nu2_model = None


def get_device():
    return str(DEVICE)


def load_enhancement_model():
    global _nu2_model

    if _nu2_model is not None:
        return _nu2_model

    if not NU2_ROOT.is_dir():
        raise FileNotFoundError(
            f"NU2Net source folder not found: {NU2_ROOT}"
        )

    if not NU2_CHECKPOINT.is_file():
        raise FileNotFoundError(
            f"NU2Net checkpoint not found: {NU2_CHECKPOINT}"
        )

    if str(NU2_ROOT) not in sys.path:
        sys.path.insert(0, str(NU2_ROOT))

    try:
        from model.NU2Net import NU2Net
    except ImportError as exc:
        raise RuntimeError(
            "Could not import NU2Net. Check the source files "
            "inside backend/models/NU2Net_UIE."
        ) from exc

    model = NU2Net()

    # Load the trusted training checkpoint.
    checkpoint = torch.load(
        NU2_CHECKPOINT,
        map_location="cpu",
        weights_only=False,
    )

    if not isinstance(checkpoint, dict):
        raise RuntimeError(
            "Invalid NU2Net checkpoint: expected a dictionary."
        )

    # PyTorch Lightning checkpoints store model weights in state_dict.
    state_dict = checkpoint.get("state_dict", checkpoint)

    if not isinstance(state_dict, dict):
        raise RuntimeError(
            "Invalid NU2Net checkpoint: state_dict is missing "
            "or is not a dictionary."
        )

    # Keep only the actual NU2Net model weights.
    # Ignore training-only weights such as per_loss.vgg_layers.*.
    cleaned_state_dict = {}

    for key, value in state_dict.items():
        if key.startswith("model."):
            cleaned_key = key[len("model."):]
            cleaned_state_dict[cleaned_key] = value

        elif key.startswith("module.model."):
            cleaned_key = key[len("module.model."):]
            cleaned_state_dict[cleaned_key] = value

        elif key.startswith("module."):
            cleaned_key = key[len("module."):]
            cleaned_state_dict[cleaned_key] = value

        elif key.startswith(("encoder.", "decoder.")):
            cleaned_state_dict[key] = value

    if not cleaned_state_dict:
        raise RuntimeError(
            "No NU2Net model weights were found in the checkpoint. "
            "Expected keys beginning with model.encoder., "
            "model.decoder., encoder., or decoder."
        )

    try:
        # Strict loading ensures the architecture and weights match.
        model.load_state_dict(cleaned_state_dict, strict=True)

    except RuntimeError as exc:
        missing, unexpected = model.load_state_dict(
            cleaned_state_dict,
            strict=False,
        ) if False else ([], [])

        raise RuntimeError(
            "NU2Net checkpoint weights still do not match the "
            "installed NU2Net architecture. The training-only "
            "weights have been excluded and model prefixes removed. "
            "Check whether NU2Net.py is the same version used to "
            "create this checkpoint. "
            f"Details: {exc}"
        ) from exc

    model = model.to(DEVICE)
    model.eval()

    _nu2_model = model

    print(f"NU2Net loaded successfully on {DEVICE}")
    print(f"Loaded {len(cleaned_state_dict)} model weight entries.")

    return _nu2_model


def enhance_image(image_rgb):
    if image_rgb is None or image_rgb.size == 0:
        raise ValueError("The input image is empty.")

    if image_rgb.ndim != 3 or image_rgb.shape[2] != 3:
        raise ValueError(
            "Expected an RGB image with three channels."
        )

    model = load_enhancement_model()

    height, width = image_rgb.shape[:2]

    # Pad dimensions to multiples of 16, as in the Colab pipeline.
    pad_h = (16 - height % 16) % 16
    pad_w = (16 - width % 16) % 16

    padded = cv2.copyMakeBorder(
        image_rgb,
        0,
        pad_h,
        0,
        pad_w,
        cv2.BORDER_REFLECT,
    )

    input_tensor = (
        torch.from_numpy(padded.astype(np.float32) / 255.0)
        .permute(2, 0, 1)
        .unsqueeze(0)
        .to(DEVICE)
    )

    with torch.inference_mode():
        output = model(input_tensor)

    if isinstance(output, (tuple, list)):
        output = output[0]

    if not isinstance(output, torch.Tensor):
        raise RuntimeError("NU2Net did not return a tensor.")

    output = (
        output.squeeze(0)
        .detach()
        .cpu()
        .permute(1, 2, 0)
        .numpy()
    )

    output = np.clip(output, 0.0, 1.0)
    enhanced_rgb = (output * 255.0).astype(np.uint8)

    # Remove padding without changing the original image dimensions.
    return enhanced_rgb[:height, :width]
