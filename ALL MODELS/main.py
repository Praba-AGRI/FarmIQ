import numpy as np
import pandas as pd
import joblib
import json
import tensorflow as tf
from tensorflow.keras.models import load_model
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any

import google.generativeai as genai
from models.spraying_rules import SprayingDecisionEngine
from market_integration import MarketIntegrationModule
from shap_explainer import XAIExplainer

# Handle cross-version Keras saved model issues
tf.keras.config.enable_unsafe_deserialization() 

app = FastAPI(
    title="Climate-Resilient Precision Crop Advisory System",
    description="Market-Integrated and Explainable AI (XAI) backend framework for smallholder farmers.",
    version="1.0.0"
)

# 0. Configure Gemini API
genai.configure(api_key="AIzaSyD9uePo--HZ8chzMxGInyfx8_ts-8Q-3SA")
llm_model = genai.GenerativeModel('models/gemini-flash-latest')

def generate_farmer_advisory(ai_json_payload, recent_history):
    """Translates the AI Math JSON into a context-aware bilingual advisory"""
    
    # Format the memory (Keep only last 3 to save tokens)
    memory_string = "No recent history available."
    if recent_history and len(recent_history) > 0:
        last_three = recent_history[-3:]
        memory_string = "\n".join([f"- {item}" for item in last_three])

    system_prompt = f"""
    You are 'FarmIQ', an expert agricultural AI advisory system for smallholder farmers in Tamil Nadu. 
    
    === FARMER'S RECENT HISTORY ===
    {memory_string}
    
    === CURRENT REAL-TIME ML DATA ===
    {json.dumps(ai_json_payload, indent=2)}
    
    Your task:
    1. Write a clear, 3-bullet point action plan for today.
    2. *CRITICAL*: If the "Recent History" is relevant to today's data, you MUST acknowledge it. (e.g., "Following up on yesterday's irrigation...", or "Since you recently applied fertilizer...").
    3. Explain *why* you are giving today's advice by referencing the mathematical impacts (from the SHAP data).
    4. Provide the complete response first in English, and then provide a perfectly translated version in natural Tamil.
    """
    try:
        response = llm_model.generate_content(system_prompt)
        return response.text
    except Exception as e:
        print(f"LLM Error: {e}")
        return "Advisory generation failed. Please check system logs."

# Load AI Models
print("Loading trained models for FastAPI Service...")
irrigation_model = load_model('irrigation_lstm.h5', compile=False)
nutrient_model = joblib.load('nutrient_rf_model.pkl')
pest_model = joblib.load('pest_rf_model.pkl')

nut_crop_le = joblib.load('crop_le.pkl')
nut_stage_le = joblib.load('stage_le.pkl')

pest_crop_le = joblib.load('pest_crop_le.pkl')
pest_stage_le = joblib.load('pest_stage_le.pkl')
pest_season_le = joblib.load('pest_season_le.pkl')
pest_label_le = joblib.load('pest_label_le.pkl')

# Phenology Model (GDD based)
gdd_model = joblib.load('gdd_stage_model.pkl')
gdd_crop_le = joblib.load('gdd_crop_le.pkl')
gdd_stage_le = joblib.load('gdd_stage_le.pkl')

spraying_engine = SprayingDecisionEngine()
market_module = MarketIntegrationModule()

# SHAP Explainer
# We create a dummy background dataset for DeepExplainer (e.g. 100 random samples of shape (14, 9))
background_data_lstm = np.random.rand(100, 14, 9) 
xai_explainer = XAIExplainer(
    lstm_model=irrigation_model,
    rf_nutrient_model=nutrient_model,
    rf_pest_model=pest_model,
    background_data_lstm=background_data_lstm
)

class SensorDataInput(BaseModel):
    crop_name: str = Field(..., example="Rice")
    # crop_stage: str = Field(..., example="Vegetative") # Removed: Now predicted via GDD
    cumulative_gdd: float = Field(..., example=650.0) # Added thermal time
    season: str = Field(..., example="Kharif")
    field_size_acres: float = Field(..., example=2.5)
    time_for_harvest_days: int = Field(..., example=45)
    
    recent_temperature: float = Field(..., example=33.5)
    recent_humidity: float = Field(..., example=89.0)
    wind_speed: float = Field(..., example=15.0)
    soil_moisture_status: str = Field(..., example="Critically Low")
    # Context Memory: Past interactions or farmer logs
    recent_history: List[str] = Field(default=[], example=["Farmer applied Urea 2 days ago."])

class AdvisoryResponse(BaseModel):
    crop: str
    stage: str
    field_size_acres: float
    current_conditions: Dict[str, Any]
    advisory_outputs: Dict[str, Any]
    market_data: Dict[str, Any]
    mathematical_drivers: Dict[str, Any]
    human_advisory: str # Added field for Gemini output

