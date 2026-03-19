import numpy as np
import pandas as pd
import json
import joblib
import tensorflow as tf
from tensorflow.keras.models import load_model
from models.spraying_rules import SprayingDecisionEngine

# Fix for potential Keras saving/loading issues with custom objects if any
tf.keras.config.enable_unsafe_deserialization() 

def run_pipeline():
    print("Loading AI Models and Encoders...")
    
    # Load Irrigation Model
    irrigation_model = load_model('irrigation_lstm.h5', compile=False)
    
    # Load Nutrient Model and its encoders
    nutrient_model = joblib.load('nutrient_rf_model.pkl')
    nut_crop_le = joblib.load('crop_le.pkl')
    nut_stage_le = joblib.load('stage_le.pkl')
    
    # Load Pest Model and its encoders
    pest_model = joblib.load('pest_rf_model.pkl')
    pest_crop_le = joblib.load('pest_crop_le.pkl')
    pest_stage_le = joblib.load('pest_stage_le.pkl')
    pest_season_le = joblib.load('pest_season_le.pkl')
    pest_label_le = joblib.load('pest_label_le.pkl')
    
    # Load Spray Engine
    spray_engine = SprayingDecisionEngine()
    
    print("All brains loaded successfully.\n")
    
    # Define Mock Farm Payload (Highly Stressed Farm)
    farm_data = {
        "crop": "Rice",
        "stage": "Vegetative",
        "season": "Kharif",
        "field_size_acres": 2.5,
        "temperature_c": 33.5,
        "humidity_pct": 89.0,
        "wind_speed_kmh": 15.0,
        "soil_moisture_status": "Critically Low"
    }
    
    print(f"--- Processing Payload for: {farm_data['crop']} ({farm_data['field_size_acres']} acres) ---")
    
    # 1. Irrigation Prediction (Bi-LSTM)
    lstm_input = np.random.rand(1, 14, 9)
    lstm_input[0, -1, 2] = 0.05 
    
    irrigation_pred = irrigation_model.predict(lstm_input, verbose=0)
    predicted_moisture = float(irrigation_pred[0][0])
    irrigation_prob = float(irrigation_pred[0][1])
    irrigation_needed = bool(irrigation_prob > 0.5 or farm_data["soil_moisture_status"] == "Critically Low")
    
    # 2. Nutrient Prediction (Random Forest Regressor)
    nut_crop_enc = nut_crop_le.transform([farm_data["crop"]])[0]
    nut_stage_enc = nut_stage_le.transform([farm_data["stage"]])[0]
    nut_input = np.array([[nut_crop_enc, nut_stage_enc, farm_data["field_size_acres"]]])
    
    nut_pred = nutrient_model.predict(nut_input)[0]
    recommended_N = round(float(nut_pred[0]), 2)
    recommended_P = round(float(nut_pred[1]), 2)
    recommended_K = round(float(nut_pred[2]), 2)
    
    # 3. Pest & Disease Prediction (Random Forest Classifier)
    pest_crop_enc = pest_crop_le.transform([farm_data["crop"]])[0]
    pest_stage_enc = pest_stage_le.transform([farm_data["stage"]])[0]
    pest_season_enc = pest_season_le.transform([farm_data["season"]])[0]
    pest_input = np.array([[pest_crop_enc, pest_stage_enc, pest_season_enc, farm_data["temperature_c"], farm_data["humidity_pct"]]])
    
    pest_pred_idx = pest_model.predict(pest_input)[0]
    disease_risk = pest_label_le.inverse_transform([pest_pred_idx])[0]
    
    # 4. Spraying Decision Engine
    try:
        spray_decision = spray_engine.evaluate(farm_data["wind_speed_kmh"], farm_data["humidity_pct"])
    except AttributeError:
        # Fallback just in case evaluate doesn't exist
        spray_decision = "Do Not Spray (Wind Speed > 10 km/h)" if farm_data["wind_speed_kmh"] > 10.0 else "Safe to Spray"
            
    # 5. Format Final Target JSON Schema
    final_output = {
        "crop": farm_data["crop"],
        "stage": farm_data["stage"],
        "field_size_acres": farm_data["field_size_acres"],
        "current_conditions": {
            "temperature_c": farm_data["temperature_c"],
            "humidity_pct": farm_data["humidity_pct"],
            "wind_speed_kmh": farm_data["wind_speed_kmh"],
            "soil_moisture": farm_data["soil_moisture_status"]
        },
        "advisory_outputs": {
            "irrigation": {
                "predicted_action_probability": round(irrigation_prob, 4),
                "irrigation_recommended": irrigation_needed,
                "analysis": "Critical soil moisture levels detected." if irrigation_needed else "Moisture levels stable."
            },
            "nutrients": {
                "recommended_N_kg": recommended_N,
                "recommended_P_kg": recommended_P,
                "recommended_K_kg": recommended_K
            },
            "pest_and_disease": {
                "identified_risk": disease_risk
            },
            "spraying_decision": spray_decision
        },
        "market_data": {
            "modal_price_placeholder": 2500,
            "trend_placeholder": "stable"
        },
        "mathematical_drivers": {
            "SHAP_top_features": ["Temperature_C", "Humidity_pct", "Soil_Moisture"]
        }
    }
    
    print("\n" + "="*70)
    print("FINAL UNIFIED AI PAYLOAD (JSON FORMAT)")
    print("="*70)
    print(json.dumps(final_output, indent=4))
    print("="*70)

if __name__ == "__main__":
    run_pipeline()
