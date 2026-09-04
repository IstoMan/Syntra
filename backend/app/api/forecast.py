"""
Forecast and Network State Endpoints
"""
from fastapi import APIRouter
from ..simulation.traffic_simulator import simulator
from ..models.temporal_model import generate_attack_forecast
from ..models.schemas import ForecastResponse, NetworkState

router = APIRouter(prefix="/api", tags=["Forecast"])

@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast():
    risk_score = simulator.get_risk_score()
    attack_prob = simulator.get_attack_probability()
    return generate_attack_forecast(simulator.current_stage, risk_score, attack_prob)

@router.get("/network-state", response_model=NetworkState)
async def get_network_state():
    forecast_data = await get_forecast()
    return forecast_data.current_state
