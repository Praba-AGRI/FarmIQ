from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from datetime import datetime

from models.schemas import SensorDataCreate, SensorDataResponse, AggregatedSensorData
from routes.auth import get_current_user
from services.storage import load_json
from utils.helpers import parse_time_range, get_timestamp
from utils.field_validation import get_field_or_404
from services.ingestion import validate_and_ingest
from services.database import sensor_raw_collection, daily_telemetry_collection

router = APIRouter()


@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def receive_sensor_data(sensor_data: SensorDataCreate):
    """
    Receive sensor data from ESP32 nodes
    """
    # Validate that sensor_node_id exists in fields.json
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    sensor_node_exists = any(
        field.get("sensor_node_id") == sensor_data.sensor_node_id
        for field in fields
    )
    
    if not sensor_node_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sensor_node_id: No field found with this sensor node ID"
        )
    
    # Use current timestamp if not provided
    timestamp = sensor_data.timestamp or get_timestamp()
    
    # Prepare row
    row = {
        "timestamp": timestamp,
        "air_temp": sensor_data.air_temp,
        "air_humidity": sensor_data.air_humidity,
        "soil_temp": sensor_data.soil_temp,
        "soil_moisture": sensor_data.soil_moisture,
        "light_lux": sensor_data.light_lux,
        "wind_speed": sensor_data.wind_speed if sensor_data.wind_speed is not None else 0.0,
        "sensor_node_id": sensor_data.sensor_node_id
    }
    
    success, reason = await validate_and_ingest(row)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data rejected by preprocessing filter: {reason}"
        )
    
    return {
        "message": "Sensor data received successfully",
        "timestamp": timestamp,
        "sensor_node_id": sensor_data.sensor_node_id
    }


@router.get("/fields/{field_id}/sensors/current", response_model=SensorDataResponse)
async def get_current_sensor_readings(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the latest sensor readings from MongoDB
    """
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get latest reading from Raw Collection
    latest_row = await sensor_raw_collection.find_one(
        {"sensor_node_id": field.sensor_node_id},
        sort=[("timestamp", -1)]
    )
    
    if latest_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sensor data found for this field"
        )
    
    return SensorDataResponse(
        timestamp=latest_row.get("timestamp", ""),
        air_temp=float(latest_row.get("air_temp", 0)),
        air_humidity=float(latest_row.get("air_humidity", 0)),
        soil_temp=float(latest_row.get("soil_temp", 0)),
        soil_moisture=float(latest_row.get("soil_moisture", 0)),
        light_lux=float(latest_row.get("light_lux", 0)),
        wind_speed=float(latest_row.get("wind_speed", 0.0))
    )


@router.get("/fields/{field_id}/sensors/historical")
async def get_historical_sensor_data(
    field_id: str,
    range: str = Query("24h", description="Time range: 24h, 7d, or 30d"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical sensor data for a field from MongoDB
    """
    field = get_field_or_404(field_id, current_user["user_id"])
    
    start_time, end_time = parse_time_range(range)
    
    cursor = sensor_raw_collection.find({
        "sensor_node_id": field.sensor_node_id,
        "timestamp": {"$gte": start_time.isoformat(), "$lte": end_time.isoformat()}
    }).sort("timestamp", 1)
    
    filtered_data = await cursor.to_list(length=1000)
    
    return [
        SensorDataResponse(
            timestamp=row.get("timestamp", ""),
            air_temp=float(row.get("air_temp", 0)),
            air_humidity=float(row.get("air_humidity", 0)),
            soil_temp=float(row.get("soil_temp", 0)),
            soil_moisture=float(row.get("soil_moisture", 0)),
            light_lux=float(row.get("light_lux", 0)),
            wind_speed=float(row.get("wind_speed", 0.0))
        )
        for row in filtered_data
    ]


@router.get("/fields/{field_id}/sensors/aggregate", response_model=AggregatedSensorData)
async def get_aggregated_sensor_data(
    field_id: str,
    window: str = Query("24h", description="Time window: 24h, 7d, or 30d"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get aggregated sensor data from DailyTelemetry collection
    """
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # We will compute basic min max avg on the fly from the raw collection or daily telemetry
    start_time, end_time = parse_time_range(window)
    
    cursor = sensor_raw_collection.find({
        "sensor_node_id": field.sensor_node_id,
        "timestamp": {"$gte": start_time.isoformat(), "$lte": end_time.isoformat()}
    })
    
    filtered_data = await cursor.to_list(length=5000)
    
    if not filtered_data:
        # Return empty aggregate if no data
        return AggregatedSensorData(
            air_temp={"min": 0, "max": 0, "avg": 0},
            air_humidity={"min": 0, "max": 0, "avg": 0},
            soil_temp={"min": 0, "max": 0, "avg": 0},
            soil_moisture={"min": 0, "max": 0, "avg": 0},
            light_lux={"min": 0, "max": 0, "avg": 0},
            wind_speed={"min": 0, "max": 0, "avg": 0},
            window=window
        )
        
    def agg(key):
        vals = [r.get(key, 0) for r in filtered_data if r.get(key) is not None]
        if not vals: return {"min": 0, "max": 0, "avg": 0}
        return {"min": min(vals), "max": max(vals), "avg": sum(vals)/len(vals)}

    return AggregatedSensorData(
        air_temp=agg("air_temp"),
        air_humidity=agg("air_humidity"),
        soil_temp=agg("soil_temp"),
        soil_moisture=agg("soil_moisture"),
        light_lux=agg("light_lux"),
        wind_speed=agg("wind_speed"),
        window=window
    )

