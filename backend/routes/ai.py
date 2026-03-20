from fastapi import APIRouter, HTTPException, Depends, status
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
    
    # 3. Call the reasoning layer
    ai_response = await reasoning_agri_assistant(
        farmer_profile=farmer_profile,
        field_context={"crop": field.crop, "stage": predicted_stage, "area_acres": field.area_acres},
        ai_agent_output=ai_state_output,
        approved_knowledge={}, 
        weather_reference={}, 
        advisory_history=[],
        farmer_question=message.message
    )
    
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
