
import asyncio
import json
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

# Mock FastAPI dependencies
sys.modules['fastapi'] = MagicMock()
sys.modules['fastapi.params'] = MagicMock()
sys.modules['models.schemas'] = MagicMock()
sys.modules['routes.auth'] = MagicMock()
sys.modules['routes.sensors'] = MagicMock()
sys.modules['utils.field_validation'] = MagicMock()

# Add backend to path
sys.path.append(os.path.abspath('backend'))

async def test_wind_speed_always_owm():
    print("Testing wind speed always from OpenWeatherMap...")
    
    # Mock data
    mock_field = MagicMock()
    mock_field.field_id = "test-field"
    mock_field.crop = "rice"
    mock_field.sowing_date = "2026-03-01" 
    
    mock_user = {"user_id": "aa48164d-df6f-4c9e-876f-f8c9734e2a13", "location": "Dindigul"}
    
    # Specific sensor readings
    sensor_reading = MagicMock()
    sensor_reading.air_temp = 28.0
    sensor_reading.air_humidity = 55.0
    sensor_reading.soil_temp = 26.0
    sensor_reading.soil_moisture = 45.0
    sensor_reading.light_lux = 800.0
    sensor_reading.wind_speed = 10.0 # Sensor says 10.0 km/h
    
    # Different weather API readings
    api_current_temp = 32.0   # 32 C
    api_current_humidity = 65.0
    api_wind_speed = 1.5      # 1.5 m/s = 5.4 km/h
    
    # Mock external services
    with patch('routes.ai.get_field_or_404', return_value=mock_field), \
         patch('routes.ai.get_current_sensor_readings', new_callable=AsyncMock, return_value=sensor_reading), \
         patch('routes.ai.load_json', return_value={"users": [mock_user]}), \
         patch('routes.ai.get_coordinates', new_callable=AsyncMock, return_value={"lat": 10.36, "lon": 77.98, "name": "Dindigul"}), \
         patch('routes.ai.get_onecall_weather', new_callable=AsyncMock, return_value={
             "current": {"temp": api_current_temp, "humidity": api_current_humidity, "wind_speed": api_wind_speed},
             "daily": [{"temp": {"min": 22, "max": 34}, "weather": [{"id": 800}], "dt": 1741626000}],
             "hourly": []
         }), \
         patch('routes.ai.get_day_summary', new_callable=AsyncMock, return_value={
             "temperature": {"min": 22, "max": 34}
         }), \
         patch('routes.ai.irrigation_recommendation') as mock_logic, \
         patch('routes.ai.predict_irrigation', return_value={
             "title": "Irrigation Recommendation",
             "message": "Apply 10 mm",
             "irrigation_required_mm": 10.0,
             "confidence": 85
         }):
        
        mock_logic.return_value = {
            "ET0_mm_day": 5.0, "ETc_mm_day": 5.0, "Kc": 1.0, 
            "cumulative_gdd": 100.0, "estimated_stage": "Vegetative",
            "recommended_irrigation_mm": 10.0, "advisory": "Test", "stage_confidence": 90
        }
        
        from routes.ai import get_ai_agent_output
        
        await get_ai_agent_output("test-field", "aa48164d-df6f-4c9e-876f-f8c9734e2a13")
        
        logic_input = mock_logic.call_args[0][0]
        # api_wind_speed (1.5 m/s) * 3.6 = 5.4 km/h
        expected_wind_speed = 5.4
        
        print(f"Sensor Wind Speed: {sensor_reading.wind_speed}, API Wind Speed: {api_wind_speed} m/s ({expected_wind_speed} km/h)")
        print(f"Logic Engine Input Wind Speed: {logic_input['wind_speed']}")
        
        print(f"Logic Engine Input Temperature: {logic_input['temp_avg']}")
        print(f"Logic Engine Input Humidity: {logic_input['humidity']}")
        
        assert logic_input['temp_avg'] == 28.0
        assert logic_input['humidity'] == 55.0
        assert logic_input['wind_speed'] == expected_wind_speed
        print("SUCCESS: Wind speed correctly overridden by API data while keeping other sensor priorities!")

if __name__ == "__main__":
    asyncio.run(test_wind_speed_always_owm())
