from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import pymongo

from services.database import get_db
from routes.auth import get_current_user

router = APIRouter()

class ActionRequest(BaseModel):
    action_type: str
    volume: Optional[float] = None
    notes: Optional[str] = None

@router.post("/{field_id}/complete")
async def complete_action(
    field_id: str,
    payload: ActionRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    HITL Feedback Execution: Logs the intervention and calibrates the ML state.
    """
    interventions_col = db["interventions"]
    telemetry_col = db["daily_aggregates"]
    
    # 1. Log the Intervention (Audit Trail)
    intervention_doc = {
        "field_id": field_id,
        "user_id": current_user["user_id"],
        "action_type": payload.action_type,
        "volume": payload.volume,
        "notes": payload.notes,
        "timestamp": datetime.utcnow(),
        "status": "completed"
    }
    await interventions_col.insert_one(intervention_doc)
    
    # 2. Recalibrate ML Baseline (Zero-out Deficits)
    # Get the latest telemetry date string (e.g., today)
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    if payload.action_type.lower() == "irrigation":
        # Force soil moisture to Field Capacity (e.g., 95%) in today's telemetry
        # This instantly tells the Bi-LSTM model the soil is wet, stopping immediate alerts.
        await telemetry_col.update_many(
            {"field_id": field_id, "date": today_str},
            {"$set": {"soil_moisture": 95.0, "irrigation_applied_mm": payload.volume}}
        )
    elif payload.action_type.lower() == "nutrients":
        # Mark nutrients as applied today
        await telemetry_col.update_many(
            {"field_id": field_id, "date": today_str},
            {"$set": {"nutrients_applied_kg": payload.volume}}
        )
        
    return {"status": "success", "message": f"{payload.action_type} marked as completed."}
