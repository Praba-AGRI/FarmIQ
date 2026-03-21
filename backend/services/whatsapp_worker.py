import os
from datetime import datetime
from services.database import daily_telemetry_collection
from services.weather_service import get_coordinates, get_day_summary
from twilio.rest import Client
# Import the global client
# Note: we import it when the job runs to avoid circular imports? Or just import from app?
# We can create the client directly or import from a shared module. To avoid circular imports, let's redefine it here or use the global one.
from openai import OpenAI
import json

def get_nvidia_client():
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
    return OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY
    )

def generate_morning_briefing():
    """
    Triggered daily at 07:00 AM by APScheduler.
    Generates a briefing using meta/llama-3.1-8b-instruct and sends via WhatsApp (Twilio).
    """
    print(f"[{datetime.now()}] Generating Morning Briefing via WhatsApp...")
    
    # 1. Gather data (simplified logic, normally iterates over subscribed farmers)
    # For now, let's just do a mock or fetch 1 field telemetry
    # In a real scenario, this would loop through users and send personalised messages.
    
    # Let's say we have today's weather and yesterday's telemetry snippet:
    context = "Yesterday's soil moisture was low (45%). Today's weather: Sunny, 32°C."
    
    system_prompt = f"""
    You are the FarmIQ Agronomy Assistant. Provide a short, friendly WhatsApp morning briefing for a farmer in English and Tamil.
    Use this context: {context}
    Keep it under 300 characters total. Use emojis.
    """
    
    # 2. Call NVIDIA meta/llama-3.1-8b-instruct
    client = get_nvidia_client()
    try:
        completion = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": system_prompt}],
            temperature=0.2,
            top_p=0.7,
            max_tokens=256,
            stream=False
        )
        briefing_text = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Failed to generate briefing: {e}")
        briefing_text = "FarmIQ: Good morning! Please check your dashboard for today's advisory. 🌱"
    
    # 3. Send via Twilio
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886") # Default Twilio Sandbox
    TARGET_FARMER_NUMBER = os.getenv("TARGET_FARMER_NUMBER", "whatsapp:+919360474097") # Default Placeholder
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
         print("Twilio credentials missing. Skipping WhatsApp push.")
         return
    
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=briefing_text,
            to=TARGET_FARMER_NUMBER
        )
        print(f"Successfully sent WhatsApp briefing. SID: {message.sid}")
    except Exception as e:
        print(f"Failed to send Twilio WhatsApp message: {e}")

def schedule_whatsapp_briefings(scheduler):
    # Run at 07:00 AM every day
    scheduler.add_job(generate_morning_briefing, 'cron', hour=7, minute=0)
    print("Scheduled WhatsApp morning briefing for 07:00 AM daily.")

