"""
OpenWeather One Call API 3.0 Service

Main service for interacting with OpenWeather One Call API 3.0
Handles HTTP requests, retries, error handling, and response transformation.
"""

import os
import httpx
from typing import Dict, Optional, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# OpenWeather API configuration
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
if not OPENWEATHERMAP_API_KEY:
    print("Warning: OPENWEATHERMAP_API_KEY environment variable is not set. Weather API will not be available.")
OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/3.0"
OPENWEATHERMAP_TIMEOUT = 10.0  # seconds
MAX_RETRIES = 3


def map_weather_condition(weather_id: int) -> str:
    """
    Map OpenWeatherMap weather condition ID to readable condition string.
    """
    if 200 <= weather_id < 300:
        return "Thunderstorm"
    elif 300 <= weather_id < 400:
        return "Drizzle"
    elif 500 <= weather_id < 600:
        return "Rain"
    elif 600 <= weather_id < 700:
        return "Snow"
    elif 700 <= weather_id < 800:
        return "Mist"
    elif weather_id == 800:
        return "Clear"
    elif 801 <= weather_id <= 804:
        return "Cloudy" if weather_id >= 803 else "Partly Cloudy"
    else:
        return "Unknown"


async def call_openweather_with_retry(
    endpoint: str,
    params: Dict,
    max_retries: int = MAX_RETRIES
) -> Dict:
    """
    Call OpenWeather API with retry logic and exponential backoff.
    
    Args:
        endpoint: API endpoint path (e.g., "/onecall")
        params: Query parameters
        max_retries: Maximum number of retry attempts
        
    Returns:
        JSON response data
        
    Raises:
        httpx.HTTPError: If API call fails after retries
    """
    url = f"{OPENWEATHERMAP_BASE_URL}{endpoint}"
    params["appid"] = OPENWEATHERMAP_API_KEY
    params["units"] = "metric"
    
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=OPENWEATHERMAP_TIMEOUT) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException as e:
            last_exception = e
            if attempt < max_retries - 1:
                # Exponential backoff: 1s, 2s, 4s
                import asyncio
                await asyncio.sleep(2 ** attempt)
        except httpx.HTTPStatusError as e:
            # Don't retry on 4xx errors (client errors)
            if 400 <= e.response.status_code < 500:
                raise
            last_exception = e
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(2 ** attempt)
        except httpx.RequestError as e:
            last_exception = e
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(2 ** attempt)
    
    # If we've exhausted retries, raise the last exception
    raise last_exception


async def get_onecall_weather(lat: float, lon: float, exclude: Optional[List[str]] = None) -> Dict:
    """
    Fetch current weather and forecasts from One Call API 3.0.
    
    Args:
        lat: Latitude
        lon: Longitude
        exclude: Optional list of parts to exclude (e.g., ["minutely", "daily"])
        
    Returns:
        Raw One Call API response
    """
    params = {"lat": lat, "lon": lon}
    if exclude:
        params["exclude"] = ",".join(exclude)
    
    return await call_openweather_with_retry("/onecall", params)


async def get_timemachine_weather(lat: float, lon: float, dt: int) -> Dict:
    """
    Fetch historical weather data from Time Machine API.
    
    Args:
        lat: Latitude
        lon: Longitude
        dt: Unix timestamp for the historical date
        
    Returns:
        Raw Time Machine API response
    """
    params = {"lat": lat, "lon": lon, "dt": dt}
    return await call_openweather_with_retry("/onecall/timemachine", params)


async def get_weather_overview(lat: float, lon: float) -> Dict:
    """
    Fetch weather overview with human-readable summary from One Call API 3.0.
    
    Args:
        lat: Latitude
        lon: Longitude
        
    Returns:
        Raw Weather Overview API response with summary
    """
    params = {"lat": lat, "lon": lon}
    return await call_openweather_with_retry("/onecall/overview", params)


async def get_day_summary(lat: float, lon: float, date: str) -> Dict:
    """
    Fetch daily aggregation data from One Call API 3.0.
    
    Args:
        lat: Latitude
        lon: Longitude
        date: Date in YYYY-MM-DD format
        
    Returns:
        Raw Day Summary API response
    """
    params = {"lat": lat, "lon": lon, "date": date}
    return await call_openweather_with_retry("/onecall/day_summary", params)


