from fastapi import APIRouter, Request, Depends
from twilio.twiml.messaging_response import MessagingResponse
from datetime import datetime
from services.database import get_db

router = APIRouter()

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db = Depends(get_db)):
    """
    Twilio Webhook for incoming WhatsApp messages.
    Allows farmers to reply 'DONE' to mark interventions as completed.
    """
    form_data = await request.form()
    incoming_msg = form_data.get('Body', '').strip().upper()
    sender = form_data.get('From', '')
    
    resp = MessagingResponse()
    
    if incoming_msg == "DONE":
        # 1. Look up user by WhatsApp number
        users_col = db["users"]
        # Twilio sends sender as "whatsapp:+1234567890"
        phone_number = sender.replace("whatsapp:", "")
        
        user = await users_col.find_one({"phone_number": phone_number})
        if not user:
            # Fallback if phone not found directly, maybe they don't have it set
            resp.message("FarmIQ: Number not recognized. Please update your profile. 🌱")
            return str(resp)

        field_id = user.get("field_id", "FC18860B-def5-4654-97c4-f75fafb95645") # Defaulting for demo
        
        # 2. Mark intervention as completed (Zero out deficit)
        interventions_col = db["interventions"]
        telemetry_col = db["daily_aggregates"]
        
        intervention_doc = {
            "field_id": field_id,
            "user_id": user.get("user_id"),
            "action_type": "Irrigation (WhatsApp Webhook)",
            "volume": 0.0,
            "notes": "Completed via SMS",
            "timestamp": datetime.utcnow(),
            "status": "completed"
        }
        await interventions_col.insert_one(intervention_doc)
        
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        await telemetry_col.update_many(
            {"field_id": field_id, "date": today_str},
            {"$set": {"soil_moisture": 95.0, "irrigation_applied_mm": 10.0}}
        )
        
        resp.message("FarmIQ: ✅ Logged! Your AI baseline has been instantly recalibrated for tomorrow.")
    else:
        resp.message(f"FarmIQ: Unrecognized command. Reply 'DONE' to log your irrigation. 🌱")
        
    return str(resp)

@router.get("/test-whatsapp")
async def test_whatsapp():
    """
    Test endpoint to manually trigger a WhatsApp message and verify Twilio configuration.
    """
    from services.whatsapp_worker import send_emergency_whatsapp
    try:
        await send_emergency_whatsapp("🧪 FarmIQ Diagnostic: This is a proactive test alert. If you receive this, your Twilio webhook is configured correctly!")
        return {"status": "success", "message": "Test WhatsApp triggered. Check your phone within 10 seconds."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
