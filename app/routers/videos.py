import time
import uuid
import os
import re
import threading
import base64
from functools import lru_cache
from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_db
from app import paths
from app.models import ProgressRequest, StatRequest
from app.utils import safe_name

router = APIRouter(prefix="/api")

_videos_cache = {"data": None, "mtime": 0, "lock": threading.Lock()}
_completed_videos_cache = {"data": None, "mtime": 0, "lock": threading.Lock()}


def clear_video_caches():
    global _videos_cache, _completed_videos_cache
    with _videos_cache["lock"]:
        _videos_cache["data"] = None
        _videos_cache["mtime"] = 0
    with _completed_videos_cache["lock"]:
        _completed_videos_cache["data"] = None
        _completed_videos_cache["mtime"] = 0


def _get_videos_uncached():
    videos = []

    with get_db() as conn:
        progress_rows = conn.execute(
            "SELECT video_id, progress_idx FROM progress"
        ).fetchall()
        progress_map = {row["video_id"]: row["progress_idx"] for row in progress_rows}

        # Fetch all session and part data
        sessions = conn.execute("SELECT * FROM video_sessions").fetchall()
        session_parts = conn.execute("SELECT * FROM video_session_parts").fetchall()

        parts_by_session = {}
        for p in session_parts:
            sid = p["session_id"]
            if sid not in parts_by_session:
                parts_by_session[sid] = {}
            mins = p["total_time_ms"] / 60000.0
            # Net WPM = ((Total Keystrokes / 5) - Word-Level Mistakes) / Time in Minutes
            # Word-Level Mistakes: count of words with any error (prevents multi-penalty for Juktakkhor)
            wpm = int((p["total_keys"] / 5.0 - p["mistakes"]) / mins) if mins > 0 else 0
            wpm = max(0, wpm)
            acc = (
                int(p["correct_keys"] / p["total_keys"] * 100)
                if p["total_keys"] > 0
                else 100
            )
            pages_completed = (
                p["pages_completed"] if "pages_completed" in p.keys() else 0
            )
            parts_by_session[sid][p["part_idx"]] = {
                "wpm": wpm,
                "acc": acc,
                "words": p["correct_words"],
                "time_ms": p["total_time_ms"],
                "keys": p["total_keys"],
                "ckeys": p["correct_keys"],
                "mistakes": p["mistakes"],
                "pages_completed": pages_completed,
            }

        active_sessions = {}
        best_sessions = {}
        last_sessions = {}

        for s in sessions:
            vid = s["video_id"]
            if s["status"] == "active":
                if (
                    vid not in active_sessions
                    or s["started_at"] > active_sessions[vid]["started_at"]
                ):
                    active_sessions[vid] = s
            elif s["status"] == "completed":
                if (
                    vid not in last_sessions
                    or s["completed_at"] > last_sessions[vid]["completed_at"]
                ):
                    last_sessions[vid] = s
                if (
                    vid not in best_sessions
                    or s["total_wpm"] > best_sessions[vid]["total_wpm"]
                ):
                    best_sessions[vid] = s

    if not os.path.exists(paths.DATA_DIR):
        return videos

    for channel_dir in os.listdir(paths.DATA_DIR):
        if channel_dir == "temp":
            continue
        channel_path = os.path.join(paths.DATA_DIR, channel_dir)
        if not os.path.isdir(channel_path):
            continue

        for file in os.listdir(channel_path):
            if not file.endswith(".txt"):
                continue

            txt_path = os.path.join(channel_path, file)
            base_name = file[:-4]

            thumb_path = ""
            for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                if os.path.exists(os.path.join(channel_path, base_name + ext)):
                    thumb_path = f"{channel_dir}/{base_name}{ext}"
                    break

            try:
                with open(txt_path, "r", encoding="utf-8") as f:
                    content = f.read()

                meta_match = re.search(
                    r"==!!Meta Data!!==\s+(.*?)\s+==!!Meta Data!!==", content, re.DOTALL
                )
                meta_dict = {
                    "Source": "YouTube",
                    "Title": base_name,
                    "Channel": channel_dir,
                    "URL": "",
                    "Upload Date": "N/A",
                }

                if meta_match:
                    for line in meta_match.group(1).strip().split("\n"):
                        if ":" in line:
                            k, v = line.split(":", 1)
                            meta_dict[k.strip()] = v.strip()

                vid_id = f"{safe_name(channel_dir)}--{safe_name(base_name)}"
                active_s = active_sessions.get(vid_id)
                best_s = best_sessions.get(vid_id)
                last_s = last_sessions.get(vid_id)

                vid_current = (
                    parts_by_session.get(active_s["session_id"], {}) if active_s else {}
                )
                vid_stats = (
                    parts_by_session.get(best_s["session_id"], {}) if best_s else {}
                )
                vid_last = (
                    parts_by_session.get(last_s["session_id"], {}) if last_s else {}
                )

                parts = []
                total_words = 0
                total_chars = 0

                # Parse Parts -> Pages
                part_matches = re.finditer(
                    r"==\*\*(.*?)\*\*==\s+(.*?)\s+==\*\*\1\*\*==", content, re.DOTALL
                )
                for part_idx, m in enumerate(part_matches):
                    part_label = m.group(1).strip()
                    part_content = m.group(2).strip()

                    pages = []
                    page_matches = re.finditer(
                        r"==%%(.*?)%%==\s+(.*?)\s+==%%\1%%==", part_content, re.DOTALL
                    )

                    for pm in page_matches:
                        page_text = pm.group(2).strip()
                        if page_text:
                            pages.append(
                                {"label": pm.group(1).strip(), "content": page_text}
                            )
                            total_words += len(page_text.split())
                            total_chars += len(page_text)

                    # Fallback if page tags are missing inside a part
                    if not pages and part_content:
                        pages = [{"label": "Page 1", "content": part_content}]
                        total_words += len(part_content.split())
                        total_chars += len(part_content)

                    wpm = vid_stats.get(part_idx, {}).get("wpm", None)
                    acc = vid_stats.get(part_idx, {}).get("acc", None)

                    cur_wpm = vid_current.get(part_idx, {}).get("wpm", None)
                    cur_acc = vid_current.get(part_idx, {}).get("acc", None)
                    cur_words = vid_current.get(part_idx, {}).get("words", 0)
                    cur_time_ms = vid_current.get(part_idx, {}).get("time_ms", 0)
                    cur_keys = vid_current.get(part_idx, {}).get("keys", 0)
                    cur_ckeys = vid_current.get(part_idx, {}).get("ckeys", 0)
                    cur_pages_completed = vid_current.get(part_idx, {}).get(
                        "pages_completed", 0
                    )

                    last_wpm = vid_last.get(part_idx, {}).get("wpm", None)
                    last_acc = vid_last.get(part_idx, {}).get("acc", None)
                    last_words = vid_last.get(part_idx, {}).get("words", 0)
                    last_time_ms = vid_last.get(part_idx, {}).get("time_ms", 0)
                    last_keys = vid_last.get(part_idx, {}).get("keys", 0)
                    last_ckeys = vid_last.get(part_idx, {}).get("ckeys", 0)
                    last_mistakes = vid_last.get(part_idx, {}).get("mistakes", 0)

                    total_pages_in_part = len(pages) if pages else 1
                    parts.append(
                        {
                            "label": part_label,
                            "pages": pages,
                            "wpm": wpm,
                            "acc": acc,
                            "words": vid_stats.get(part_idx, {}).get("words", 0),
                            "time_ms": vid_stats.get(part_idx, {}).get("time_ms", 0),
                            "keys": vid_stats.get(part_idx, {}).get("keys", 0),
                            "ckeys": vid_stats.get(part_idx, {}).get("ckeys", 0),
                            "mistakes": vid_stats.get(part_idx, {}).get("mistakes", 0),
                            "cur_wpm": cur_wpm,
                            "cur_acc": cur_acc,
                            "cur_words": cur_words,
                            "cur_time_ms": cur_time_ms,
                            "cur_keys": cur_keys,
                            "cur_ckeys": cur_ckeys,
                            "cur_mistakes": vid_current.get(part_idx, {}).get(
                                "mistakes", 0
                            ),
                            "cur_pages_completed": cur_pages_completed,
                            "total_pages": total_pages_in_part,
                            "last_wpm": last_wpm,
                            "last_acc": last_acc,
                            "last_words": last_words,
                            "last_time_ms": last_time_ms,
                            "last_keys": last_keys,
                            "last_ckeys": last_ckeys,
                            "last_mistakes": last_mistakes,
                        }
                    )

                # Calculate video-level current, last, best WPM using cumulative formula
                # Current = active session stats (cumulative across all parts typed)
                vid_cur_wpm, vid_cur_acc = None, None
                if vid_current:
                    c_keys = sum(
                        vid_current.get(i, {}).get("keys", 0) for i in range(len(parts))
                    )
                    c_ckeys = sum(
                        vid_current.get(i, {}).get("ckeys", 0)
                        for i in range(len(parts))
                    )
                    c_mistakes = sum(
                        vid_current.get(i, {}).get("mistakes", 0)
                        for i in range(len(parts))
                    )
                    c_time = sum(
                        vid_current.get(i, {}).get("time_ms", 0)
                        for i in range(len(parts))
                    )
                    c_mins = c_time / 60000.0 if c_time > 0 else 0
                    if c_mins > 0 and c_keys > 0:
                        vid_cur_wpm = max(0, int((c_keys / 5.0 - c_mistakes) / c_mins))
                        vid_cur_acc = (
                            int((c_ckeys / c_keys) * 100) if c_keys > 0 else 100
                        )

                # Last = last completed session stats
                vid_last_wpm, vid_last_acc = None, None
                if vid_last:
                    l_keys = sum(
                        vid_last.get(i, {}).get("keys", 0) for i in range(len(parts))
                    )
                    l_ckeys = sum(
                        vid_last.get(i, {}).get("ckeys", 0) for i in range(len(parts))
                    )
                    l_mistakes = sum(
                        vid_last.get(i, {}).get("mistakes", 0)
                        for i in range(len(parts))
                    )
                    l_time = sum(
                        vid_last.get(i, {}).get("time_ms", 0) for i in range(len(parts))
                    )
                    l_mins = l_time / 60000.0 if l_time > 0 else 0
                    if l_mins > 0 and l_keys > 0:
                        vid_last_wpm = max(0, int((l_keys / 5.0 - l_mistakes) / l_mins))
                        vid_last_acc = (
                            int((l_ckeys / l_keys) * 100) if l_keys > 0 else 100
                        )

                # Best = best session stats (highest overall WPM)
                vid_best_wpm, vid_best_acc = None, None
                if vid_stats:
                    b_keys = sum(
                        vid_stats.get(i, {}).get("keys", 0) for i in range(len(parts))
                    )
                    b_ckeys = sum(
                        vid_stats.get(i, {}).get("ckeys", 0) for i in range(len(parts))
                    )
                    b_mistakes = sum(
                        vid_stats.get(i, {}).get("mistakes", 0)
                        for i in range(len(parts))
                    )
                    b_time = sum(
                        vid_stats.get(i, {}).get("time_ms", 0)
                        for i in range(len(parts))
                    )
                    b_mins = b_time / 60000.0 if b_time > 0 else 0
                    if b_mins > 0 and b_keys > 0:
                        vid_best_wpm = max(0, int((b_keys / 5.0 - b_mistakes) / b_mins))
                        vid_best_acc = (
                            int((b_ckeys / b_keys) * 100) if b_keys > 0 else 100
                        )

                videos.append(
                    {
                        "id": vid_id,
                        "title": meta_dict["Title"],
                        "channel": meta_dict["Channel"],
                        "source": meta_dict["Source"],
                        "url": meta_dict["URL"],
                        "upload_date": meta_dict.get("Upload Date", "N/A"),
                        "total_words": total_words,
                        "total_chars": total_chars,
                        "thumb_path": thumb_path,
                        "progress": progress_map.get(vid_id, 0),
                        "parts": parts,
                        "cur_wpm": vid_cur_wpm,
                        "cur_acc": vid_cur_acc,
                        "last_wpm": vid_last_wpm,
                        "last_acc": vid_last_acc,
                        "best_wpm": vid_best_wpm,
                        "best_acc": vid_best_acc,
                        "_mtime": os.path.getmtime(txt_path),
                    }
                )
            except Exception as e:
                print(f"Failed parsing {txt_path}: {e}")

    videos.sort(key=lambda x: x["_mtime"], reverse=True)
    for v in videos:
        del v["_mtime"]

    return videos


