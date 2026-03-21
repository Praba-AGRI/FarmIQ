from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List, Optional
import uuid

from models.schemas import (
    AIRecommendationResponse, RecommendationItem,
    ChatMessage, ChatResponse, TransparencyData, RecommendationStatus
)
from routes.auth import get_current_user
from routes.sensors import get_current_sensor_readings
# Note: Weather endpoints now require lat/lon coordinates
# TODO: Update to use geolocation or new weather endpoints when location strings can be converted to coordinates
from routes.advisories import get_advisory_history
from services.storage import load_json, save_json
from services.ai_pipeline_service import ai_pipeline
from services.reasoning_layer import reasoning_agri_assistant
from services.agronomic_engine import enrich_telemetry_history
from utils.field_validation import get_field_or_404
from utils.helpers import get_timestamp
import datetime
import numpy as np
import asyncio
import json
import time

router = APIRouter()

#
# Simple in-memory TTL caches.
# NOTE: These are only safe if the backend runs as a single instance (no multi-replica autoscaling).
#
CACHE_TTL_SECONDS = 3600
_advisory_cache: dict = {}  # cache_key -> (expires_at, payload_dict)
_card_reasoning_cache: dict = {}  # cache_key -> (expires_at, reasoning_text)


def _cache_get(cache: dict, cache_key: str):
    cached = cache.get(cache_key)
    if not cached:
        return None
    expires_at, value = cached
    if time.time() >= expires_at:
        cache.pop(cache_key, None)
        return None
    return value


def _cache_set(cache: dict, cache_key: str, value, ttl_seconds: int = CACHE_TTL_SECONDS):
    cache[cache_key] = (time.time() + ttl_seconds, value)




