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
from services.storage import load_json, save_json
from services.reasoning_layer import reasoning_agri_assistant
from services.weather_service import get_coordinates, get_onecall_weather, transform_onecall_response
from services.irrigation_ml_service import predict_irrigation
from services.irrigation_logic import irrigation_recommendation
from utils.helpers import get_timestamp
from utils.field_validation import get_field_or_404

router = APIRouter()


async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None) -> dict:
    """
    Get AI agent output (ML + rule-based decisions)
    
    This function should call your actual AI agent/ML model.
    For now, it returns mock decisions based on sensor data.
    
    In production, replace this with actual AI agent API call.
    """
    try:
        # Use provided current_user or create mock user dict
        if current_user is None:
            mock_user = {"user_id": farmer_id}
        else:
            mock_user = current_user
        
        # Get field first - validate ownership using helper
        # Note: get_field_or_404 is synchronous, but works with farmer_id directly
        farmer_id_to_use = farmer_id if current_user is None else current_user["user_id"]
        
        field = get_field_or_404(field_id, farmer_id_to_use)
        
        # Try to get sensor data, but handle missing data gracefully
        try:
            sensor_response = await get_current_sensor_readings(field_id, mock_user)
        except HTTPException as e:
            if e.status_code == 404:
                # No sensor data available - use default values
                sensor_response = None
            else:
                raise
        
        # Use default sensor values if no data is available
        if sensor_response is None:
            sensor_data = {
                "air_temp": 25.0,
                "air_humidity": 60.0,
                "soil_temp": 24.0,
                "soil_moisture": 50.0,
                "light_lux": 500.0,
                "wind_speed": 10.0
            }
        else:
            sensor_data = {
                "air_temp": sensor_response.air_temp,
                "air_humidity": sensor_response.air_humidity,
                "soil_temp": sensor_response.soil_temp,
                "soil_moisture": sensor_response.soil_moisture,
                "light_lux": sensor_response.light_lux,
                "wind_speed": sensor_response.wind_speed
            }
        
        # Mock AI logic (in production, this comes from AI agent)
        # Note: crop_stage is not stored in field schema, will come from AI agent
        crop_stage = "Vegetative"  # Default, should come from AI agent
        gdd_value = 1250.0  # This should come from AI agent
        
        # Get weather data for irrigation prediction (ET0, rainfall, etc.)
        # Default values if weather service fails
        weather_data = {
            "temp_avg": sensor_data["air_temp"],
            "humidity_avg": sensor_data["air_humidity"],
            "wind_speed": sensor_data["wind_speed"] if sensor_data["wind_speed"] else 1.4,
            "solar_radiation": 20.0,
            "rainfall_last_3d": 0.0,
            "rainfall_forecast": 0.0,
            "ET0": 5.0
        }
        
        try:
            # Try to get actual weather data if user location is available
            users_data = load_json("users.json")
            users = users_data.get("users", [])
            farmer_user = next((u for u in users if u.get("user_id") == farmer_id_to_use), None)
            
            if farmer_user and farmer_user.get("location"):
                coords = await get_coordinates(farmer_user["location"])
                if coords:
                    onecall_data = await get_onecall_weather(coords["lat"], coords["lon"])
                    transformed = transform_onecall_response(onecall_data)
                    
                    # Update weather_data with real values
                    weather_data["temp_avg"] = transformed["current"]["temperature"]
                    weather_data["humidity_avg"] = transformed["current"]["humidity"]
                    weather_data["wind_speed"] = transformed["current"]["wind_speed"]
                    # Rainfall forecast (next 24h as rough estimate for forecast)
                    weather_data["rainfall_forecast"] = sum(h["rain"] for h in transformed["hourly"][:24])
                    # Note: rainfall_last_3d and solar_radiation would ideally come from a history/sensor service
        except Exception as e:
            print(f"Error fetching weather context for ML model: {e}")

        # Generate recommendations
        recommendations = []
        
        # 1. Calculate derived metrics using Logic Engine (GDD, ET0, ETc) 
        # based on real-time weather data
        logic_input = {
            "crop": field.crop,
            "weather_history": [], # TODO: pass real history if available
            "temp_avg": weather_data.get("temp_avg", 30),
            "temp_max": weather_data.get("temp_avg", 30) + 5, # Estimate
            "temp_min": weather_data.get("temp_avg", 30) - 5, # Estimate
            "humidity": weather_data.get("humidity_avg", 60),
            "wind_speed": weather_data.get("wind_speed", 2.0),
            "solar_radiation": weather_data.get("solar_radiation", 15.0),
            "rainfall_last_3d": weather_data.get("rainfall_last_3d", 0),
            "soil_moisture": sensor_data["soil_moisture"],
            "stage": crop_stage # Use estimated stage as fallback/hint
        }
        
        logic_result = irrigation_recommendation(logic_input)
        
        # Extract calculated metrics for ML model and Transparency
        calculated_et0 = logic_result["ET0_mm_day"]
        calculated_etc = logic_result["ETc_mm_day"]
        calculated_kc = logic_result["Kc"]
        calculated_gdd = logic_result["cumulative_gdd"]
        estimated_stage = logic_result["estimated_stage"]
        
        # 2. Call Irrigation ML Model using calculated metrics
        ml_input = {
            "crop": field.crop,
            "stage": estimated_stage, # Use stage from logic engine
            **weather_data,
            "ET0": calculated_et0, # Use calculated ET0
            "soil_moisture": sensor_data["soil_moisture"]
        }
        
        ml_recommendation = predict_irrigation(ml_input)
        
        # Determine which recommendation to use
        # We prefer ML if available, but Logic is a very strong fallback/baseline
        if ml_recommendation and ml_recommendation["irrigation_required_mm"] is not None:
             # Use ML recommendation
            status = RecommendationStatus.MONITOR
            if ml_recommendation["irrigation_required_mm"] > 10:
                status = RecommendationStatus.DO_NOW
            elif ml_recommendation["irrigation_required_mm"] > 0:
                status = RecommendationStatus.WAIT
                
            recommendations.append({
                "title": ml_recommendation["title"],
                "description": ml_recommendation["message"],
                "status": status,
                "explanation": f"Based on ML prediction using Penman-Monteith ET0 ({calculated_et0} mm). Crop Stage: {estimated_stage}.",
                "timing": "Within next 12 hours",
                "ml_data": {
                    "amount_mm": ml_recommendation["irrigation_required_mm"],
                    "confidence": ml_recommendation["confidence"],
                    "et0": calculated_et0,
                    "kc": calculated_kc,
                    "etc": calculated_etc
                }
            })
        else:
            # Fallback to Logic-Based Engine
            rec_amount = logic_result["recommended_irrigation_mm"]
            if rec_amount > 10:
                status = RecommendationStatus.DO_NOW
            elif rec_amount > 0:
                status = RecommendationStatus.WAIT
            else:
                status = RecommendationStatus.MONITOR
                
            recommendations.append({
                "title": "Irrigation",
                "description": logic_result["advisory"],
                "status": status,
                "explanation": f"Calculated using Penman-Monteith ET0. Crop Stage: {estimated_stage} (GDD: {calculated_gdd}). ETc: {calculated_etc} mm/day.",
                "timing": "Within next 24 hours" if rec_amount > 0 else "Monitor daily",
                "ml_data": {
                    "amount_mm": rec_amount,
                    "confidence": logic_result["stage_confidence"],
                    "et0": calculated_et0,
                    "kc": calculated_kc,
                    "etc": calculated_etc
                }
            })
        
        recommendations.append({
            "title": "Nutrients",
            "description": "Apply nitrogen fertilizer at recommended dosage.",
            "status": RecommendationStatus.WAIT,
            "explanation": "Crop is in vegetative stage. Wait for 2 days after irrigation before applying fertilizer.",
            "timing": "After 2 days"
        })
        
        # Pest Management Recommendation with ML-style predictions
        pest_risk_score = 0
        pest_factors = []
        
        # Environmental risk factors for pests
        if sensor_data["air_humidity"] > 70:
            pest_risk_score += 40
            pest_factors.append(f"High humidity ({sensor_data['air_humidity']}%)")
        elif sensor_data["air_humidity"] > 60:
            pest_risk_score += 25
            pest_factors.append(f"Moderate humidity ({sensor_data['air_humidity']}%)")
        
        temp_optimal_for_pests = 25 <= sensor_data["air_temp"] <= 32
        if temp_optimal_for_pests:
            pest_risk_score += 30
            pest_factors.append(f"Optimal temperature for pests ({sensor_data['air_temp']}°C)")
        
        # Add rainfall influence if available
        if weather_data.get("rainfall_last_3d", 0) > 10:
            pest_risk_score += 20
            pest_factors.append("Recent rainfall increases risk")
        
        # Normalize score to 0-100 and calculate confidence
        pest_risk_score = min(pest_risk_score, 100)
        pest_confidence = min(75 + len(pest_factors) * 5, 95)  # Higher confidence with more factors
        
        # Determine pest status and description
        if pest_risk_score >= 60:
            pest_status = RecommendationStatus.DO_NOW
            pest_description = "High pest risk detected. Immediate monitoring and preventive action recommended."
            pest_action = "Apply recommended pest control measures"
        elif pest_risk_score >= 30:
            pest_status = RecommendationStatus.MONITOR
            pest_description = "Moderate pest risk. Increase monitoring frequency."
            pest_action = "Monitor daily for pest activity"
        else:
            pest_status = RecommendationStatus.WAIT
            pest_description = "Low pest risk. Continue regular monitoring."
            pest_action = "Continue routine monitoring"
        
        # Build explanation
        pest_explanation = f"Pest risk assessment based on: {', '.join(pest_factors)}. Environmental conditions are {'favorable' if pest_risk_score >= 60 else 'moderately favorable' if pest_risk_score >= 30 else 'not favorable'} for pest activity."
        
        recommendations.append({
            "title": "Pest Management",
            "description": pest_description,
            "status": pest_status,
            "explanation": pest_explanation,
            "timing": "Immediate" if pest_risk_score >= 60 else "Daily monitoring" if pest_risk_score >= 30 else "Weekly monitoring",
            "ml_data": {
                "risk_level": round(pest_risk_score, 1),
                "confidence": round(pest_confidence, 1)
            }
        })
        
        return {
            "crop_stage": crop_stage,
            "gdd_value": gdd_value,
            "recommendations": recommendations,
            "sensor_values": sensor_data
        }
    except Exception as e:
        # Return default mock data if sensor data unavailable
        return {
            "crop_stage": "Vegetative",
            "gdd_value": 1250.0,
            "recommendations": [
                {
                    "title": "Irrigation",
                    "description": "Monitor soil moisture levels",
                    "status": RecommendationStatus.MONITOR,
                    "explanation": "Regular monitoring recommended",
                    "timing": "Daily"
                }
            ],
            "sensor_values": {}
        }


