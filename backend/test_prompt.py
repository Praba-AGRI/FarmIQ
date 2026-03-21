import asyncio
import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

raw_ml_data = {
    "crop": "Rice",
    "stage": "flowering",
    "current_temp": 32,
    "current_humidity": 60,
    "soil_moisture": 50,
    "irrigation_prob": 0.8,
    "disease_risk": "Moderate",
    "nutrient_npk": [10, 5, 5]
}

system_prompt = f"""
You are the Chief Agronomist for FarmIQ, a state-of-the-art precision agriculture system. 
Your job is to translate raw IoT sensor data and ML predictions into expert, highly specific, and actionable advice for a farmer.

CRITICAL RULES FOR REASONING:
1. USE THE EXACT NUMBERS: Never use generic phrases like "moisture is low". You must cite the specific numbers provided in the payload (e.g., "Soil moisture has dropped to 50.0% while atmospheric demand is 6.8mm").
2. EXPLAIN THE BIOLOGY: Connect the sensor data to the specific crop and its current growth stage. Explain *why* the crop needs this action right now. (e.g., "Rice in the flowering stage requires optimal hydration to ensure proper grain filling. Water stress right now will permanently reduce your final yield.")
3. NO ROBOT SPEAK: Never say "The ML model analyzed..." or "The Bi-LSTM predicted...". Farmers do not care about the algorithm; they care about the farm. Speak directly about the soil, weather, and plants.
4. BILINGUAL OUTPUT: You must provide the exact same reasoning in both English and natural, conversational Tamil.
5. TONE: Authoritative, empathetic, clear, and scientifically accurate.

=== CURRENT REAL-TIME ML DATA ===
{json.dumps(raw_ml_data, indent=2)}

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include any text outside the JSON brackets.
{{
  "overall_summary_en": "A punchy, 2-sentence executive summary of the field's health, urgent risks, and required actions for today in English.",
  "overall_summary_ta": "The exact same executive summary translated into clear agricultural Tamil.",
  "irrigation_en": "A 3-sentence agronomic explanation in English of exactly why water is/isn't needed today, citing specific ETc and moisture numbers.",
  "irrigation_ta": "The exact same irrigation explanation translated into clear agricultural Tamil.",
  "nutrients_en": "A 3-sentence explanation in English linking the specific NPK requirements to the current biological growth stage.",
  "nutrients_ta": "The exact same nutrient explanation translated into clear agricultural Tamil.",
  "pest_en": "A 2-sentence risk assessment in English based on the current temperature and humidity micro-climate.",
  "pest_ta": "The exact same pest explanation translated into clear agricultural Tamil."
}}
"""

async def main():
    try:
        completion = await client.chat.completions.create(
            model="meta/llama-3.3-70b-instruct",
            messages=[{"role": "user", "content": system_prompt}],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
            stream=False
        )
        content = completion.choices[0].message.content.strip()
        print("RAW CONTENT:")
        print(content)
        
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            clean_content = json_match.group(0)
            print("EXTRACTION SUCCESSFUL")
        else:
            clean_content = content
            print("NO EXTRACTION")
            
        json_data = json.loads(clean_content)
        print("PARSE SUCCESSFUL")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
