# AI Reasoning Layer - Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Replacing Mock Data](#replacing-mock-data)
5. [Configuration](#configuration)
6. [API Usage](#api-usage)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The AI Reasoning Layer is a constrained agricultural assistant that:

- **Explains AI agent decisions** in human-readable language
- **Answers farmer questions** about recommendations
- **Uses farmer + field memory** to avoid contradictory advice
- **Leverages ICAR/TNAU knowledge** only (no hallucinated agronomy)
- **Respects farming preferences** (organic/conventional)
- **Supports multiple languages** based on farmer preference

### Key Design Principles

✅ **What it DOES:**
- Language generation and reasoning
- Explanation of AI agent outputs
- Question answering using context
- Weather alert awareness
- Memory-based consistency

❌ **What it DOES NOT:**
- Make calculations
- Make predictions
- Change AI agent decisions
- Invent new agronomic practices
- Override AI agent with weather data

---

## Architecture

### System Flow

```
┌─────────────────┐
│  Farmer Request │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backend API Endpoint            │
│  (routes/ai.py)                  │
└────────┬─────────────────────────┘
         │
         ├──► Get AI Agent Output (ML/rule-based decisions)
         ├──► Get Farmer Profile
         ├──► Get Field Context
         ├──► Get Sensor Data
         ├──► Get Weather Data
         ├──► Get Advisory History
         └──► Load Approved Knowledge (ICAR/TNAU)
         │
         ▼
┌─────────────────────────────────┐
│  Reasoning Layer                 │
│  (services/reasoning_layer.py)  │
│  - Build Memory Context          │
│  - Format Data Payload           │
│  - Call OpenAI API               │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  OpenAI GPT-4o-mini              │
│  - Generates Human-Readable      │
│    Advisory/Answer              │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Response to Farmer              │
└─────────────────────────────────┘
```

### Components

1. **Reasoning Layer Service** (`services/reasoning_layer.py`)
   - Main reasoning function
   - Memory builder
   - OpenAI API integration

2. **AI Routes** (`routes/ai.py`)
   - API endpoints
   - Data collection and formatting
   - Integration with reasoning layer

3. **Knowledge Base** (`data/knowledge_base.json`)
   - ICAR/TNAU approved knowledge
   - Agronomic notes and practices

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `openai>=1.0.0` - OpenAI Python SDK
- Other FastAPI dependencies

### 2. Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

### 3. Set Environment Variable

**Option A: Create `.env` file** (Recommended for development)

Create `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-api-key-here
```

**Option B: Set system environment variable**

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-api-key-here"
```

**Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=sk-your-api-key-here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

**Option C: Set in production environment**

Set the environment variable in your deployment platform (Vercel, AWS, etc.)

### 4. Verify Setup

Start the backend server:
```bash
cd backend
uvicorn app:app --reload
```

If setup is correct, the server should start without errors. If you see:
```
ValueError: OPENAI_API_KEY environment variable is required
```
Then the environment variable is not set correctly.

---

## Replacing Mock Data

### Current Mock Implementation

The `get_ai_agent_output()` function in `backend/routes/ai.py` currently uses mock logic. Here's what needs to be replaced:

**File:** `backend/routes/ai.py`  
**Function:** `get_ai_agent_output()`  
**Lines:** 22-103

### Step-by-Step Replacement Guide

#### 1. Identify Mock Data Locations

**Location 1: Mock AI Logic (Lines 49-80)**
```python
# Mock AI logic (in production, this comes from AI agent)
crop_stage = field.crop_stage or "Vegetative"
gdd_value = 1250.0  # This should come from AI agent

# Generate recommendations based on mock logic
recommendations = []
if sensor_data["soil_moisture"] < 50:
    recommendations.append({...})
```

**Location 2: Default Mock Data (Lines 89-103)**
```python
except Exception as e:
    # Return default mock data if sensor data unavailable
    return {
        "crop_stage": "Vegetative",
        "gdd_value": 1250.0,
        "recommendations": [...],
        "sensor_values": {}
    }
```

#### 2. Replace with Real AI Agent

**Option A: External AI Agent API**

```python
async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None) -> dict:
    """
    Get AI agent output from external API
    """
    import httpx
    
    # Get sensor data
    if current_user is None:
        mock_user = {"user_id": farmer_id}
    else:
        mock_user = current_user
        
    sensor_response = await get_current_sensor_readings(field_id, mock_user)
    field = await get_field(field_id, mock_user)
    
    # Prepare payload for AI agent
    payload = {
        "field_id": field_id,
        "farmer_id": farmer_id,
        "sensor_data": {
            "air_temp": sensor_response.air_temp,
            "air_humidity": sensor_response.air_humidity,
            "soil_temp": sensor_response.soil_temp,
            "soil_moisture": sensor_response.soil_moisture,
            "light_lux": sensor_response.light_lux,
            "wind_speed": sensor_response.wind_speed
        },
        "field_info": {
            "crop": field.crop,
            "crop_stage": field.crop_stage,
            "sowing_date": field.sowing_date,
            "area_acres": field.area_acres,
            "location": field.location
        }
    }
    
    # Call AI agent API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://your-ai-agent-api.com/recommendations",
            json=payload,
            headers={
                "Authorization": f"Bearer {AI_AGENT_API_KEY}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        response.raise_for_status()
        ai_response = response.json()
    
    # Map AI agent response to expected format
    return {
        "crop_stage": ai_response.get("crop_stage", "Unknown"),
        "gdd_value": ai_response.get("gdd_value", 0.0),
        "recommendations": [
            {
                "title": rec.get("title"),
                "description": rec.get("description"),
                "status": RecommendationStatus(rec.get("status", "monitor")),
                "explanation": rec.get("explanation", ""),
                "timing": rec.get("timing", "")
            }
            for rec in ai_response.get("recommendations", [])
        ],
        "sensor_values": payload["sensor_data"]
    }
```

**Option B: Local ML Model**

```python
async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None) -> dict:
    """
    Get AI agent output from local ML model
    """
    import your_ml_model  # Import your ML model
    
    # Get sensor data
    if current_user is None:
        mock_user = {"user_id": farmer_id}
    else:
        mock_user = current_user
        
    sensor_response = await get_current_sensor_readings(field_id, mock_user)
    field = await get_field(field_id, mock_user)
    
    # Prepare input for ML model
    model_input = {
        "sensor_readings": {
            "air_temp": sensor_response.air_temp,
            "air_humidity": sensor_response.air_humidity,
            "soil_temp": sensor_response.soil_temp,
            "soil_moisture": sensor_response.soil_moisture,
            "light_lux": sensor_response.light_lux,
            "wind_speed": sensor_response.wind_speed
        },
        "crop_type": field.crop,
        "crop_stage": field.crop_stage,
        "sowing_date": field.sowing_date,
        "location": field.location
    }
    
    # Get predictions from ML model
    predictions = your_ml_model.predict(model_input)
    
    # Format response
    recommendations = []
    for pred in predictions.recommendations:
        recommendations.append({
            "title": pred.title,
            "description": pred.description,
            "status": RecommendationStatus(pred.status),
            "explanation": pred.explanation,
            "timing": pred.timing
        })
    
    return {
        "crop_stage": predictions.crop_stage,
        "gdd_value": predictions.gdd_value,
        "recommendations": recommendations,
        "sensor_values": model_input["sensor_readings"]
    }
```

**Option C: Hybrid (Rule-Based + ML)**

```python
async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None) -> dict:
    """
    Get AI agent output using rule-based logic + ML predictions
    """
    # Get sensor data
    if current_user is None:
        mock_user = {"user_id": farmer_id}
    else:
        mock_user = current_user
        
    sensor_response = await get_current_sensor_readings(field_id, mock_user)
    field = await get_field(field_id, mock_user)
    
    sensor_data = {
        "air_temp": sensor_response.air_temp,
        "air_humidity": sensor_response.air_humidity,
        "soil_temp": sensor_response.soil_temp,
        "soil_moisture": sensor_response.soil_moisture,
        "light_lux": sensor_response.light_lux,
        "wind_speed": sensor_response.wind_speed
    }
    
    # Call ML model for crop stage and GDD
    ml_predictions = your_ml_model.predict_crop_stage(sensor_data, field)
    crop_stage = ml_predictions.crop_stage
    gdd_value = ml_predictions.gdd_value
    
    # Use rule-based logic for recommendations
    recommendations = []
    
    # Irrigation rule
    if sensor_data["soil_moisture"] < get_optimal_moisture(crop_stage):
        recommendations.append({
            "title": "Irrigation",
            "description": f"Irrigate the field. Current soil moisture is {sensor_data['soil_moisture']}%.",
            "status": RecommendationStatus.DO_NOW,
            "explanation": f"Soil moisture is below optimal for {crop_stage} stage.",
            "timing": "Within next 6 hours"
        })
    
    # Pest risk rule
    if sensor_data["air_humidity"] > 60 and 25 <= sensor_data["air_temp"] <= 30:
        recommendations.append({
            "title": "Pest/Disease Risk",
            "description": "Monitor for pest activity.",
            "status": RecommendationStatus.MONITOR,
            "explanation": "High humidity and optimal temperature favor pest development.",
            "timing": "Daily monitoring"
        })
    
    # Add ML-based recommendations
    ml_recommendations = your_ml_model.get_recommendations(sensor_data, crop_stage)
    recommendations.extend(ml_recommendations)
    
    return {
        "crop_stage": crop_stage,
        "gdd_value": gdd_value,
        "recommendations": recommendations,
        "sensor_values": sensor_data
    }