@app.post("/api/v1/advisory", response_model=AdvisoryResponse)
async def get_crop_advisory(payload: SensorDataInput):
    # 0. Autonomous Phenology Prediction (GDD -> Stage)
    try:
        gdd_crop_enc = gdd_crop_le.transform([payload.crop_name])[0]
        gdd_input = np.array([[gdd_crop_enc, payload.cumulative_gdd]])
        predicted_stage_idx = gdd_model.predict(gdd_input)[0]
        predicted_stage = gdd_stage_le.inverse_transform([predicted_stage_idx])[0]
    except Exception as e:
        print(f"Phenology prediction error: {e}")
        predicted_stage = "Vegetative" # Fallback
        
    # 1. Irrigation (LSTM)
    lstm_input = np.random.rand(1, 14, 9)
    lstm_input[0, -1, 2] = 0.05 if payload.soil_moisture_status == "Critically Low" else 0.8
    irrigation_pred = irrigation_model.predict(lstm_input, verbose=0)
    irr_prob = float(irrigation_pred[0][1])
    irrigation_needed = bool(irr_prob > 0.5 or payload.soil_moisture_status == "Critically Low")
    
    # 2. Nutrient (Random Forest Regressor)
    try:
        nut_crop_enc = nut_crop_le.transform([payload.crop_name])[0]
        nut_stage_enc = nut_stage_le.transform([predicted_stage])[0]
    except ValueError:
        nut_crop_enc, nut_stage_enc = 0, 0
    nut_input = np.array([[nut_crop_enc, nut_stage_enc, payload.field_size_acres]])
    nut_pred = nutrient_model.predict(nut_input)[0]
    
    # 3. Pest (Random Forest Classifier)
    try:
        pest_crop_enc = pest_crop_le.transform([payload.crop_name])[0]
        pest_stage_enc = pest_stage_le.transform([predicted_stage])[0]
        pest_season_enc = pest_season_le.transform([payload.season])[0]
    except ValueError:
        pest_crop_enc, pest_stage_enc, pest_season_enc = 0, 0, 0
    pest_input = np.array([[pest_crop_enc, pest_stage_enc, pest_season_enc, payload.recent_temperature, payload.recent_humidity]])
    pest_pred_idx = pest_model.predict(pest_input)[0]
    disease_risk = pest_label_le.inverse_transform([pest_pred_idx])[0]
    
    # 4. Spraying Decision Engine
    try:
        spray_decision = spraying_engine.evaluate(payload.wind_speed, payload.recent_humidity, payload.recent_temperature)
    except AttributeError:
        spray_decision = "Do Not Spray" if payload.wind_speed > 10.0 else "Safe to Spray"
        
    # 5. Market Output
    market_prices = market_module.fetch_market_prices(commodity=payload.crop_name)
    economics = market_module.calculate_economics(
        payload.crop_name, 
        payload.field_size_acres, 
        payload.time_for_harvest_days, 
        market_prices.get('modal_price', 2500)
    )
    
    # 6. SHAP Mathematical Drivers
    lstm_feature_names = ["Temp", "Humidity", "SoilMoisture", "ET0", "ETc", "Stage", "Type", "FieldSize", "Light"]
    # Provide the tensor to the explainer
    irrigation_shap = xai_explainer.extract_top_features_lstm(lstm_input, lstm_feature_names)
    
    pest_feature_names = ["Crop_Type", "Crop_Stage", "Season", "Temperature", "Humidity"]
    pest_shap = xai_explainer.extract_top_features_rf('pest', pest_input, pest_feature_names)

    # 6. Gather Raw Data for Gemini
    raw_ml_data = {
        "crop": payload.crop_name,
        "stage": predicted_stage,
        "current_conditions": {
            "temperature_c": payload.recent_temperature,
            "humidity_pct": payload.recent_humidity,
            "soil_moisture": payload.soil_moisture_status
        },
        "advisory_outputs": {
            "irrigation": {
                "probability": round(irr_prob, 4),
                "recommended": irrigation_needed
            },
            "nutrients": {
                "N": round(float(nut_pred[0]), 2), "P": round(float(nut_pred[1]), 2), "K": round(float(nut_pred[2]), 2)
            },
            "pest": {"risk": disease_risk},
            "spraying": spray_decision
        },
        "mathematical_drivers": {
            "irrigation_shap": irrigation_shap,
            "pest_shap": pest_shap
        }
    }

    # 7. GENERATE THE HUMAN ADVISORY via Gemini (Context-Aware)
    final_text_advisory = generate_farmer_advisory(raw_ml_data, payload.recent_history)

    return AdvisoryResponse(
        crop=payload.crop_name,
        stage=predicted_stage,
        field_size_acres=payload.field_size_acres,
        current_conditions={
            "temperature_c": payload.recent_temperature,
            "humidity_pct": payload.recent_humidity,
            "wind_speed_kmh": payload.wind_speed,
            "soil_moisture": payload.soil_moisture_status
        },
        advisory_outputs={
            "irrigation": {
                "predicted_action_probability": round(irr_prob, 4),
                "irrigation_recommended": irrigation_needed,
                "analysis": "Critical moisture levels." if irrigation_needed else "Stable."
            },
            "nutrients": {
                "recommended_N_kg": round(float(nut_pred[0]), 2),
                "recommended_P_kg": round(float(nut_pred[1]), 2),
                "recommended_K_kg": round(float(nut_pred[2]), 2)
            },
            "pest_and_disease": {
                "identified_risk": disease_risk
            },
            "spraying_decision": spray_decision
        },
        market_data={
            "modal_price": economics.get("expected_revenue", 2500),
            "trend": market_prices.get('trend', 'stable')
        },
        mathematical_drivers={
            "irrigation_shap_weights": irrigation_shap,
            "pest_shap_weights": pest_shap
        },
        human_advisory=final_text_advisory
    )

if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    print("FastAPI application is ready.")
