"""
Weather AI Summary Service

Generates farmer-friendly weather summaries using OpenAI reasoning layer.
Provides AI-powered explanations and Q&A for weather-related questions.
"""

import os
import json
import requests
from typing import Dict, Optional
import asyncio
from services.reasoning_layer import SYSTEM_PROMPT
from services.weather_service import (
    get_onecall_weather, transform_onecall_response, 
    get_weather_overview
)

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "qwen/qwen3-coder:free"


async def generate_weather_summary(lat: float, lon: float) -> Dict[str, str]:
    """
    Get weather summary from OpenWeather API overview endpoint.
    Uses OpenWeather's AI-generated summaries instead of generating our own.
    """
    try:
        summary_today = ""
        summary_tomorrow = ""
        
        try:
            overview_data = await get_weather_overview(lat, lon)
            
            if isinstance(overview_data, dict):
                summary_fields = [
                    overview_data.get("summary"),
                    overview_data.get("overview"),
                    overview_data.get("description"),
                    overview_data.get("summary_text"),
                    overview_data.get("weather_summary"),
                ]
                
                summary_fields = [s for s in summary_fields if s]
                
                if summary_fields:
                    main_summary = summary_fields[0]
                    
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
                    elif isinstance(main_summary, str) and len(main_summary) > 50:
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
                            summary_today = main_summary[:500]
                
                if not summary_today:
                    summary_today = overview_data.get("today") or overview_data.get("today_summary") or ""
                if not summary_tomorrow:
                    summary_tomorrow = overview_data.get("tomorrow") or overview_data.get("tomorrow_summary") or ""
            
        except Exception as overview_error:
            print(f"OpenWeather overview endpoint error: {overview_error}")
        
        has_valid_overview = (
            summary_today and len(summary_today.strip()) >= 20
        ) or (
            summary_tomorrow and len(summary_tomorrow.strip()) >= 20
        )
        
        if not has_valid_overview:
            weather_data = await get_onecall_weather(lat, lon, exclude=["minutely"])
            transformed = transform_onecall_response(weather_data)
            
            current = transformed.get("current", {})
            daily = transformed.get("daily", [])
            
            current_temp = current.get("temperature", 0) or 0
            current_condition = current.get("condition", "Unknown") or "Unknown"
            current_humidity = current.get("humidity", 0) or 0
            
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
        
        return {
            "summary_today": summary_today[:1000] if summary_today else "Weather summary unavailable.",
            "summary_tomorrow": summary_tomorrow[:1000] if summary_tomorrow else "Weather forecast summary unavailable."
        }
        
    except Exception as e:
        print(f"Weather overview AI processing error: {e}")
        return {
            "summary_today": "Weather data is being processed. Please check back in a moment.",
            "summary_tomorrow": "Weather forecast data is being processed. Please check back in a moment."
        }


async def answer_weather_question(question: str, lat: float, lon: float) -> Dict[str, any]:
    """
    Answer weather-related questions using Gemini reasoning.
    """
    try:
        weather_data = await get_onecall_weather(lat, lon, exclude=None)
        transformed = transform_onecall_response(weather_data)
        overview_data = await get_weather_overview(lat, lon)
        
        current = transformed.get("current", {})
        minutely = transformed.get("minutely", [])[:60]
        hourly = transformed.get("hourly", [])[:48]
        daily = transformed.get("daily", [])[:8]
        alerts = transformed.get("alerts", [])
        
        weather_context = {
            "current": current,
            "minutely_precipitation": [
                {"time": m.get("time"), "precipitation": m.get("precipitation", 0)} 
                for m in minutely[:30]
            ],
            "hourly_forecast": [
                {
                    "time": h.get("time"),
                    "temperature": h.get("temperature"),
                    "condition": h.get("condition"),
                    "rain": h.get("rain", 0)
                }
                for h in hourly[:24]
            ],
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
            "alerts": alerts,
            "overview_summary": overview_data.get("summary") or overview_data.get("overview", "")
        }
        
        prompt = f"""
        {SYSTEM_PROMPT}
        
        A farmer is asking: "{question}"

        COMPREHENSIVE WEATHER DATA:
        {json.dumps(weather_context, indent=2, ensure_ascii=False)}

        Provide a clear, helpful answer to the farmer's question considering ALL of the above weather aspects.
        Keep the answer concise (2-4 sentences) but comprehensive.
        """
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://farmiq.ai", # Optional
            "X-OpenRouter-Title": "FarmIQ Agricultural Assistant", # Optional
        }
        
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        response = await asyncio.to_thread(
            requests.post,
            url=OPENROUTER_URL,
            headers=headers,
            data=json.dumps(payload)
        )
        
        if response.status_code != 200:
            print(f"OpenRouter Error: {response.status_code} - {response.text}")
            raise Exception(f"OpenRouter returned status {response.status_code}")
            
        result = response.json()
        answer = result['choices'][0]['message']['content']
        
        return {
            "answer": answer[:1000],
            "confidence": 0.9,
            "weather_context": weather_context
        }
        
    except Exception as e:
        print(f"OpenRouter weather answering error: {e}")
        return {
            "answer": "I'm unable to answer your question about the weather at this time. Please try again later.",
            "confidence": 0.0,
            "weather_context": {}
        }