def _get_directory_fingerprint(directory):
    """
    Generate a fingerprint based on file names and modification times.
    This is faster than full parsing but more robust than just checking max mtime,
    as it detects deletions and changes to older files.
    """
    if not os.path.exists(directory):
        return ""

    fingerprint_parts = []
    try:
        # Get all channel directories
        channels = sorted(
            [
                d
                for d in os.listdir(directory)
                if os.path.isdir(os.path.join(directory, d)) and d != "temp"
            ]
        )
        for ch in channels:
            ch_path = os.path.join(directory, ch)
            # Get all .txt files in channel
            files = sorted([f for f in os.listdir(ch_path) if f.endswith(".txt")])
            for f in files:
                f_path = os.path.join(ch_path, f)
                stat = os.stat(f_path)
                fingerprint_parts.append(f"{ch}/{f}:{stat.st_mtime}:{stat.st_size}")
    except OSError:
        pass

    import hashlib

    return hashlib.md5("|".join(fingerprint_parts).encode()).hexdigest()


@router.get("/fingerprint")
def get_fingerprint():
    return {"fingerprint": _get_directory_fingerprint(paths.DATA_DIR)}


@router.get("/videos")
def get_videos(force_refresh: bool = False):
    global _videos_cache

    current_fingerprint = _get_directory_fingerprint(paths.DATA_DIR)

    with _videos_cache["lock"]:
        if (
            not force_refresh
            and _videos_cache["data"] is not None
            and _videos_cache["mtime"] == current_fingerprint
        ):
            return _videos_cache["data"]

        videos = _get_videos_uncached()
        _videos_cache["data"] = videos
        _videos_cache["mtime"] = current_fingerprint
        return videos