def transform_onecall_response(api_response: Dict) -> Dict:
    """
    Transform OpenWeather One Call API response to our standardized format.
    
    Args:
        api_response: Raw API response from One Call endpoint
        
    Returns:
        Transformed weather data
    """
    current = api_response.get("current", {})
    weather_array = current.get("weather", [])
    weather_id = weather_array[0].get("id", 800) if weather_array else 800
    
    # Transform current weather
    current_data = {
        "temperature": round(current.get("temp", 0.0), 1),
        "humidity": current.get("humidity", 0),
        "wind_speed": round(current.get("wind_speed", 0.0) * 3.6, 1),  # m/s to km/h
        "condition": map_weather_condition(weather_id),
        "rain": round(current.get("rain", {}).get("1h", 0.0), 1),
        "feels_like": round(current.get("feels_like", 0.0), 1)
    }
    
    # Transform minutely forecast (60 items, 1 min intervals)
    minutely_data = []
    if "minutely" in api_response:
        for item in api_response["minutely"][:60]:  # Limit to 60 items
            minutely_data.append({
                "time": datetime.fromtimestamp(item["dt"]).strftime("%H:%M"),
                "precipitation": round(item.get("precipitation", 0.0), 1)
            })
    
    # Transform hourly forecast (48 items)
    hourly_data = []
    if "hourly" in api_response:
        for item in api_response["hourly"][:48]:  # Limit to 48 items
            weather_item = item.get("weather", [{}])[0]
            weather_id_hourly = weather_item.get("id", 800)
            hourly_data.append({
                "time": datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d %H:%M"),
                "temperature": round(item.get("temp", 0.0), 1),
                "condition": map_weather_condition(weather_id_hourly),
                "rain": round(item.get("rain", {}).get("1h", 0.0), 1)
            })
    
    # Transform daily forecast (8 items)
    daily_data = []
    if "daily" in api_response:
        for item in api_response["daily"][:8]:  # Limit to 8 items
            weather_item = item.get("weather", [{}])[0]
            weather_id_daily = weather_item.get("id", 800)
            daily_data.append({
                "date": datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d"),
                "temp_min": round(item.get("temp", {}).get("min", 0.0), 1),
                "temp_max": round(item.get("temp", {}).get("max", 0.0), 1),
                "condition": map_weather_condition(weather_id_daily),
                "rain": round(item.get("rain", 0.0), 1)
            })
    
    # Extract alerts
    alerts_data = []
    if "alerts" in api_response:
        for alert in api_response["alerts"]:
            alerts_data.append({
                "event": alert.get("event", "Unknown"),
                "severity": alert.get("severity", "minor"),
                "description": alert.get("description", ""),
                "start": datetime.fromtimestamp(alert.get("start", 0)).isoformat(),
                "end": datetime.fromtimestamp(alert.get("end", 0)).isoformat()
            })
    
    # Extract location name (if available from timezone)
    location = api_response.get("timezone", "").split("/")[-1].replace("_", " ") if api_response.get("timezone") else "Unknown Location"
    
    return {
        "current": current_data,
        "minutely": minutely_data,
        "hourly": hourly_data,
        "daily": daily_data,
        "alerts": alerts_data,
        "location": location
    }


def transform_timemachine_response(api_response: Dict) -> Dict:
    """
    Transform Time Machine API response for historical data analysis.
    
    Args:
        api_response: Raw API response from Time Machine endpoint
        
    Returns:
        Transformed historical weather data
    """
    current = api_response.get("current", {})
    
    return {
        "date": datetime.fromtimestamp(current.get("dt", 0)).strftime("%Y-%m-%d"),
        "temperature": round(current.get("temp", 0.0), 1),
        "humidity": current.get("humidity", 0),
        "rain": round(current.get("rain", {}).get("1h", 0.0), 1),
        "wind_speed": round(current.get("wind_speed", 0.0) * 3.6, 1)
    }