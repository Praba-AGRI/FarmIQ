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
from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError

# -------------------------------------------------
# OpenRouter Client
# -------------------------------------------------
# Get API key from environment variable
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = None

if OPENROUTER_API_KEY:
    try:
        # OpenRouter client using OpenAI SDK
        client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            default_headers={
                 "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", ""),
                 "X-Title": os.getenv("OPENROUTER_APP_NAME", "FarmIQ AI Assistant"),
            }
        )
    except Exception as e:
        print(f"Warning: Failed to initialize OpenRouter client: {e}")
        client = None
else:
    print("Warning: OPENROUTER_API_KEY environment variable is not set. OpenRouter API will not be available.")

# -------------------------------------------------
# SYSTEM PROMPT (STRICT)
# -------------------------------------------------
SYSTEM_PROMPT = """
You are a helpful and friendly Agricultural Assistant for Indian farmers.

Your goal is to explain things simply and clearly.

GUIDELINES FOR YOUR ANSWERS:
1.  **Be Friendly and Respectful**: Start with a polite greeting (e.g., "Hello!", "Namaste!").
2.  **Simple Language**: Avoid technical jargon. Use simple words that are easy to understand.
3.  **Clear Formatting**:
    *   Use **Bold** for important numbers or actions.
    *   Use Bullet points for lists.
    *   Keep paragraphs short.
4.  **Structure**:
    *   **Observation**: What did the sensors or AI find? (e.g., "The soil is dry.")
    *   **Action**: What should the farmer do? (e.g., "Irrigate 2 inches of water.")
    *   **Why**: Briefly explain the reason. (e.g., "The crop needs water to grow.")
    *   **Timing**: When should they do it? (e.g., "Do this within 6 hours.")
5.  **Language**: Respond in the farmer's preferred language if specified. Otherwise, use simple English.

MANDATORY RULES:
1.  Use ONLY the provided context. Do NOT invent information.
2.  Agronomic knowledge is LIMITED to the provided ICAR/TNAU notes.
3.  DO NOT change numeric values given by the AI agent.
4.  If data is missing, give GENERAL advice and mention what data is missing nicely.
5.  Respect organic/conventional farming preferences.

Your responsibilities:
- Explain recommendations clearly.
- Answer farmer questions using the context.
- Be a helpful companion to the farmer.
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
async def reasoning_agri_assistant(
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
    # Check if OpenRouter client is available
    if not client:
        error_msg = (
            "OpenRouter API is not configured. Please set the OPENROUTER_API_KEY environment variable.\n\n"
            "To fix this:\n"
            "1. Get an API key from https://openrouter.ai/keys\n"
            "2. Set it as an environment variable:\n"
            "   - Windows (PowerShell): $env:OPENROUTER_API_KEY='sk-or-your-key-here'\n"
            "   - Windows (CMD): set OPENROUTER_API_KEY=sk-or-your-key-here\n"
            "   - Linux/Mac: export OPENROUTER_API_KEY='sk-or-your-key-here'\n"
            "3. Or create a .env file in the backend folder with: OPENROUTER_API_KEY=sk-or-your-key-here\n"
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

        # Call OpenRouter API with OpenAI SDK
        response = await client.chat.completions.create(
            model="openai/gpt-oss-120b:free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False, indent=2)}
            ],
            extra_body={"reasoning": {"enabled": True}},
        )
        
        # Extract the assistant message
        message = response.choices[0].message
        response_content = message.content

        # Note: reasoning_details might be available in message.reasoning_details if supported by model/SDK version
        # We process response_content primarily
        return response_content

    except Exception as e:
        # Log the error for debugging
        error_type = type(e).__name__
        error_details = str(e)
        
        # Provide more helpful error messages
        if "api_key" in error_details.lower() or "authentication" in error_details.lower() or "401" in error_details:
             error_msg = (
                f"OpenRouter API authentication failed. Please check your API key.\n\n"
                f"Error: {error_type}: {error_details}\n\n"
                f"To fix:\n"
                f"1. Verify your API key at https://openrouter.ai/keys\n"
                f"2. Make sure the key is set correctly: OPENROUTER_API_KEY=sk-or-your-key-here\n"
                f"3. Check if your OpenRouter account has credits\n"
                f"4. Restart the backend server"
            )
        elif "rate limit" in error_details.lower() or "429" in error_details:
             error_msg = (
                f"OpenRouter API rate limit exceeded. Please try again in a moment.\n\n"
                f"Error: {error_type}: {error_details}"
            )
        else:
             error_msg = (
                f"OpenRouter API error occurred.\n\n"
                f"Error Type: {error_type}\n"
                f"Error Details: {error_details}\n\n"
                f"Please check:\n"
                f"1. Your internet connection\n"
                f"2. OpenRouter API status: https://openrouter.ai/\n"
                f"3. Your API key and account credits"
            )
        
        return error_msg


