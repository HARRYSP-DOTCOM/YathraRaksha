# RoadWatch / YatraRaksha

RoadWatch is a Progressive Web App for road safety monitoring, with a static frontend and a Python FastAPI backend. The project supports offline use, complaint submission, media upload, infrastructure insight, and server-side analysis.

## Overview

The frontend is a static PWA built with HTML, CSS, and JavaScript. The backend uses FastAPI and SQLite for local data persistence and provides a REST API for the app.

Key capabilities:
- Complaint submission and offline queueing
- Road and contractor data retrieval
- Media uploads for supporting evidence
- AI-assisted analysis endpoint
- PWA installability and offline fallback handling

## Government data (`/data`)

Real datasets (NHAI, MoRTH, CAG, PMGSY) live under [`data/`](data/). The API serves them at `/v1/*`; the build also copies `data/` to `public/data/` for direct static fetch.

| File | Use |
|------|-----|
| `01_ai_road_defect_data.json` | AI Analyzer — defect classes, benchmarks |
| `02_contractors_data.json` | Contractor Registry |
| `03_tenders_data.json` | Tender Registry |
| `04_roads_map_data.json` | Map — NHs, expressways, Kerala GPS |
| `05_budget_audit_data.json` | Audit Ledger — budget + CAG findings |
| `06_complaints_sample_data.json` | Seed complaints (Kannur, NH-66) |
| `india_accidents_2023.json` | Accident heatmap / route risk |
| `india_nh_data.json` | Extended NH records |
| `india_contractors_cag.json` | CAG-flagged contractors |
| `india_road_budget.json` | NHAI capex + MoRTH allocation |
| `road_wise_accidents_2023.csv` | Per-road accident counts |

> **Data attribution:** NHAI Annual Report 2023-24 · MoRTH Annual Report 2023-24 · Union Budget 2024-25 · CAG Report No.14/2023 · MoRTH Road Accidents in India 2023 · PMGSY OMMS. AI defect model trained on RDD2022/CRDDC2022 (Osaka University / SEKILAB).

## Repository Structure

- `data/` — government road datasets (see above)
- `index.html` — main application shell
- `manifest.json` — PWA metadata
- `sw.js` — service worker logic
- `offline.html` — offline fallback page
- `css/` — styling resources
- `js/` — frontend application code
- `backend/` — FastAPI backend service
  - `main.py` — app initialization and router registration
  - `run.py` — local backend launch script
  - `requirements.txt` — Python dependencies
  - `app/` — backend package
    - `routers/` — API route modules
    - `services/` — background workers and business logic
    - `models.py` — SQLAlchemy models
    - `database.py` — database engine and session management
    - `config.py` — application settings and environment variables

## Requirements

- Python 3.10 or newer
- A modern browser with PWA support
- A shell for `./start.sh` on Windows (Git Bash, WSL, or similar)

## Quick start (v2.0)

```bash
# 1. Clone
git clone https://github.com/HARRYSP-DOTCOM/YathraRaksha.git
cd YathraRaksha

# 2. Backend setup
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set GROQ_API_KEY=<your key>
python download_model.py
python run.py
# API at http://127.0.0.1:8000

# 3. Frontend (new terminal, repo root)
cd ..
python -m http.server 5500
# Open http://127.0.0.1:5500

# 4. Install as PWA — Chrome/Edge install icon, or Safari Share → Add to Home Screen
```

## Installation

### Clone the repository

```bash
git clone https://github.com/HARRYSP-DOTCOM/YathraRaksha.git
cd YathraRaksha
```

### Set up the backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# Windows CMD
.venv\Scripts\activate.bat

# macOS / Linux
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
python download_model.py
```

### Optional configuration

The backend reads optional settings from a `.env` file located in `backend/`.

Example `.env`:

```env
APP_NAME=YatraRaksha API
API_PREFIX=/v1
SECRET_KEY=replace-this-for-production
DATABASE_URL=sqlite:///./yatra_raksha.db
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
GROQ_API_KEY=
OPEN_DATA_REFRESH_ON_STARTUP=False
```

### Start the backend

From `backend/`:

```bash
python run.py
```

Access the backend at:
- `http://127.0.0.1:8000`
- `http://127.0.0.1:8000/docs`

### Start the frontend

From the project root:

```bash
python -m http.server 5500
```

Then open:
- `http://127.0.0.1:5500`

The frontend is configured to use the backend API at `http://127.0.0.1:8000/v1` in development.

> For production/Vercel deployments, the frontend expects the backend to be reachable from the same origin under `/v1`, or you must set a production API URL in `js/config-env.js` and allow it in `vercel.json`.
> If you deploy new frontend code and still see stale behavior, refresh the browser and clear the PWA service worker cache.

### Start both services together

From the repository root, use the provided startup script:

```bash
./start.sh
```

This starts the frontend on port `5500` and the backend on port `8000`. Use `Ctrl+C` to stop both services.

## Windows setup

If you prefer not to use the shell script, run the backend and frontend separately.

Backend in PowerShell:
``powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py


Frontend in another terminal:

```powershell
cd e:\roadwatch
python -m http.server 5500
```

Then open `http://127.0.0.1:5500`.

## API Endpoints

The backend exposes these core routes under `/v1`:

- `POST /v1/complaints` — submit a road complaint
- `GET /v1/roads` — retrieve road data
- `GET /v1/contractors` — retrieve contractor information
- `GET /v1/audit/budget` — view budget audit data
- `POST /v1/media/upload` — upload media files
- `POST /v1/ai/analyze` — request AI analysis
- `GET /v1/health` — health check endpoint

The backend also exposes uploaded media files under `/uploads`.

## Features

- PWA install support
- Offline caching and fallback page
- Local complaint queueing when the network is unavailable
- Media upload handling
- Road data and contractor analytics
- Server-side analysis endpoint for additional processing

## Development notes

- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: static HTML, CSS, and JavaScript
- The project is intended as a demo/proof of concept and is suitable for local development

## Notes

- If you modify backend ports or origins, update `backend/app/config.py` or use the `.env` file.
- The frontend assumes the API prefix is `/v1` and the API is available from `localhost`.
- For production, replace the default secret key and choose a production database.
