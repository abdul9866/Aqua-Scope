@echo off
title Aqua Scope Frontend - Vite React
cd /d "%~dp0web"
echo ========================================================
echo Starting Aqua Scope Web Frontend (Port 5173)...
echo ========================================================
call npm.cmd run dev -- --host 127.0.0.1 --port 5173
pause
