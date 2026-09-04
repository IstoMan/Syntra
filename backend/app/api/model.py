"""
Model Performance and Validation Metrics Endpoints
"""
from fastapi import APIRouter
from ..models.world_model_service import world_model_service
from ..models.schemas import ModelPerformanceMetrics

router = APIRouter(prefix="/api/model", tags=["Model"])

@router.get("/performance", response_model=ModelPerformanceMetrics)
async def get_model_performance():
    return world_model_service.performance_metrics()
