"""
Explainability (SHAP & XAI) Endpoints
"""
from fastapi import APIRouter
from ..models.world_model_service import world_model_service
from ..models.schemas import ExplainabilityResponse

router = APIRouter(prefix="/api/explanation", tags=["Explainability"])

@router.get("", response_model=ExplainabilityResponse)
async def get_explanation():
    return world_model_service.explanation_response()
