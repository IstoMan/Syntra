"""
Explainability (SHAP & XAI) Endpoints
"""
from fastapi import APIRouter
from ..simulation.traffic_simulator import simulator
from ..explainability.shap_engine import compute_shap_explanations
from ..models.schemas import ExplainabilityResponse

router = APIRouter(prefix="/api/explanation", tags=["Explainability"])

@router.get("", response_model=ExplainabilityResponse)
async def get_explanation():
    risk_score = simulator.get_risk_score()
    return compute_shap_explanations(simulator.current_stage, risk_score, {})
