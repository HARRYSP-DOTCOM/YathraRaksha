import sys
import os

# Add the backend directory to the Python path
# This allows imports like 'from app.config import settings' to work
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.append(backend_path)

# Import the FastAPI app from backend/main.py
try:
    from main import app
except ImportError:
    # If the above fails, try adding backend directly to path
    sys.path.append(backend_path)
    from main import app

# Vercel looks for the 'app' or 'handler' variable
# In FastAPI, the app instance is the handler
