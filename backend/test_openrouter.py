import os
import requests
import json
from dotenv import load_dotenv

def test_openrouter():
    load_dotenv()
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    MODEL_NAME = "meta-llama/llama-3.3-70b-instruct:free"
    
    print(f"Testing OpenRouter with model: {MODEL_NAME}")
    print(f"API Key (first 10 chars): {api_key[:10]}...")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": "Say 'Migration Successful' if you can hear me."}
        ],
        "reasoning": {"enabled": True}
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Full Response: {json.dumps(result, indent=2)}")
            message = result['choices'][0]['message']
            content = message.get('content')
            reasoning = message.get('reasoning_details')
            print(f"Content: {content}")
            print(f"Reasoning: {reasoning}")
            
            if content and "Migration Successful" in content:
                print("✅ CONNECTIVITY TEST PASSED")
            elif content or reasoning:
                print("✅ CONNECTIVITY TEST PASSED (Received response or reasoning)")
            else:
                print("⚠️ RECEIVED EMPTY CONTENT AND REASONING")
        else:
            print(f"❌ TEST FAILED: {response.text}")
    except Exception as e:
        print(f"❌ ERROR DURING TEST: {e}")

if __name__ == "__main__":
    test_openrouter()
