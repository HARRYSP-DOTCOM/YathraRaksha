"""
Vercel serverless entry — mounts FastAPI app from backend/main.py.
Must export `app` for @vercel/python ASGI handler.
"""
import os
import sys

backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app  # noqa: E402

__all__ = ["app"]