def _get_completed_videos_uncached():
    """
    Internal function that does the actual work.
    """
    with get_db() as conn:
        # Get all completed sessions with their stats
        completed_sessions = conn.execute(
            "SELECT session_id, video_id, completed_at, total_wpm, total_acc FROM video_sessions WHERE status = 'completed' ORDER BY completed_at DESC"
        ).fetchall()

        # Get parts data for each session
        session_parts = conn.execute(
            "SELECT session_id, part_idx, correct_words, total_time_ms, total_keys, correct_keys, mistakes FROM video_session_parts"
        ).fetchall()

        parts_by_session = {}
        for p in session_parts:
            sid = p["session_id"]
            if sid not in parts_by_session:
                parts_by_session[sid] = []
            parts_by_session[sid].append(dict(p))

        # Calculate total words and characters typed across all sessions
        total_words = sum(p["correct_words"] for p in session_parts)
        total_chars = sum(p["total_keys"] for p in session_parts)

        # Get last 10 completed sessions for average calculation
        last_10_sessions = completed_sessions[:10]

        # Calculate proper cumulative WPM for each of last 10 sessions
        session_wpms = []
        session_accs = []
        for s in last_10_sessions:
            parts = parts_by_session.get(s["session_id"], [])
            if parts:
                tot_keys = sum(p["total_keys"] for p in parts)
                tot_ckeys = sum(p["correct_keys"] for p in parts)
                tot_mistakes = sum(p["mistakes"] for p in parts)
                tot_time = sum(p["total_time_ms"] for p in parts)
                tot_mins = tot_time / 60000.0
                if tot_mins > 0 and tot_keys > 0:
                    wpm = max(0, int((tot_keys / 5.0 - tot_mistakes) / tot_mins))
                    acc = int((tot_ckeys / tot_keys) * 100)
                    session_wpms.append(wpm)
                    session_accs.append(acc)

        avg_wpm = int(sum(session_wpms) / len(session_wpms)) if session_wpms else 0
        avg_acc = int(sum(session_accs) / len(session_accs)) if session_accs else 0

        # Get unique completed videos with their stats
        video_last_session = {}
        video_best_session = {}

        for s in completed_sessions:
            vid = s["video_id"]
            # Track last (most recent) session
            if vid not in video_last_session:
                video_last_session[vid] = s
            # Track best session
            if (
                vid not in video_best_session
                or s["total_wpm"] > video_best_session[vid]["total_wpm"]
            ):
                video_best_session[vid] = s

        # Build completed videos list
        completed_videos = []
        for vid, last_s in video_last_session.items():
            best_s = video_best_session.get(vid)

            # Get video metadata from file
            video_meta = None
            if not os.path.exists(paths.DATA_DIR):
                continue
            for channel_dir in os.listdir(paths.DATA_DIR):
                if channel_dir == "temp":
                    continue
                channel_path = os.path.join(paths.DATA_DIR, channel_dir)
                if not os.path.isdir(channel_path):
                    continue
                for txt_file in os.listdir(channel_path):
                    if not txt_file.endswith(".txt"):
                        continue
                    base_name = txt_file[:-4]
                    potential_id = f"{safe_name(channel_dir)}--{safe_name(base_name)}"
                    if potential_id == vid:
                        txt_path = os.path.join(channel_path, txt_file)
                        try:
                            with open(txt_path, "r", encoding="utf-8") as f:
                                content = f.read()
                            meta = {}
                            meta_match = re.search(
                                r"==!!Meta Data!!==\s+(.*?)\s+==!!Meta Data!!==",
                                content,
                                re.DOTALL,
                            )
                            if meta_match:
                                for line in meta_match.group(1).strip().split("\n"):
                                    if ":" in line:
                                        k, v = line.split(":", 1)
                                        meta[k.strip()] = v.strip()
                            # Check for thumbnail
                            thumb_jpg = os.path.join(channel_path, f"{base_name}.jpg")
                            thumb_png = os.path.join(channel_path, f"{base_name}.png")
                            thumb_path = None
                            for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                                if os.path.exists(
                                    os.path.join(channel_path, base_name + ext)
                                ):
                                    thumb_path = f"{channel_dir}/{base_name}{ext}"
                                    break
                            video_meta = {
                                "title": meta.get("Title", base_name),
                                "thumb_path": thumb_path,
                            }
                        except Exception as e:
                            print(f"Error reading video meta for {vid}: {e}")
                        break
                if video_meta:
                    break

            if video_meta:
                completed_videos.append(
                    {
                        "id": vid,
                        "title": video_meta["title"],
                        "thumb_path": video_meta["thumb_path"],
                        "last_wpm": last_s["total_wpm"],
                        "last_acc": last_s["total_acc"],
                        "best_wpm": best_s["total_wpm"]
                        if best_s
                        else last_s["total_wpm"],
                        "best_acc": best_s["total_acc"]
                        if best_s
                        else last_s["total_acc"],
                        "completed_at": last_s["completed_at"],
                    }
                )
            else:
                # Video file not found, but still add with basic info
                completed_videos.append(
                    {
                        "id": vid,
                        "title": vid.replace("--", " - "),
                        "thumb_path": None,
                        "last_wpm": last_s["total_wpm"],
                        "last_acc": last_s["total_acc"],
                        "best_wpm": best_s["total_wpm"]
                        if best_s
                        else last_s["total_wpm"],
                        "best_acc": best_s["total_acc"]
                        if best_s
                        else last_s["total_acc"],
                        "completed_at": last_s["completed_at"],
                    }
                )

        # Sort by completion date (most recent first)
        completed_videos.sort(key=lambda x: x["completed_at"], reverse=True)

        return {
            "total_words": total_words,
            "total_chars": total_chars,
            "videos_completed": len(video_last_session),
            "total_sessions": len(completed_sessions),
            "avg_wpm": avg_wpm,
            "avg_acc": avg_acc,
            "sessions_counted": len(session_wpms),
            "completed_videos": completed_videos,
        }


