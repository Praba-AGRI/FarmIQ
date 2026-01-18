"""
Weather API Routes

Endpoints for OpenWeather One Call API 3.0 integration.
All endpoints use device geolocation (latitude, longitude).
"""

from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional
from datetime import datetime, timedelta
import time

from models.schemas import (
    WeatherLiveResponse, CurrentWeather, MinutelyForecast, HourlyForecast, DailyForecast,
    WeatherHistoryResponse, WeatherSummaryResponse, WeatherAIHelpRequest, WeatherAIHelpResponse,
    WeatherAlertsOneCallResponse, WeatherAlertOneCall
)
from services.weather_service import (
    get_onecall_weather, transform_onecall_response, get_timemachine_weather, transform_timemachine_response
)
from services.weather_cache import weather_cache
from services.weather_ai_service import generate_weather_summary, answer_weather_question
from utils.location import validate_coordinates

router = APIRouter()


@router.get("/live", response_model=WeatherLiveResponse)
async def get_live_weather(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180)
):
    """
    Get current weather and forecasts (minutely, hourly, daily) from One Call API 3.0.
    
    - **lat**: Latitude (-90 to 90)
    - **lon**: Longitude (-180 to 180)
    - Returns current weather, 1-hour minutely forecast, 48-hour hourly forecast, and 8-day daily forecast
    - Used for dashboard, irrigation rules, spray timing, and heat/rain logic
    - Cached for 10 minutes
    """
    # Validate coordinates
    is_valid, error_msg = validate_coordinates(lat, lon)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check cache first
    cached_data = weather_cache.get("live", lat, lon)
    if cached_data:
        return WeatherLiveResponse(**cached_data)
    
    try:
        # Fetch from OpenWeather One Call API
        weather_data = await get_onecall_weather(lat, lon, exclude=None)
        transformed = transform_onecall_response(weather_data)
        
        # Convert to response models
        current = CurrentWeather(**transformed["current"])
        minutely = [MinutelyForecast(**item) for item in transformed["minutely"]]
        hourly = [HourlyForecast(**item) for item in transformed["hourly"]]
        daily = [DailyForecast(**item) for item in transformed["daily"]]
        
        response_data = {
            "current": current.dict(),
            "minutely": [m.dict() for m in minutely],
            "hourly": [h.dict() for h in hourly],
            "daily": [d.dict() for d in daily],
            "location": transformed["location"]
        }
        
        # Cache the response
        weather_cache.set("live", lat, lon, response_data)
        
        return WeatherLiveResponse(**response_data)
        
    except Exception as e:
        # Try to return stale cache if available
        stale_data = weather_cache.get("live", lat, lon)
        if stale_data:
            # Return stale data with a note (handled by client)
            return WeatherLiveResponse(**stale_data)
        
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch live weather data: {str(e)}"
        )


@router.get("/history", response_model=WeatherHistoryResponse)
async def get_weather_history(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format. If not provided, uses yesterday.")
):
    """
    Get historical weather data for climate analysis.
    
    - **lat**: Latitude (-90 to 90)
    - **lon**: Longitude (-180 to 180)
    - **date**: Optional date (YYYY-MM-DD). Defaults to yesterday.
    - Returns average temperature, rainfall, and climate trend
    - Used for crop suitability analysis and long-term planning
    - Cached for 24 hours (historical data doesn't change)
    """
    # Validate coordinates
    is_valid, error_msg = validate_coordinates(lat, lon)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Parse date or default to yesterday
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.now() - timedelta(days=1)
    
    # Check cache
    cache_key = date or target_date.strftime("%Y-%m-%d")
    cached_data = weather_cache.get("history", lat, lon, cache_key)
    if cached_data:
        return WeatherHistoryResponse(**cached_data)
    
    try:
        # Convert date to Unix timestamp
        dt_timestamp = int(target_date.timestamp())
        
        # Fetch historical data
        historical_data = await get_timemachine_weather(lat, lon, dt_timestamp)
        transformed = transform_timemachine_response(historical_data)
        
        # For now, return basic historical data
        # In production, you might aggregate multiple days or use day_summary endpoint
        response_data = {
            "date": transformed["date"],
            "avg_temperature": transformed["temperature"],
            "avg_rainfall": transformed["rain"],
            "climate_trend": "similar",  # Would require comparison with more data
            "location": "Unknown Location"  # Time Machine API doesn't return location name
        }
        
        # Cache the response
        weather_cache.set("history", lat, lon, response_data, cache_key)
        
        return WeatherHistoryResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch historical weather data: {str(e)}"
        )


