import uuid
import time
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import base64
import os
from app.database import get_db
from app import paths

router = APIRouter(prefix="/api/playlists")


class CreatePlaylistRequest(BaseModel):
    name: str
    video_ids: List[str] = []


class AddVideosRequest(BaseModel):
    video_ids: List[str]


class UpdatePlaylistRequest(BaseModel):
    name: str
    thumbnail_base64: Optional[str] = None
    thumbnail_ext: Optional[str] = None


@router.get("")
def get_playlists():
    """Get all playlists with video count and thumbnail info."""
    with get_db() as conn:
        playlists = conn.execute(
            "SELECT * FROM playlists ORDER BY updated_at DESC"
        ).fetchall()

        result = []
        for pl in playlists:
            pid = pl["playlist_id"]
            videos = conn.execute(
                "SELECT video_id FROM playlist_videos WHERE playlist_id = ? ORDER BY position",
                (pid,),
            ).fetchall()
            video_ids = [v["video_id"] for v in videos]
            result.append(
                {
                    "playlist_id": pid,
                    "name": pl["name"],
                    "created_at": pl["created_at"],
                    "updated_at": pl["updated_at"],
                    "video_ids": video_ids,
                    "video_count": len(video_ids),
                    "thumb_path": pl["thumb_path"]
                    if "thumb_path" in pl.keys()
                    else None,
                }
            )

        return result


@router.get("/{playlist_id}")
def get_playlist(playlist_id: str):
    """Get a single playlist with its video IDs."""
    with get_db() as conn:
        pl = conn.execute(
            "SELECT * FROM playlists WHERE playlist_id = ?", (playlist_id,)
        ).fetchone()

        if not pl:
            return {"error": "Playlist not found"}

        videos = conn.execute(
            "SELECT video_id FROM playlist_videos WHERE playlist_id = ? ORDER BY position",
            (playlist_id,),
        ).fetchall()

        return {
            "playlist_id": pl["playlist_id"],
            "name": pl["name"],
            "created_at": pl["created_at"],
            "updated_at": pl["updated_at"],
            "video_ids": [v["video_id"] for v in videos],
            "thumb_path": pl["thumb_path"] if "thumb_path" in pl.keys() else None,
        }


@router.post("")
def create_playlist(req: CreatePlaylistRequest):
    """Create a new playlist with optional initial video IDs."""
    pid = str(uuid.uuid4())
    now = int(time.time())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO playlists (playlist_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (pid, req.name.strip(), now, now),
        )
        for i, vid in enumerate(req.video_ids):
            conn.execute(
                "INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position, added_at) VALUES (?, ?, ?, ?)",
                (pid, vid, i, now),
            )
        conn.commit()
    return {"status": "ok", "playlist_id": pid}


@router.post("/{playlist_id}/videos")
def add_videos_to_playlist(playlist_id: str, req: AddVideosRequest):
    """Add videos to an existing playlist."""
    now = int(time.time())
    with get_db() as conn:
        pl = conn.execute(
            "SELECT playlist_id FROM playlists WHERE playlist_id = ?", (playlist_id,)
        ).fetchone()
        if not pl:
            return {"error": "Playlist not found"}

        # Get current max position
        max_pos = (
            conn.execute(
                "SELECT MAX(position) as mp FROM playlist_videos WHERE playlist_id = ?",
                (playlist_id,),
            ).fetchone()["mp"]
            or 0
        )

        for i, vid in enumerate(req.video_ids):
            conn.execute(
                "INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position, added_at) VALUES (?, ?, ?, ?)",
                (playlist_id, vid, max_pos + i + 1, now),
            )

        conn.execute(
            "UPDATE playlists SET updated_at = ? WHERE playlist_id = ?",
            (now, playlist_id),
        )
        conn.commit()
    return {"status": "ok"}


@router.delete("/{playlist_id}/videos/{video_id}")
def remove_video_from_playlist(playlist_id: str, video_id: str):
    """Remove a video from a playlist."""
    now = int(time.time())
    with get_db() as conn:
        conn.execute(
            "DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?",
            (playlist_id, video_id),
        )
        conn.execute(
            "UPDATE playlists SET updated_at = ? WHERE playlist_id = ?",
            (now, playlist_id),
        )
        conn.commit()
    return {"status": "ok"}


@router.put("/{playlist_id}")
def update_playlist(playlist_id: str, req: UpdatePlaylistRequest):
    """Update a playlist's name and optionally its custom thumbnail."""
    now = int(time.time())

    thumb_path = None
    if req.thumbnail_base64 and req.thumbnail_ext:
        try:
            thumb_data = base64.b64decode(req.thumbnail_base64)
            thumbs_dir = os.path.join(paths.DATA_DIR, "thumbs", "playlists")
            os.makedirs(thumbs_dir, exist_ok=True)

            filename = f"{playlist_id}{req.thumbnail_ext}"
            file_path = os.path.join(thumbs_dir, filename)

            with open(file_path, "wb") as f:
                f.write(thumb_data)

            thumb_path = f"playlists/{filename}"
        except Exception as e:
            print(f"Error saving playlist thumbnail: {e}")
            return {"error": "Failed to save thumbnail"}

    with get_db() as conn:
        if thumb_path:
            conn.execute(
                "UPDATE playlists SET name = ?, updated_at = ?, thumb_path = ? WHERE playlist_id = ?",
                (req.name.strip(), now, thumb_path, playlist_id),
            )
        else:
            conn.execute(
                "UPDATE playlists SET name = ?, updated_at = ? WHERE playlist_id = ?",
                (req.name.strip(), now, playlist_id),
            )
        conn.commit()
    return {"status": "ok", "thumb_path": thumb_path}


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str):
    """Delete a playlist entirely."""
    with get_db() as conn:
        conn.execute(
            "DELETE FROM playlist_videos WHERE playlist_id = ?", (playlist_id,)
        )
        conn.execute("DELETE FROM playlists WHERE playlist_id = ?", (playlist_id,))
        conn.commit()
    return {"status": "ok"}
