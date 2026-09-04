# SYNTRA Launcher Script (SIH26153)
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  SYNTRA — AI-Based Network Attack Forecasting (SIH26153)" -ForegroundColor Green
Write-Host "  Launching FastAPI Backend and Vite SOC Frontend..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nServers launched successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:  http://127.0.0.1:8000/docs`n" -ForegroundColor Yellow
