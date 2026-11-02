import numpy as np
import cv2

TRASH_HAZARD_WEIGHTS = {
    "trash_net": 3.0,          # High ghost net entanglement risk
    "trash_rope": 2.5,         # Marine mammal/turtle entanglement
    "trash_bag": 2.2,          # Ingestion hazard / microplastics
    "trash_bottle": 1.8,       # Long persistence plastic
    "trash_can": 1.5,          # Sharp metal edges
    "trash_pipe": 2.0,         # Heavy industrial debris
    "trash_container": 2.2,    # Chemical/plastic pollution
    "trash_snack_wrapper": 1.6,# Degradable into toxic microplastics
    "trash_cup": 1.4,
    "trash_clothing": 1.7,     # Synthetic fibers
    "trash_tarp": 2.5,         # Smothering benthic reef habitats
    "trash_wreckage": 2.0,
    "trash_branch": 0.8,       # Natural organic matter
    "trash_unknown_instance": 1.5,
}

HAZARD_DESCRIPTIONS = {
    "trash_net": "Discarded fishing net ('ghost gear') presents acute entanglement hazards to marine life and coral reefs.",
    "trash_rope": "Heavy synthetic ropes pose severe entanglement risks for marine mammals, sea turtles, and fish.",
    "trash_bag": "Plastic bags threaten marine fauna through accidental ingestion, suffocation, and long-term microplastic fragmentation.",
    "trash_bottle": "High-density polymers persist for centuries, degrading water quality and accumulating bio-fouling.",
    "trash_tarp": "Submerged tarps smother benthic coral communities and block sunlight essential for aquatic flora.",
    "trash_container": "Degrading containers may leach toxic chemical residues and phthalates into the surrounding water column.",
}


