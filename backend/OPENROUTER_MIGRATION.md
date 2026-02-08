# OpenRouter Migration Guide

This document describes the migration from OpenAI to OpenRouter SDK for the AI reasoning layer.

## Changes Made

### 1. Replaced OpenAI SDK with OpenRouter (HTTP Client)

**Files Modified:**
- `backend/services/reasoning_layer.py`
- `backend/services/weather_ai_service.py`
- `backend/routes/ai.py`
- `backend/requirements.txt`

### 2. Key Changes

#### Environment Variable
- **Old:** `OPENAI_API_KEY`
- **New:** `OPENROUTER_API_KEY`

#### API Client
- **Old:** `OpenAI(api_key=OPENAI_API_KEY)`
- **New:** `httpx.AsyncClient` with OpenRouter API endpoint

#### Model
- **Old:** `gpt-4o-mini` / `gpt-3.5-turbo`
- **New:** `deepseek/deepseek-v3.2`

#### API Calls
- **Old:** Synchronous `client.chat.completions.create()`
- **New:** Async streaming with `client.stream()` to capture reasoning tokens

### 3. Streaming Implementation

The new implementation uses streaming to:
- Get real-time response chunks
- Capture reasoning tokens from usage information
- Maintain async compatibility with FastAPI

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit https://openrouter.ai/keys
2. Create an account or sign in
3. Generate a new API key
4. Copy the key (starts with `sk-or-`)

### 2. Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY="sk-or-your-key-here"
```

**Windows (CMD):**
```cmd
set OPENROUTER_API_KEY=sk-or-your-key-here
```

**Linux/Mac:**
```bash
export OPENROUTER_API_KEY='sk-or-your-key-here'
```

**Or in `.env` file:**
```
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_HTTP_REFERER=https://your-domain.com  # Optional
OPENROUTER_APP_NAME=FarmIQ AI Assistant  # Optional
```

### 3. Install Dependencies

The `httpx` package is already in `requirements.txt`. Install with:

```bash
pip install -r requirements.txt
```

### 4. Restart Backend Server

After setting the environment variable, restart your backend server:

```bash
python start_server.py
# or
uvicorn app:app --reload
```

## API Differences

### Request Format

**OpenAI (Old):**
```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    temperature=0.2,
    max_tokens=1000
)
content = response.choices[0].message.content
```

**OpenRouter (New):**
```python
async with client.stream(
    "POST",
    "/chat/completions",
    json={
        "model": "deepseek/deepseek-v3.2",
        "messages": [...],
        "temperature": 0.2,
        "max_tokens": 1000,
        "stream": True
    }
) as response:
    # Process streaming chunks
    async for line in response.aiter_lines():
        # Extract content and usage tokens
```

### Response Format

OpenRouter returns streaming chunks in Server-Sent Events (SSE) format:
```
data: {"choices": [{"delta": {"content": "..."}}], "usage": {"reasoning_tokens": 123}}
```

## Benefits of OpenRouter

1. **Access to Multiple Models**: OpenRouter provides access to various AI models including DeepSeek, Claude, GPT-4, etc.
2. **Reasoning Tokens**: DeepSeek models provide reasoning tokens in usage information
3. **Cost Efficiency**: Often more cost-effective than direct OpenAI API
4. **Unified API**: Single API for multiple model providers

## Troubleshooting

### Error: "OPENROUTER_API_KEY environment variable is not set"

**Solution:**
- Verify the environment variable is set correctly
- Check that the variable name is `OPENROUTER_API_KEY` (not `OPENAI_API_KEY`)
- Restart the backend server after setting the variable

### Error: "OpenRouter API authentication failed"

**Solution:**
1. Verify your API key at https://openrouter.ai/keys
2. Ensure the key starts with `sk-or-`
3. Check if your OpenRouter account has credits
4. Verify the key is set correctly: `OPENROUTER_API_KEY=sk-or-your-key-here`

### Error: "Rate limit exceeded"

**Solution:**
- Wait a moment and try again
- Check your OpenRouter account limits
- Consider upgrading your plan if needed

### Streaming Issues

If streaming doesn't work:
- Check network connectivity
- Verify the API key has streaming permissions
- Check OpenRouter API status: https://openrouter.ai/

## Model Selection

The current implementation uses `deepseek/deepseek-v3.2`. You can change this by modifying the `model` parameter in:

- `backend/services/reasoning_layer.py` (line ~175)
- `backend/services/weather_ai_service.py` (line ~302)

Available models on OpenRouter:
- `deepseek/deepseek-v3.2` (current)
- `openai/gpt-4o-mini`
- `anthropic/claude-3-haiku`
- And many more...

## Migration Checklist

- [x] Replace OpenAI client with OpenRouter HTTP client
- [x] Update environment variable name
- [x] Implement streaming API calls
- [x] Update error messages
- [x] Update weather AI service
- [x] Update requirements.txt
- [ ] Set `OPENROUTER_API_KEY` environment variable
- [ ] Test recommendations endpoint
- [ ] Test chat endpoint
- [ ] Test weather AI service
- [ ] Monitor API usage and costs

## Additional Resources

- OpenRouter Documentation: https://openrouter.ai/docs
- OpenRouter Models: https://openrouter.ai/models
- OpenRouter API Keys: https://openrouter.ai/keys

---

**Last Updated:** January 2024
**Version:** 1.0