@router.get("/completed_videos")
def get_completed_videos(force_refresh: bool = False):
    global _completed_videos_cache

    current_fingerprint = _get_directory_fingerprint(paths.DATA_DIR)

    with _completed_videos_cache["lock"]:
        if (
            not force_refresh
            and _completed_videos_cache["data"] is not None
            and _completed_videos_cache["mtime"] == current_fingerprint
        ):
            return _completed_videos_cache["data"]

        data = _get_completed_videos_uncached()
        _completed_videos_cache["data"] = data
        _completed_videos_cache["mtime"] = current_fingerprint
        return data


@router.post("/{vid:path}/progress")
def update_progress(vid: str, req: ProgressRequest):
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO progress (video_id, progress_idx) VALUES (?, ?)",
            (vid, req.progress),
        )
        conn.commit()
    return {"status": "ok"}


@router.post("/{vid:path}/parts/{part_idx}/stats")
def update_stats(vid: str, part_idx: int, req: StatRequest):
    new_best = False
    previous_best = 0
    with get_db() as conn:
        print(
            f"[Stats] Received Final for {vid}, Part {part_idx}: {req.correct_words} words, {req.time_ms} ms"
        )

        # Insert history (legacy table, optionally kept for records)
        # Use minimum 100ms threshold to prevent unrealistic WPM values
        mins = max(req.time_ms / 60000.0, 0.1) if req.time_ms > 0 else 1.0
        # Net WPM = ((Total Keystrokes / 5) - Word-Level Mistakes) / Time in Minutes
        wpm = int((req.total_keys / 5.0 - req.mistakes) / mins)
        wpm = max(0, wpm)
        acc = (
            int((req.correct_keys / req.total_keys) * 100)
            if req.total_keys > 0
            else 100
        )

        conn.execute(
            "INSERT INTO part_stats_history (video_id, part_idx, timestamp, wpm, acc) VALUES (?, ?, ?, ?, ?)",
            (vid, part_idx, int(time.time()), wpm, acc),
        )

        # Find active session
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()
        if not active_sess:
            sess_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO video_sessions (session_id, video_id, status, started_at) VALUES (?, ?, 'active', ?)",
                (sess_id, vid, int(time.time())),
            )
        else:
            sess_id = active_sess["session_id"]

        conn.execute(
            "INSERT INTO video_session_parts (session_id, part_idx, correct_words, total_time_ms, total_keys, correct_keys, mistakes, pages_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(session_id, part_idx) DO UPDATE SET correct_words=excluded.correct_words, total_time_ms=excluded.total_time_ms, total_keys=excluded.total_keys, correct_keys=excluded.correct_keys, mistakes=excluded.mistakes, pages_completed=excluded.pages_completed",
            (
                sess_id,
                part_idx,
                req.correct_words,
                req.time_ms,
                req.total_keys,
                req.correct_keys,
                req.mistakes,
                req.pages_completed,
            ),
        )

        if req.is_completed:
            # Mark session as completed and calculate overall
            parts = conn.execute(
                "SELECT correct_words, total_time_ms, correct_keys, total_keys, mistakes FROM video_session_parts WHERE session_id = ?",
                (sess_id,),
            ).fetchall()
            tot_words = sum(p["correct_words"] for p in parts)
            tot_time = sum(p["total_time_ms"] for p in parts)
            tot_keys = sum(p["total_keys"] for p in parts)
            tot_ckeys = sum(p["correct_keys"] for p in parts)
            tot_mistakes = sum(p["mistakes"] for p in parts)

            tot_mins = tot_time / 60000.0 if tot_time > 0 else 1.0
            # Session Overall Net WPM = ((Total Keys / 5) - Total Mistakes) / Total Minutes
            overall_wpm = int((tot_keys / 5.0 - tot_mistakes) / tot_mins)
            overall_wpm = max(0, overall_wpm)
            overall_acc = int((tot_ckeys / tot_keys) * 100) if tot_keys > 0 else 100

            conn.execute(
                "UPDATE video_sessions SET status = 'completed', completed_at = ?, total_wpm = ?, total_acc = ? WHERE session_id = ?",
                (int(time.time()), overall_wpm, overall_acc, sess_id),
            )

            # Check if this is the new best video session
            best_sess = conn.execute(
                "SELECT total_wpm FROM video_sessions WHERE video_id = ? AND status = 'completed' AND session_id != ? ORDER BY total_wpm DESC LIMIT 1",
                (vid, sess_id),
            ).fetchone()
            previous_best = best_sess["total_wpm"] if best_sess else 0
            if not best_sess or overall_wpm > best_sess["total_wpm"]:
                new_best = True
                print(f"[Stats] New Best Session for {vid}! WPM: {overall_wpm}")
                # When video best is achieved, update ALL parts' best stats to this session's part stats
                # This ensures part bests are tied to the best video session
                session_parts = conn.execute(
                    "SELECT part_idx, correct_words, total_time_ms, total_keys, correct_keys, mistakes FROM video_session_parts WHERE session_id = ?",
                    (sess_id,),
                ).fetchall()
                for sp in session_parts:
                    p_mins = (
                        sp["total_time_ms"] / 60000.0
                        if sp["total_time_ms"] > 0
                        else 1.0
                    )
                    p_wpm = max(
                        0, int((sp["total_keys"] / 5.0 - sp["mistakes"]) / p_mins)
                    )
                    p_acc = (
                        int((sp["correct_keys"] / sp["total_keys"]) * 100)
                        if sp["total_keys"] > 0
                        else 100
                    )
                    conn.execute(
                        "INSERT INTO part_stats (video_id, part_idx, wpm, acc) VALUES (?, ?, ?, ?) "
                        "ON CONFLICT(video_id, part_idx) DO UPDATE SET wpm=excluded.wpm, acc=excluded.acc",
                        (vid, sp["part_idx"], p_wpm, p_acc),
                    )

        conn.commit()

    global _videos_cache, _completed_videos_cache
    with _videos_cache["lock"]:
        _videos_cache["data"] = None
    with _completed_videos_cache["lock"]:
        _completed_videos_cache["data"] = None

    return {"status": "ok", "new_best": new_best, "previous_best": previous_best}


