# RoadWatch (YatraRaksha)

AI-powered road safety PWA with a **Python (FastAPI)** backend for hackathon demos.

## Quick start

### Start Both (Recommended)

To start both the frontend and the backend automatically using a single script:

```bash
./start.sh
```

This will spin up the backend API on port `8000` and the frontend server on port `5500`, and gracefully shut both down when you press `Ctrl+C`.

### 1. Backend (Python)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python run.py
```

API: [http://127.0.0.1:8000](http://127.0.0.1:8000) · Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend (static)

Serve the project root with any static server, for example:

```bash
# From repo root (Python 3)
python -m http.server 5500
```

Open [http://127.0.0.1:5500](http://127.0.0.1:5500). When the page is served from `localhost` or `127.0.0.1`, the app automatically calls the API at `http://127.0.0.1:8000/v1`.

### Install as PWA

1. Open the site in **Chrome** or **Edge** (use `http://127.0.0.1:5500`, not `file://`).
2. Click **Install App** in the sidebar, or use the browser install icon in the address bar.
3. On **iPhone**: Safari → Share → **Add to Home Screen**.

The app works **offline** for the dashboard shell; complaints queue locally and sync when online.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/complaints` | File complaint |
| GET | `/v1/roads` | Road infrastructure data |
| GET | `/v1/contractors` | Contractor rankings |
| GET | `/v1/audit/budget` | Budget audit |
| POST | `/v1/media/upload` | Media upload |
| POST | `/v1/ai/analyze` | Server-side AI analysis |

Stack: **FastAPI**, **SQLAlchemy** (SQLite), **JWT** auth.
