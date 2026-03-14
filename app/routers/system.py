from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_db, reset_db_pool, init_db
from app.services.heartbeat import update_heartbeat
from app import paths
from app.routers.videos import clear_video_caches

router = APIRouter(prefix="/api")


class DataDirUpdate(BaseModel):
    path: str


@router.post("/heartbeat")
def heartbeat():
    update_heartbeat()
    return {"status": "ok"}


@router.get("/data_dir")
def get_data_dir():
    return {"path": str(paths.DATA_DIR.resolve())}


@router.post("/data_dir")
def set_data_dir(data: DataDirUpdate):
    paths.update_data_dir(data.path)
    reset_db_pool()
    init_db()  # Ensure tables exist in new location
    clear_video_caches()  # Clear file-system caches
    return {"status": "ok"}


@router.post("/increment_counter/{key}")
def increment_counter(key: str):
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO settings (key, value) VALUES (?, '1')
            ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
        """,
            (key,),
        )
        conn.commit()
    return {"status": "ok"}


@router.get("/settings")
def get_all_settings():
    with get_db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        return {r["key"]: r["value"] for r in rows}