@router.post("/{vid:path}/parts/{part_idx}/current_stats")
def update_current_stats(
    vid: str, part_idx: int, req: StatRequest, reset_others: bool = False
):
    with get_db() as conn:
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()

        if reset_others or not active_sess:
            if active_sess and reset_others:
                sess_id = str(uuid.uuid4())
                conn.execute(
                    "UPDATE video_sessions SET status = 'abandoned' WHERE video_id = ? AND status = 'active'",
                    (vid,),
                )
                conn.execute(
                    "INSERT INTO video_sessions (session_id, video_id, status, started_at) VALUES (?, ?, 'active', ?)",
                    (sess_id, vid, int(time.time())),
                )
            elif not active_sess:
                sess_id = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO video_sessions (session_id, video_id, status, started_at) VALUES (?, ?, 'active', ?)",
                    (sess_id, vid, int(time.time())),
                )
            else:
                sess_id = active_sess["session_id"]
        else:
            sess_id = active_sess["session_id"]

        conn.execute(
            "INSERT INTO video_session_parts (session_id, part_idx, correct_words, total_time_ms, total_keys, correct_keys, mistakes, pages_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(session_id, part_idx) DO UPDATE SET correct_words=excluded.correct_words, total_time_ms=excluded.total_time_ms, total_keys=excluded.total_keys, correct_keys=excluded.correct_keys, mistakes=excluded.mistakes, pages_completed=excluded.pages_completed",
            (
                sess_id,
                part_idx,
                req.correct_words,
                req.time_ms,
                req.total_keys,
                req.correct_keys,
                req.mistakes,
                req.pages_completed,
            ),
        )
        conn.commit()
    return {"status": "ok"}


