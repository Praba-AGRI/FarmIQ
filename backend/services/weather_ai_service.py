"""
Weather AI Summary Service

Generates farmer-friendly weather summaries using OpenAI reasoning layer.
Provides AI-powered explanations and Q&A for weather-related questions.
"""

import os
import json
from typing import Dict, Optional
from openai import AsyncOpenAI
from services.reasoning_layer import SYSTEM_PROMPT
from services.weather_service import (
    get_onecall_weather, transform_onecall_response, 
    get_weather_overview
)

# OpenRouter client for weather AI
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
openrouter_client = None

if OPENROUTER_API_KEY:
    try:
        openrouter_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", ""),
                "X-Title": os.getenv("OPENROUTER_APP_NAME", "FarmIQ Weather AI"),
            }
        )
    except Exception as e:
        print(f"Warning: Failed to initialize OpenRouter client for weather AI: {e}")
        openrouter_client = None


async def generate_weather_summary(lat: float, lon: float) -> Dict[str, str]:
    """
    Get weather summary from OpenWeather API overview endpoint.
    Uses OpenWeather's AI-generated summaries instead of generating our own.
    
    Args:
        lat: Latitude
        lon: Longitude
        
    Returns:
        Dictionary with summary_today and summary_tomorrow from OpenWeather API
    """
    try:
        # Try to fetch weather overview from OpenWeather API first
        summary_today = ""
        summary_tomorrow = ""
        
        try:
            overview_data = await get_weather_overview(lat, lon)
            
            # Try various possible response structures from OpenWeather overview endpoint
            # The API might return summary in different formats
            if isinstance(overview_data, dict):
                # Try different possible field names for summary
                summary_fields = [
                    overview_data.get("summary"),
                    overview_data.get("overview"),
                    overview_data.get("description"),
                    overview_data.get("summary_text"),
                    overview_data.get("weather_summary"),
                ]
                
                # Remove None values
                summary_fields = [s for s in summary_fields if s]
                
                if summary_fields:
                    main_summary = summary_fields[0]
                    
                    # If it's a dict, try to extract today/tomorrow
                    if isinstance(main_summary, dict):
                        summary_today = (
                            main_summary.get("today") or 
                            main_summary.get("current") or 
                            main_summary.get("today_summary") or
                            ""
                        )
                        summary_tomorrow = (
                            main_summary.get("tomorrow") or 
                            main_summary.get("forecast") or 
                            main_summary.get("tomorrow_summary") or
                            ""
                        )
                    # If it's a string, try to split it intelligently
                    elif isinstance(main_summary, str) and len(main_summary) > 50:
                        # Try to split by common separators
                        if "Today:" in main_summary or "TODAY:" in main_summary:
                            parts = main_summary.split("Today:")
                            if len(parts) > 1:
                                today_tomorrow = parts[1].split("Tomorrow:")
                                summary_today = today_tomorrow[0].strip()[:500] if today_tomorrow[0].strip() else ""
                                summary_tomorrow = today_tomorrow[1].strip()[:500] if len(today_tomorrow) > 1 and today_tomorrow[1].strip() else ""
                        elif "Tomorrow:" in main_summary or "TOMORROW:" in main_summary:
                            parts = main_summary.split("Tomorrow:")
                            summary_today = parts[0].strip()[:500] if parts[0].strip() else ""
                            summary_tomorrow = parts[1].strip()[:500] if len(parts) > 1 and parts[1].strip() else ""
                        else:
                            # Use entire summary as today, try to find tomorrow separately
                            summary_today = main_summary[:500]
                
                # Also check for direct today/tomorrow fields at root level
                if not summary_today:
                    summary_today = overview_data.get("today") or overview_data.get("today_summary") or ""
                if not summary_tomorrow:
                    summary_tomorrow = overview_data.get("tomorrow") or overview_data.get("tomorrow_summary") or ""
            
        except Exception as overview_error:
            # If overview endpoint fails, log and continue to fallback
            import traceback
            print(f"OpenWeather overview endpoint error: {overview_error}")
            print(f"Traceback: {traceback.format_exc()}")
            # Continue to fallback below
        
        # Use overview summaries if we got valid ones (even if only one)
        # Only fall back if we got nothing useful from overview
        has_valid_overview = (
            summary_today and len(summary_today.strip()) >= 20
        ) or (
            summary_tomorrow and len(summary_tomorrow.strip()) >= 20
        )
        
        # Fallback: Only if OpenWeather overview didn't provide any usable summaries
        if not has_valid_overview:
            weather_data = await get_onecall_weather(lat, lon, exclude=["minutely"])
            transformed = transform_onecall_response(weather_data)
            
            current = transformed.get("current", {})
            daily = transformed.get("daily", [])
            
            current_temp = current.get("temperature", 0) or 0
            current_condition = current.get("condition", "Unknown") or "Unknown"
            current_humidity = current.get("humidity", 0) or 0
            current_rain = current.get("rain", 0) or 0
            
            today_forecast = daily[0] if len(daily) > 0 else {}
            tomorrow_forecast = daily[1] if len(daily) > 1 else {}
            
            today_temp_min = today_forecast.get("temp_min", current_temp) or current_temp
            today_temp_max = today_forecast.get("temp_max", current_temp) or current_temp
            today_condition = today_forecast.get("condition", current_condition) or current_condition
            today_rain = today_forecast.get("rain", 0) or 0
            
            tomorrow_temp_min = tomorrow_forecast.get("temp_min", current_temp) or current_temp
            tomorrow_temp_max = tomorrow_forecast.get("temp_max", current_temp) or current_temp
            tomorrow_condition = tomorrow_forecast.get("condition", "Unknown") or "Unknown"
            tomorrow_rain = tomorrow_forecast.get("rain", 0) or 0
            
            # Only generate fallback if overview didn't provide it
            if not summary_today or len(summary_today.strip()) < 20:
                summary_today = (
                    f"Today's weather: {today_condition} with temperatures ranging from "
                    f"{today_temp_min}°C to {today_temp_max}°C. "
                    f"Current conditions: {current_temp}°C, {current_humidity}% humidity."
                )
                if today_rain > 0:
                    summary_today += f" Expected rainfall: {today_rain}mm."
            
            if not summary_tomorrow or len(summary_tomorrow.strip()) < 20:
                summary_tomorrow = (
                    f"Tomorrow's forecast: {tomorrow_condition} with temperatures between "
                    f"{tomorrow_temp_min}°C and {tomorrow_temp_max}°C."
                )
                if tomorrow_rain > 0:
                    summary_tomorrow += f" Expected rainfall: {tomorrow_rain}mm."
                else:
                    summary_tomorrow += " No significant rain expected."
        
        # Return summaries - use overview if we have it, otherwise use fallback
        return {
            "summary_today": summary_today[:1000] if summary_today else "Weather summary unavailable.",
            "summary_tomorrow": summary_tomorrow[:1000] if summary_tomorrow else "Weather forecast summary unavailable."
        }
        
    except Exception as e:
        # Final fallback if API fails
        print(f"Weather overview API error: {e}")
        return {
            "summary_today": "Weather data is being processed. Please check back in a moment.",
            "summary_tomorrow": "Weather forecast data is being processed. Please check back in a moment."
        }


