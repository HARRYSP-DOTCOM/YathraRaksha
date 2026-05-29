from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import ai, audit, auth, captcha, chatbot, complaints, contractors, media, roads


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description="RoadWatch / YatraRaksha REST API — Python (FastAPI) backend for hackathon demos.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_prefix

app.include_router(auth.router, prefix=prefix)
app.include_router(captcha.router, prefix=prefix)
app.include_router(complaints.router, prefix=prefix)
app.include_router(roads.router, prefix=prefix)
app.include_router(contractors.router, prefix=prefix)
app.include_router(audit.router, prefix=prefix)
app.include_router(media.router, prefix=prefix)
app.include_router(ai.router, prefix=prefix)
app.include_router(chatbot.router, prefix=prefix)

upload_dir = Path(__file__).parent / settings.media_upload_dir
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=[".venv", "venv", "uploads", "*.db"],
    )