@router.post("/{vid:path}/parts/{part_idx}/reset")
def reset_part(vid: str, part_idx: int):
    with get_db() as conn:
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()
        if active_sess:
            sess_id = active_sess["session_id"]
            conn.execute(
                "DELETE FROM video_session_parts WHERE session_id = ? AND part_idx = ?",
                (sess_id, part_idx),
            )
        conn.commit()
    return {"status": "ok"}


@router.post("/{vid:path}/reset")
def reset_video(vid: str):
    with get_db() as conn:
        conn.execute("DELETE FROM progress WHERE video_id = ?", (vid,))
        conn.execute(
            "UPDATE video_sessions SET status = 'abandoned' WHERE video_id = ? AND status = 'active'",
            (vid,),
        )
        conn.commit()

    global _videos_cache, _completed_videos_cache
    with _videos_cache["lock"]:
        _videos_cache["data"] = None
    with _completed_videos_cache["lock"]:
        _completed_videos_cache["data"] = None

    return {"status": "ok"}


@router.get("/{vid:path}/page_state/{part_idx}/{page_idx}")
def get_page_state(vid: str, part_idx: int, page_idx: int):
    with get_db() as conn:
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()

        if not active_sess:
            return {"found": False}

        row = conn.execute(
            "SELECT * FROM video_page_states WHERE session_id = ? AND part_idx = ? AND page_idx = ?",
            (active_sess["session_id"], part_idx, page_idx),
        ).fetchone()

        if not row:
            return {"found": False}

        row_dict = dict(row)
        return {
            "found": True,
            "current_index": row_dict.get("current_index", 0),
            "correctness_json": row_dict.get("correctness_json", ""),
            "completed_words": row_dict.get("completed_words", 0),
            "time_spent_ms": row_dict.get("time_spent_ms", 0),
            "keys_total": row_dict.get("keys_total", 0),
            "keys_correct": row_dict.get("keys_correct", 0),
            "keys_wrong": row_dict.get("keys_wrong", 0),
            "mistakes": row_dict.get("mistakes", 0),
            "page_chars_correct": row_dict.get("page_chars_correct", 0),
            "page_chars_wrong": row_dict.get("page_chars_wrong", 0),
            "page_keystrokes_total": row_dict.get("page_keystrokes_total", 0),
            "page_keystrokes_correct": row_dict.get("page_keystrokes_correct", 0),
            "page_keystrokes_wrong": row_dict.get("page_keystrokes_wrong", 0),
        }


