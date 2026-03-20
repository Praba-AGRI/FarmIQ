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

import asyncio
import json
import os
import requests
from datetime import datetime
from typing import List, Dict, Optional

# -------------------------------------------------
# OpenRouter Configuration
# -------------------------------------------------
# Get API key from environment variable
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "qwen/qwen3-coder:free"

# -------------------------------------------------
# SYSTEM PROMPT (STRICT)
# -------------------------------------------------
SYSTEM_PROMPT = """
You are a helpful and friendly Agricultural Assistant for Indian farmers.

Your goal is to explain things simply and clearly while maintaining a professional, expert tone.

GUIDELINES FOR YOUR ANSWERS:
1.  **No Greetings**: Do NOT include any greetings (Namaste, Hello, etc.) or conversational fluff. Start directly with the data.
2.  **Clear Structural Headers**: Use ONLY these standard markdown headers for consistency:
    - `### Action`: Direct recommendation steps.
    - `### Why (Reasoning)`: Science/logical basis.
    - `### Timing`: Explicit when-to-do-it instructions.
3.  **Visual Emphasis**:
    - Use **Bold** for ALL key numbers (e.g., **2 inches**, **6 hours**, **60-70%**).
    - Use bullet points for lists of sensor readings or steps.
4.  **Tone**: Professional yet encouraging. 
5.  **Language**: Respond in the farmer's preferred language.

MANDATORY RULES:
- Use provided facts ONLY.
- Respect organic/conventional farming preferences.
- DO NOT change values (mm, confidence, etc) provided by the agent.
- Keep the summary section strictly separated by these headers.
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
    Executes the reasoning layer using Gemini.

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

        # Call OpenRouter API
        prompt = f"""
        {SYSTEM_PROMPT}
        
        === CONTEXT DATA ===
        {json.dumps(user_payload, indent=2, ensure_ascii=False)}
        
        Please provide the advisory or answer the question based on the above context.
        """

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://farmiq.ai",
            "X-OpenRouter-Title": "FarmIQ Agricultural Assistant",
        }
        
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        try:
            response = await asyncio.to_thread(
                requests.post,
                url=OPENROUTER_URL,
                headers=headers,
                data=json.dumps(payload)
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                print(f"OpenRouter Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"OpenRouter reasoning error on {MODEL_NAME}: {e}")
            
        return "Advisory reasoning currently unavailable. Please check your OpenRouter API configuration."

    except Exception as e:
        print(f"Reasoning layer logic error: {e}")

