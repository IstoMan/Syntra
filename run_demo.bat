@echo off
echo ======================================================================
echo   SYNTRA - AI-Based Network Attack Forecasting (SIH26153)
echo   Starting FastAPI Backend (Port 8000) and React Frontend (Port 5173)...
echo ======================================================================

start "SYNTRA Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 >nul
start "SYNTRA Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting!
echo Frontend will be accessible at: http://localhost:5173
echo Backend API Docs at: http://127.0.0.1:8000/docs
echo.
pause
