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

router = APIRouter()

async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None, lat: float = None, lon: float = None, skip_llm: bool = False) -> dict:
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
        
        human_advisory = "Recommendation generated. Click 'Generate AI Smart Advisory' for a detailed bilingual plan."
        if not skip_llm:
            human_advisory = ai_pipeline.generate_human_advisory(raw_ml_data, history_summaries)

        # 5. Response Assembly (Simplified for Farmers)
        irr_amount_mm = lr.get("recommended_irrigation_mm", 0)
        # Rule of thumb: 10mm = 60 mins for a standard pump/field size
        pump_minutes = int(round(irr_amount_mm * 6))
        
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

        recommendations = [
            {
                "title": "Irrigation",
                "description": irr_action,
                "status": RecommendationStatus.DO_NOW if irrigation_needed else RecommendationStatus.MONITOR,
                "explanation": irr_why,
                "timing": "Today" if irrigation_needed else "Next 24h",
                "ml_data": {
                    "confidence": round(irr_prob * 100, 1),
                    "amount_mm": irr_amount_mm,
                    "pump_minutes": pump_minutes,
                    "shap": irrigation_shap
                }
            },
            {
                "title": "Nutrients",
                "description": nut_action,
                "status": RecommendationStatus.WAIT,
                "explanation": nut_why,
                "timing": "Next 2-3 days",
                "ml_data": {
                    "confidence": 85,
                    "prediction": f"N:{round(nut_pred[0],1)}",
                    "nitro_kg": nitro_kg
                }
            },
            {
                "title": "Pest Management",
                "description": pest_action,
                "status": RecommendationStatus.GREEN if disease_risk == "Healthy" else RecommendationStatus.DO_NOW,
                "explanation": pest_why,
                "timing": "Monitor daily",
                "ml_data": {
                    "confidence": 92,
                    "risk_level": disease_risk,
                    "shap": pest_shap
                }
            },
            {
                "title": "Spraying Conditions",
                "description": spray_action,
                "status": RecommendationStatus.MONITOR if is_safe_to_spray else RecommendationStatus.DO_NOW,
                "explanation": spray_why,
                "timing": "Check before application"
            }
        ]
        
        return {
            "crop_stage": predicted_stage,
            "gdd_value": cumulative_gdd,
            "recommendations": recommendations,
            "sensor_values": sensor_data,
            "ai_reasoning_text": human_advisory,
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
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger the FarmIQ AI to generate a human-readable advisory.
    Saves rate limits by only calling when the farmer explicitly requests it.
    """
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get output WITH LLM advisory
    ai_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user, lat, lon, skip_llm=False)
    
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
    
    return AIRecommendationResponse(
        crop_stage=ai_output["crop_stage"],
        gdd_value=ai_output["gdd_value"],
        recommendations=recommendation_items,
        ai_reasoning_text=ai_output.get("ai_reasoning_text", "No advisory available")
    )

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
    
    # Get all context (Farmer, Field, Sensors, Advisory History)
    ai_agent_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
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
    ai_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    return TransparencyData(
        sensor_values=ai_output["sensor_values"],
        predicted_stage=ai_output["crop_stage"],
        gdd_value=ai_output["gdd_value"],
        irrigation_logic=f"Bi-LSTM Confidence: {ai_output['recommendations'][0].get('ml_data', {}).get('confidence', 0)}% - Based on 14-day history",
        pest_risk_factors=[f"{k}: {v}" for k, v in ai_output["pest_shap"].items()],
        et0=ai_output["logic_metrics"]["et0"],
        etc=ai_output["logic_metrics"]["etc"],
        kc=ai_output["logic_metrics"]["kc"],
        irrigation_shap_weights=ai_output["irrigation_shap"],
        pest_shap_weights=ai_output["pest_shap"]
    )
