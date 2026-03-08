"""
main.py — HireIt
Unified FastAPI backend + serves React frontend from frontend/dist
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

print("--- DEBUG: Environment Loading ---")
key = os.getenv("GROQ_API_KEY")
if key:
    print(f"GROQ_API_KEY found: {key[:7]}...")
else:
    print("GROQ_API_KEY NOT FOUND in os.environ")
print(f"Current Working Directory: {os.getcwd()}")
print("----------------------------------")

from routers import resume, jd, session, factcheck, zoom

app = FastAPI(title="HireIt", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ────────────────────────────────────────────────────────────────
app.include_router(resume.router,    prefix="/api/resume",   tags=["Resume"])
app.include_router(jd.router,        prefix="/api/jd",       tags=["JD"])
app.include_router(session.router,   prefix="/api/session",  tags=["Session"])
app.include_router(factcheck.router, prefix="/api/factcheck",tags=["Factcheck"])
app.include_router(zoom.router,      prefix="/api/zoom",     tags=["Zoom"])

# ── Serve built React frontend ─────────────────────────────────────────────────
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        index = DIST / "index.html"
        return FileResponse(index)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"status": "backend running", "frontend": "not built yet — run npm run build"}
