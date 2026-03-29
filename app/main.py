import os
import sys
import argparse
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app import paths
from app.services.heartbeat import start_monitor
from app.routers import stats, system, videos, youtube, playlists

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(paths.DATA_DIR, exist_ok=True)
    os.makedirs(paths.DATA_DIR / "temp", exist_ok=True)
    start_monitor()
    yield


app = FastAPI(lifespan=lifespan)


# Dynamic thumbnail server instead of static mount
@app.get("/thumbs/{path:path}")
async def serve_thumbnail(path: str):
    file_path = paths.DATA_DIR / path
    if file_path.exists():
        return FileResponse(file_path)
    return HTMLResponse("Not Found", status_code=404)


# Serve static files - in development from ./static, in frozen from bundled resources
if getattr(sys, "frozen", False):
    # When running as exe, static files should be bundled
    static_dir = os.path.join(sys._MEIPASS, "static")
else:
    static_dir = "static"

app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(stats.router)
app.include_router(system.router)
app.include_router(videos.router)
app.include_router(youtube.router, prefix="/api")
app.include_router(playlists.router)


@app.get("/")
def serve_html():
    if getattr(sys, "frozen", False):
        html_path = os.path.join(sys._MEIPASS, "static", "index.html")
    else:
        html_path = "static/index.html"
        if not os.path.exists(html_path):
            html_path = "bijoy-typer-combined.html"
            if not os.path.exists(html_path):
                return HTMLResponse("<h1>Error: HTML not found.</h1>")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bangla Typer Server")
    parser.add_argument(
        "--port", type=int, default=8000, help="Port to run the server on"
    )
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    args = parser.parse_args()

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port)
