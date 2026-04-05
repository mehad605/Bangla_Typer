import time
import sqlite3
from fastapi import APIRouter
from app.database import get_db
from app.models import InstantStatRequest

router = APIRouter(prefix="/api")


@router.post("/inst_stats")
def add_inst_stat(req: InstantStatRequest):
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO instant_stats 
                (timestamp, wpm, rawWpm, acc, consistency, timeMs, correctChars, wrongChars, extraChars, missedChars, totalKeystrokes, isValid, validationFlags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    req.timestamp,
                    req.wpm,
                    req.rawWpm,
                    req.acc,
                    req.consistency,
                    req.timeMs,
                    req.correctChars,
                    req.wrongChars,
                    req.extraChars,
                    0,  # missedChars always 0 due to forced correction mechanics
                    req.totalKeystrokes,
                    1 if req.isValid else 0,
                    req.validationFlags,
                ),
            )
            conn.commit()
        return {"status": "ok"}
    except sqlite3.OperationalError as e:
        print("SQLite Error on POST /api/inst_stats:", e)
        return {"status": "db_error"}


@router.get("/yt_stats")
def get_yt_stats():
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT video_id, part_idx, timestamp, wpm, acc FROM part_stats_history ORDER BY timestamp ASC"
            ).fetchall()
            return [dict(r) for r in rows]
    except sqlite3.OperationalError:
        return []
