"""
SYNTRA - AI-Based Network Attack Forecasting Backend Application (SIH26153)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import traffic, forecast, risk, explainability, alerts, model, simulation, datasets
from .models.world_model_service import world_model_service

app = FastAPI(
    title="SYNTRA - AI-Based Network Attack Forecasting API",
    description="Backend API for Smart India Hackathon 2026 Problem Statement SIH26153",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(traffic.router)
app.include_router(forecast.router)
app.include_router(risk.router)
app.include_router(explainability.router)
app.include_router(alerts.router)
app.include_router(model.router)
app.include_router(simulation.router)
app.include_router(datasets.router)

@app.get("/api/health")
async def health_check():
    model_status = world_model_service.status()
    return {
        "status": "online",
        "product": "SYNTRA",
        "version": "1.0.0",
        "problem_statement": "SIH26153",
        "environment": "demo",
        "region": "India",
        "timezone": "Asia/Kolkata",
        "system_time": "10:30:21 IST",
        "active_scenario": "Indian Digital Infrastructure Network (CII Simulation)",
        "model_loaded": model_status["model_loaded"],
        "model_architecture": model_status["model_architecture"],
        "inference_source": model_status["inference_source"],
        "artifacts_dir": model_status["artifacts_dir"],
        "load_error": model_status["load_error"],
        "has_novelty": model_status["has_novelty"],
        "alert_threshold": model_status["alert_threshold"],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
