import numpy as np
import joblib
import json
import os
import tensorflow as tf
from tensorflow.keras.models import load_model
from pathlib import Path
from services.models.spraying_rules import SprayingDecisionEngine
from services.market_integration import MarketIntegrationModule
from services.shap_explainer import XAIExplainer
import google.generativeai as genai

# Handle cross-version Keras saved model issues
try:
    tf.keras.config.enable_unsafe_deserialization() 
except AttributeError:
    pass

class AIPipelineService:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent
        self.model_dir = self.base_dir / "ml_models"
        
        # Load AI Models
        print("Loading trained models for AI Pipeline Service...")
        self.irrigation_model = load_model(self.model_dir / 'irrigation_lstm.h5', compile=False)
        self.nutrient_model = joblib.load(self.model_dir / 'nutrient_rf_model.pkl')
        self.pest_model = joblib.load(self.model_dir / 'pest_rf_model.pkl')
        
        # Encoders
        self.nut_crop_le = joblib.load(self.model_dir / 'crop_le.pkl')
        self.nut_stage_le = joblib.load(self.model_dir / 'stage_le.pkl')
        self.pest_crop_le = joblib.load(self.model_dir / 'pest_crop_le.pkl')
        self.pest_stage_le = joblib.load(self.model_dir / 'pest_stage_le.pkl')
        self.pest_season_le = joblib.load(self.model_dir / 'pest_season_le.pkl')
        self.pest_label_le = joblib.load(self.model_dir / 'pest_label_le.pkl')
        
        # Phenology Model (GDD based)
        self.gdd_model = joblib.load(self.model_dir / 'gdd_stage_model.pkl')
        self.gdd_crop_le = joblib.load(self.model_dir / 'gdd_crop_le.pkl')
        self.gdd_stage_le = joblib.load(self.model_dir / 'gdd_stage_le.pkl')
        
        self.spraying_engine = SprayingDecisionEngine()
        
        # SHAP Explainer
        # background data shape should match input
        background_data_lstm = np.random.rand(100, 14, 9) 
        self.xai_explainer = XAIExplainer(
            lstm_model=self.irrigation_model,
            rf_nutrient_model=self.nutrient_model,
            rf_pest_model=self.pest_model,
            background_data_lstm=background_data_lstm
        )
        
        # Gemini Initialization
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyD9uePo--HZ8chzMxGInyfx8_ts-8Q-3SA"
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Try to find an available model
        self.model_name = "gemini-1.5-flash" # Default
        self.llm_model = genai.GenerativeModel(self.model_name)

    def predict_stage(self, crop_name: str, cumulative_gdd: float):
        try:
            gdd_crop_enc = self.gdd_crop_le.transform([crop_name])[0]
            gdd_input = np.array([[gdd_crop_enc, cumulative_gdd]])
            predicted_stage_idx = self.gdd_model.predict(gdd_input)[0]
            return self.gdd_stage_le.inverse_transform([predicted_stage_idx])[0]
        except Exception as e:
            print(f"Phenology prediction error: {e}")
            return "Vegetative"

    def predict_irrigation(self, historical_features: np.ndarray):
        """
        Input: historical_features: (14, 9) or (1, 14, 9)
        Features: [Temp, Humidity, SoilMoisture, ET0, ETc, Stage, Type, FieldSize, Light]
        """
        if historical_features.ndim == 2:
            lstm_input = historical_features.reshape(1, 14, 9)
        else:
            lstm_input = historical_features
            
        # Ensure input is a pure NumPy float32 array and pass it as a named dict to avoid Keras UserWarnings
        clean_input = np.array(lstm_input, dtype=np.float32)
        irrigation_pred = self.irrigation_model.predict({"input_layer": clean_input}, verbose=0)
        # Handle Logit Explosion: Apply Sigmoid to squish raw math between 0 and 1
        if irrigation_pred.shape[1] > 1:
            raw_logit = float(irrigation_pred[0][1])
        else:
            raw_logit = float(irrigation_pred[0][0])
            
        irr_prob = 1 / (1 + np.exp(-raw_logit))
        
        # Decision: If prob > 0.5 OR Soil Moisture (feature index 2) is very low (< 30)
        current_soil_moisture = lstm_input[0, -1, 2]
        irrigation_needed = bool(irr_prob > 0.5 or current_soil_moisture < 0.3)
        return irr_prob, irrigation_needed, lstm_input

    def predict_nutrients(self, crop_name: str, stage: str, field_size_acres: float):
        try:
            nut_crop_enc = self.nut_crop_le.transform([crop_name])[0]
            nut_stage_enc = self.nut_stage_le.transform([stage])[0]
        except ValueError:
            nut_crop_enc, nut_stage_enc = 0, 0 # Fallback
        nut_input = np.array([[nut_crop_enc, nut_stage_enc, field_size_acres]])
        return self.nutrient_model.predict(nut_input)[0], nut_input

    def predict_pests(self, crop_name: str, stage: str, season: str, temp: float, humidity: float):
        try:
            pest_crop_enc = self.pest_crop_le.transform([crop_name])[0]
            pest_stage_enc = self.pest_stage_le.transform([stage])[0]
            pest_season_enc = self.pest_season_le.transform([season])[0]
        except ValueError:
             pest_crop_enc, pest_stage_enc, pest_season_enc = 0, 0, 0
        pest_input = np.array([[pest_crop_enc, pest_stage_enc, pest_season_enc, temp, humidity]])
        pest_pred_idx = self.pest_model.predict(pest_input)[0]
        disease_risk = self.pest_label_le.inverse_transform([pest_pred_idx])[0]
        return disease_risk, pest_input

    def construct_feature_vector(self, temp, humidity, soil_moisture, et0, etc, stage, crop_name, field_size, light):
        # Encoders were likely trained on Capitalized names
        crop_name_cap = crop_name.capitalize()
        stage_cap = stage.capitalize()
        try:
            crop_enc = self.nut_crop_le.transform([crop_name_cap])[0]
            stage_enc = self.nut_stage_le.transform([stage_cap])[0]
        except:
            try:
                # Try lowercase if capitalize fails
                crop_enc = self.nut_crop_le.transform([crop_name.lower()])[0]
                stage_enc = self.nut_stage_le.transform([stage.lower()])[0]
            except:
                crop_enc, stage_enc = 0, 0
            
        return [
            temp, humidity, soil_moisture / 100.0, 
            et0, etc, stage_enc, crop_enc, 
            field_size, light / 1000.0
        ]

    def get_shap_drivers(self, lstm_input, pest_input):
        lstm_features = ["Temp", "Humidity", "SoilMoisture", "ET0", "ETc", "Stage", "Type", "FieldSize", "Light"]
        pest_features = ["Crop_Type", "Crop_Stage", "Season", "Temperature", "Humidity"]
        
        irrigation_shap = self.xai_explainer.extract_top_features_lstm(lstm_input, lstm_features)
        pest_shap = self.xai_explainer.extract_top_features_rf('pest', pest_input, pest_features)
        
        return irrigation_shap, pest_shap

    def generate_human_advisory(self, raw_ml_data, recent_history):
        memory_string = "No recent history available."
        if recent_history and len(recent_history) > 0:
            last_three = recent_history[-3:]
            memory_string = "\n".join([f"- {item}" for item in last_three])

        system_prompt = f"""
        You are 'FarmIQ', an expert agricultural AI advisory system for smallholder farmers in Tamil Nadu. 
        
        === FARMER'S RECENT HISTORY ===
        {memory_string}
        
        === CURRENT REAL-TIME ML DATA ===
        {json.dumps(raw_ml_data, indent=2)}
        
        Your task:
        1. Write a clear, 3-bullet point action plan for today.
        2. *CRITICAL*: If the "Recent History" is relevant to today's data, you MUST acknowledge it.
        3. Explain *why* you are giving today's advice by referencing the mathematical impacts (from the SHAP data).
        4. Provide the complete response first in English, and then provide a perfectly translated version in natural Tamil.
        """
        
        # Iterative fallback for model names
        model_names = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]
        for m_name in model_names:
            try:
                model = genai.GenerativeModel(m_name)
                response = model.generate_content(system_prompt)
                return response.text
            except Exception as e:
                # If it's a 404/not found, try the next model in the list
                if "404" in str(e) or "not found" in str(e).lower():
                    continue
                print(f"LLM Error ({m_name}): {e}")
                
        return "Advisory generation failed. Please check system logs."

# Singleton instance
ai_pipeline = AIPipelineService()
