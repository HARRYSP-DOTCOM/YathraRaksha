from app.config import settings
print(f"GEMINI_MODEL: {settings.gemini_model}")
print(f"GEMINI_API_KEY set: {bool(settings.gemini_api_key)}")
