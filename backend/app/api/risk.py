"""
Risk Analysis API Endpoints
"""
from fastapi import APIRouter
from ..models.world_model_service import world_model_service
from ..models.schemas import RiskAnalysisResponse

router = APIRouter(prefix="/api/risk", tags=["Risk"])

@router.get("", response_model=RiskAnalysisResponse)
async def get_risk_analysis():
    return world_model_service.risk_response()