@router.get("/{field_id}/chat/history", response_model=List[ChatResponse])
async def get_chat_history(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get chat history for a field
    
    - Returns list of previous chat messages
    """
    # Verify field belongs to user (raises 404 if not owned)
    get_field_or_404(field_id, current_user["user_id"])
    
    # Load chat history
    chat_data = load_json("chat_history.json")
    field_history = chat_data.get(field_id, [])
    
    return [ChatResponse(**msg) for msg in field_history]

@router.post("/{field_id}/chat", response_model=ChatResponse)
async def ai_chat(
    field_id: str,
    message: ChatMessage,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # 1. Farmer profile for context-aware chat
    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == current_user["user_id"]), None)
    farmer_location = farmer_user.get("location", "") if farmer_user else ""
    
    farmer_profile = {
        "name": farmer_user.get("name", ""),
        "location": farmer_location,
        "preferred_language": message.language or farmer_user.get("preferred_language", "en"),
        "farming_type": farmer_user.get("farming_type", "conventional")
    }
    
    # 2. Get high-quality agronomic state (instead of CSV fallback)
    history_last_14, cumulative_gdd, predicted_stage = await enrich_telemetry_history(
        field, farmer_location
    )
    
    # Prepare dummy state for history if empty
    if not history_last_14:
        sensor_data = {"air_temp": 25, "air_humidity": 60, "soil_moisture": 50, "light_lux": 1000}
    else:
        last_day = history_last_14[-1]
        sensor_data = {
            "air_temp": last_day.get("t_avg", 25),
            "air_humidity": last_day.get("humidity", 60),
            "soil_moisture": last_day.get("soil_moisture", 50),
            "light_lux": last_day.get("solar_radiation", 1) * 1000
        }

    ai_state_output = {
        "crop_stage": predicted_stage,
        "sensor_values": sensor_data,
        "history_count": len(history_last_14)
    }
    
    # 3. Call the reasoning layer (Endpoint B)
    # Using NVIDIA client for Chat instead of old Gemini prompt inside reasoning_agri_assistant
    client = getattr(request.app.state, "nvidia_client", None)
    if not client:
        # Fallback if accessed via a router test mock
        from services.whatsapp_worker import get_nvidia_client
        client = get_nvidia_client()
        
    system_prompt = f"""
    You are the FarmIQ Agronomy Assistant. You are chatting with a farmer about their field.
    Farmer Profile: {json.dumps(farmer_profile)}
    Field Context: Crop: {field.crop}, Stage: {predicted_stage}, Area: {field.area_acres} acres.
    Real-time Sensor Data: {json.dumps(sensor_data)}
    
    Answer the user's question directly, clearly, and in a friendly tone. Use local farming terminology if helpful. Language: {farmer_profile['preferred_language']}.
    """
    
    try:
        completion = client.chat.completions.create(
            model="meta/llama-3.3-70b-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message.message}
            ],
            temperature=0.5,
            top_p=0.8,
            max_tokens=512,
            stream=False
        )
        ai_response = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"NVIDIA API Error in Chat: {e}")
        ai_response = "Sorry, I am having trouble connecting to my AI brain at the moment."
    
    # 4. Save chat history
    chat_data = load_json("chat_history.json")
    if field_id not in chat_data:
        chat_data[field_id] = []
    
    timestamp = get_timestamp()
    chat_data[field_id].append({"id": str(uuid.uuid4()), "type": "user", "message": message.message, "timestamp": timestamp})
    chat_data[field_id].append({"id": str(uuid.uuid4()), "type": "ai", "message": ai_response, "timestamp": timestamp})
    save_json("chat_history.json", chat_data)
    
    return ChatResponse(
        id=str(uuid.uuid4()),
        type="ai",
        message=ai_response,
        timestamp=timestamp
    )



@router.get("/{field_id}/reasoning")
async def get_ai_reasoning(
    field_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint A: The Dashboard Brain.
    Generates structured AI reasoning (Tamil/English paragraphs) for the drop-downs.
    Features a 15-minute 40-RPM Cache Shield.
    """
    # 1. Check 40-RPM Cache Shield
    cache = getattr(request.app.state, "ai_reasoning_cache", {})
    if field_id in cache:
        timestamp, cached_data = cache[field_id]
        if time.time() - timestamp < 900:  # 15 minutes TTL
            print(f"Cache HIT for {field_id} reasoning. 0 API calls.")
            return cached_data
            
    # 2. Cache Miss: We must generate new AI content
    print(f"Cache MISS for {field_id}. Generating via NVIDIA...")
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Farmer Profile
    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == current_user["user_id"]), None)
    farmer_location = farmer_user.get("location", "") if farmer_user else ""
    pref_language = farmer_user.get("preferred_language", "en") if farmer_user else "en"
    
    # Get transparency ML data
    history_last_14, cumulative_gdd, predicted_stage = await enrich_telemetry_history(
        field, farmer_location
    )
    if not history_last_14:
        raise HTTPException(status_code=404, detail="No sensor history available for AI reasoning.")
        
    # Get ML predictions
    current_day = history_last_14[-1]
    feature_sequence = [
        ai_pipeline.construct_feature_vector(
            day.get("t_avg", 25), day.get("humidity", 60), day.get("soil_moisture", 50),
            day.get("et0", 4), day.get("etc", 4), day.get("stage", predicted_stage),
            field.crop, field.area_acres, day.get("solar_radiation", 15) * 1000
        ) for day in history_last_14[-14:]
    ]
    # Pad if needed
    while len(feature_sequence) < 14:
        feature_sequence.insert(0, feature_sequence[0])
        
    lstm_input = np.array(feature_sequence)
    irr_prob, irrigation_needed, final_lstm_input = ai_pipeline.predict_irrigation(lstm_input)
    
    now = datetime.datetime.now()
    season = "Kharif" if 6 <= now.month <= 10 else "Rabi"
    temp = current_day.get("t_avg", 25)
    humidity = current_day.get("humidity", 60)
    
    disease_risk, pest_input = ai_pipeline.predict_pests(
        field.crop, predicted_stage, season, temp, humidity
    )
    
    nut_pred, nutrient_input = ai_pipeline.predict_nutrients(
        field.crop, predicted_stage, field.area_acres
    )

    raw_ml_data = {
        "crop": field.crop,
        "stage": predicted_stage,
        "current_temp": temp,
        "current_humidity": humidity,
        "soil_moisture": current_day.get("soil_moisture", 50),
        "irrigation_prob": float(irr_prob),
        "disease_risk": disease_risk,
        "nutrient_npk": [float(nut_pred[0]), float(nut_pred[1]), float(nut_pred[2])]
    }
    
    lang_instruction = "English" if pref_language == "en" else "Tamil"
    
    system_prompt = f"""
    You are the FarmIQ Agronomy Engine, an expert agricultural AI for smallholder farmers. 
    Analyze the raw ML data and output a STRICT JSON response in {lang_instruction}.
    Do NOT output markdown code blocks (no ```json). Output ONLY the raw JSON string.

    === CURRENT REAL-TIME ML DATA ===
    {json.dumps(raw_ml_data, indent=2)}

    JSON SCHEMA REQUIREMENTS:
    {{
      "overall_summary": "A 2-sentence high-level summary of the entire farm's current status and urgent needs.",
      "cards": [
        {{
          "card_name": "Irrigation",
          "traffic_light": "RED|YELLOW|GREEN",
          "main_action": "The simple, imperative command (e.g., Irrigate 45 mins).",
          "simple_why": "One sentence explaining why based on weather/soil.",
          "detailed_reasoning": "Explain the Bi-LSTM reasoning."
        }},
        {{
          "card_name": "Nutrients",
          "traffic_light": "RED|YELLOW|GREEN",
          "main_action": "Imperative fertilizer command.",
          "simple_why": "One sentence why based on crop stage.",
          "detailed_reasoning": "Deep technical explanation of nutrient needs."
        }},
        {{
          "card_name": "Pest Management",
          "traffic_light": "RED|YELLOW|GREEN",
          "main_action": "Risk status or treatment command.",
          "simple_why": "One sentence why based on environment.",
          "detailed_reasoning": "Technical breakdown of pest risk factors."
        }},
        {{
          "card_name": "Spraying Conditions",
          "traffic_light": "RED|YELLOW|GREEN",
          "main_action": "Safety decision (Spray/Do Not Spray).",
          "simple_why": "One sentence why based on wind/humidity sensors.",
          "detailed_reasoning": "Analysis of drift risks and cost impact."
        }}
      ]
    }}
    """
    
    client = request.app.state.nvidia_client
    try:
        completion = client.chat.completions.create(
            model="meta/llama-3.3-70b-instruct",
            messages=[{"role": "user", "content": system_prompt}],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
            stream=False
        )
        content = completion.choices[0].message.content.strip()
        # Clean markdown wrappers if any
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        json_data = json.loads(content)
        
        # 3. Save to Cache Shield
        request.app.state.ai_reasoning_cache[field_id] = (time.time(), json_data)
        
        return json_data
        
    except Exception as e:
        print(f"NVIDIA API Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI reasoning")


