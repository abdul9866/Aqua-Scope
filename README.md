# Aqua Scope: Underwater Pollution Detection & Explainable AI Pipeline

An advanced, end-to-end underwater computer vision capstone project integrating deep optical enhancement, object localization, pixel-level contour segmentation, and explainable AI (Grad-CAM & Eigen-CAM) attention heatmaps.

---

## 🌟 Core Architecture & Pipeline Stages

1. **Stage 01 — Introduction & Ingestion**:
   - High-throughput image ingestion pipeline supporting high-resolution underwater captures (up to 15 MB).
   - Pre-loaded one-click test scenes (Seabed Debris Scene & Marine Habitat Scene).

2. **Stage 02 — Image Enhancement (NU²Net / NSGA-Net)**:
   - Deep residual convolutional architecture engineered specifically for underwater optical degradation.
   - Mitigates severe red wavelength absorption, light backscatter, and turbidity.
   - Interactive Before/After split slider allowing dynamic side-by-side comparison of optical restoration.

3. **Stage 03 — Pollution Detection (YOLOv8)**:
   - Synchronized dual-view bounding boxes (rendered on both raw underwater capture and enhanced view).
   - Trained on 22 TrashCan benchmark categories (plastic bags, bottles, fishing nets, wreckage, ropes, etc.) while distinguishing marine fauna and benthic flora.

4. **Stage 04 — Pixel-Level Segmentation (YOLOv12)**:
   - Pixel-accurate instance masks delineating exact contour boundaries of detected debris.
   - Executes conditionally upon detection of anthropogenic waste to quantify exact contaminated spatial footprint.

5. **Stage 05 — Explainable AI (Grad-CAM & Eigen-CAM Multi-Scale Heatmaps)**:
   - Visual model interpretability through multi-scale feature projection across deep convolutional neck layers (C2f & SPPF).
   - Generates both a blended Jet heatmap overlay and a pure colormap activation map with a cool-to-warm saliency scale.
   - Computes quantitative explainability metrics (Peak Attention Score, Mean Salience, High-Attention Coverage %).

6. **Stage 06 — Capstone Environmental Analytics & Object Census**:
   - **Feature 1: Total Object Count & Ecological Census**:
     - Total object count in the scene.
     - Breakdown between anthropogenic trash vs marine fauna/flora.
     - Dominant category identification and full category distribution percentages.
     - Spatial size classification (Small debris <2% area, Medium 2–10%, Large >10%).
   - **Feature 2: Marine Pollution Severity Index (PSI)**:
     - Standardized 0–100 environmental risk index calculated using weighted hazard coefficients (e.g. ghost fishing nets and synthetic ropes carry high entanglement risks; single-use plastics carry microplastic fragmentation risks).
     - Color-coded severity tiers: Clean / Pristine, Low Contamination, Moderate Risk, Severe Pollution, and Critical Hazard.
     - Tailored actionable environmental cleanup recommendations.
     - Real-time flagging of critical ecological hazards (ghost gear, toxic container leaching).
   - **Feature 3: Water Quality & Clarity Diagnostics**:
     - Quantifies contrast gain percentage, sharpness boost percentage, and RGB channel balance restoration.
     - Debris surface area coverage percentage vs preserved clean benthic habitat percentage.
   - **Feature 4: One-Click Audit Dossier Export**:
     - Print-optimized inspection report for presentations and capstone documentation.

---

## 🚀 How to Run the Project

### Option A: One-Click Launch (Recommended)
Double-click `start_all.bat` in the project root. This automatically:
1. Starts the FastAPI backend at `http://127.0.0.1:8000`.
2. Starts the React Vite frontend at `http://localhost:5173`.
3. Opens your default web browser directly to the application.

### Option B: Manual Command Line Launch

#### 1. Backend (FastAPI):
```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

#### 2. Frontend (React + Vite):
```bash
cd web
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📂 Project Structure

```
├── backend/
│   ├── models/
│   │   ├── best.pt              # YOLOv8 detection & YOLOv12 segmentation weights
│   │   ├── NU2Net.ckpt          # NU2Net image enhancement checkpoint
│   │   └── NU2Net_UIE/          # NU2Net neural network architecture
│   ├── enhancement.py           # NU2Net enhancement inference module
│   ├── detection.py             # YOLOv8 object detection module
│   ├── segmentation.py          # YOLOv12 pixel segmentation module
│   ├── explainability.py        # Grad-CAM & Eigen-CAM multi-scale attention heatmaps
│   ├── analytics.py             # Object census, PSI score, water clarity diagnostics
│   ├── main.py                  # FastAPI REST endpoints & orchestration
│   ├── requirements.txt         # Python dependencies
│   └── venv/                    # Virtual environment
├── web/
│   ├── src/
│   │   ├── App.jsx              # Main UI component with full 6-stage dossier
│   │   ├── App.css              # Custom styling, slider, jet gradient & print styles
│   │   └── main.jsx
│   ├── public/
│   │   └── samples/             # Curated underwater test scenes
│   └── package.json             # Vite & React dependencies
├── start_all.bat                # One-click dual server launcher
└── README.md                    # Project documentation
```

---

## 📱 Progressive Web App (PWA) & Mobile Application

Aqua Scope is a complete Progressive Web App (PWA) configured for mobile installation:
- **Mobile-Ready**: Add to Home Screen on iOS and Android devices for a native, full-screen mobile app experience.
- **Service Worker (`sw.js`)**: Offline caching of shell assets, fonts, icons, and diagnostic layouts.
- **Web App Manifest (`manifest.json`)**: Standalone display mode, ocean theme branding (`#237f72`), and adaptive maskable icons.
- **Install Prompt**: 1-click "Install App" button in the navigation bar and an adaptive mobile installation prompt with step-by-step Apple iOS instructions.

---

## 👤 Researcher Authentication & Profile Management

- **Sign In & Sign Up**: Full credential-based authentication with password visibility toggle, validation, and persistent sessions.
- **1-Click Demo Account**: Evaluators can instantly test authentication with 1 click as `Dr. Marina Chen` (`demo@aquascope.org` / `password123`).
- **Profile Symbol & Details Modal**: Shows researcher credentials, verified badge, platform ID, institution, and research bio.
- **Live Diagnostics Tracking**: Dynamically tracks total underwater scans run and audit dossiers exported.
- **Editable Profile**: Researchers can update their name, role, affiliation, and research notes directly from the profile modal.
