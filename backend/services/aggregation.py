from typing import List, Dict
from datetime import datetime
from utils.helpers import parse_time_range


def aggregate_sensor_data(data: List[Dict], window: str = "24h") -> Dict:
    """
    Aggregate sensor data to calculate min, max, and average values
    
    Args:
        data: List of dictionaries with sensor readings
        window: Time window string ("24h", "7d", "30d")
    
    Returns:
        Dictionary with aggregated values for each sensor type
    """
    if not data:
        return {
            "air_temp": {"min": 0, "max": 0, "avg": 0},
            "air_humidity": {"min": 0, "max": 0, "avg": 0},
            "soil_temp": {"min": 0, "max": 0, "avg": 0},
            "soil_moisture": {"min": 0, "max": 0, "avg": 0},
            "light_lux": {"min": 0, "max": 0, "avg": 0},
            "wind_speed": {"min": 0, "max": 0, "avg": 0},
            "window": window
        }
    
    # Extract values for each sensor type
    air_temps = []
    air_humidities = []
    soil_temps = []
    soil_moistures = []
    light_luxes = []
    wind_speeds = []
    
    for row in data:
        try:
            if 'air_temp' in row:
                air_temps.append(float(row['air_temp']))
            if 'air_humidity' in row:
                air_humidities.append(float(row['air_humidity']))
            if 'soil_temp' in row:
                soil_temps.append(float(row['soil_temp']))
            if 'soil_moisture' in row:
                soil_moistures.append(float(row['soil_moisture']))
            if 'light_lux' in row:
                light_luxes.append(float(row['light_lux']))
            if 'wind_speed' in row and row.get('wind_speed'):
                wind_speeds.append(float(row['wind_speed']))
        except (ValueError, TypeError):
            continue
    
    def calculate_stats(values: List[float]) -> Dict:
        """Calculate min, max, and average for a list of values"""
        if not values:
            return {"min": 0, "max": 0, "avg": 0}
        return {
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "avg": round(sum(values) / len(values), 2)
        }
    
    return {
        "air_temp": calculate_stats(air_temps),
        "air_humidity": calculate_stats(air_humidities),
        "soil_temp": calculate_stats(soil_temps),
        "soil_moisture": calculate_stats(soil_moistures),
        "light_lux": calculate_stats(light_luxes),
        "wind_speed": calculate_stats(wind_speeds),
        "window": window
    }




