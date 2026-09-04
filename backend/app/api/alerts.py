"""
Alerts and Early Warning Endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import List
from ..simulation.traffic_simulator import simulator
from ..models.schemas import AlertItem, AlertUpdateRequest

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertItem])
async def get_alerts():
    return simulator.alerts

@router.put("/{alert_id}/status", response_model=AlertItem)
async def update_alert_status(alert_id: str, payload: AlertUpdateRequest):
    updated = simulator.update_alert_status(alert_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return updated
