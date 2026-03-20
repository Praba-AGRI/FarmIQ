from datetime import datetime, timedelta
import asyncio
from services.database import daily_telemetry_collection
from services.weather_service import get_day_summary, get_coordinates
from services.irrigation_logic import (
    calculate_daily_gdd, calculate_et0, calculate_etc, estimate_stage
)

async def enrich_telemetry_history(field: dict, farmer_location: str, lat: float = None, lon: float = None):
    """
    Phase 3: The Agronomic Math Engine
    1. Spatio-Temporal Fusion: Query daily history since Sowing Date. 
       If missing, fetch from OpenWeatherMap.
    2. Phenology & GDD Math: Calculate cumulative GDD to find stage.
    3. Evapotranspiration Math: ET0, Kc, ETc.
    4. Save to DailyTelemetry collection.
    
    Returns structured 14-day history for Bi-LSTM.
    """
    
    node_id = field["sensor_node_id"]
    crop = field["crop"]
    
    try:
        sowing_date = datetime.strptime(field["sowing_date"], "%Y-%m-%d")
    except:
        sowing_date = datetime.now() - timedelta(days=30) # fallback
        
    start_date = min(sowing_date, datetime.now() - timedelta(days=14))
    end_date = datetime.now()
    
    # Coordinate resolution for weather fallback
    resolved_lat = lat
    resolved_lon = lon
    if not lat or not lon:
        coords = await get_coordinates(farmer_location)
        if coords:
            resolved_lat = coords["lat"]
            resolved_lon = coords["lon"]
        else:
            resolved_lat = 13.0827 # Fallback Chennai
            resolved_lon = 80.2707
            
    current_date = start_date
    cumulative_gdd = 0.0
    
    history_last_14 = []
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        
        # 1. Spatio-Temporal Fusion
        day_record = await daily_telemetry_collection.find_one({"sensor_node_id": node_id, "date": date_str})
        
        needs_weather_patch = False
        t_max, t_min, t_avg = 30.0, 20.0, 25.0
        humidity, wind, lux, moisture = 60.0, 2.0, 15.0, 50.0 # lux in thousands as approx radiation
        
        if day_record and day_record.get("daily_aggregates"):
            agg = day_record["daily_aggregates"]
            if agg.get("t_avg") is None or agg.get("t_max") == -100:
                needs_weather_patch = True
            else:
                t_max = agg.get("t_max", 30.0)
                t_min = agg.get("t_min", 20.0)
                t_avg = agg.get("t_avg", 25.0)
                humidity = agg.get("humidity_avg", 60.0)
                wind = agg.get("wind_speed_avg", 2.0)
                moisture = agg.get("soil_moisture_avg", 50.0)
                lux_val = agg.get("light_lux_avg", 15000.0)
                lux = max(lux_val, 0) / 1000.0 # Approximation of solar radiation from lux
        else:
            needs_weather_patch = True
            
        if needs_weather_patch:
            # Autonomously call OpenWeatherMap to patch the gaps
            try:
                weather_summary = await get_day_summary(resolved_lat, resolved_lon, date_str)
                t_max = weather_summary.get("temperature", {}).get("max", 30.0)
                t_min = weather_summary.get("temperature", {}).get("min", 20.0)
                t_avg = (t_max + t_min) / 2
                humidity = weather_summary.get("humidity", {}).get("afternoon", 60.0)
                wind = weather_summary.get("wind", {}).get("max", {}).get("speed", 2.0)
            except Exception as e:
                print(f"Weather patch failed for {date_str}: {e}")
                
        # 2. Phenology & GDD Math
        daily_gdd = calculate_daily_gdd(t_max, t_min, crop)
        cumulative_gdd += daily_gdd
        
        # Estimate stage based on GDD
        stage, conf = estimate_stage(crop, cumulative_gdd)
        
        # 3. Evapotranspiration Math
        et0 = calculate_et0(t_avg, t_max, t_min, humidity, wind, lux)
        etc, kc = calculate_etc(crop, stage, et0)
        
        # 4. Save enriched data back to MongoDB safely
        enriched_data = {
            "sensor_node_id": node_id,
            "date": date_str,
            "agronomic_data": {
                "t_max": t_max,
                "t_min": t_min,
                "t_avg": t_avg,
                "humidity": humidity,
                "wind_speed": wind,
                "soil_moisture": moisture,
                "solar_radiation": lux,
                "daily_gdd": daily_gdd,
                "cumulative_gdd": cumulative_gdd,
                "stage": stage,
                "et0": et0,
                "kc": kc,
                "etc": etc
            }
        }
        
        await daily_telemetry_collection.update_one(
            {"sensor_node_id": node_id, "date": date_str},
            {"$set": {"agronomic_data": enriched_data["agronomic_data"]}},
            upsert=True
        )
        
        # Collect last 14 days features
        days_diff = (end_date.date() - current_date.date()).days
        if days_diff < 14:
            history_last_14.append(enriched_data["agronomic_data"])
            
        current_date += timedelta(days=1)
        
    return history_last_14, cumulative_gdd, stage