@router.get("/{field_id}/transparency", response_model=TransparencyData)
async def get_transparency_data(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    from services.agronomic_engine import enrich_telemetry_history
    field = get_field_or_404(field_id, current_user["user_id"])
    
    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == current_user["user_id"]), None)
    farmer_location = farmer_user.get("location", "") if farmer_user else ""
    
    history_last_14, cumulative_gdd, predicted_stage = await enrich_telemetry_history(
        field, farmer_location
    )
    
    if len(history_last_14) == 0:
        raise HTTPException(status_code=404, detail="No sensor history available for transparency calculation.")
        
    while len(history_last_14) < 14:
        history_last_14.insert(0, history_last_14[0])
        
    feature_sequence = []
    for day in history_last_14:
        fv = ai_pipeline.construct_feature_vector(
            day.get("t_avg", 25), day.get("humidity", 60), day.get("soil_moisture", 50),
            day.get("et0", 4), day.get("etc", 4), day.get("stage", predicted_stage),
            field.crop, field.area_acres, day.get("solar_radiation", 15) * 1000
        )
        feature_sequence.append(fv)
        
    lstm_input = np.array(feature_sequence)
    irr_prob, irrigation_needed, final_lstm_input = ai_pipeline.predict_irrigation(lstm_input)
    
    current_day = history_last_14[-1]
    
    from datetime import datetime
    now = datetime.now()
    season = "Kharif" if 6 <= now.month <= 10 else "Rabi"
    temp = current_day.get("t_avg", 25)
    humidity = current_day.get("humidity", 60)
    
    disease_risk, pest_input = ai_pipeline.predict_pests(
        field.crop, predicted_stage, season, temp, humidity
    )
    
    nut_pred, nutrient_input = ai_pipeline.predict_nutrients(
        field.crop, predicted_stage, field.area_acres
    )
    
    irrigation_shap, pest_shap, nutrient_shap, spraying_shap = ai_pipeline.get_shap_drivers(
        final_lstm_input, 
        pest_input, 
        nutrient_input=nutrient_input,
        spray_context={"wind_speed": current_day.get("wind_speed", 0), "temp": temp, "humidity": humidity}
    )
    
    return TransparencyData(
        sensor_values={
            "air_temp": round(temp, 1),
            "air_humidity": round(humidity, 1),
            "soil_moisture": round(current_day.get("soil_moisture", 0), 1),
            "light_lux": round(current_day.get("solar_radiation", 0) * 1000, 1),
            "wind_speed": round(current_day.get("wind_speed", 0), 1)
        },
        predicted_stage=predicted_stage,
        gdd_value=round(cumulative_gdd, 1),
        irrigation_logic=f"Bi-LSTM Confidence: {round(irr_prob * 100, 1)}% - Based on 14-day history",
        pest_risk_factors=[f"{k}: {v}" for k, v in pest_shap.items()],
        nutrient_recommendations=[f"Apply {round(nut_pred[0], 1)}kg N, {round(nut_pred[1], 1)}kg P, {round(nut_pred[2], 1)}kg K"],
        et0=round(current_day.get("et0", 0), 2),
        etc=round(current_day.get("etc", 0), 2),
        kc=round(current_day.get("kc", 0), 2),
        irrigation_shap_weights=irrigation_shap,
        pest_shap_weights=pest_shap,
        nutrient_shap_weights=nutrient_shap,
        spraying_shap_weights=spraying_shap
    )
