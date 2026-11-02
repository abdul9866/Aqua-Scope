@echo off
title Aqua Scope - Underwater Intelligence System
echo ======================================================================
echo             AQUA SCOPE: UNDERWATER INTELLIGENCE CAPSTONE
echo    NSGA-Net + YOLOv8 + YOLOv12 + Grad-CAM + Pollution Severity Index
echo ======================================================================
echo.
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "Aqua Scope Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo [2/2] Launching React Vite Web Frontend on http://localhost:5173 ...
start "Aqua Scope Frontend (Vite)" cmd /k "cd web && npm run dev"

echo.
echo ======================================================================
echo Servers starting in background windows.
echo Open your browser at: http://localhost:5173
echo ======================================================================
timeout /t 3 >nul
start http://localhost:5173

