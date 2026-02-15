import os
from pathlib import Path

# Try to import ML libraries, but don't crash if they are missing
# This allows the backend to run even if the environment is not fully set up
try:
    import joblib
    import numpy as np
    ML_AVAILABLE = True
except ImportError:
    print("Warning: ML libraries (joblib, numpy) not found. ML features will be disabled.")
    ML_AVAILABLE = False

# Load models once at startup
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml models" / "irrigation"

models = {}

if ML_AVAILABLE:
    try:
        models["rice"] = joblib.load(MODEL_PATH / "rice_irrigation_model.pkl")
        models["wheat"] = joblib.load(MODEL_PATH / "wheat_irrigation_model.pkl")
        models["groundnut"] = joblib.load(MODEL_PATH / "groundnut_irrigation_model.pkl")
        models["sugarcane"] = joblib.load(MODEL_PATH / "sugarcane_irrigation_model.pkl")
        print("Irrigation models loaded successfully.")
    except Exception as e:
        print(f"Error loading irrigation models: {e}")


# Crop-specific Kc values
KC_VALUES = {
    "rice": {
        "initial": 1.05,
        "vegetative": 1.10,
        "flowering": 1.20,
        "maturity": 0.90
    },
    "wheat": {
        "initial": 0.70,
        "vegetative": 1.05,
        "flowering": 1.15,
        "maturity": 0.80
    },
    "groundnut": {
        "initial": 0.60,
        "vegetative": 0.95,
        "flowering": 1.10,
        "maturity": 0.85
    },
    "sugarcane": {
        "initial": 0.40,
        "vegetative": 1.00,
        "flowering": 1.25,
        "maturity": 1.15
    }
}

def predict_irrigation(data: dict):
    """
    Predicts irrigation requirement in mm based on field and weather data.
    
    data = {
        "crop": "rice",
        "stage": "vegetative",
        "temp_avg": 30,
        "humidity_avg": 72,
        "wind_speed": 1.4,
        "solar_radiation": 20,
        "soil_moisture": 45,
        "rainfall_last_3d": 2,
        "rainfall_forecast": 0,
        "ET0": 5.5
    }
    """
    crop = data["crop"].lower()
    stage = data["stage"].lower()

    if not ML_AVAILABLE or crop not in models:
        # Fallback logic if model for specific crop is not loaded or ML libs missing
        return None

    model = models[crop]

    # Get Kc (default to vegetative if stage unknown)
    crop_stages = KC_VALUES.get(crop, {})
    Kc = crop_stages.get(stage, crop_stages.get("vegetative", 1.0))

    # Compute ETc
    ET0 = data.get("ET0", 5.0) # Default value if missing
    ETc = ET0 * Kc

    # Stage encoding (must match training)
    stage_vegetative = 1 if stage == "vegetative" else 0
    stage_flowering = 1 if stage == "flowering" else 0
    stage_maturity = 1 if stage == "maturity" else 0
    # initial = all zeros

    # Prepare feature vector (ORDER MUST MATCH TRAINING)
    features = np.array([[
        data["temp_avg"],
        data["humidity_avg"],
        data["wind_speed"],
        data["solar_radiation"],
        ET0,
        Kc,
        ETc,
        data["soil_moisture"],
        data["rainfall_last_3d"],
        data["rainfall_forecast"],
        stage_vegetative,
        stage_flowering,
        stage_maturity
    ]])

    try:
        irrigation_mm = model.predict(features)[0]
    except Exception as e:
        print(f"Error during model prediction: {e}")
        return None

    # Simple confidence estimate
    confidence = min(90, max(60, 70 + (ETc - data["soil_moisture"]/10)))

    return {
        "title": "Irrigation Recommendation",
        "irrigation_required_mm": round(float(irrigation_mm), 2),
        "stage": stage.capitalize(),
        "crop": crop.capitalize(),
        "confidence": round(confidence, 1),
        "message": f"Apply approximately {round(float(irrigation_mm),2)} mm irrigation within next 12 hours."
    }
