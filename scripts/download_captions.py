#!/usr/bin/env python3
"""
Download captions (VTT) and thumbnails from YouTube videos.

Smart Caching:
    Checks for existing .vtt files before making network requests.
    If a file exists, the URL is skipped, saving API quota.

Usage:
    uv run download_captions.py links.txt
    uv run download_captions.py "https://youtube.com/watch?v=..."

Output:
    - Thumbnail: Bangla Data/{Channel Name}/{title}.webp
    - VTT:       Bangla Data/temp/{safe_title}.vtt  (with metadata header)

    The channel folder is taken from the YouTube channel name and created
    automatically if it does not exist.

Cookies:
    Place cookies.txt next to this script. It will only be used as a fallback
    when YouTube asks for authentication - videos that work without it will
    never use the cookie file.
"""

import argparse
import re
import shutil
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import yt_dlp

BASE_DIR     = Path.cwd()
DATA_DIR     = BASE_DIR / "Bangla Data"
TEMP_DIR     = DATA_DIR / "temp"
COOKIES_FILE = Path(__file__).resolve().parent / "cookies.txt"

SUBTITLE_LANGS = ("bn", "bn-BD", "bn-Beng", "en", "en-US")

_BOT_PHRASES = (
    "sign in to confirm",
    "not a bot",
    "cookies",
    "authentication",
)

_RELOAD_PHRASES = (
    "needs to be reloaded",
    "page needs to be reloaded",
)

def _needs_cookies(msg: str) -> bool:
    low = msg.lower()
    return any(p in low for p in _BOT_PHRASES)

def _needs_reload(msg: str) -> bool:
    low = msg.lower()
    return any(p in low for p in _RELOAD_PHRASES)

def _ydl_opts(base: dict, use_cookies: bool) -> dict:
    if use_cookies and COOKIES_FILE.exists():
        return {**base, "cookiefile": str(COOKIES_FILE)}
    return base


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def safe_name(text: str, max_len: int = 80) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", text).strip(". ")
    return cleaned[:max_len] or "untitled"


def extract_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    if parsed.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        elif parsed.path.startswith("/embed/"):
            return parsed.path.split("/")[2]
        elif parsed.path.startswith("/v/"):
            return parsed.path.split("/")[2]
    elif parsed.hostname == "youtu.be":
        return parsed.path[1:]
    return None


def is_youtube_url(text: str) -> bool:
    return "youtube.com" in text or "youtu.be" in text