```

#### 3. Update Error Handling

Replace the mock fallback with proper error handling:

```python
except Exception as e:
    # Log error for debugging
    import logging
    logging.error(f"Failed to get AI agent output for field {field_id}: {str(e)}")
    
    # Return minimal safe response
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"AI agent service unavailable: {str(e)}"
    )
```

#### 4. Add Environment Variables

If using external API, add to `.env`:
```bash
AI_AGENT_API_URL=https://your-ai-agent-api.com
AI_AGENT_API_KEY=your-api-key
```

#### 5. Update Requirements

If using external API client, add to `requirements.txt`:
```txt
httpx>=0.25.0
```

---

## Configuration

### OpenAI Model Settings

**File:** `backend/services/reasoning_layer.py`  
**Lines:** 139-147

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",      # Change model here
    temperature=0.2,           # Adjust creativity (0.0-2.0)
    max_tokens=1000           # Adjust response length
)
```

**Available Models:**
- `gpt-4o-mini` - Cost-effective, fast (recommended)
- `gpt-4o` - More capable, higher cost
- `gpt-3.5-turbo` - Older, cheaper alternative

**Temperature Settings:**
- `0.0-0.3` - More deterministic, consistent
- `0.4-0.7` - Balanced
- `0.8-2.0` - More creative, varied

