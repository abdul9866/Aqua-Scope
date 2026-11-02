@echo off
title Aqua Scope Backend - FastAPI
cd /d "%~dp0backend"
echo ========================================================
echo Starting Aqua Scope Backend (FastAPI on Port 8000)...
echo Models: NSGA-Net + YOLOv8 + YOLOv12 + Grad-CAM Heatmaps
echo ========================================================
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