class PageStateRequest(BaseModel):
    current_index: int
    correctness_json: str
    completed_words: int
    time_spent_ms: int
    keys_total: int
    keys_correct: int
    keys_wrong: int
    mistakes: int
    page_chars_correct: int = 0
    page_chars_wrong: int = 0
    page_keystrokes_total: int = 0
    page_keystrokes_correct: int = 0
    page_keystrokes_wrong: int = 0


@router.post("/{vid:path}/page_state/{part_idx}/{page_idx}")
def save_page_state(vid: str, part_idx: int, page_idx: int, req: PageStateRequest):
    with get_db() as conn:
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()

        if not active_sess:
            return {"status": "no_active_session"}

        conn.execute(
            """INSERT INTO video_page_states 
               (session_id, part_idx, page_idx, current_index, correctness_json, completed_words, time_spent_ms, keys_total, keys_correct, keys_wrong, mistakes, page_chars_correct, page_chars_wrong, page_keystrokes_total, page_keystrokes_correct, page_keystrokes_wrong, last_updated)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(session_id, part_idx, page_idx) DO UPDATE SET
               current_index=excluded.current_index,
               correctness_json=excluded.correctness_json,
               completed_words=excluded.completed_words,
               time_spent_ms=excluded.time_spent_ms,
               keys_total=excluded.keys_total,
               keys_correct=excluded.keys_correct,
               keys_wrong=excluded.keys_wrong,
               mistakes=excluded.mistakes,
               page_chars_correct=excluded.page_chars_correct,
               page_chars_wrong=excluded.page_chars_wrong,
               page_keystrokes_total=excluded.page_keystrokes_total,
               page_keystrokes_correct=excluded.page_keystrokes_correct,
               page_keystrokes_wrong=excluded.page_keystrokes_wrong,
               last_updated=excluded.last_updated""",
            (
                active_sess["session_id"],
                part_idx,
                page_idx,
                req.current_index,
                req.correctness_json,
                req.completed_words,
                req.time_spent_ms,
                req.keys_total,
                req.keys_correct,
                req.keys_wrong,
                req.mistakes,
                req.page_chars_correct,
                req.page_chars_wrong,
                req.page_keystrokes_total,
                req.page_keystrokes_correct,
                req.page_keystrokes_wrong,
                int(time.time()),
            ),
        )
        conn.commit()

    return {"status": "ok"}


@router.delete("/{vid:path}/page_state/{part_idx}/{page_idx}")
def delete_page_state(vid: str, part_idx: int, page_idx: int):
    with get_db() as conn:
        active_sess = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
            (vid,),
        ).fetchone()

        if active_sess:
            conn.execute(
                "DELETE FROM video_page_states WHERE session_id = ? AND part_idx = ? AND page_idx = ?",
                (active_sess["session_id"], part_idx, page_idx),
            )
            conn.commit()

    return {"status": "ok"}


@router.delete("/videos/{vid:path}")
def delete_video(vid: str):
    # Delete from database
    with get_db() as conn:
        conn.execute("DELETE FROM progress WHERE video_id = ?", (vid,))

        # Get all session IDs for this video
        sessions = conn.execute(
            "SELECT session_id FROM video_sessions WHERE video_id = ?",
            (vid,),
        ).fetchall()

        for sess in sessions:
            sess_id = sess["session_id"]
            conn.execute(
                "DELETE FROM video_session_parts WHERE session_id = ?", (sess_id,)
            )
            conn.execute(
                "DELETE FROM video_page_states WHERE session_id = ?", (sess_id,)
            )

        conn.execute("DELETE FROM video_sessions WHERE video_id = ?", (vid,))
        conn.commit()

    # Delete from filesystem (txt file and thumbnail)
    if os.path.exists(paths.DATA_DIR):
        for channel_dir in os.listdir(paths.DATA_DIR):
            if channel_dir == "temp":
                continue
            channel_path = os.path.join(paths.DATA_DIR, channel_dir)
            if not os.path.isdir(channel_path):
                continue

            for file in os.listdir(channel_path):
                if not file.endswith(".txt"):
                    continue

                base_name = file[:-4]
                potential_id = f"{safe_name(channel_dir)}--{safe_name(base_name)}"

                if potential_id == vid:
                    txt_path = os.path.join(channel_path, file)

                    # Delete thumbnail if exists
                    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                        thumb_path = os.path.join(channel_path, base_name + ext)
                        if os.path.exists(thumb_path):
                            os.remove(thumb_path)

                    # Delete txt file
                    if os.path.exists(txt_path):
                        os.remove(txt_path)

                    break

    # Clear caches
    global _videos_cache, _completed_videos_cache
    with _videos_cache["lock"]:
        _videos_cache["data"] = None
    with _completed_videos_cache["lock"]:
        _completed_videos_cache["data"] = None

    return {"status": "ok"}


