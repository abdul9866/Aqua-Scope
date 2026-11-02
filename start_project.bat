@echo off
title Aqua Scope - Underwater Intelligence System
echo ========================================================
echo Launching Aqua Scope Capstone Project...
echo ========================================================
echo Starting Backend on http://127.0.0.1:8000
start "Aqua Scope Backend" cmd /c "%~dp0start_backend.bat"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend on http://127.0.0.1:5173
start "Aqua Scope Frontend" cmd /c "%~dp0start_frontend.bat"

timeout /t 2 /nobreak > nul
echo Opening Aqua Scope Web App in your browser...
start http://localhost:5173

echo ========================================================
echo Aqua Scope is now running!
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo Swagger:  http://127.0.0.1:8000/docs
echo ========================================================
