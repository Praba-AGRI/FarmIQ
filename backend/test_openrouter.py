import os
import requests
import json
from dotenv import load_dotenv

def test_openrouter():
    load_dotenv()
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/chat/completions"
    model = "qwen/qwen3-coder:free"
    
    print(f"Testing OpenRouter with model: {model}")
    print(f"API Key (first 10 chars): {api_key[:10]}...")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://farmiq.ai",
        "X-OpenRouter-Title": "FarmIQ Test Script",
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "Say 'Migration Successful' if you can hear me."}
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            print(f"Response Content: {content}")
            if "Migration Successful" in content:
                print("✅ CONNECTIVITY TEST PASSED")
            else:
                print("⚠️ TEST RETURNED UNEXPECTED CONTENT, BUT CONNECTIVITY IS OK")
        else:
            print(f"❌ TEST FAILED: {response.text}")
    except Exception as e:
        print(f"❌ ERROR DURING TEST: {e}")

if __name__ == "__main__":
    test_openrouter()