@router.post("/{field_id}/recommendations", response_model=AIRecommendationResponse)
async def get_ai_recommendations(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger AI agent pipeline to get recommendations for a field
    
    - Calls AI agent to get decisions
    - Uses reasoning layer to generate human-readable advisory
    - Returns structured recommendations with reasoning
    """
    # Verify field belongs to user (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get AI agent output (ML + rule-based decisions)
    ai_agent_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    # Get all required data for reasoning layer
    # Get farmer profile from users.json
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    farmer_user = next((u for u in users if u.get("user_id") == current_user["user_id"]), None)
    
    if not farmer_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
    
    farmer_profile = {
        "name": farmer_user.get("name", ""),
        "location": farmer_user.get("location", ""),
        "preferred_language": farmer_user.get("preferred_language", "en"),
        "farming_type": farmer_user.get("farming_type", "conventional")
    }
    
    # Get user location (location is stored in user profile, not field)
    user_location = farmer_user.get("location", "Tamil Nadu, India")
    
    field_context = {
        "crop": field.crop,
        "stage": ai_agent_output.get("crop_stage", "Unknown"),
        "area_acres": field.area_acres
    }
    
    # Get sensor data
    sensor_response = await get_current_sensor_readings(field_id, current_user)
    
    # Weather data requires lat/lon coordinates, not location strings
    # TODO: Integrate geocoding service or use device geolocation to get coordinates
    # For now, weather reference is optional (AI reasoning layer can work without it)
    weather_reference = {
        "note": "Weather data not available - requires device geolocation (lat/lon)"
    }
    
    # Get advisory history
    advisory_history_response = await get_advisory_history(field_id=field_id, current_user=current_user)
    advisory_history = [
        {
            "date": adv.date,
            "recommendations": [
                {
                    "type": rec.type,
                    "status": rec.status,
                    "message": rec.message
                }
                for rec in adv.recommendations
            ]
        }
        for adv in advisory_history_response
    ]
    
    # Load approved knowledge (ICAR/TNAU)
    knowledge_data = load_json("knowledge_base.json")
    approved_knowledge = knowledge_data.get("approved_knowledge", {
        "source": ["ICAR", "TNAU"],
        "notes": []
    })
    
    # Format AI agent output for reasoning layer
    formatted_ai_output = {
        "irrigation": {
            "action": next((r["title"] for r in ai_agent_output["recommendations"] if r["title"] == "Irrigation"), "Monitor"),
            "amount_mm": 27.6 if any(r["title"] == "Irrigation" and r["status"] == RecommendationStatus.DO_NOW for r in ai_agent_output["recommendations"]) else None
        },
        "pest_risk": {
            "level": "High" if any(r["title"] == "Pest/Disease Risk" for r in ai_agent_output["recommendations"]) else "Low",
            "threat": "Monitor conditions"
        },
        "nutrients": {
            "N": "20 kg/acre",
            "organic": "2 tons FYM" if farmer_profile["farming_type"] == "organic" else None
        },
        "recommendations": ai_agent_output["recommendations"],
        "crop_stage": ai_agent_output["crop_stage"],
        "gdd_value": ai_agent_output["gdd_value"]
    }
    
    # Convert recommendations to schema format
    recommendation_items = [
        RecommendationItem(**rec) for rec in ai_agent_output["recommendations"]
    ]
    
    # Save to advisory history
    advisories_data = load_json("advisories.json")
    advisories = advisories_data.get("advisories", [])
    
    advisory = {
        "advisory_id": str(uuid.uuid4()),
        "field_id": field_id,
        "field_name": field.name,
        "date": get_timestamp(),
        "recommendations": [
            {
                "type": rec.title.lower().replace(" ", "_"),
                "status": rec.status.value if hasattr(rec.status, 'value') else rec.status,
                "message": rec.description
            }
            for rec in recommendation_items
        ]
    }
    
    advisories.append(advisory)
    advisories_data["advisories"] = advisories
    save_json("advisories.json", advisories_data)
    
    return AIRecommendationResponse(
        crop_stage=ai_agent_output["crop_stage"],
        gdd_value=ai_agent_output["gdd_value"],
        recommendations=recommendation_items,
        ai_reasoning_text=None
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
    """
    Send a question to AI reasoning assistant
    
    - Accepts user question about recommendations
    - Returns AI explanation/response using reasoning layer
    """
    # Verify field belongs to user (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get AI agent output (ML + rule-based decisions)
    ai_agent_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    # Get all required data for reasoning layer
    # Get farmer profile from users.json
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    farmer_user = next((u for u in users if u.get("user_id") == current_user["user_id"]), None)
    
    if not farmer_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
    
    farmer_profile = {
        "name": farmer_user.get("name", ""),
        "location": farmer_user.get("location", ""),
        "preferred_language": message.language or farmer_user.get("preferred_language", "en"),
        "farming_type": farmer_user.get("farming_type", "conventional")
    }
    
    # Get user location (location is stored in user profile, not field)
    user_location = farmer_user.get("location", "Tamil Nadu, India")
    
    field_context = {
        "crop": field.crop,
        "stage": ai_agent_output.get("crop_stage", "Unknown"),
        "area_acres": field.area_acres
    }
    
    # Get sensor data (optional - handle gracefully if missing)
    sensor_response = None
    try:
        sensor_response = await get_current_sensor_readings(field_id, current_user)
    except HTTPException as e:
        if e.status_code == 404:
            # No sensor data available - that's okay, we'll use general advice
            sensor_response = None
        else:
            raise
    
    # Get weather data using user's location (optional - handle gracefully if missing)
    # Get weather data using user's location
    weather_reference = {"note": "Weather data not available"}
    try:
        # Get coordinates for user location
        coords = await get_coordinates(farmer_profile["location"])
        
        if coords:
            # Fetch weather data
            weather_data = await get_onecall_weather(coords["lat"], coords["lon"])
            transformed_weather = transform_onecall_response(weather_data)
            
            # Format for reasoning layer
            weather_reference = {
                "current": transformed_weather["current"],
                "forecast": transformed_weather["daily"][:3], # Next 3 days
                "alerts": [
                    {
                        "type": alert.get("event"),
                        "severity": alert.get("severity"),
                        "description": alert.get("description")
                    }
                    for alert in transformed_weather.get("alerts", [])
                ],
                "location": coords["name"]
            }
        else:
            print(f"Could not find coordinates for location: {farmer_profile['location']}")
            weather_reference = {"note": f"Weather data not available for location: {farmer_profile['location']}"}
            
    except Exception as e:
        # Weather data unavailable - continue with general advice
        print(f"Weather data unavailable: {e}")
        weather_reference = {"note": "Weather data not available"}
    
    # Get advisory history (optional - handle gracefully if missing)
    advisory_history = []
    try:
        advisory_history_response = await get_advisory_history(field_id=field_id, current_user=current_user)
        advisory_history = [
            {
                "date": adv.date,
                "recommendations": [
                    {
                        "type": rec.type,
                        "status": rec.status,
                        "message": rec.message
                    }
                    for rec in adv.recommendations
                ]
            }
            for adv in advisory_history_response
        ]
    except Exception as e:
        # Advisory history unavailable - continue without it
        print(f"Advisory history unavailable: {e}")
        advisory_history = []
    
    # Load approved knowledge (ICAR/TNAU)
    knowledge_data = load_json("knowledge_base.json")
    approved_knowledge = knowledge_data.get("approved_knowledge", {
        "source": ["ICAR", "TNAU"],
        "notes": []
    })
    
    # Format AI agent output for reasoning layer (only if available)
    # Check if we have valid recommendations and sensor data
    has_recommendations = ai_agent_output.get("recommendations") and len(ai_agent_output.get("recommendations", [])) > 0
    has_sensor_data = ai_agent_output.get("sensor_values") and len(ai_agent_output.get("sensor_values", {})) > 0
    
    if has_recommendations and has_sensor_data:
        # Use actual ML/logic output
        formatted_ai_output = {
            "irrigation": {
                "action": next((r["title"] for r in ai_agent_output["recommendations"] if r["title"] == "Irrigation"), "Monitor"),
                "amount_mm": 27.6 if any(r["title"] == "Irrigation" and r["status"] == RecommendationStatus.DO_NOW for r in ai_agent_output["recommendations"]) else None
            },
            "pest_risk": {
                "level": "High" if any(r["title"] == "Pest/Disease Risk" for r in ai_agent_output["recommendations"]) else "Low",
                "threat": "Monitor conditions"
            },
            "nutrients": {
                "N": "20 kg/acre",
                "organic": "2 tons FYM" if farmer_profile["farming_type"] == "organic" else None
            },
            "recommendations": ai_agent_output["recommendations"],
            "crop_stage": ai_agent_output.get("crop_stage", "Unknown"),
            "gdd_value": ai_agent_output.get("gdd_value", 0.0),
            "sensor_values": ai_agent_output.get("sensor_values", {})
        }
    else:
        # No ML/logic data available - provide minimal context for general advice
        formatted_ai_output = {
            "note": "ML/AI agent output and sensor data not available",
            "recommendations": [],
            "crop_stage": field_context.get("stage", "Unknown"),
            "gdd_value": None,
            "sensor_values": {}
        }
    
    # Call reasoning layer with farmer question
    ai_response = await reasoning_agri_assistant(
        farmer_profile=farmer_profile,
        field_context=field_context,
        ai_agent_output=formatted_ai_output,
        approved_knowledge=approved_knowledge,
        weather_reference=weather_reference,
        advisory_history=advisory_history,
        farmer_question=message.message
    )
    
    # Save chat history
    chat_data = load_json("chat_history.json")
    if field_id not in chat_data:
        chat_data[field_id] = []
    
    timestamp = get_timestamp()
    
        # setMessages(response.data)
        # So backend MUST return objects with { type, message, timestamp }.

    

    
    # Append User Message
    chat_data[field_id].append({
        "id": str(uuid.uuid4()),
        "type": "user",
        "message": message.message,
        "timestamp": timestamp
    })
    
    # Append AI Message
    chat_data[field_id].append({
        "id": str(uuid.uuid4()),
        "type": "ai",
        "message": ai_response,
        "timestamp": timestamp
    })
    
    save_json("chat_history.json", chat_data)
    
    return ChatResponse(
        id=str(uuid.uuid4()),
        type="ai",
        message=ai_response,
        response=ai_response,
        timestamp=timestamp
    )


@router.get("/{field_id}/transparency", response_model=TransparencyData)
async def get_transparency_data(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get ML transparency data showing what data was used for recommendations
    """
    
    # Reuse the main logic to get all the data and calculations
    # This ensures consistency between what the agent "thought" and what we show
    ai_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    # Extract the relevant data from the complex ai_output structure
    # We need to find the irrigation recommendation to get the detailed metrics
    rec_item = next((r for r in ai_output.get("recommendations", []) if r.get("title") == "Irrigation"), None)
    
    ml_data = rec_item.get("ml_data", {}) if rec_item else {}
    
    # Construct the transparency response
    # We map the internal calculation keys to the public API properties
    return TransparencyData(
        sensor_values=ai_output.get("sensor_values", {}),
        predicted_stage=ai_output.get("crop_stage", "Vegetative"),
        gdd_value=ml_data.get("gdd", 0.0), # We might need to ensure this is passed in ml_data or ai_output
        irrigation_logic=rec_item.get("explanation", "Standard logic") if rec_item else "No irrigation needed",
        pest_risk_factors=["High humidity", "Low wind"] if ai_output.get("sensor_values", {}).get("air_humidity", 0) > 85 else ["None"],
        et0=ml_data.get("et0"),
        etc=ml_data.get("etc"),
        kc=ml_data.get("kc")
    )