@router.get("/videos/{vid:path}/content")
def get_video_content(vid: str):
    if not os.path.exists(paths.DATA_DIR):
        return {"error": "Data directory not found"}, 404

    # Find the video file
    for channel_dir in os.listdir(paths.DATA_DIR):
        if channel_dir == "temp":
            continue
        channel_path = os.path.join(paths.DATA_DIR, channel_dir)
        if not os.path.isdir(channel_path):
            continue

        for file in os.listdir(channel_path):
            if not file.endswith(".txt"):
                continue

            base_name = file[:-4]
            potential_id = f"{safe_name(channel_dir)}--{safe_name(base_name)}"

            if potential_id == vid:
                txt_path = os.path.join(channel_path, file)
                try:
                    with open(txt_path, "r", encoding="utf-8") as f:
                        content = f.read()

                    # Find current thumbnail
                    thumb_path = None
                    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                        if os.path.exists(os.path.join(channel_path, base_name + ext)):
                            thumb_path = f"{channel_dir}/{base_name}{ext}"
                            break

                    # Extract title and channel from content
                    meta_match = re.search(
                        r"==!!Meta Data!!==\s+(.*?)\s+==!!Meta Data!!==",
                        content,
                        re.DOTALL,
                    )
                    title = base_name
                    channel = channel_dir

                    if meta_match:
                        for line in meta_match.group(1).strip().split("\n"):
                            if ":" in line:
                                k, v = line.split(":", 1)
                                if k.strip() == "Title":
                                    title = v.strip()
                                elif k.strip() == "Channel":
                                    channel = v.strip()

                    return {
                        "content": content,
                        "thumb_path": thumb_path,
                        "title": title,
                        "channel": channel,
                        "file_path": txt_path,
                        "channel_dir": channel_dir,
                        "base_name": base_name,
                    }
                except Exception as e:
                    return {"error": str(e)}, 500

    return {"error": "Video not found"}, 404


class VideoEditRequest(BaseModel):
    content: str
    thumbnail_base64: str | None = None
    thumbnail_ext: str | None = None


@router.put("/videos/{vid:path}")
def update_video(vid: str, req: VideoEditRequest):
    if not os.path.exists(paths.DATA_DIR):
        return {"error": "Data directory not found"}, 404

    # Find and update the video file
    for channel_dir in os.listdir(paths.DATA_DIR):
        if channel_dir == "temp":
            continue
        channel_path = os.path.join(paths.DATA_DIR, channel_dir)
        if not os.path.isdir(channel_path):
            continue

        for file in os.listdir(channel_path):
            if not file.endswith(".txt"):
                continue

            base_name = file[:-4]
            potential_id = f"{safe_name(channel_dir)}--{safe_name(base_name)}"

            if potential_id == vid:
                txt_path = os.path.join(channel_path, file)
                try:
                    with open(txt_path, "w", encoding="utf-8") as f:
                        f.write(req.content)

                    # Update thumbnail if provided
                    if req.thumbnail_base64 and req.thumbnail_ext:
                        import base64

                        thumb_data = base64.b64decode(req.thumbnail_base64)
                        thumb_path = os.path.join(
                            channel_path, base_name + req.thumbnail_ext
                        )
                        with open(thumb_path, "wb") as thumb_file:
                            thumb_file.write(thumb_data)

                    # Clear caches
                    global _videos_cache, _completed_videos_cache
                    with _videos_cache["lock"]:
                        _videos_cache["data"] = None
                    with _completed_videos_cache["lock"]:
                        _completed_videos_cache["data"] = None

                    return {"status": "ok"}
                except Exception as e:
                    return {"error": str(e)}, 500

    return {"error": "Video not found"}, 404


@router.post("/videos")
def create_manual_video(req: VideoEditRequest):
    content = req.content

    # Extract Title and Channel from metadata
    meta_match = re.search(
        r"==!!Meta Data!!==\s+(.*?)\s+==!!Meta Data!!==",
        content,
        re.DOTALL,
    )

    title = "Untitled"
    channel = "Manual"

    if meta_match:
        for line in meta_match.group(1).strip().split("\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                if k.strip().lower() == "title":
                    title = v.strip()
                elif k.strip().lower() == "channel":
                    channel = v.strip()

    channel_safe = safe_name(channel)
    title_safe = safe_name(title)

    base_name = title_safe
    channel_path = os.path.join(paths.DATA_DIR, channel_safe)
    os.makedirs(channel_path, exist_ok=True)

    txt_path = os.path.join(channel_path, f"{base_name}.txt")

    # Avoid overwriting existing files by appending timestamp if needed
    if os.path.exists(txt_path):
        base_name = f"{title_safe}_{int(time.time())}"
        txt_path = os.path.join(channel_path, f"{base_name}.txt")

    try:
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(content)

        # Handle thumbnail
        if req.thumbnail_base64 and req.thumbnail_ext:
            thumb_path = os.path.join(channel_path, base_name + req.thumbnail_ext)
            with open(thumb_path, "wb") as f:
                f.write(base64.b64decode(req.thumbnail_base64))

        # Invalidate caches
        global _videos_cache, _completed_videos_cache
        with _videos_cache["lock"]:
            _videos_cache["data"] = None
        with _completed_videos_cache["lock"]:
            _completed_videos_cache["data"] = None

        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}, 500
