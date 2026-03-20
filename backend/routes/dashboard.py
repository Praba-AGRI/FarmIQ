import numpy as np
from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from utils.field_validation import get_field_or_404
from routes.auth import get_current_user
from services.storage import load_json
from services.agronomic_engine import enrich_telemetry_history
from services.ai_pipeline_service import ai_pipeline
from services.ui_mapper import format_dashboard_json

router = APIRouter()

@router.get("/fields/{field_id}/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard_advisory(
    field_id: str,
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Phase 4, 5 & 6: Machine Learning Inference, Dumb Frontend Mapper & Delivery
    Queries the Agronomic Math Engine for the precise array, feeds the Bi-LSTM/RF,
    and formats via strict dictionary for 0ms frontend delivery.
    """
    farmer_id = current_user["user_id"]
    field = get_field_or_404(field_id, farmer_id)
    
    # Get farmer location from memory if not provided
    users_data = load_json("users.json")
    farmer_user = next((u for u in users_data.get("users", []) if u.get("user_id") == farmer_id), None)
    farmer_location = farmer_user.get("location", "") if farmer_user else ""
    
    # Phase 3: Agronomic Engine
    # Ensures MongoDB is populated and synced with OpenWeather API fallback.
    # Returns last 14 days of cleaned sensor/agronomic data array.
    history_last_14, cumulative_gdd, predicted_stage = await enrich_telemetry_history(
        field, farmer_location, lat, lon
    )
    
    # Needs 14 days exactly. If history is less, pad it with the first available day's data
    if len(history_last_14) == 0:
        # Emergency empty state if DB is completely empty and Weather API failed
        return format_dashboard_json(
            0, False, 0, 0, 0, [0,0,0], "Unknown", field.crop, field.area_acres,
            "Normal", 25, 60, "Safe", 5
        )

    # Pad array if < 14
    while len(history_last_14) < 14:
        # duplicate the oldest known day backward
        history_last_14.insert(0, history_last_14[0])
        
    feature_sequence = []
    for day in history_last_14:
        fv = ai_pipeline.construct_feature_vector(
            day.get("t_avg", 25),
            day.get("humidity", 60),
            day.get("soil_moisture", 50),
            day.get("et0", 4),
            day.get("etc", 4),
            day.get("stage", predicted_stage),
            field.crop,
            field.area_acres,
            day.get("solar_radiation", 15) * 1000 # Convert back to lux for the model if needed
        )
        feature_sequence.append(fv)
        
    lstm_input = np.array(feature_sequence)
    
    # Phase 4: Machine Learning Inference
    irr_prob, irrigation_needed, final_lstm_input = ai_pipeline.predict_irrigation(lstm_input)
    nut_pred, nut_input = ai_pipeline.predict_nutrients(field.crop, predicted_stage, field.area_acres)
    
    # Get current day logic bounds
    current_day = history_last_14[-1]
    temp = current_day.get("t_avg", 25)
    humidity = current_day.get("humidity", 60)
    wind_speed = current_day.get("wind_speed", 5.0)
    
    # Season approximation
    from datetime import datetime
    now = datetime.now()
    season = "Kharif" if 6 <= now.month <= 10 else "Rabi"
    
    disease_risk, pest_input = ai_pipeline.predict_pests(
        field.crop, predicted_stage, season, temp, humidity
    )
    
    # Spraying rule evaluation
    spray_decision = ai_pipeline.spraying_engine.evaluate(wind_speed, humidity, temp)
    
    # Irrigation Amount Math (ETc - Effective Rain)
    curr_etc = current_day.get("etc", 0)
    curr_sm = current_day.get("soil_moisture", 50)
    # Simple rule: if needed, supply the ETc lost. (Assuming no rain for simple 0ms response).
    irr_amount_mm = curr_etc if irrigation_needed else 0
    
    # Phase 5: Python Dictionary Mapper
    ui_response_payload = format_dashboard_json(
        irr_prob, irrigation_needed, curr_etc, curr_sm, irr_amount_mm,
        nut_pred, predicted_stage, field.crop, field.area_acres,
        disease_risk, temp, humidity, spray_decision, wind_speed
    )
    
    # Extra context for transparency
    ui_response_payload["cumulative_gdd"] = cumulative_gdd
    
    # Deliver instant 0ms JSON
    return ui_response_payload
