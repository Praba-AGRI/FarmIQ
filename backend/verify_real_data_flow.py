import os
import sys
import asyncio
from pathlib import Path
import numpy as np
import json

# Add backend to path
backend_path = Path("c:/Users/Prabakaran/Desktop/Farmiq/website/backend")
sys.path.append(str(backend_path))

os.environ["GEMINI_API_KEY"] = "AIzaSyD9uePo--HZ8chzMxGInyfx8_ts-8Q-3SA"

async def verify_real_data():
    try:
        from routes.ai import get_ai_agent_output
        from services.storage import SENSORS_DIR, append_csv
        
        field_id = "ac43c0c7-4d3b-4db7-9f15-24f0a0045a76"
        farmer_id = "aa48164d-df6f-4c9e-876f-f8c9734e2a13"
        sensor_node_id = "tonystark"
        
        # 1. Create a specific sensor reading
        test_reading = {
            "timestamp": "2026-03-19T10:00:00Z",
            "air_temp": 32.5,
            "air_humidity": 45.0,
            "soil_temp": 28.0,
            "soil_moisture": 22.0, # Low moisture -> Should trigger irrigation
            "light_lux": 15000.0,
            "wind_speed": 4.5
        }
        
        # Append to CSV
        csv_file = f"{sensor_node_id}.csv"
        # Clear file first to ensure we know the history
        full_path = SENSORS_DIR / csv_file
        if full_path.exists():
            os.remove(full_path)
            
        for i in range(14):
            reading = test_reading.copy()
            reading["timestamp"] = f"2026-03-19T{10+i}:00:00Z"
            # Add some slight variation to prove it's reading correctly
            reading["soil_moisture"] = 22.0 + i
            append_csv(csv_file, reading)
            
        print(f"Created 14-day history for {sensor_node_id}")
        
        # 2. Get AI output
        output = await get_ai_agent_output(field_id, farmer_id)
        
        print("\n--- AI VERIFICATION ---")
        print(f"Predicted Stage: {output['crop_stage']}")
        print(f"Current Soil Moisture: {output['sensor_values']['soil_moisture']}%")
        
        irrigation_rec = next(r for r in output['recommendations'] if r['title'] == "Irrigation")
        print(f"Irrigation Probability: {irrigation_rec['ml_data']['probability']}")
        print(f"Irrigation Status: {irrigation_rec['status']}")
        
        # 3. Check for original values
        if output['sensor_values']['soil_moisture'] == 22.0 + 13: # Last reading in loop
            print("✅ SUCCESS: AI is reading the LATEST sensor value correctly.")
        else:
            print(f"❌ ERROR: Expected moisture {22.0+13}, got {output['sensor_values']['soil_moisture']}")

        # 4. Check for determinism (Run twice, should be identical)
        output2 = await get_ai_agent_output(field_id, farmer_id)
        if output['recommendations'][0]['ml_data']['probability'] == output2['recommendations'][0]['ml_data']['probability']:
             print("✅ SUCCESS: AI output is DETERMINISTIC (No mock random noise).")
        else:
             print("❌ ERROR: AI output is NOT deterministic. Randomness detected!")

    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_real_data())
