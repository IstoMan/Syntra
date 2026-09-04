"""
Forecast and Network State Endpoints
"""
from fastapi import APIRouter
from ..models.world_model_service import world_model_service
from ..models.schemas import ForecastResponse, NetworkState

router = APIRouter(prefix="/api", tags=["Forecast"])

@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast():
    return world_model_service.forecast_response()

@router.get("/network-state", response_model=NetworkState)
async def get_network_state():
    return world_model_service.forecast_response().current_state
