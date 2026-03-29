import sys
import os
import time
import shutil
import tempfile
import threading
import subprocess
import json
from pathlib import Path
from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse, StreamingResponse
import yt_dlp
from app.database import get_db
from app import paths
from app.utils import safe_name
from app.services.youtube import *

# Import script logic directly
import scripts.download_captions as dl_script
import scripts.process_captions as proc_script

ACTIVE_TASKS = set()
TASKS_LOCK = threading.Lock()
AVAILABLE_MODELS_CACHE = None

router = APIRouter()


def _get_temp_dir():
    return Path(paths.DATA_DIR) / "temp"


@router.get("/process")
def process_url(url: str):

    clean_url = url.strip()
    if clean_url in ACTIVE_TASKS:
        return JSONResponse(
            status_code=400, content={"error": "এই ভিডিওটি বর্তমানে প্রসেস করা হচ্ছে।"}
        )

    # Patch script directories to match app's current DATA_DIR
    dl_script.DATA_DIR = Path(paths.DATA_DIR)
    dl_script.TEMP_DIR = Path(paths.DATA_DIR) / "temp"

    with TASKS_LOCK:
        if len(ACTIVE_TASKS) >= 3:
            return JSONResponse(
                status_code=429,
                content={"error": "একসাথে সর্বোচ্চ ৩টি ভিডিও প্রসেস করা যাবে।"},
            )
        ACTIVE_TASKS.add(clean_url)

    def event_generator():
        def send_event(data):
            return f"data: {json.dumps(data)}\n\n"

        try:
            yield send_event(
                {"step": 1, "log": "🔗 ভিডিও তথ্য দেখা হচ্ছে...", "type": "info"}
            )
            time.sleep(0.3)

            ydl_info_opts = {
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "check_formats": False,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "web"],
                    }
                },
            }
            with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            title = info.get("title", "Unknown Title")
            channel = info.get("uploader", "Unknown Channel")
            safe_ch = safe_name(channel)
            safe_tit = safe_name(title)
            ch_dir = os.path.join(paths.DATA_DIR, safe_ch)
            os.makedirs(ch_dir, exist_ok=True)
            txt_file = os.path.join(ch_dir, f"{safe_tit}.txt")

            existing_img = None
            for ext in [".jpg", ".jpeg", ".png", ".webp"]:
                candidate = os.path.join(ch_dir, safe_tit + ext)
                if os.path.exists(candidate):
                    existing_img = candidate
                    break

            if os.path.exists(txt_file) and existing_img:
                yield send_event(
                    {"log": "এই ভিডিওটি আগে থেকেই সংগ্রহে আছে!", "type": "ok"}
                )
                time.sleep(1)
                yield send_event({"done": True})
                return

            yield send_event(
                {
                    "step": 2,
                    "log": "⬇ Caption ডাউনলোড হচ্ছে...",
                    "type": "info",
                }
            )

            # Call download logic directly instead of subprocess
            try:
                success = dl_script.download_video(url)
            except Exception as e:
                yield send_event({"error": f"Caption ডাউনলোড এরর: {str(e)}"})
                return

            if not success:
                yield send_event({"error": "Caption ডাউনলোড ব্যর্থ হয়েছে।"})
                return

            temp_dir = _get_temp_dir()
            vtt_files = list(temp_dir.glob(f"{safe_tit}.vtt"))
            if not vtt_files:
                fallback_vtts = list(temp_dir.glob("*.vtt"))
                if fallback_vtts:
                    vtt_files = [fallback_vtts[-1]]

            if not vtt_files:
                yield send_event({"error": "VTT ফাইল পাওয়া যায়নি।"})
                return

            vtt_path = vtt_files[0]

            yield send_event(
                {
                    "step": 3,
                    "log": "⚙ Caption প্রসেস করা হচ্ছে...",
                    "type": "info",
                }
            )

            # Call process logic directly
            try:
                # We need to determine the output directory for proc_script
                # In proc_script, it usually resolves channel dir automatically if not provided
                resolved_channel, out_dir = proc_script._resolve_channel_dir(
                    vtt_path, Path(paths.DATA_DIR), channel
                )

                res = proc_script.process_single_vtt(
                    vtt_path=vtt_path,
                    out_dir=out_dir,
                    force=True,
                    channel=resolved_channel,
                    url=url,
                    title_override=title,
                )
                success = res == "ok"
            except Exception as e:
                yield send_event({"error": f"Caption প্রসেস এরর: {str(e)}"})
                return

            if not success:
                yield send_event({"error": "Caption প্রসেস ব্যর্থ হয়েছে।"})
                return

            yield send_event({"log": "✓ প্রসেস সম্পন্ন", "type": "ok"})

            if not existing_img:
                for ext in ["jpg", "jpeg", "webp", "png"]:
                    candidate = os.path.join(ch_dir, safe_tit + ext)
                    if os.path.exists(candidate):
                        existing_img = candidate
                        break

            if os.path.exists(txt_file):
                yield send_event(
                    {
                        "step": 4,
                        "log": "✓ ভিডিওটি সফলভাবে সংগ্রহে সেভ হয়েছে।",
                        "type": "ok",
                    }
                )
                yield send_event({"done": True})
            else:
                yield send_event({"error": "টেক্সট ফাইল তৈরি হয়নি।"})

        except Exception as e:
            import traceback

            print(f"[Error] {traceback.format_exc()}")
            yield send_event({"error": str(e)[:200]})
        finally:
            with TASKS_LOCK:
                if clean_url in ACTIVE_TASKS:
                    ACTIVE_TASKS.remove(clean_url)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/active_tasks_count")
def get_active_tasks_count():
    return {"count": len(ACTIVE_TASKS)}