def read_urls_from_file(filepath: Path) -> list[str]:
    urls: list[str] = []
    print(f"Reading URLs from: {filepath}")
    for line_num, raw in enumerate(filepath.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if is_youtube_url(line):
            urls.append(line)
        else:
            print(f"  [WARN] Line {line_num}: not a YouTube URL - skipping '{line[:60]}'")
    return urls


def build_cache_set(temp_dir: Path) -> set[str]:
    cached: set[str] = set()
    for vtt_file in temp_dir.glob("*.vtt"):
        try:
            header = vtt_file.read_text(encoding="utf-8")[:500]
            for line in header.splitlines():
                if line.startswith("URL: "):
                    cached.add(line[5:].strip())
                    break
        except Exception:
            continue
    return cached


def inject_metadata(vtt_path: Path, title: str, channel: str, url: str) -> None:
    block = (
        "==!!Meta Data!!==\n"
        "Source: YouTube\n"
        f"Title: {title}\n"
        f"Channel: {channel}\n"
        f"URL: {url}\n"
        "==!!Meta Data!!==\n\n"
    )
    try:
        original = vtt_path.read_text(encoding="utf-8")
        vtt_path.write_text(block + original, encoding="utf-8")
    except Exception as e:
        print(f"  [ERROR] Failed to inject metadata: {e}")


# ---------------------------------------------------------------------------
# Fetch helper with cookie + reload retry
# ---------------------------------------------------------------------------

def _ydl_run(action_label: str, base_opts: dict, target: str, is_download: bool) -> dict | None:
    """
    Run a yt-dlp operation with up to 3 attempts:
      1. No cookies
      2. Bot-check detected  -> retry with cookies
      3. Reload error        -> wait 3s and retry with cookies once more

    Returns info dict for extract_info, or True/None for downloads.
    Raises on unrecoverable error.
    """
    last_err = ""
    use_cookies = False

    for attempt in range(1, 4):
        opts = _ydl_opts(base_opts, use_cookies)
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                if is_download:
                    ydl.download([target])
                    return True
                else:
                    return ydl.extract_info(target, download=False)
        except Exception as e:
            last_err = str(e)

            if _needs_cookies(last_err) and not use_cookies:
                if not COOKIES_FILE.exists():
                    raise RuntimeError(
                        f"Bot check triggered but cookies.txt not found at: {COOKIES_FILE}"
                    )
                print(f"  [RETRY] Bot check on {action_label} - retrying with cookies...")
                use_cookies = True
                continue

            if _needs_reload(last_err) and attempt < 3:
                print(f"  [RETRY] Reload error on {action_label} - waiting 3s and retrying...")
                time.sleep(3)
                # keep use_cookies as-is (already True from previous step if we got here)
                continue

            raise RuntimeError(last_err)

    raise RuntimeError(last_err)


# ---------------------------------------------------------------------------
# Core download
# ---------------------------------------------------------------------------

def download_video(url: str) -> bool:
    video_id = extract_video_id(url)
    if not video_id:
        print(f"  [SKIP] Not a valid YouTube URL: {url}")
        return False

    print(f"\n{'=' * 60}")
    print(f"Processing: {url}")
    print(f"{'=' * 60}")

    # --- Fetch metadata ---
    try:
        info = _ydl_run(
            "metadata",
            {"quiet": True, "no_warnings": True},
            url,
            is_download=False,
        )
    except Exception as e:
        print(f"  [ERROR] Could not fetch video info: {e}")
        return False

    title      = info.get("title", "Unknown Title")
    channel    = info.get("uploader", "Unknown Channel")
    safe_title = safe_name(title)

    ch_dir = DATA_DIR / channel
    ch_dir.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    vtt_path = TEMP_DIR / f"{safe_title}.vtt"

    if vtt_path.exists():
        print(f"  [SKIP] VTT already exists: {vtt_path.name}")
        return True

    # --- Thumbnail ---
    existing_thumb = next(
        (
            ch_dir / f"{safe_title}{ext}"
            for ext in (".jpg", ".jpeg", ".png", ".webp")
            if (ch_dir / f"{safe_title}{ext}").exists()
        ),
        None,
    )

    if existing_thumb:
        print(f"  [SKIP] Thumbnail already exists: {existing_thumb.name}")
    else:
        thumb_tmp = TEMP_DIR / f"thumb_{video_id}"
        try:
            _ydl_run(
                "thumbnail",
                {
                    "quiet": True,
                    "no_warnings": True,
                    "writethumbnail": True,
                    "skip_download": True,
                    "outtmpl": str(thumb_tmp),
                },
                url,
                is_download=True,
            )
            for ext in ("jpg", "jpeg", "webp", "png"):
                src = TEMP_DIR / f"thumb_{video_id}.{ext}"
                if src.exists():
                    dest = ch_dir / f"{safe_title}.{ext}"
                    shutil.move(str(src), dest)
                    print(f"  [OK] Thumbnail -> {dest.relative_to(BASE_DIR)}")
                    break
        except Exception as e:
            print(f"  [WARN] Thumbnail download failed: {e}")

    # --- Subtitles ---
    vtt_downloaded = False
    subs_tmp = TEMP_DIR / f"subs_{video_id}"

    for lang in SUBTITLE_LANGS:
        try:
            _ydl_run(
                f"subtitles ({lang})",
                {
                    "quiet": True,
                    "no_warnings": True,
                    "writesubtitles": True,
                    "writeautomaticsub": True,
                    "subtitleslangs": [lang],
                    "subtitlesformat": "vtt",
                    "skip_download": True,
                    "outtmpl": str(subs_tmp),
                },
                url,
                is_download=True,
            )
        except Exception:
            continue

        found = list(TEMP_DIR.glob(f"subs_{video_id}.*.vtt"))
        if found:
            shutil.move(str(found[0]), vtt_path)
            vtt_downloaded = True
            print(f"  [OK] VTT -> {vtt_path.name}  (lang: {lang})")
            break

    for f in TEMP_DIR.glob(f"subs_{video_id}.*"):
        try:
            f.unlink()
        except Exception:
            pass

    if not vtt_downloaded:
        print(f"  [WARN] No subtitles found for: {title}")
        return False

    inject_metadata(vtt_path, title, channel, url)
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download YouTube captions and thumbnails.",
    )
    parser.add_argument(
        "input",
        help="YouTube URL  OR  path to a .txt file with one URL per line",
    )
    args = parser.parse_args()

    if is_youtube_url(args.input):
        urls   = [args.input]
        source = args.input
    else:
        path = Path(args.input)
        if not path.exists():
            alt = TEMP_DIR / args.input
            if alt.exists():
                path = alt
            else:
                print(f"Error: File not found: {args.input}")
                sys.exit(1)
        urls   = read_urls_from_file(path)
        source = str(path)

    if not urls:
        print("No valid YouTube URLs found.")
        sys.exit(0)

    print(f"\nLoaded {len(urls)} URL(s) from: {source}")

    if COOKIES_FILE.exists():
        print(f"  cookies.txt found - will use as fallback if needed")
    else:
        print(f"  No cookies.txt - running without cookies")

    print("\nScanning existing files to skip duplicates...")
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    cached = build_cache_set(TEMP_DIR)
    to_do  = [u for u in urls if u not in cached]
    print(f"  Already downloaded : {len(urls) - len(to_do)}")
    print(f"  Queued to download : {len(to_do)}")

    if not to_do:
        print("\nNothing to do - all videos already downloaded.")
        return 0

    COOLDOWN = 15
    success = failed = 0

    for i, url in enumerate(to_do, 1):
        print(f"\n  [{i}/{len(to_do)}]")
        try:
            result = download_video(url)
        except Exception as e:
            print(f"  [ERROR] Unexpected error for {url}: {e}")
            result = False
        if result:
            success += 1
        else:
            failed += 1

        if i < len(to_do):
            for remaining in range(COOLDOWN, 0, -1):
                print(f"\r  Waiting {remaining}s before next download...  ", end="", flush=True)
                time.sleep(1)
            print()

    print(f"\n{'=' * 60}")
    print(f"Done.  Success: {success}  Failed: {failed}")
    print(f"VTT files  ->  {TEMP_DIR}")
    print(f"{'=' * 60}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())