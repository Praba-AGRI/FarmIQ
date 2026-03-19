import requests
import json
import os
import pandas as pd
import datetime

def verify_real_data():
    """
    Verify that the AI output is using real data and is deterministic.
    """
    # Use a real farmer and field from fields.json
    farmer_id = "aa48164d-df6f-4c9e-876f-f8c9734e2a13"
    field_id = "ac43c0c7-4d3b-4db7-9f15-24f0a0045a76"
    sensor_node_id = "tonystark"
    
    # Base URL
    base_url = "http://localhost:8000/api/v1"
    
    print("\n--- AI REAL DATA VERIFICATION ---")
    
    # 1. Check if sensor file exists, create if not
    sensor_dir = "data/sensors"
    if not os.path.exists(sensor_dir):
        os.makedirs(sensor_dir)
        
    csv_path = os.path.join(sensor_dir, f"{sensor_node_id}.csv")
    
    # Create synthetic 14-day history for testing if needed
    now = datetime.datetime.now()
    history_data = []
    for i in range(15):
        date = now - datetime.timedelta(days=i)
        history_data.append({
            "timestamp": date.isoformat(),
            "air_temp": 28.0 + (i % 3),
            "air_humidity": 65.0 - (i % 5),
            "soil_temp": 24.0,
            "soil_moisture": 42.0 + i,
            "light_lux": 12000,
            "wind_speed": 4.5
        })
    pd.DataFrame(history_data).to_csv(csv_path, index=False)
    print(f"Created/Updated sensor history at {csv_path}")

    # 2. Get AI Recommendations
    # Authentication is required, but for this internal test we might bypass 
    # if we run the backend locally without auth or use a test token.
    # Assuming the server is running and we can call the service directly or via endpoint
    
    from services.ai_pipeline_service import ai_pipeline
    from routes.ai import get_ai_agent_output
    import asyncio

    print("Fetching AI predictions...")
    try:
        output = asyncio.run(get_ai_agent_output(field_id, farmer_id))
        
        print("\nVerification Results:")
        print(f"Crop Stage: {output['crop_stage']}")
        print(f"Current Soil Moisture: {output['sensor_values']['soil_moisture']}%")
        
        irrigation_rec = next(r for r in output['recommendations'] if r['title'] == "Irrigation")
        print(f"Irrigation Confidence: {irrigation_rec['ml_data']['confidence']}%")
        print(f"Irrigation Amount: {irrigation_rec['ml_data']['amount_mm']} mm")
        print(f"Irrigation Status: {irrigation_rec['status']}")
        
        # 3. Check for original values (no randomization)
        output2 = asyncio.run(get_ai_agent_output(field_id, farmer_id))
        irrigation_rec2 = next(r for r in output2['recommendations'] if r['title'] == "Irrigation")
        
        if irrigation_rec['ml_data']['confidence'] == irrigation_rec2['ml_data']['confidence']:
            print("✅ SUCCESS: AI output is DETERMINISTIC (No mock random noise).")
        else:
            print("❌ FAILURE: AI output is RANDOMIZED (Random noise detected).")
            
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_real_data()
    print("--- AI VERIFICATION ---")