### Memory Context Settings

**File:** `backend/services/reasoning_layer.py`  
**Function:** `build_memory_context()`  
**Line:** 66

```python
def build_memory_context(advisory_history: List[Dict], max_entries: int = 3) -> List[Dict]:
    # Change max_entries to adjust memory size
    # More entries = more context but higher token usage
```

### System Prompt Customization

**File:** `backend/services/reasoning_layer.py`  
**Lines:** 41-61

Edit the `SYSTEM_PROMPT` to change assistant behavior:

```python
SYSTEM_PROMPT = """
You are a constrained Agricultural Reasoning Assistant for Indian farmers.

MANDATORY RULES:
1. Use ONLY the information provided in the context.
2. Agronomic knowledge is LIMITED to ICAR and TNAU notes supplied.
# ... add your custom rules here
"""
```

### Knowledge Base

**File:** `backend/data/knowledge_base.json`

Add or modify ICAR/TNAU knowledge:

```json
{
  "approved_knowledge": {
    "source": ["ICAR", "TNAU"],
    "notes": [
      "Your approved knowledge here",
      "More notes..."
    ]
  }
}
```

---

## API Usage

### 1. Get Recommendations

**Endpoint:** `POST /api/fields/{field_id}/recommendations`

**Request:**
```bash
curl -X POST "http://localhost:8000/api/fields/field-123/recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "crop_stage": "Vegetative",
  "gdd_value": 1250.0,
  "recommendations": [
    {
      "title": "Irrigation",
      "description": "...",
      "status": "do_now",
      "explanation": "...",
      "timing": "Within next 6 hours"
    }
  ],
  "ai_reasoning_text": "Based on current sensor readings..."
}
```

### 2. Chat Interface

**Endpoint:** `POST /api/fields/{field_id}/chat`

**Request:**
```bash
curl -X POST "http://localhost:8000/api/fields/field-123/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Why do you recommend irrigation?"}'
```

**Response:**
```json
{
  "response": "Based on the current sensor readings...",
  "timestamp": "2024-01-15T10:00:00"
}
```

---

## Customization

### Adding Language Support

The reasoning layer respects `farmer_profile["preferred_language"]`. To add support:

1. Update system prompt to mention language support
2. Ensure knowledge base has translations (if needed)
3. Test with different language preferences

