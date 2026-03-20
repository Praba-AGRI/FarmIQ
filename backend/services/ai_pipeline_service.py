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
import requests

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
        
        
        # OpenRouter Initialization
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY") or "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"
        self.openrouter_url = "https://openrouter.ai/api/v1/chat/completions"
        # Revert to the previously-working Gemini free-tier model.
        self.model_name = "google/gemini-2.0-flash-exp:free"

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

    def get_shap_drivers(self, lstm_input, pest_input, nutrient_input=None, spray_context=None):
        lstm_features = ["Temp", "Humidity", "SoilMoisture", "ET0", "ETc", "Stage", "Type", "FieldSize", "Light"]
        pest_features = ["Crop_Type", "Crop_Stage", "Season", "Temperature", "Humidity"]
        nut_features = ["Crop_Type", "Crop_Stage", "Field_Size"]
        
        irrigation_shap = self.xai_explainer.extract_top_features_lstm(lstm_input, lstm_features)
        pest_shap = self.xai_explainer.extract_top_features_rf('pest', pest_input, pest_features)
        
        nutrient_shap = {}
        if nutrient_input is not None:
            nutrient_shap = self.xai_explainer.extract_top_features_rf('nutrient', nutrient_input, nut_features)
            
        spraying_shap = {}
        if spray_context:
            # Rule-based pseudo-SHAP: Calculate "Impact" based on closeness to thresholds
            # Higher value means it's the primary driver of the decision (positive or negative)
            w = spray_context.get("wind_speed", 0)
            h = spray_context.get("humidity", 50)
            t = spray_context.get("temp", 25)
            
            # Distance from safe limits (normalized 0 to 1)
            # Wind: limit 12
            spraying_shap["Wind Speed"] = round(abs(w / self.spraying_engine.max_wind_speed), 4)
            # Humidity: range 40-85
            h_mid = (self.spraying_engine.min_humidity + self.spraying_engine.max_humidity) / 2
            h_range = (self.spraying_engine.max_humidity - self.spraying_engine.min_humidity) / 2
            spraying_shap["Humidity"] = round(abs((h - h_mid) / h_range), 4)
            # Temp: limit 33
            spraying_shap["Temperature"] = round(abs(t / self.spraying_engine.max_temp), 4)
            
        return irrigation_shap, pest_shap, nutrient_shap, spraying_shap

    def generate_human_advisory(self, raw_ml_data, recent_history, language="en"):
        memory_string = "No recent history available."
        if recent_history and len(recent_history) > 0:
            last_three = recent_history[-3:]
            memory_string = "\n".join([f"- {item}" for item in last_three])

        lang_instruction = "English" if language == "en" else "Tamil"

        system_prompt = f"""
You are the FarmIQ Agronomy Engine, an expert agricultural AI for smallholder farmers in Tamil Nadu. 
Analyze the raw ML data and output a STRICT JSON response in {lang_instruction}.
Do NOT output markdown code blocks (no ```json). Output ONLY the raw JSON string.

=== FARMER'S RECENT HISTORY ===
{memory_string}

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
      "detailed_reasoning": "Explain the Bi-LSTM/Random Forest reasoning and reference mathematical impacts from SHAP data."
    }},
    {{
      "card_name": "Nutrients",
      "traffic_light": "RED|YELLOW|GREEN",
      "main_action": "Impereative fertilizer command.",
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
        
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://farmiq.ai",
            "X-OpenRouter-Title": "FarmIQ Agricultural Assistant",
        }
        
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "user", "content": system_prompt}
            ],
            "reasoning": {"enabled": True}
        }
        
        try:
            response = requests.post(
                url=self.openrouter_url,
                headers=headers,
                data=json.dumps(payload)
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                # Strip markdown if LLM includes it despite instructions
                content = content.replace("```json", "").replace("```", "").strip()
                try:
                    return json.loads(content)
                except:
                    print(f"Failed to parse LLM JSON: {content[:100]}...")
                    return {"overall_summary": content[:200], "cards": []}
            else:
                print(f"OpenRouter Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"LLM Error ({self.model_name}): {e}")
                
        return {"overall_summary": "Advisory generation failed. Please check system logs.", "cards": []}

# Singleton instance
ai_pipeline = AIPipelineService()
