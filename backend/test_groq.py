import os
from groq import Groq
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def test_groq():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("❌ ERROR: GROQ_API_KEY environment variable is not set.")
        print("   -> Check your .env file in the backend folder.")
        return

    print(f"🔍 Found API Key (starts with: {api_key[:7]}...)")
    
    if "your_groq_api_key_here" in api_key:
        print("❌ ERROR: You are still using the placeholder key. Please paste your REAL key into .env.")
        return

    client = Groq(api_key=api_key)
    
    print("📡 Connecting to Groq API (api.groq.com)...")
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say hello!"}],
            model="llama-3.3-70b-versatile", # Testing with the specific model used in the app
        )
        print("✅ SUCCESS! Groq responded:")
        print(f"  > {chat_completion.choices[0].message.content}")
    except Exception as e:
        print("❌ FAILED: Groq connection failed.")
        print("-" * 50)
        print(f"Error type: {type(e).__name__}")
        print(f"Error details: {e}")
        print("-" * 50)
        
        if "Connection error" in str(e):
            print("\n💡 ADVICE: This is a network issue.")
            print("1. Check your internet connection.")
            print("2. If you are behind a VPN or Proxy, either turn it off or configure HTTP_PROXY/HTTPS_PROXY env variables.")
            print("3. Check if api.groq.com is reachable from your browser.")

if __name__ == "__main__":
    test_groq()
