"""
Simulation Control Endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from ..simulation.traffic_simulator import simulator, STAGE_NAMES
from ..models.schemas import SimulationStatus

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

class SetStageRequest(BaseModel):
    stage: int

class SpeedRequest(BaseModel):
    speed: float

@router.get("/status", response_model=SimulationStatus)
async def get_simulation_status():
    return SimulationStatus(
        is_running=simulator.is_running,
        current_stage=simulator.current_stage,
        stage_name=STAGE_NAMES[simulator.current_stage - 1],
        tick_count=simulator.tick_count,
        speed_multiplier=simulator.speed_multiplier,
        active_scenario=simulator.active_scenario,
        time_ist=simulator._get_current_time_str()
    )

@router.post("/start")
async def start_simulation():
    simulator.is_running = True
    return {"status": "started", "current_stage": simulator.current_stage}

@router.post("/pause")
async def pause_simulation():
    simulator.is_running = False
    return {"status": "paused", "current_stage": simulator.current_stage}

@router.post("/step")
async def step_simulation():
    simulator.step_forward()
    return {
        "status": "stepped",
        "current_stage": simulator.current_stage,
        "stage_name": STAGE_NAMES[simulator.current_stage - 1]
    }

@router.post("/set-stage")
async def set_simulation_stage(req: SetStageRequest):
    simulator.set_stage(req.stage)
    return {
        "status": "stage_set",
        "current_stage": simulator.current_stage,
        "stage_name": STAGE_NAMES[simulator.current_stage - 1]
    }

@router.post("/reset")
async def reset_simulation():
    simulator.reset_simulation()
    from ..models.world_model_service import world_model_service
    world_model_service.reset()
    return {"status": "reset", "current_stage": 1}
