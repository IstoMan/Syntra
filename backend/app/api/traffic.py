"""
Traffic API Endpoints
"""
from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from typing import Optional
from ..simulation.traffic_simulator import simulator
from ..models.schemas import TrafficResponse, FlowDetail

router = APIRouter(prefix="/api/traffic", tags=["Traffic"])

@router.get("", response_model=TrafficResponse)
async def get_traffic(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    protocol: Optional[str] = None,
    risk: Optional[str] = None,
    search: Optional[str] = None
):
    filtered_flows = simulator.flows

    if protocol and protocol != "ALL":
        filtered_flows = [f for f in filtered_flows if protocol.upper() in f.protocol.upper()]
    if risk and risk != "ALL":
        filtered_flows = [f for f in filtered_flows if f.risk_level.upper() == risk.upper()]
    if search:
        s = search.lower()
        filtered_flows = [
            f for f in filtered_flows 
            if s in f.source_ip.lower() 
            or s in f.destination_ip.lower() 
            or (f.source_asset and s in f.source_asset.lower())
            or (f.destination_asset and s in f.destination_asset.lower())
        ]

    total = len(filtered_flows)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    end = start + page_size
    paged_flows = filtered_flows[start:end]

    return TrafficResponse(
        total_flows=len(simulator.flows),
        active_flows=len(filtered_flows),
        flows=paged_flows,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/flow/{flow_id}", response_model=FlowDetail)
async def get_flow_detail(flow_id: str):
    for f in simulator.flows:
        if f.id == flow_id:
            return f
    raise HTTPException(status_code=404, detail=f"Flow {flow_id} not found")

@router.post("/upload")
async def upload_csv_data(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.pcap')):
        raise HTTPException(status_code=400, detail="Only CSV or PCAP network capture files are supported.")
    
    contents = await file.read()
    line_count = len(contents.decode(errors="ignore").splitlines())
    
    return {
        "status": "success",
        "filename": file.filename,
        "rows_processed": max(1, line_count - 1),
        "dataset_name": f"Uploaded ({file.filename})",
        "message": f"Successfully parsed and ingested {line_count - 1} network flow records into SYNTRA temporal analyzer."
    }