### Adding Custom Knowledge Sources

1. Edit `backend/data/knowledge_base.json`
2. Add new sources to `source` array
3. Add notes with source attribution

### Modifying Response Format

Edit the reasoning layer to format responses differently:

```python
# In reasoning_agri_assistant function
# Add formatting logic before returning
formatted_response = format_response(response.choices[0].message.content)
return formatted_response
```

---

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable is required"

**Solution:**
1. Check `.env` file exists in `backend/` directory
2. Verify `OPENAI_API_KEY` is set correctly
3. Restart the server after setting environment variable

### Error: "AI reasoning assistant is temporarily unavailable"

**Possible Causes:**
1. OpenAI API key is invalid
2. OpenAI account has no credits
3. Network connectivity issues
4. OpenAI API is down

**Solutions:**
1. Verify API key at https://platform.openai.com/api-keys
2. Check account credits at https://platform.openai.com/usage
3. Check internet connection
4. Check OpenAI status at https://status.openai.com/

### Slow Response Times

**Causes:**
- OpenAI API latency
- Large payload size
- Network issues

**Solutions:**
1. Use `gpt-4o-mini` (faster than gpt-4o)
2. Reduce `max_tokens` if responses are too long
3. Reduce `max_entries` in memory context
4. Add caching for repeated queries

### High API Costs

**Solutions:**
1. Use `gpt-4o-mini` instead of `gpt-4o`
2. Reduce `max_tokens`
3. Implement response caching
4. Monitor usage at https://platform.openai.com/usage

### Inconsistent Responses

**Solutions:**
1. Lower `temperature` (e.g., 0.1-0.2)
2. Improve system prompt clarity
3. Provide more context in payload
4. Use same model version consistently

---

## Best Practices

### 1. Error Handling

Always handle OpenAI API failures gracefully:

```python
try:
    response = client.chat.completions.create(...)
    return response.choices[0].message.content
except openai.APIError as e:
    logging.error(f"OpenAI API error: {e}")
    return "AI reasoning assistant is temporarily unavailable. Please try again later."
except Exception as e:
    logging.error(f"Unexpected error: {e}")
    return "An error occurred. Please contact support."
```

### 2. Caching

Implement caching for frequently asked questions:

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_cached_response(payload_hash: str):
    # Check cache first
    pass
```

### 3. Logging

Log all reasoning layer calls for debugging:

```python
import logging

logging.info(f"Reasoning layer called for field {field_id}")
logging.debug(f"Payload: {json.dumps(user_payload)}")
```

### 4. Rate Limiting

Implement rate limiting to prevent abuse:

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/{field_id}/chat")
@limiter.limit("10/minute")
async def ai_chat(...):
    ...
```

### 5. Monitoring

Monitor API usage and costs:

- Set up alerts for high usage
- Track token consumption
- Monitor response times
- Track error rates

---

## File Structure

```
backend/
├── services/
│   └── reasoning_layer.py      # Main reasoning layer service
├── routes/
│   └── ai.py                    # API endpoints (contains get_ai_agent_output)
├── data/
│   └── knowledge_base.json      # ICAR/TNAU knowledge base
├── .env                         # Environment variables (create this)
└── requirements.txt             # Dependencies
```

---

## Support

For issues or questions:

1. **OpenAI API Issues:** https://platform.openai.com/docs/guides/error-codes
2. **OpenAI Status:** https://status.openai.com/
3. **Backend Logs:** Check server console output
4. **API Documentation:** http://localhost:8000/docs (when server is running)

---

## Quick Reference

### Environment Variables
```bash
OPENAI_API_KEY=sk-...              # Required
AI_AGENT_API_URL=https://...      # Optional (if using external AI agent)
AI_AGENT_API_KEY=...               # Optional (if using external AI agent)
```

### Key Functions
- `reasoning_agri_assistant()` - Main reasoning function
- `build_memory_context()` - Builds memory from advisory history
- `get_ai_agent_output()` - **REPLACE THIS** with real AI agent

### Key Files
- `services/reasoning_layer.py` - Reasoning layer implementation
- `routes/ai.py` - API endpoints and AI agent integration
- `data/knowledge_base.json` - Approved knowledge

### Testing
```bash
# Test recommendations endpoint
curl -X POST "http://localhost:8000/api/fields/{field_id}/recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test chat endpoint
curl -X POST "http://localhost:8000/api/fields/{field_id}/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Why irrigation?"}'
```

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0

