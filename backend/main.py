import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import Road
from app.routers import accountability, ai, ai_chat, alerts, audit, auth, chatbot, complaints, contractors, data, media, roads, sla
from app.services.data_ingestion import refresh_road_data
from app.services.escalation_service import run_escalation_sweep


async def escalation_loop():
    while True:
        await asyncio.sleep(900)  # 15 minutes
        db = SessionLocal()
        try:
            run_escalation_sweep(db)
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # SQLite lightweight migration to add columns to an existing table if they don't exist
    with engine.begin() as conn:
        inspector = inspect(engine)
        if "complaints" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("complaints")]
            if "escalation_level" not in columns:
                conn.execute(text("ALTER TABLE complaints ADD COLUMN escalation_level INTEGER DEFAULT 0"))
            if "sla_deadline" not in columns:
                conn.execute(text("ALTER TABLE complaints ADD COLUMN sla_deadline DATETIME NULL"))

    with SessionLocal() as db:
        if settings.open_data_refresh_on_startup or not db.query(Road).first():
            refresh_road_data(db)
                
    # Launch escalation background worker
    task = asyncio.create_task(escalation_loop())
    yield
    # Shutdown background task gracefully
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.app_name,
    description="RoadWatch / YatraRaksha REST API — Python (FastAPI) backend for hackathon demos.",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
allow_all_origins = "*" in origins
if allow_all_origins:
    cors_allow_origins = ["*"]
    cors_allow_credentials = False
else:
    cors_allow_origins = origins
    cors_allow_credentials = settings.allow_credentials

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_prefix

app.include_router(auth.router, prefix=prefix)
app.include_router(complaints.router, prefix=prefix)
app.include_router(roads.router, prefix=prefix)
app.include_router(contractors.router, prefix=prefix)
app.include_router(audit.router, prefix=prefix)
app.include_router(data.router, prefix=prefix)
app.include_router(media.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)
app.include_router(chatbot.router, prefix=prefix)
app.include_router(ai_chat.router, prefix=prefix)
app.include_router(sla.router, prefix=prefix)
app.include_router(alerts.router, prefix=prefix)
app.include_router(accountability.router, prefix=prefix)

upload_dir = Path(__file__).parent / settings.media_upload_dir
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

frontend_dir = Path(__file__).resolve().parent.parent


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "api": settings.api_prefix,
        "health": f"{settings.api_prefix}/health",
    }


@app.get(f"{settings.api_prefix}/health")
def health():
    return {"status": "ok", "backend": "python", "framework": "fastapi"}

if not os.environ.get("VERCEL") and (frontend_dir / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


@app.get("/{full_path:path}")
async def spa_catchall(full_path: str):
    if os.environ.get("VERCEL"):
        raise HTTPException(status_code=404, detail="Not found")
    if full_path.startswith(settings.api_prefix.strip("/")) or full_path.startswith("uploads"):
        raise HTTPException(status_code=404, detail="Not found")
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=[".venv", "venv", "uploads", "*.db"],
    )
