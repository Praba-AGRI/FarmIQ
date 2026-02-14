from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
import uuid

from models.schemas import (
    AIRecommendationRequest, AIRecommendationResponse, RecommendationItem,
    ChatMessage, ChatResponse, TransparencyData, RecommendationStatus
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
        
        # Call Irrigation ML Model
        ml_input = {
            "crop": field.crop,
            "stage": crop_stage,
            **weather_data,
            "soil_moisture": sensor_data["soil_moisture"]
        }
        
        ml_recommendation = predict_irrigation(ml_input)
        
        if ml_recommendation:
            # Add to recommendations if irrigation is required (> 0 mm)
            status = RecommendationStatus.MONITOR
            if ml_recommendation["irrigation_required_mm"] > 10:
                status = RecommendationStatus.DO_NOW
            elif ml_recommendation["irrigation_required_mm"] > 0:
                status = RecommendationStatus.WAIT
                
            recommendations.append({
                "title": ml_recommendation["title"],
                "description": ml_recommendation["message"],
                "status": status,
                "explanation": f"Based on ML model prediction for {ml_recommendation['crop']} ({ml_recommendation['stage']}) with {ml_recommendation['confidence']}% confidence. Required: {ml_recommendation['irrigation_required_mm']}mm.",
                "timing": "Within next 12 hours"
            })
        else:
            # Fallback to old rule-based logic if ML model fails or unsupported crop
            if sensor_data["soil_moisture"] < 50:
                recommendations.append({
                    "title": "Irrigation",
                    "description": f"Irrigate the field with 2 inches of water. Current soil moisture is {sensor_data['soil_moisture']}%, which is below optimal levels.",
                    "status": RecommendationStatus.DO_NOW,
                    "explanation": f"Soil moisture is at {sensor_data['soil_moisture']}%, which is below the optimal range of 60-70% for the current crop stage.",
                    "timing": "Within next 6 hours"
                })
        
        recommendations.append({
            "title": "Nutrients",
            "description": "Apply nitrogen fertilizer at recommended dosage.",
            "status": RecommendationStatus.WAIT,
            "explanation": "Crop is in vegetative stage. Wait for 2 days after irrigation before applying fertilizer.",
            "timing": "After 2 days"
        })
        
        if sensor_data["air_humidity"] > 60:
            recommendations.append({
                "title": "Pest/Disease Risk",
                "description": "Monitor for pest activity. High humidity conditions favor pest development.",
                "status": RecommendationStatus.MONITOR,
                "explanation": f"Relative humidity is above 60% ({sensor_data['air_humidity']}%) and temperature is optimal for pest activity. Regular monitoring recommended.",
                "timing": "Daily monitoring"
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
    
    # Call reasoning layer to generate human-readable advisory
    ai_reasoning_text = await reasoning_agri_assistant(
        farmer_profile=farmer_profile,
        field_context=field_context,
        ai_agent_output=formatted_ai_output,
        approved_knowledge=approved_knowledge,
        weather_reference=weather_reference,
        advisory_history=advisory_history,
        farmer_question=None
    )
    
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
        ai_reasoning_text=ai_reasoning_text
    )


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
    
    - Returns sensor values, crop stage, GDD, and logic summary
    """
    # Verify field belongs to user (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get AI agent output
    ai_agent_output = await get_ai_agent_output(field_id, current_user["user_id"], current_user)
    
    # Get sensor values
    sensor_values = ai_agent_output.get("sensor_values", {})
    
    # Generate pest risk factors based on sensor data
    pest_risk_factors = []
    if sensor_values.get("air_humidity", 0) > 60:
        pest_risk_factors.append(f"High relative humidity ({sensor_values.get('air_humidity', 0)}%)")
    if 25 <= sensor_values.get("air_temp", 0) <= 30:
        pest_risk_factors.append(f"Optimal temperature range ({sensor_values.get('air_temp', 0)}°C)")
    pest_risk_factors.append(f"Crop stage: {ai_agent_output.get('crop_stage', 'Unknown')} (susceptible)")
    
    # Generate irrigation logic
    soil_moisture = sensor_values.get("soil_moisture", 0)
    irrigation_logic = f"Soil moisture ({soil_moisture}%) is {'below' if soil_moisture < 50 else 'within' if 50 <= soil_moisture <= 70 else 'above'} optimal threshold (60-70%) for {ai_agent_output.get('crop_stage', 'current')} stage. Temperature and humidity are within acceptable ranges."
    
    return TransparencyData(
        sensor_values=sensor_values,
        predicted_stage=ai_agent_output.get("crop_stage", "Unknown"),
        gdd_value=ai_agent_output.get("gdd_value", 0.0),
        irrigation_logic=irrigation_logic,
        pest_risk_factors=pest_risk_factors
    )