@router.get("/summary", response_model=WeatherSummaryResponse)
async def get_weather_summary(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180)
):
    """
    Get AI-generated weather summary for today and tomorrow.
    
    - **lat**: Latitude (-90 to 90)
    - **lon**: Longitude (-180 to 180)
    - Returns farmer-friendly summaries for today and tomorrow
    - Used for dashboard text cards and multilingual support
    - Cached for 10 minutes
    """
    # Validate coordinates
    is_valid, error_msg = validate_coordinates(lat, lon)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check cache
    cached_data = weather_cache.get("summary", lat, lon)
    if cached_data:
        return WeatherSummaryResponse(**cached_data)
    
    try:
        # Get location name from live weather
        weather_data = await get_onecall_weather(lat, lon, exclude=["minutely"])
        transformed = transform_onecall_response(weather_data)
        location = transformed["location"]
        
        # Generate AI summary
        summary_data = await generate_weather_summary(lat, lon)
        
        response_data = {
            "summary_today": summary_data["summary_today"],
            "summary_tomorrow": summary_data["summary_tomorrow"],
            "location": location
        }
        
        # Cache the response
        weather_cache.set("summary", lat, lon, response_data)
        
        return WeatherSummaryResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to generate weather summary: {str(e)}"
        )


@router.post("/ai-help", response_model=WeatherAIHelpResponse)
async def get_weather_ai_help(request: WeatherAIHelpRequest = Body(...)):
    """
    Get AI-powered answer to weather-related questions.
    
    - **question**: Farmer's question about weather
    - **lat**: Latitude
    - **lon**: Longitude
    - Returns AI-generated answer with confidence score
    - Used for farmer Q&A and explainability layer
    - Not cached (Q&A is dynamic)
    """
    # Validate coordinates
    is_valid, error_msg = validate_coordinates(request.lat, request.lon)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        # Get AI answer
        answer_data = await answer_weather_question(request.question, request.lat, request.lon)
        
        return WeatherAIHelpResponse(**answer_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to get AI weather help: {str(e)}"
        )


@router.get("/alerts", response_model=WeatherAlertsOneCallResponse)
async def get_weather_alerts(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180)
):
    """
    Get government weather alerts from One Call API.
    
    - **lat**: Latitude (-90 to 90)
    - **lon**: Longitude (-180 to 180)
    - Returns active weather alerts with severity levels
    - Alerts override AI recommendations (high priority)
    - Cached for 5 minutes
    """
    # Validate coordinates
    is_valid, error_msg = validate_coordinates(lat, lon)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check cache
    cached_data = weather_cache.get("alerts", lat, lon)
    if cached_data:
        return WeatherAlertsOneCallResponse(**cached_data)
    
    try:
        # Fetch weather data including alerts
        weather_data = await get_onecall_weather(lat, lon, exclude=["minutely", "hourly", "daily"])
        transformed = transform_onecall_response(weather_data)
        
        # Extract alerts
        alerts_list = []
        for alert in transformed.get("alerts", []):
            alerts_list.append(WeatherAlertOneCall(**alert))
        
        response_data = {
            "alerts": [a.dict() for a in alerts_list]
        }
        
        # Cache the response
        weather_cache.set("alerts", lat, lon, response_data)
        
        return WeatherAlertsOneCallResponse(**response_data)
        
    except Exception as e:
        # Try to return stale cache if available
        stale_data = weather_cache.get("alerts", lat, lon)
        if stale_data:
            return WeatherAlertsOneCallResponse(**stale_data)
        
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch weather alerts: {str(e)}"
        )