async def answer_weather_question(question: str, lat: float, lon: float) -> Dict[str, any]:
    """
    Answer weather-related questions using comprehensive weather data and AI reasoning.
    OpenAI is used for reasoning considering all weather parameters and aspects.
    
    Args:
        question: Farmer's question about weather
        lat: Latitude
        lon: Longitude
        
    Returns:
        Dictionary with answer, confidence, and weather_context
    """
    try:
        # Fetch comprehensive weather data (all aspects)
        weather_data = await get_onecall_weather(lat, lon, exclude=None)
        transformed = transform_onecall_response(weather_data)
        
        # Also get overview for additional context
        overview_data = await get_weather_overview(lat, lon)
        
        current = transformed.get("current", {})
        minutely = transformed.get("minutely", [])[:60]  # Next hour
        hourly = transformed.get("hourly", [])[:48]  # Next 48 hours
        daily = transformed.get("daily", [])[:8]  # Next 8 days
        alerts = transformed.get("alerts", [])
        
        # Build comprehensive weather context for AI reasoning
        weather_context = {
            # Current conditions
            "current": {
                "temperature": current.get("temperature"),
                "feels_like": current.get("feels_like"),
                "humidity": current.get("humidity"),
                "wind_speed": current.get("wind_speed"),
                "condition": current.get("condition"),
                "rain": current.get("rain")
            },
            # Minutely precipitation (next hour)
            "minutely_precipitation": [
                {"time": m.get("time"), "precipitation": m.get("precipitation", 0)} 
                for m in minutely[:30]
            ],
            # Hourly forecast (next 48h)
            "hourly_forecast": [
                {
                    "time": h.get("time"),
                    "temperature": h.get("temperature"),
                    "condition": h.get("condition"),
                    "rain": h.get("rain", 0)
                }
                for h in hourly[:24]
            ],
            # Daily forecast (next 8 days)
            "daily_forecast": [
                {
                    "date": d.get("date"),
                    "temp_min": d.get("temp_min"),
                    "temp_max": d.get("temp_max"),
                    "condition": d.get("condition"),
                    "rain": d.get("rain", 0)
                }
                for d in daily[:3]
            ],
            # Active alerts
            "alerts": [
                {
                    "event": a.get("event"),
                    "severity": a.get("severity"),
                    "description": a.get("description"),
                    "start": a.get("start"),
                    "end": a.get("end")
                }
                for a in alerts
            ],
            # Overview summary (if available)
            "overview_summary": overview_data.get("summary") or overview_data.get("overview", "")
        }
        
        if not openrouter_client:
            # Fallback response
            return {
                "answer": f"Current weather: {weather_context['condition']}, {weather_context['temperature']}°C. "
                          f"Rain in last hour: {weather_context['rain']}mm. "
                          f"Wind speed: {weather_context['wind_speed']} km/h.",
                "confidence": 0.5,
                "weather_context": weather_context
            }
        
        # Generate comprehensive AI answer considering all weather aspects
        current = weather_context['current']
        minutely = weather_context['minutely_precipitation']
        hourly = weather_context['hourly_forecast']
        daily = weather_context['daily_forecast']
        alerts_list = weather_context['alerts']
        
        # Calculate aggregated values for context
        max_rain_next_hour = max([m.get("precipitation", 0) for m in minutely], default=0)
        max_rain_next_24h = max([h.get("rain", 0) for h in hourly[:24]], default=0)
        avg_temp_next_24h = sum([h.get("temperature", 0) for h in hourly[:24]]) / len(hourly[:24]) if hourly else current.get("temperature", 0)
        
        prompt = f"""A farmer is asking: "{question}"

COMPREHENSIVE WEATHER DATA:

Current Conditions:
- Temperature: {current.get('temperature')}°C (feels like {current.get('feels_like')}°C)
- Condition: {current.get('condition')}
- Humidity: {current.get('humidity')}%
- Wind Speed: {current.get('wind_speed')} km/h
- Rain (last hour): {current.get('rain', 0)}mm

Precipitation Forecast:
- Max rain in next hour: {max_rain_next_hour}mm
- Max rain in next 24 hours: {max_rain_next_hour}mm
- Average temperature next 24h: {avg_temp_next_24h:.1f}°C

Upcoming Conditions:
- Next 3 days: {', '.join([f"{d.get('date')}: {d.get('temp_min')}-{d.get('temp_max')}°C, {d.get('condition')}, {d.get('rain', 0)}mm rain" for d in daily])}

Active Weather Alerts:
{chr(10).join([f"- {a.get('event')} ({a.get('severity')}): {a.get('description')[:100]}" for a in alerts_list]) if alerts_list else "None"}

Weather Overview: {weather_context.get('overview_summary', 'N/A')}

Provide a clear, helpful answer to the farmer's question considering ALL of the above weather aspects: 
- Current conditions and trends
- Precipitation forecasts (short and medium term)
- Temperature patterns
- Active alerts and warnings
- Conditions relevant to farming operations (irrigation, spraying, harvesting, etc.)

Keep the answer concise (2-4 sentences) but comprehensive, considering all weather parameters and their implications for farming."""
        
        # Call OpenRouter API with OpenAI SDK
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        response = await openrouter_client.chat.completions.create(
            model="openai/gpt-oss-120b:free",
            messages=messages,
            max_tokens=200,
            extra_body={"reasoning": {"enabled": True}}
        )
        
        # Extract response
        answer = response.choices[0].message.content
        
        # Calculate confidence based on available data
        confidence = 0.8  # Default confidence
        if not weather_context.get("temperature"):
            confidence -= 0.2
        if len(weather_context.get("next_12h_rain", [])) == 0:
            confidence -= 0.1
        
        return {
            "answer": answer[:1000],
            "confidence": min(max(confidence, 0.0), 1.0),
            "weather_context": weather_context
        }
        
    except Exception as e:
        return {
            "answer": "I'm unable to answer your question about the weather at this time. Please try again later.",
            "confidence": 0.0,
            "weather_context": {}
        }