def compute_image_clarity(image_rgb):
    """
    Computes contrast, sharpness, and turbidity indicators.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Sharpness using Laplacian variance
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    # Standard deviation of luminance (contrast)
    contrast = float(np.std(gray))
    
    # Color channel balance (underwater images often have severe red attenuation)
    r_mean = float(np.mean(image_rgb[:, :, 0]))
    g_mean = float(np.mean(image_rgb[:, :, 1]))
    b_mean = float(np.mean(image_rgb[:, :, 2]))
    
    return {
        "sharpness": round(sharpness, 1),
        "contrast": round(contrast, 1),
        "channel_balance": {
            "red": round(r_mean, 1),
            "green": round(g_mean, 1),
            "blue": round(b_mean, 1),
        },
    }


def compute_comprehensive_analytics(
    original_rgb,
    enhanced_rgb,
    trash_detections,
    non_trash_objects,
    segments=None,
):
    """
    Computes full capstone analytics:
      1. Total object census & breakdown
      2. Marine Pollution Severity Index (PSI)
      3. Water quality & clarity metrics before/after NSGA-Net
      4. Debris surface area coverage percentage
    """
    h, w = original_rgb.shape[:2]
    total_pixels = h * w

    # --- 1. Total Object Census & Breakdown ---
    trash_count = len(trash_detections)
    
    # Handle non-trash objects (can be strings or list of dicts)
    marine_life_count = len(non_trash_objects)
    total_objects = trash_count + marine_life_count

    category_counts = {}
    category_confidences = {}
    sizes = {"small": 0, "medium": 0, "large": 0}
    debris_pixel_mask = np.zeros((h, w), dtype=np.uint8)

    for item in trash_detections:
        cls_name = item.get("class_name", "trash_unknown_instance")
        category_counts[cls_name] = category_counts.get(cls_name, 0) + 1
        
        conf = float(item.get("confidence", 0.0))
        category_confidences.setdefault(cls_name, []).append(conf)

        box = item.get("box")
        if box and len(box) == 4:
            x1, y1, x2, y2 = map(int, box)
            bw = max(0, x2 - x1)
            bh = max(0, y2 - y1)
            area = bw * bh
            debris_pixel_mask[y1:y2, x1:x2] = 1

            area_pct = (area / total_pixels) * 100.0
            if area_pct < 2.0:
                sizes["small"] += 1
            elif area_pct < 10.0:
                sizes["medium"] += 1
            else:
                sizes["large"] += 1

    for obj in non_trash_objects:
        cls_name = obj if isinstance(obj, str) else obj.get("class_name", "marine_fauna")
        category_counts[cls_name] = category_counts.get(cls_name, 0) + 1
        if isinstance(obj, dict):
            conf = float(obj.get("confidence", 0.75))
            category_confidences.setdefault(cls_name, []).append(conf)

    # Calculate category breakdown list
    category_breakdown = []
    for cls_name, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        avg_conf = (
            np.mean(category_confidences[cls_name])
            if cls_name in category_confidences and category_confidences[cls_name]
            else 0.80
        )
        is_trash = cls_name.startswith("trash_")
        category_breakdown.append({
            "name": cls_name,
            "display_name": cls_name.replace("trash_", "").replace("animal_", "").replace("_", " ").title(),
            "count": count,
            "percentage": round((count / max(total_objects, 1)) * 100.0, 1),
            "avg_confidence": round(float(avg_conf), 3),
            "is_trash": is_trash,
            "hazard_weight": TRASH_HAZARD_WEIGHTS.get(cls_name, 1.0) if is_trash else 0.0,
        })

    dominant_category = (
        category_breakdown[0]["display_name"]
        if category_breakdown
        else "None detected"
    )

    # --- 2. Debris Coverage Percentage ---
    debris_pixels = int(np.count_nonzero(debris_pixel_mask))
    debris_coverage_pct = round((debris_pixels / total_pixels) * 100.0, 2)
    clean_habitat_pct = round(max(0.0, 100.0 - debris_coverage_pct), 2)

    # --- 3. Marine Pollution Severity Index (PSI) ---
    weighted_hazard_sum = sum(
        TRASH_HAZARD_WEIGHTS.get(item.get("class_name", ""), 1.5)
        for item in trash_detections
    )
    
    # Base formula combining count, coverage, and hazard weights
    raw_psi = (weighted_hazard_sum * 12.0) + (debris_coverage_pct * 3.5)
    psi_score = int(np.clip(round(raw_psi), 0, 100))

    if psi_score == 0:
        psi_level = "Clean / Pristine"
        psi_color = "emerald"
        psi_desc = "No visible anthropogenic pollution detected. Benthic habitat appears preserved."
        recommendation = "Continue passive environmental monitoring; baseline water quality maintained."
    elif psi_score <= 25:
        psi_level = "Low Contamination"
        psi_color = "blue"
        psi_desc = "Minor isolated litter detected. Localized benthic disturbance."
        recommendation = "Routine scheduled coastal or reef cleanup recommended."
    elif psi_score <= 55:
        psi_level = "Moderate Risk"
        psi_color = "amber"
        psi_desc = "Multiple synthetic pollutants present. Potential hazard to local marine fauna and benthic flora."
        recommendation = "Targeted diver or ROV retrieval intervention suggested within the current survey sector."
    elif psi_score <= 80:
        psi_level = "Severe Pollution"
        psi_color = "orange"
        psi_desc = "Substantial concentration of hazardous debris. Elevated risk of ingestion and habitat degradation."
        recommendation = "High priority cleanup action required to prevent persistent environmental contamination."
    else:
        psi_level = "Critical Hazard"
        psi_color = "red"
        psi_desc = "Extensive pollution or critical ghost nets present. Immediate threat of wildlife mortality."
        recommendation = "Immediate salvage response urged; deployment of specialized recovery ROV recommended."

    # Identify specific critical threats
    flagged_hazards = []
    seen_hazards = set()
    for item in trash_detections:
        c_name = item.get("class_name", "")
        if c_name in HAZARD_DESCRIPTIONS and c_name not in seen_hazards:
            flagged_hazards.append({
                "type": c_name.replace("trash_", "").replace("_", " ").title(),
                "impact": HAZARD_DESCRIPTIONS[c_name],
            })
            seen_hazards.add(c_name)

    # --- 4. Water Quality & Enhancement Gain ---
    orig_clarity = compute_image_clarity(original_rgb)
    enh_clarity = compute_image_clarity(enhanced_rgb)

    contrast_gain = round(
        ((enh_clarity["contrast"] - orig_clarity["contrast"]) / max(orig_clarity["contrast"], 1.0)) * 100.0,
        1,
    )
    sharpness_gain = round(
        ((enh_clarity["sharpness"] - orig_clarity["sharpness"]) / max(orig_clarity["sharpness"], 1.0)) * 100.0,
        1,
    )

    return {
        "census": {
            "total_objects": total_objects,
            "trash_count": trash_count,
            "marine_life_count": marine_life_count,
            "dominant_category": dominant_category,
            "category_breakdown": category_breakdown,
            "size_distribution": sizes,
        },
        "severity": {
            "score": psi_score,
            "level": psi_level,
            "color": psi_color,
            "description": psi_desc,
            "recommendation": recommendation,
            "flagged_hazards": flagged_hazards,
        },
        "coverage": {
            "debris_coverage_pct": debris_coverage_pct,
            "clean_habitat_pct": clean_habitat_pct,
            "debris_pixels": debris_pixels,
            "total_frame_pixels": total_pixels,
        },
        "water_quality": {
            "original_contrast": orig_clarity["contrast"],
            "enhanced_contrast": enh_clarity["contrast"],
            "contrast_gain_pct": contrast_gain,
            "sharpness_gain_pct": sharpness_gain,
            "original_balance": orig_clarity["channel_balance"],
            "enhanced_balance": enh_clarity["channel_balance"],
            "turbidity_mitigation": "High" if contrast_gain > 20 else "Moderate" if contrast_gain > 5 else "Optimal",
        },
    }
