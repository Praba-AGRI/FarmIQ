import numpy as np
import joblib
from main import app, SensorDataInput, get_crop_advisory
import asyncio

async def test_autonomous_phenology():
    print("Testing Autonomous Phenology System...")
    
    # Mocking a Rice farm at 650 GDD (Should be Flowering stage according to logic)
    payload = SensorDataInput(
        crop_name="Rice",
        cumulative_gdd=650.0, 
        season="Kharif",
        field_size_acres=2.5,
        time_for_harvest_days=45,
        recent_temperature=33.5,
        recent_humidity=89.0,
        wind_speed=15.0,
        soil_moisture_status="Critically Low",
        recent_history=[
            "Day 14: AI advised withholding irrigation due to rain forecast.",
            "Day 15: Farmer logged applying 50kg of Urea.",
            "Day 16: AI advised monitoring for Bacterial Blight."
        ]
    )
    
    print(f"Input: Crop={payload.crop_name}, GDD={payload.cumulative_gdd}")
    
    # Call the advisory logic directly (bypassing HTTP)
    response = await get_crop_advisory(payload)
    
    print("\n--- AI Advisory Output (Autonomous Stage Detection) ---")
    print(f"Predicted Crop Stage: {response.stage}")
    
    # Irrigation check
    irr = response.advisory_outputs['irrigation']
    print(f"Irrigation Recommended: {irr['irrigation_recommended']} (Prob: {irr['predicted_action_probability']})")
    print(f"Irrigation Analysis: {irr['analysis']}")
    
    # Nutrient check
    nut = response.advisory_outputs['nutrients']
    print(f"Nutrient Rec: N={nut['recommended_N_kg']}kg, P={nut['recommended_P_kg']}kg, K={nut['recommended_K_kg']}kg")
    
    # Pest check
    pest = response.advisory_outputs['pest_and_disease']
    print(f"Pest Risk Identifed: {pest['identified_risk']}")
    
    # Diagnostic: Print drivers to ensure SHAP is working
    print("\n--- Mathematical Drivers (SHAP) ---")
    print(f"Irrigation Drivers: {response.mathematical_drivers['irrigation_shap_weights']}")
    print(f"Pest Drivers: {response.mathematical_drivers['pest_shap_weights']}")
    
    print("\n" + "="*80)
    print("GEMINI BILINGUAL ADVISORY (English & Tamil)")
    print("="*80)
    # Save to file with UTF-8 to avoid Windows terminal encoding errors
    with open("final_advisory.txt", "w", encoding="utf-8") as f:
        f.write(response.human_advisory)
    print("Bilingual advisory saved to 'final_advisory.txt'. Check the file for full content.")
    print("="*80)
    
    # Verification conditions
    # For Rice: Veg End = 600, Flow End = 1200. 650 should be "Flowering".
    if response.stage == "Flowering":
        print("\nSUCCESS: The AI correctly deduced the 'Flowering' stage from thermal time (GDD)!")
    else:
        print(f"\nFAILURE: Expected 'Flowering' but got '{response.stage}'. Check GDD thresholds.")

if __name__ == "__main__":
    asyncio.run(test_autonomous_phenology())
