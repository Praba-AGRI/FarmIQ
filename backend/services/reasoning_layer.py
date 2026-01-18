"""
FULL MEMORY-AWARE REASONING LAYER

================================

Purpose:
- Acts as a constrained agricultural assistant
- Explains AI agent decisions
- Answers farmer questions
- Uses farmer + field memory
- Uses ONLY ICAR/TNAU knowledge provided

IMPORTANT DESIGN RULES:
- NO calculations
- NO predictions
- NO decision changes
- NO hallucinated agronomy

This layer is LANGUAGE + REASONING ONLY.
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from openai import OpenAI

# -------------------------------------------------
# OpenAI Client
# -------------------------------------------------
# Get API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = None

if OPENAI_API_KEY:
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize OpenAI client: {e}")
        client = None
else:
    print("Warning: OPENAI_API_KEY environment variable is not set. OpenAI API will not be available.")

# -------------------------------------------------
# SYSTEM PROMPT (STRICT)
# -------------------------------------------------
SYSTEM_PROMPT = """
You are a constrained Agricultural Reasoning Assistant for Indian farmers.

MANDATORY RULES:
1. Use ONLY the information provided in the context.
2. Agronomic knowledge is LIMITED to ICAR and TNAU notes supplied.
3. DO NOT change numeric values or decisions given by the AI agent (if provided).
4. DO NOT invent new practices or chemicals.
5. Weather information is for REFERENCE and ALERTS ONLY.
6. DO NOT override AI agent decisions using weather data (if AI agent output is available).
7. Consider farmer history and avoid contradictory advice.
8. If data is insufficient or missing, provide GENERAL agricultural advice based on ICAR/TNAU knowledge.
9. Respect farmer preference (organic / conventional).
10. Respond in farmer's preferred language if specified.

IMPORTANT: Data Availability:
- If sensor data, ML outputs, or specific recommendations are marked as "not_available" or are empty/null, provide GENERAL agricultural guidance.
- Use available data when present, but don't require it to answer questions.
- Always provide helpful responses even with limited data.

Your responsibilities:
- Explain AI agent outputs clearly (when available)
- Use weather alerts to improve farmer awareness (when available)
- Generate short-term weather warnings (next 24 hours) (when weather data is available)
- Answer farmer questions using context and memory (or general knowledge if context is limited)
- Provide general agricultural advice when specific data is unavailable
"""

# -------------------------------------------------
# MEMORY BUILDER
# -------------------------------------------------
def build_memory_context(advisory_history: List[Dict], max_entries: int = 3) -> List[Dict]:
    """
    Extracts last N advisories to form short-term memory.
    Prevents overload and hallucination.
    """
    if not advisory_history:
        return []

    recent_entries = advisory_history[-max_entries:]
    memory_context = []

    for entry in recent_entries:
        # Handle different advisory formats
        if isinstance(entry, dict):
            date = entry.get("date") or entry.get("timestamp")
            # Extract summary from recommendations
            recommendations = entry.get("recommendations", [])
            summary_parts = []
            for rec in recommendations:
                if isinstance(rec, dict):
                    summary_parts.append(f"{rec.get('type', 'unknown')}: {rec.get('message', '')}")
            
            memory_context.append({
                "date": date,
                "summary": "; ".join(summary_parts) if summary_parts else entry.get("advisory", {}).get("summary", "")
            })

    return memory_context

# -------------------------------------------------
# MAIN REASONING FUNCTION
# -------------------------------------------------
def reasoning_agri_assistant(
    farmer_profile: Dict,
    field_context: Dict,
    ai_agent_output: Dict,
    approved_knowledge: Dict,
    weather_reference: Dict,
    advisory_history: List[Dict],
    farmer_question: Optional[str] = None
) -> str:
    """
    Executes the reasoning layer.

    Inputs:
    - farmer_profile: name, location, language, farming type
    - field_context: crop, stage, area
    - ai_agent_output: ML + rule decisions (FACTS)
    - approved_knowledge: ICAR/TNAU extracted notes
    - weather_reference: weather data for alerts
    - advisory_history: past advisories for this field
    - farmer_question: optional question from farmer

    Output:
    - Human-readable advisory / answer
    """
    # Check if OpenAI client is available
    if not client:
        error_msg = (
            "OpenAI API is not configured. Please set the OPENAI_API_KEY environment variable.\n\n"
            "To fix this:\n"
            "1. Get an API key from https://platform.openai.com/api-keys\n"
            "2. Set it as an environment variable:\n"
            "   - Windows (PowerShell): $env:OPENAI_API_KEY='sk-your-key-here'\n"
            "   - Windows (CMD): set OPENAI_API_KEY=sk-your-key-here\n"
            "   - Linux/Mac: export OPENAI_API_KEY='sk-your-key-here'\n"
            "3. Or create a .env file in the backend folder with: OPENAI_API_KEY=sk-your-key-here\n"
            "4. Restart the backend server"
        )
        return error_msg
    
    try:
        # Build controlled memory
        memory_context = build_memory_context(advisory_history)

        # Check data availability and mark missing data
        data_availability = {
            "sensor_data_available": bool(ai_agent_output.get("sensor_values")),
            "ml_recommendations_available": bool(ai_agent_output.get("recommendations")),
            "weather_data_available": bool(weather_reference.get("current")),
            "advisory_history_available": bool(memory_context)
        }

        # Construct payload for LLM with data availability flags
        user_payload = {
            "timestamp": datetime.now().isoformat(),
            "farmer_profile": farmer_profile,
            "field_context": field_context,
            "ai_agent_output": ai_agent_output if data_availability["ml_recommendations_available"] else {"note": "ML/AI agent output not available - provide general advice"},
            "approved_knowledge": approved_knowledge,
            "recent_memory": memory_context if data_availability["advisory_history_available"] else [],
            "weather_reference": weather_reference if data_availability["weather_data_available"] else {"note": "Weather data not available"},
            "farmer_question": farmer_question,
            "data_availability": data_availability,
            "instruction": "Use available data when present. If data is marked as not available, provide general agricultural advice based on ICAR/TNAU knowledge and the farmer's question."
        }

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False, indent=2)}
            ],
            temperature=0.2,
            max_tokens=1000
        )

        return response.choices[0].message.content
    except Exception as e:
        # Log the error for debugging
        error_type = type(e).__name__
        error_details = str(e)
        
        # Provide more helpful error messages
        if "api_key" in error_details.lower() or "authentication" in error_details.lower():
            error_msg = (
                f"OpenAI API authentication failed. Please check your API key.\n\n"
                f"Error: {error_type}: {error_details}\n\n"
                f"To fix:\n"
                f"1. Verify your API key at https://platform.openai.com/api-keys\n"
                f"2. Make sure the key is set correctly: OPENAI_API_KEY=sk-your-key-here\n"
                f"3. Check if your OpenAI account has credits\n"
                f"4. Restart the backend server"
            )
        elif "rate limit" in error_details.lower():
            error_msg = (
                f"OpenAI API rate limit exceeded. Please try again in a moment.\n\n"
                f"Error: {error_type}: {error_details}"
            )
        else:
            error_msg = (
                f"OpenAI API error occurred.\n\n"
                f"Error Type: {error_type}\n"
                f"Error Details: {error_details}\n\n"
                f"Please check:\n"
                f"1. Your internet connection\n"
                f"2. OpenAI API status: https://status.openai.com/\n"
                f"3. Your API key and account credits"
            )
        
        return error_msg

