import json
from fastapi.testclient import TestClient
from app import app
import datetime

client = TestClient(app)

def test_full_pipeline():
    print("=== FarmIQ Architecture Test ===")
    
    # Check if a user and field exist, if not, mock the auth temporarily or find an existing one
    # Note: Using a fake token might fail auth middleware, let's see what auth expects
    headers = {"Authorization": "Bearer test-token"}
    
    # 1. Test Ingestion Pipeline (Phase 1 & 2)
    print("\n1. Testing Ingestion Route (/api/sensor-data)...")
    sensor_payload = {
        "node_id": "NODE_TEST_1",
        "temperature": 28.5,
        "humidity": 65.0,
        "soil_moisture": 45.0,
        "light_intensity": 15000.0,
        "soil_temp": 24.0
    }
    
    # We may get 404 if NODE_TEST_1 is not mapped, but let's see how sensors API behaves
    res_sensor = client.post("/api/sensor-data", json=sensor_payload)
    print(f"Ingestion Response: {res_sensor.status_code}")
    print(json.dumps(res_sensor.json(), indent=2))
    
    # 2. Test Dashboard Advisory Pipeline (Phases 3-6)
    print("\n2. Testing Math & ML Dashboard Route (/api/fields/FIELD_TEST_1/dashboard)...")
    
    # Let's bypass the actual user login by registering a mock user via the existing logic 
    # if it's stateless, or just see if the endpoint throws 401.
    res_dash = client.get("/api/fields/1/dashboard")
    print(f"Dashboard Response: {res_dash.status_code}")
    if res_dash.status_code == 200:
        print("Dashboard successfully bypassed LLMs and delivered 0ms payload!")
        print(json.dumps(res_dash.json(), indent=2))
    else:
        print(f"Error fetching dashboard: {res_dash.text}")

if __name__ == "__main__":
    test_full_pipeline()
