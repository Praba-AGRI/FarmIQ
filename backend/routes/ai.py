from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid

from models.schemas import (
    AIRecommendationRequest, AIRecommendationResponse, RecommendationItem,
    ChatMessage, ChatResponse, TransparencyData, RecommendationStatus,
    CardReasoningRequest, CardReasoningResponse
)
from routes.auth import get_current_user
from routes.sensors import get_current_sensor_readings
# Note: Weather endpoints now require lat/lon coordinates
# TODO: Update to use geolocation or new weather endpoints when location strings can be converted to coordinates
from routes.advisories import get_advisory_history
from services.storage import load_json, save_json, get_recent_readings
from services.ai_pipeline_service import ai_pipeline
from services.irrigation_logic import irrigation_recommendation
from services.reasoning_layer import reasoning_agri_assistant
from services.weather_service import get_onecall_weather, transform_onecall_response
from utils.field_validation import get_field_or_404
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


async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None, lat: float = None, lon: float = None, skip_llm: bool = False, language: str = "en") -> dict:
    """
    Get AI agent output using original data from sensors and weather APIs.
    No mock data inside the pipeline.
    """
    try:
        farmer_id_to_use = farmer_id if current_user is None else current_user["user_id"]
        field = get_field_or_404(field_id, farmer_id_to_use)
        
        # 1. Get current sensor data
        sensor_response = None
        try:
            sensor_response = await get_current_sensor_readings(field_id, {"user_id": farmer_id_to_use})
        except:
            pass
            
        # Weather Fallback Logic
        weather_wind = None
        weather_temp = None
        weather_humidity = None
        
        if lat is not None and lon is not None:
            try:
                weather_raw = await get_onecall_weather(lat, lon)
                weather_data = transform_onecall_response(weather_raw)
                weather_wind = weather_data["current"]["wind_speed"]
                weather_temp = weather_data["current"]["temperature"]
                weather_humidity = weather_data["current"]["humidity"]
            except Exception as e:
                print(f"Weather fallback failed: {e}")

        sensor_data = {
            "air_temp": float(sensor_response.air_temp) if (sensor_response and sensor_response.air_temp is not None) else (weather_temp or 25.0),
            "air_humidity": float(sensor_response.air_humidity) if (sensor_response and sensor_response.air_humidity is not None) else (weather_humidity or 60.0),
            "soil_moisture": float(sensor_response.soil_moisture) if (sensor_response and sensor_response.soil_moisture is not None) else 50.0,
            "light_lux": float(sensor_response.light_lux) if (sensor_response and sensor_response.light_lux is not None) else 1000.0,
            # wind_speed PRIMARY REQUEST: Use weather if sensor is missing
            "wind_speed": float(sensor_response.wind_speed) if (sensor_response and sensor_response.wind_speed is not None) else (weather_wind or 5.0)
        }
        
        # 2. Calculate Environmental Metrics (ET0, ETc, Kc, GDD)
        logic_input = {
            "crop": field.crop,
            "temp_avg": sensor_data["air_temp"],
            "humidity": sensor_data["air_humidity"],
            "wind_speed": sensor_data["wind_speed"],
            "soil_moisture": sensor_data["soil_moisture"],
            "solar_radiation": 15.0 # Fallback if not available
        }
        lr = irrigation_recommendation(logic_input)
        cumulative_gdd = lr.get("cumulative_gdd", 0)
        
        # 3. AI Predictions
        # 3a. Stage (GDD Based RF Model)
        predicted_stage = ai_pipeline.predict_stage(field.crop, cumulative_gdd)
        
        # 3b. Irrigation (Bi-LSTM - 14 Days History)
        history = get_recent_readings(f"{field.sensor_node_id}.csv", limit=14)
        
        # Construct LSTM Input Sequence (14, 9)
        feature_sequence = []
        for row in history:
            fv = ai_pipeline.construct_feature_vector(
                row.get("air_temp", 25.0),
                row.get("air_humidity", 60.0),
                row.get("soil_moisture", 50.0),
                lr.get("ET0_mm_day", 4.0), # Use current ET0 if history doesn't have it
                lr.get("ETc_mm_day", 4.0),
                predicted_stage,
                field.crop,
                field.area_acres,
                row.get("light_lux", 1000.0)
            )
            feature_sequence.append(fv)
        
        # Pad history if less than 14 days
        while len(feature_sequence) < 14:
            if not feature_sequence:
                # Total fallback if no history at all
                fv = ai_pipeline.construct_feature_vector(
                    sensor_data["air_temp"], sensor_data["air_humidity"], sensor_data["soil_moisture"],
                    lr.get("ET0_mm_day"), lr.get("ETc_mm_day"), predicted_stage, 
                    field.crop, field.area_acres, sensor_data["light_lux"]
                )
                feature_sequence.append(fv)
            else:
                feature_sequence.insert(0, feature_sequence[0])
                
        lstm_input = np.array(feature_sequence)
        irr_prob, irrigation_needed, final_lstm_input = ai_pipeline.predict_irrigation(lstm_input)
        
        # 3c. Nutrients
        nut_pred, nut_input = ai_pipeline.predict_nutrients(field.crop, predicted_stage, field.area_acres)
        
        # 3d. Pests
        now = datetime.datetime.now()
        season = "Kharif" if 6 <= now.month <= 10 else "Rabi"
        disease_risk, pest_input = ai_pipeline.predict_pests(field.crop, predicted_stage, season, sensor_data["air_temp"], sensor_data["air_humidity"])
        
        # 3e. Spraying
        spray_decision = ai_pipeline.spraying_engine.evaluate(sensor_data["wind_speed"], sensor_data["air_humidity"], sensor_data["air_temp"])
        
        # 4. Explainability & Advisory
        irrigation_shap, pest_shap = ai_pipeline.get_shap_drivers(final_lstm_input, pest_input)
        
        raw_ml_data = {
            "crop": field.crop,
            "stage": predicted_stage,
            "advisory_outputs": {
                "irrigation": {"probability": round(irr_prob, 4), "recommended": irrigation_needed},
                "nutrients": {"N": round(float(nut_pred[0]), 2), "P": round(float(nut_pred[1]), 2), "K": round(float(nut_pred[2]), 2)},
                "pest": {"risk": disease_risk},
                "spraying": spray_decision
            },
            "mathematical_drivers": {"irrigation_shap": irrigation_shap, "pest_shap": pest_shap}
        }
        
        advisory_history_response = await get_advisory_history(field_id=field_id, current_user={"user_id": farmer_id_to_use})
        history_summaries = [rec.message for adv in advisory_history_response for rec in adv.recommendations][:5]
        
        human_advisory = {"overall_summary": "Recommendation generated. Click 'Generate AI Smart Advisory' for a detailed bilingual plan.", "cards": []}
        if not skip_llm:
            human_advisory = ai_pipeline.generate_human_advisory(raw_ml_data, history_summaries, language=language)
            # If OpenRouter fails (401/429/etc) or JSON parsing returns no cards, keep the UI functional
            # by falling back to local reasoning templates below.
            if not isinstance(human_advisory, dict) or not human_advisory.get("cards"):
                human_advisory = {
                    "overall_summary": "AI advisory not available right now. Showing locally generated impact analysis.",
                    "cards": []
                }

        # Merge LLM-specific card data if available
        llm_cards = {c['card_name'].lower(): (c if isinstance(c, dict) else {}) for c in human_advisory.get('cards', []) if isinstance(c, dict)}

        # 5. Response Assembly (Simplified for Farmers)
        irr_amount_mm = lr.get("recommended_irrigation_mm", 0)
        # Rule of thumb: 10mm = 60 mins for a standard pump/field size
        # Main Action (Huge Text) should be at least 45 minutes if deficit is detected
        pump_minutes = max(45, int(round(irr_amount_mm * 6))) if irrigation_needed else 0
        
        # Irrigation Card
        irr_action = f"Irrigate for {pump_minutes} minutes today." if irrigation_needed else "No irrigation needed today."
        irr_why = "Soil moisture is dropping fast, and satellite weather data shows no rain expected for the next 48 hours." if irrigation_needed else "Soil moisture is at optimal levels and current evapotranspiration is low."
        
        # Nutrient Card
        nitro_kg = round(float(nut_pred[0]))
        nut_action = f"Prepare to apply {nitro_kg}kg of Nitrogen mix this week."
        nut_why = f"Your {field.crop} is deep in the {predicted_stage} stage and needs immediate fuel for leaf growth before the flowering phase begins."
        
        # Pest Card
        pest_action = "No pesticide needed today." if disease_risk == "Healthy" else f"Apply treatment for {disease_risk} risk."
        pest_why = f"Current farm temperatures ({round(sensor_data['air_temp'], 1)}°C) and humidity are not favorable for major local pest outbreaks." if disease_risk == "Healthy" else f"Environmental conditions are high risk for {disease_risk}. Monitor your crop closely."
        
        # Spray Card
        is_safe_to_spray = "Safe to spray" in spray_decision
        spray_action = "Perfect conditions for spraying." if is_safe_to_spray else "Do not spray today. High wind risk."
        spray_why = f"Live sensors detect wind speeds of {round(sensor_data['wind_speed'], 1)}m/s. Spraying now will cause chemical drift and waste money. Wait until tomorrow morning." if not is_safe_to_spray else "Wind speed and humidity are within the optimal range for effective chemical application."

        # ---- Local fallback reasoning ----
        # Used when OpenRouter-generated `detailed_reasoning` is missing/unavailable.
        irr_fallback_reasoning = (
            f"### Action\n{irr_action}\n\n"
            f"### Why (Reasoning)\n- {irr_why}\n- Confidence: **{round(irr_prob * 100, 1)}%**\n\n"
            f"### Timing\nToday"
        )
        nut_fallback_reasoning = (
            f"### Action\n{nut_action}\n\n"
            f"### Why (Reasoning)\n- {nut_why}\n\n"
            f"### Timing\nThis week (review results over the next 2-3 days)"
        )
        pest_fallback_reasoning = (
            f"### Action\n{pest_action}\n\n"
            f"### Why (Reasoning)\n- {pest_why}\n\n"
            f"### Timing\nMonitor daily"
        )
        spray_fallback_reasoning = (
            f"### Action\n{spray_action}\n\n"
            f"### Why (Reasoning)\n- {spray_why}\n\n"
            f"### Timing\nCheck before application"
        )

        recommendations = []
        
        # Mapping for LLM Traffic Light to Schema Status
        status_map = {
            "RED": RecommendationStatus.DO_NOW,
            "YELLOW": RecommendationStatus.WAIT,
            "GREEN": RecommendationStatus.GREEN,
            "BLUE": RecommendationStatus.MONITOR
        }

        # 1. Irrigation
        irr_llm = llm_cards.get('irrigation', {})
        recommendations.append({
            "title": "Irrigation",
            "description": irr_llm.get('main_action', irr_action),
            "status": status_map.get(irr_llm.get('traffic_light'), RecommendationStatus.DO_NOW if irrigation_needed else RecommendationStatus.MONITOR),
            "explanation": irr_llm.get('simple_why', irr_why),
            "timing": "Today" if irrigation_needed else "Next 24h",
            "ai_reasoning": irr_llm.get('detailed_reasoning') or irr_fallback_reasoning,
            "ml_data": {
                "confidence": round(irr_prob * 100, 1),
                "amount_mm": irr_amount_mm,
                "pump_minutes": pump_minutes,
                "shap": irrigation_shap
            }
        })

        # 2. Nutrients
        nut_llm = llm_cards.get('nutrients', {})
        recommendations.append({
            "title": "Nutrients",
            "description": nut_llm.get('main_action', nut_action),
            "status": status_map.get(nut_llm.get('traffic_light'), RecommendationStatus.WAIT),
            "explanation": nut_llm.get('simple_why', nut_why),
            "timing": "Next 2-3 days",
            "ai_reasoning": nut_llm.get('detailed_reasoning') or nut_fallback_reasoning,
            "ml_data": {
                "confidence": 85,
                "prediction": f"N:{round(nut_pred[0],1)}",
                "nitro_kg": nitro_kg
            }
        })

        # 3. Pest Management
        pest_llm = llm_cards.get('pest management', {}) or llm_cards.get('pest', {})
        recommendations.append({
            "title": "Pest Management",
            "description": pest_llm.get('main_action', pest_action),
            "status": status_map.get(pest_llm.get('traffic_light'), RecommendationStatus.GREEN if disease_risk == "Healthy" else RecommendationStatus.DO_NOW),
            "explanation": pest_llm.get('simple_why', pest_why),
            "timing": "Monitor daily",
            "ai_reasoning": pest_llm.get('detailed_reasoning') or pest_fallback_reasoning,
            "ml_data": {
                "confidence": 92,
                "risk_level": disease_risk,
                "shap": pest_shap
            }
        })

        # 4. Spraying Conditions
        spray_llm = llm_cards.get('spraying conditions', {}) or llm_cards.get('spraying', {})
        recommendations.append({
            "title": "Spraying Conditions",
            "description": spray_llm.get('main_action', spray_action),
            "status": status_map.get(spray_llm.get('traffic_light'), RecommendationStatus.MONITOR if is_safe_to_spray else RecommendationStatus.DO_NOW),
            "explanation": spray_llm.get('simple_why', spray_why),
            "timing": "Check before application",
            "ai_reasoning": spray_llm.get('detailed_reasoning') or spray_fallback_reasoning
        })
        
        return {
            "crop_stage": predicted_stage,
            "gdd_value": cumulative_gdd,
            "recommendations": recommendations,
            "sensor_values": sensor_data,
            "ai_reasoning_text": human_advisory.get("overall_summary", "No summary available"),
            "irrigation_shap": irrigation_shap,
            "pest_shap": pest_shap,
            "logic_metrics": {
                "et0": lr.get("ET0_mm_day"),
                "etc": lr.get("ETc_mm_day"),
                "kc": lr.get("Kc")
            }
        }
    except Exception as e:
        print(f"CRITICAL ERROR in get_ai_agent_output: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback with at least one item to avoid empty UI
        return {
            "crop_stage": "Monitoring",
            "gdd_value": 0.0,
            "recommendations": [
                {
                    "title": "System Status",
                    "description": "AI models are currently initializing or updating. Please check sensor status.",
                    "status": RecommendationStatus.MONITOR,
                    "explanation": f"The advisory system encountered a processing error: {str(e)[:100]}. Real-time data is still being collected.",
                    "timing": "Next 1 hour"
                }
            ],
            "sensor_values": {},
            "ai_reasoning_text": f"Error generating advisory: {str(e)}. Please ensure your OpenRouter API key is valid and sensors are sending data.",
            "logic_metrics": {"et0": 0, "etc": 0, "kc": 0},
            "irrigation_shap": {},
            "pest_shap": {}
        }


@router.post("/{field_id}/recommendations", response_model=AIRecommendationResponse)
async def get_ai_recommendations(
    field_id: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    # Verify field belongs to user
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get combined output (Skip LLM by default to save rate limits)
    ai_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user, lat, lon, skip_llm=True)
    
    recommendation_items = [RecommendationItem(**rec) for rec in ai_output["recommendations"]]
    
    # Save to advisory history
    advisories_data = load_json("advisories.json")
    advisories = advisories_data.get("advisories", [])
    
    advisory_id = str(uuid.uuid4())
    advisory = {
        "advisory_id": advisory_id,
        "field_id": field_id,
        "field_name": field.name,
        "date": datetime.datetime.now().isoformat(),
        "recommendations": [
            {
                "type": rec["title"].lower().replace(" ", "_"),
                "status": rec["status"].value if hasattr(rec["status"], 'value') else rec["status"],
                "message": rec["description"]
            }
            for rec in ai_output["recommendations"]
        ],
        "human_advisory": ai_output.get("ai_reasoning_text", "No advisory available")
    }
    
    advisories.append(advisory)
    advisories_data["advisories"] = advisories
    save_json("advisories.json", advisories_data)
    
    return AIRecommendationResponse(
        crop_stage=ai_output["crop_stage"],
        gdd_value=ai_output["gdd_value"],
        recommendations=recommendation_items,
        ai_reasoning_text=ai_output.get("ai_reasoning_text", "Click 'Generate' for AI Advisory")
    )

@router.post("/{field_id}/advisory/generate", response_model=AIRecommendationResponse)
async def generate_manual_advisory(
    field_id: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    language: Optional[str] = "en",
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger the FarmIQ AI to generate a human-readable advisory.
    Saves rate limits by only calling when the farmer explicitly requests it.
    """
    farmer_id = current_user["user_id"]
    lat_key = round(lat, 3) if lat is not None else None
    lon_key = round(lon, 3) if lon is not None else None
    cache_key = f"advisory:{farmer_id}:{field_id}:{language}:{lat_key}:{lon_key}"
    cached_payload = _cache_get(_advisory_cache, cache_key)
    if cached_payload is not None:
        return AIRecommendationResponse(**cached_payload)

    field = get_field_or_404(field_id, farmer_id)
    
    # Get output WITH LLM advisory
    ai_output = await get_ai_agent_output(
        field_id,
        farmer_id,
        current_user,
        lat,
        lon,
        skip_llm=False,
        language=language or "en",
    )
    
    recommendation_items = [RecommendationItem(**rec) for rec in ai_output["recommendations"]]
    
    # Save to history
    advisories_data = load_json("advisories.json")
    advisories = advisories_data.get("advisories", [])
    advisory = {
        "advisory_id": str(uuid.uuid4()),
        "field_id": field_id,
        "field_name": field.name,
        "date": datetime.datetime.now().isoformat(),
        "recommendations": [
            {"type": rec["title"].lower().replace(" ", "_"), "status": rec["status"], "message": rec["description"]}
            for rec in ai_output["recommendations"]
        ],
        "human_advisory": ai_output.get("ai_reasoning_text", "No advisory available")
    }
    advisories.append(advisory)
    advisories_data["advisories"] = advisories
    save_json("advisories.json", advisories_data)
    
    response = AIRecommendationResponse(
        crop_stage=ai_output["crop_stage"],
        gdd_value=ai_output["gdd_value"],
        recommendations=recommendation_items,
        ai_reasoning_text=ai_output.get("ai_reasoning_text", "No advisory available")
    )
    # Avoid caching known "bad" responses (errors / rate limit messages).
    if isinstance(response.ai_reasoning_text, str) and "Error generating advisory" not in response.ai_reasoning_text:
        _cache_set(_advisory_cache, cache_key, response.model_dump())
    return response

@router.post("/{field_id}/recommendations/reasoning", response_model=CardReasoningResponse)
async def get_recommendation_reasoning(
    field_id: str,
    request: CardReasoningRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get AI reasoning for a specific recommendation card.
    Supports Tamil and English via language parameter.
    """
    # Verify field ownership
    field = get_field_or_404(field_id, current_user["user_id"])

    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == current_user["user_id"]), None)
    if not farmer_user:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
        
    # Use language from request, or default to user preference
    language = request.language if request.language else farmer_user.get("preferred_language", "en")
    
    farmer_profile = {
        "name": farmer_user.get("name", ""),
        "location": farmer_user.get("location", ""),
        "preferred_language": language,  # Use requested language
        "farming_type": farmer_user.get("farming_type", "conventional")
    }

    cache_key = f"card_reasoning:{current_user['user_id']}:{field_id}:{request.title}:{language}"
    cached_reasoning = _cache_get(_card_reasoning_cache, cache_key)
    if cached_reasoning is not None:
        return CardReasoningResponse(reasoning=cached_reasoning)

    # Get all context (Farmer, Field, Sensors, Advisory History)
    # skip_llm=True prevents calling the OpenRouter-based advisory generator again.
    ai_agent_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user, skip_llm=True)
    
    field_context = {
        "crop": field.crop,
        "stage": ai_agent_output.get("crop_stage", "Unknown"),
        "area_acres": field.area_acres
    }
    
    # Format current agent output
    formatted_ai_output = {
        "specific_request": request.title,
        "recommendations": ai_agent_output["recommendations"],
        "sensor_values": ai_agent_output["sensor_values"],
        "crop_stage": ai_agent_output["crop_stage"]
    }
    
    # Load knowledge base
    knowledge_data = load_json("knowledge_base.json")
    approved_knowledge = knowledge_data.get("approved_knowledge", {})
    
    # Call reasoning layer with a specific prompt for this card
    prompt = f"Please explain the reasoning behind the recommendation: '{request.title}'. Focus only on this specific recommendation."
    
    reasoning_text = await reasoning_agri_assistant(
        farmer_profile=farmer_profile,
        field_context=field_context,
        ai_agent_output=formatted_ai_output,
        approved_knowledge=approved_knowledge,
        weather_reference={}, # Optional
        advisory_history=[], # Optional
        farmer_question=prompt
    )

    # Avoid caching known "bad" responses (rate limit messages, errors).
    if isinstance(reasoning_text, str) and "Rate Limit" not in reasoning_text and "Advisory reasoning error" not in reasoning_text:
        _cache_set(_card_reasoning_cache, cache_key, reasoning_text)
    
    return CardReasoningResponse(reasoning=reasoning_text)


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
    ai_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    from services.reasoning_layer import reasoning_agri_assistant
    
    # Farmer profile for context-aware chat
    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == current_user["user_id"]), None)
    
    farmer_profile = {
        "name": farmer_user.get("name", ""),
        "location": farmer_user.get("location", ""),
        "preferred_language": message.language or farmer_user.get("preferred_language", "en"),
        "farming_type": farmer_user.get("farming_type", "conventional")
    }
    
    # Call the reasoning layer (updated to use OpenRouter)
    ai_response = await reasoning_agri_assistant(
        farmer_profile=farmer_profile,
        field_context={"crop": field.crop, "stage": ai_output["crop_stage"], "area_acres": field.area_acres},
        ai_agent_output=ai_output,
        approved_knowledge={}, 
        weather_reference={}, 
        advisory_history=[],
        farmer_question=message.message
    )
    
    # Save chat history
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
    
    irrigation_shap, pest_shap = ai_pipeline.get_shap_drivers(final_lstm_input, pest_input)
    
    return TransparencyData(
        sensor_values={
            "air_temp": round(temp, 2),
            "air_humidity": round(humidity, 2),
            "soil_moisture": current_day.get("soil_moisture", 0),
            "light_lux": current_day.get("solar_radiation", 0) * 1000,
            "wind_speed": current_day.get("wind_speed", 0)
        },
        predicted_stage=predicted_stage,
        gdd_value=cumulative_gdd,
        irrigation_logic=f"Bi-LSTM Confidence: {round(irr_prob * 100, 1)}% - Based on 14-day history",
        pest_risk_factors=[f"{k}: {v}" for k, v in pest_shap.items()],
        et0=current_day.get("et0", 0),
        etc=current_day.get("etc", 0),
        kc=current_day.get("kc", 0),
        irrigation_shap_weights=irrigation_shap,
        pest_shap_weights=pest_shap
    )
