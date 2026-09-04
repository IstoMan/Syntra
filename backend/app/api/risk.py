"""
Risk Analysis API Endpoints
"""
from fastapi import APIRouter
from ..simulation.traffic_simulator import simulator
from ..models.schemas import RiskAnalysisResponse

router = APIRouter(prefix="/api/risk", tags=["Risk"])

@router.get("", response_model=RiskAnalysisResponse)
async def get_risk_analysis():
    return simulator.get_risk_analysis()
