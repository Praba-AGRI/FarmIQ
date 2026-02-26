from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from services.community_service import get_community_insights, load_farmers
from models.schemas import CommunityInsights
from typing import List, Dict, Any
import json, os

router = APIRouter()

CHAT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "community_chat.json")

def load_chat() -> List[Dict]:
    if not os.path.exists(CHAT_FILE):
        return []
    with open(CHAT_FILE, "r") as f:
        return json.load(f)

def save_chat(messages: List[Dict]):
    with open(CHAT_FILE, "w") as f:
        json.dump(messages, f, indent=2)

@router.get("/insights", response_model=CommunityInsights)
async def get_community_data(
    radius_km: float = 15.0,
    current_user: dict = Depends(get_current_user)
):
    """Get community clustering and crop distribution insights"""
    # Using a default farmer for demo; in production, map user → farmer
    actual_farmer_id = "farmer_001"
    try:
        return get_community_insights(actual_farmer_id, radius_km)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_community_alerts(current_user: dict = Depends(get_current_user)):
    """Get active pest and disease alerts from nearby farmers"""
    farmers = load_farmers()
    alerts = []
    for f in farmers:
        if f.get("pest_alert") or f.get("disease_alert"):
            alerts.append({
                "farmer_name": f["name"],
                "village": f["village"],
                "crop": f["crop_current"],
                "pest_alert": f.get("pest_alert"),
                "disease_alert": f.get("disease_alert"),
                "severity": f.get("alert_severity", "LOW"),
                "reported_date": f.get("alert_reported_date"),
            })
    return {"alerts": alerts, "total": len(alerts)}

@router.get("/farmers")
async def get_all_community_farmers(current_user: dict = Depends(get_current_user)):
    """Get all farmers with their crop and alert status"""
    farmers = load_farmers()
    return {"farmers": farmers, "total": len(farmers)}

@router.get("/chat")
async def get_chat_messages(current_user: dict = Depends(get_current_user)):
    """Get all community chat messages"""
    return {"messages": load_chat()}

@router.post("/chat")
async def post_chat_message(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Post a new message to the community chat"""
    from datetime import datetime
    messages = load_chat()
    message = {
        "id": len(messages) + 1,
        "author": current_user.get("name", "Farmer"),
        "user_id": current_user.get("user_id"),
        "text": body.get("text", ""),
        "timestamp": datetime.utcnow().isoformat(),
        "crop": body.get("crop", ""),
    }
    messages.append(message)
    # Keep last 200 messages
    if len(messages) > 200:
        messages = messages[-200:]
    save_chat(messages)
    return message
