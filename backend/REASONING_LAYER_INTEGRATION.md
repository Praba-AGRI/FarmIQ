# Reasoning Layer Integration Guide

## Overview

The reasoning layer has been successfully integrated into the backend. This layer acts as a constrained agricultural assistant that explains AI agent decisions, answers farmer questions, and uses farmer + field memory with ICAR/TNAU knowledge.

## What Was Changed

### 1. New Files Created

- **`backend/services/reasoning_layer.py`**: The main reasoning layer service that uses OpenAI GPT-4o-mini to generate human-readable advisories
- **`backend/data/knowledge_base.json`**: Approved knowledge base containing ICAR/TNAU notes

### 2. Files Modified

- **`backend/routes/ai.py`**: Updated to use the reasoning layer instead of mock responses
- **`backend/requirements.txt`**: Added `openai>=1.0.0` dependency

### 3. Key Features

- **Memory-Aware**: Uses last 3 advisories to build context and avoid contradictory advice
- **Constrained**: Only uses provided ICAR/TNAU knowledge, no hallucinated agronomy
- **Language Support**: Responds in farmer's preferred language
- **Weather Integration**: Uses weather data for alerts and awareness
- **Question Answering**: Handles farmer questions about recommendations

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variable

Create a `.env` file in the `backend` directory (or set system environment variable):

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Important**: You need an OpenAI API key. Get one from https://platform.openai.com/api-keys

### 3. Update Knowledge Base

Edit `backend/data/knowledge_base.json` to add more ICAR/TNAU approved knowledge:

```json
{
  "approved_knowledge": {
    "source": ["ICAR", "TNAU"],
    "notes": [
      "Your approved knowledge notes here",
      "More notes..."
    ]
  }
}
```

## How It Works

### Flow Diagram

```
1. Farmer requests recommendations
   ↓
2. Backend gets AI agent output (ML/rule-based decisions)
   ↓
3. Backend collects:
   - Farmer profile (name, location, language, farming type)
   - Field context (crop, stage, area)
   - Sensor data (current readings)
   - Weather data (current + alerts)
   - Advisory history (last 3 advisories)
   - Approved knowledge (ICAR/TNAU notes)
   ↓
4. Reasoning layer formats data and calls OpenAI API
   ↓
5. OpenAI generates human-readable advisory
   ↓
6. Response returned to farmer
```

### API Endpoints

#### 1. Get Recommendations
```
POST /api/fields/{field_id}/recommendations
```
- Gets AI agent decisions
- Uses reasoning layer to generate advisory
- Returns structured recommendations with human-readable reasoning

#### 2. Chat Interface
```
POST /api/fields/{field_id}/chat
Body: { "message": "Why do you recommend irrigation?" }
```
- Accepts farmer questions
- Uses reasoning layer with question context
- Returns AI explanation

#### 3. Transparency Data
```
GET /api/fields/{field_id}/transparency
```
- Returns sensor values, crop stage, GDD
- Shows logic summary (not using reasoning layer, just data)

## Configuration

### OpenAI Model

Currently using `gpt-4o-mini`. To change, edit `backend/services/reasoning_layer.py`:

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",  # Change this to your preferred model
    ...
)
```

### Temperature

Set to `0.2` for more deterministic responses. Adjust in `reasoning_layer.py`:

```python
temperature=0.2  # Lower = more deterministic, Higher = more creative
```

### Max Tokens

Currently set to `1000`. Adjust if you need longer responses:

```python
max_tokens=1000  # Increase for longer responses
```

### Memory Context

Controls how many past advisories are used. Edit `build_memory_context` function:

```python
def build_memory_context(advisory_history: List[Dict], max_entries: int = 3):
    # Change max_entries to adjust memory size
```

## Error Handling

The reasoning layer includes error handling:

- If OpenAI API fails, returns a fallback error message
- If farmer profile not found, returns 404 error
- If sensor data unavailable, uses default values

## Testing

### Test Recommendations Endpoint

```bash
curl -X POST "http://localhost:8000/api/fields/{field_id}/recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Chat Endpoint

```bash
curl -X POST "http://localhost:8000/api/fields/{field_id}/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Why do you recommend irrigation?"}'
```

## Customization

### Adding More Knowledge

1. Edit `backend/data/knowledge_base.json`
2. Add more ICAR/TNAU notes to the `notes` array
3. Restart the backend server

### Modifying System Prompt

Edit the `SYSTEM_PROMPT` in `backend/services/reasoning_layer.py` to change the assistant's behavior.

### Integrating Real AI Agent

The `get_ai_agent_output()` function in `backend/routes/ai.py` currently uses mock data. Replace it with your actual AI agent/ML model:

```python
async def get_ai_agent_output(field_id: str, farmer_id: str, current_user: dict = None) -> dict:
    # Replace this with your actual AI agent API call
    # response = await your_ai_agent.get_recommendations(field_id, farmer_id)
    # return response
```

## Cost Considerations

- OpenAI API charges per token used
- `gpt-4o-mini` is cost-effective for this use case
- Monitor usage at https://platform.openai.com/usage
- Consider caching responses for frequently asked questions

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable is required"
- Set the `OPENAI_API_KEY` environment variable
- Or create a `.env` file in the `backend` directory

### Error: "AI reasoning assistant is temporarily unavailable"
- Check your OpenAI API key is valid
- Check your OpenAI account has credits
- Check internet connection

### Slow Responses
- OpenAI API calls take 1-3 seconds typically
- Consider adding caching for repeated queries
- Check your internet connection speed

## Next Steps

1. **Add Caching**: Cache common queries to reduce API calls
2. **Add Logging**: Log all reasoning layer calls for debugging
3. **Add Rate Limiting**: Prevent abuse of OpenAI API
4. **Add Monitoring**: Track API usage and costs
5. **Integrate Real AI Agent**: Replace mock `get_ai_agent_output()` with actual ML model

## Support

For issues or questions:
1. Check OpenAI API status: https://status.openai.com/
2. Review OpenAI API documentation: https://platform.openai.com/docs/
3. Check backend logs for detailed error messages

