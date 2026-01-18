from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from datetime import datetime

from models.schemas import SensorDataCreate, SensorDataResponse, AggregatedSensorData
from routes.auth import get_current_user
from services.storage import (
    append_csv, read_csv, get_latest_csv_row, get_csv_by_date_range, load_json
)
from services.aggregation import aggregate_sensor_data
from utils.helpers import parse_time_range, get_timestamp
from utils.field_validation import get_field_or_404

router = APIRouter()


@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def receive_sensor_data(sensor_data: SensorDataCreate):
    """
    Receive sensor data from ESP32 nodes
    
    - **timestamp**: ISO format timestamp (optional, defaults to current time)
    - **air_temp**: Air temperature in Celsius
    - **air_humidity**: Air humidity percentage (0-100)
    - **soil_temp**: Soil temperature in Celsius
    - **soil_moisture**: Soil moisture percentage (0-100)
    - **light_lux**: Light intensity in lux
    - **sensor_node_id**: ID of the sensor node
    
    Note: Validates that sensor_node_id exists in fields.json before accepting data.
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
    
    # Prepare CSV row
    csv_row = {
        "timestamp": timestamp,
        "air_temp": sensor_data.air_temp,
        "air_humidity": sensor_data.air_humidity,
        "soil_temp": sensor_data.soil_temp,
        "soil_moisture": sensor_data.soil_moisture,
        "light_lux": sensor_data.light_lux,
        "wind_speed": sensor_data.wind_speed if sensor_data.wind_speed is not None else ""
    }
    
    # Append to CSV file
    csv_filename = f"{sensor_data.sensor_node_id}.csv"
    success = append_csv(csv_filename, csv_row)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save sensor data"
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
    Get the latest sensor readings for a specific field
    
    - Returns the most recent sensor data from the field's sensor node
    - Validates that the field belongs to the authenticated farmer
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    # Validate field ownership (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Get latest reading from CSV
    csv_filename = f"{field.sensor_node_id}.csv"
    latest_row = get_latest_csv_row(csv_filename)
    
    if latest_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No sensor data found for this field"
        )
    
    wind_speed_val = latest_row.get("wind_speed", "")
    return SensorDataResponse(
        timestamp=latest_row.get("timestamp", ""),
        air_temp=float(latest_row.get("air_temp", 0)),
        air_humidity=float(latest_row.get("air_humidity", 0)),
        soil_temp=float(latest_row.get("soil_temp", 0)),
        soil_moisture=float(latest_row.get("soil_moisture", 0)),
        light_lux=float(latest_row.get("light_lux", 0)),
        wind_speed=float(wind_speed_val) if wind_speed_val else None
    )


@router.get("/fields/{field_id}/sensors/historical")
async def get_historical_sensor_data(
    field_id: str,
    range: str = Query("24h", description="Time range: 24h, 7d, or 30d"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get historical sensor data for a field
    
    - **range**: Time range filter (24h, 7d, or 30d)
    - Returns array of sensor readings within the specified range
    - Validates that the field belongs to the authenticated farmer
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    # Validate field ownership (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Parse time range
    start_time, end_time = parse_time_range(range)
    
    # Get filtered data
    csv_filename = f"{field.sensor_node_id}.csv"
    filtered_data = get_csv_by_date_range(csv_filename, start_time, end_time)
    
    # Convert to response format
    return [
        SensorDataResponse(
            timestamp=row.get("timestamp", ""),
            air_temp=float(row.get("air_temp", 0)),
            air_humidity=float(row.get("air_humidity", 0)),
            soil_temp=float(row.get("soil_temp", 0)),
            soil_moisture=float(row.get("soil_moisture", 0)),
            light_lux=float(row.get("light_lux", 0))
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
    Get aggregated sensor data (min, max, avg) for a field
    
    - **window**: Time window for aggregation (24h, 7d, or 30d)
    - Returns aggregated statistics for all sensor types
    - Validates that the field belongs to the authenticated farmer
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    # Validate field ownership (raises 404 if not owned)
    field = get_field_or_404(field_id, current_user["user_id"])
    
    # Parse time range
    start_time, end_time = parse_time_range(window)
    
    # Get filtered data
    csv_filename = f"{field.sensor_node_id}.csv"
    filtered_data = get_csv_by_date_range(csv_filename, start_time, end_time)
    
    # Aggregate data
    aggregated = aggregate_sensor_data(filtered_data, window)
    
    return AggregatedSensorData(**aggregated)

