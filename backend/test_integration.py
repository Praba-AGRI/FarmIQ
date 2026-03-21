import os
from openai import OpenAI
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

def run_tests():
    print("1. Testing NVIDIA Client Init & Request...")
    
    # We use the key provided in .env
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
    print(f"   Using key: {NVIDIA_API_KEY[:10]}...")
    
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY
    )
    print("   Success! Client initialized.")
    
    try:
        completion = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": "Say 'Test Successful'."}],
            temperature=0.2,
            max_tokens=20
        )
        print("   LLM Response:", completion.choices[0].message.content.strip())
        print("   Success! NVIDIA API is returning valid completions.")
    except Exception as e:
        print("   Error calling NVIDIA:", e)

    print("\n2. Twilio Validation...")
    try:
        TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
        TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
        
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
             print("   Skipped: Twilio credentials not found in environment.")
        else:
             twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
             print("   Success! Twilio Client Configured.")
    except Exception as e:
        print("   Error setting up Twilio:", e)

if __name__ == "__main__":
    run_tests()
