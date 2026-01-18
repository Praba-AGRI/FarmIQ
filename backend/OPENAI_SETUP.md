# OpenAI API Setup Guide

## Why OpenAI API is Required

The AI Reasoning Layer uses OpenAI's GPT-4o-mini model to:
- Generate human-readable explanations of AI recommendations
- Answer farmer questions about agricultural practices
- Provide context-aware responses based on field data, weather, and history

## Setup Instructions

### Step 1: Get Your OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)
5. **Important**: Save it immediately - you won't be able to see it again!

### Step 2: Set the Environment Variable

#### Option A: Using .env file (Recommended)

1. Create a file named `.env` in the `backend` folder
2. Add this line:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. Replace `sk-your-actual-api-key-here` with your actual API key
4. The `.env` file is automatically loaded by the backend

#### Option B: Set Environment Variable Directly

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="sk-your-actual-api-key-here"
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY='sk-your-actual-api-key-here'
```

### Step 3: Restart the Backend Server

After setting the environment variable, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Verify It's Working

1. Open the chat interface in your application
2. Ask a question like "Why do I need to irrigate?"
3. You should receive a response from the AI Reasoning Assistant

If you see an error message about the API key, double-check:
- The API key is correct (starts with `sk-`)
- The environment variable is set correctly
- The backend server was restarted after setting the variable

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable is required"

**Solution:**
- Make sure you've set the `OPENAI_API_KEY` environment variable
- If using `.env` file, ensure it's in the `backend` folder
- Restart the backend server after setting the variable

### Error: "OpenAI API authentication failed"

**Possible causes:**
1. Invalid API key - verify it at https://platform.openai.com/api-keys
2. API key has been revoked or deleted
3. Account has no credits

**Solution:**
- Check your API key at https://platform.openai.com/api-keys
- Verify your account has credits at https://platform.openai.com/usage
- Generate a new API key if needed

### Error: "OpenAI API rate limit exceeded"

**Solution:**
- Wait a few moments and try again
- Check your usage limits at https://platform.openai.com/usage
- Consider upgrading your OpenAI plan if you need higher limits

### Error: "No sensor data found for this field"

**This is a different issue:**
- This means your field doesn't have sensor data yet
- The AI Reasoning Layer will still work, but with default values
- To fix: Send sensor data to your field using the sensor API endpoint

## Cost Information

- **Model Used**: GPT-4o-mini (cost-effective)
- **Typical Cost**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Average Request**: ~500-1000 tokens per chat message
- **Estimated Cost**: Very low for typical usage (pennies per conversation)

Monitor your usage at: https://platform.openai.com/usage

## Security Notes

⚠️ **IMPORTANT**: Never commit your `.env` file or API key to version control!

- The `.env` file should be in `.gitignore`
- Never share your API key publicly
- If your key is exposed, revoke it immediately and generate a new one

## Need Help?

- OpenAI API Documentation: https://platform.openai.com/docs
- OpenAI Status: https://status.openai.com/
- Check backend logs for detailed error messages

