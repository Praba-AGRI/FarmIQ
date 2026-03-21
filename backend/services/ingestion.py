import numpy as np
from datetime import datetime
from services.database import sensor_raw_collection, daily_telemetry_collection
import asyncio

async def validate_and_ingest(sensor_data: dict):
    """
    Phase 2: Ingestion & Preprocessing
    1. Z-score check
    2. Save to Raw Collection
    3. Update Daily Aggregation
    """
    node_id = sensor_data["sensor_node_id"]
    
    # 1. Z-Score Check (Outlier Rejection)
    # Get last 30 readings for this node
    cursor = sensor_raw_collection.find({"sensor_node_id": node_id}).sort("timestamp", -1).limit(30)
    history = await cursor.to_list(length=30)
    
    is_valid = True
    rejection_reason = ""
    
    if len(history) >= 10:
        for key in ["air_temp", "air_humidity", "soil_temp", "soil_moisture", "light_lux"]:
            val = sensor_data.get(key)
            if val is None:
                continue
                
            vals = [h.get(key) for h in history if h.get(key) is not None]
            if len(vals) < 5:
                continue
                
            mean = np.mean(vals)
            std = np.std(vals)
            
            # Avoid division by zero
            if std > 0.1: 
                z_score = abs(val - mean) / std
                if z_score > 3.0:  # Z-Score Threshold
                    is_valid = False
                    rejection_reason = f"Corrupted {key}: {val} (Z={z_score:.1f}, Mean={mean:.1f})"
                    break
    
    # Hard bounds fallback
    if sensor_data.get("air_temp", 25) > 60 or sensor_data.get("air_temp", 25) < -20:
        is_valid = False
        rejection_reason = "Temperature out of absolute physical bounds."
    if sensor_data.get("soil_moisture", 50) < 0 or sensor_data.get("soil_moisture", 50) > 100:
        is_valid = False
        rejection_reason = "Soil moisture out of bounds (0-100)."

    if not is_valid:
        print(f"Skipping sensor reading from {node_id}: {rejection_reason}")
        return False, rejection_reason

    # 2. Insert Valid Data exactly as received
    await sensor_raw_collection.insert_one(sensor_data)
    
    # 3. Temporal Aggregation (Update DailyTelemetry)
    await update_daily_aggregation(sensor_data)
    
    # 4. Emergency Thresholds (Proactive Twilio Alerts)
    moisture = float(sensor_data.get("soil_moisture", 50))
    if moisture < 20.0:
        from services.whatsapp_worker import send_emergency_whatsapp
        # Fire and forget
        asyncio.create_task(send_emergency_whatsapp(
            f"🚨 URGENT: Soil moisture critically low ({moisture}%) on Sensor {node_id}. Immediate irrigation required to prevent wilting!"
        ))
    
    return True, "Success"


async def update_daily_aggregation(sensor_data: dict):
    """
    Aggregates the raw incoming data into Hourly / Daily cleanly.
    Creates or updates the DailyTelemetry document for the current day.
    """
    node_id = sensor_data["sensor_node_id"]
    
    # ensure timestamp is datetime object for grouping
    ts_str = sensor_data["timestamp"]
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
    except Exception:
        dt = datetime.now()
        
    date_str = dt.strftime("%Y-%m-%d")
    hour_str = dt.strftime("%H")
    
    # Base structure we want per field per day
    # We will compute daily Tmax, Tmin, etc.
    
    # Atomically push this hour's reading into an array or update the day's record
    # For simplicity, we can fetch the day record, re-calculate averages, and save.
    
    day_record = await daily_telemetry_collection.find_one({"sensor_node_id": node_id, "date": date_str})
    
    if not day_record:
        day_record = {
            "sensor_node_id": node_id,
            "date": date_str,
            "readings_count": 0,
            "hourly_data": {},
            "daily_aggregates": {
                "t_max": -100,
                "t_min": 100,
                "t_avg": 0,
                "humidity_avg": 0,
                "soil_moisture_avg": 0,
                "light_lux_avg": 0,
                "wind_speed_avg": 0
            }
        }
        
    # Append the reading to the specific hour
    if hour_str not in day_record["hourly_data"]:
        day_record["hourly_data"][hour_str] = []
        
    # strip _id for safe storage
    clean_reading = {k: v for k, v in sensor_data.items() if k != '_id'}
    day_record["hourly_data"][hour_str].append(clean_reading)
    
    # Recompute daily aggregates
    all_readings = []
    for h_list in day_record["hourly_data"].values():
        all_readings.extend(h_list)
        
    if all_readings:
        temps = [r["air_temp"] for r in all_readings if "air_temp" in r]
        humids = [r["air_humidity"] for r in all_readings if "air_humidity" in r]
        sm = [r["soil_moisture"] for r in all_readings if "soil_moisture" in r]
        lux = [r["light_lux"] for r in all_readings if "light_lux" in r]
        wind = [r.get("wind_speed", 0) for r in all_readings if r.get("wind_speed") is not None]
        
        day_record["readings_count"] = len(all_readings)
        day_record["daily_aggregates"] = {
            "t_max": float(max(temps)) if temps else None,
            "t_min": float(min(temps)) if temps else None,
            "t_avg": float(np.mean(temps)) if temps else None,
            "humidity_avg": float(np.mean(humids)) if humids else None,
            "soil_moisture_avg": float(np.mean(sm)) if sm else None,
            "light_lux_avg": float(np.mean(lux)) if lux else None,
            "wind_speed_avg": float(np.mean(wind)) if wind else None,
        }
        
    # Upsert back to Mongo
    await daily_telemetry_collection.update_one(
        {"sensor_node_id": node_id, "date": date_str},
        {"$set": day_record},
        upsert=True
    )
