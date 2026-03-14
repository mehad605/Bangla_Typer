#!/usr/bin/env python3
"""
YouTube Video Filter — interactive mode.
Run with no arguments and follow the prompts.

Usage:
    uv run youtube_filter.py

Saves a list of URLs to: Bangla Data/temp/links.txt
Then pass that to download_captions.py:
    uv run download_captions.py "Bangla Data/temp/links.txt"
"""

import json
import subprocess
import sys
from pathlib import Path

BASE_DIR    = Path.cwd()
TEMP_DIR    = BASE_DIR / "Bangla Data" / "temp"
OUTPUT_FILE = Path(__file__).resolve().parent / "links.txt"

# ── ANSI colours ────────────────────────────────────────────────────────────

class C:
    _ok  = sys.stdout.isatty()
    R    = "\033[0m"   if _ok else ""
    B    = "\033[1m"   if _ok else ""
    DIM  = "\033[2m"   if _ok else ""
    CYN  = "\033[36m"  if _ok else ""
    BCYN = "\033[96m"  if _ok else ""
    BWHT = "\033[97m"  if _ok else ""
    GRN  = "\033[32m"  if _ok else ""
    BGRN = "\033[92m"  if _ok else ""
    BYLW = "\033[93m"  if _ok else ""
    BRED = "\033[91m"  if _ok else ""
    BLU  = "\033[34m"  if _ok else ""

W = 60

def rule(ch="─"):  print(f"{C.DIM}{ch * W}{C.R}")
def blank():       print()

def header(title: str) -> None:
    blank()
    rule("━")
    print(f"  {C.B}{C.BCYN}{title}{C.R}")
    rule("━")
    blank()

def prompt(label: str, hint: str = "") -> str:
    hint_str = f"  {C.DIM}{hint}{C.R}" if hint else ""
    if hint_str:
        print(hint_str)
    return input(f"  {C.B}{C.BWHT}›{C.R} {C.B}{label}{C.R}  ").strip()

def info(msg: str)  -> None: print(f"  {C.DIM}{msg}{C.R}")
def ok(msg: str)    -> None: print(f"  {C.BGRN}✓{C.R}  {msg}")
def warn(msg: str)  -> None: print(f"  {C.BYLW}⚠{C.R}  {C.BYLW}{msg}{C.R}")
def err(msg: str)   -> None: print(f"  {C.BRED}✗{C.R}  {C.BRED}{msg}{C.R}")
def step(msg: str)  -> None: print(f"  {C.BLU}●{C.R}  {msg}")

# ── yt-dlp helpers ──────────────────────────────────────────────────────────

def check_yt_dlp() -> None:
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        err("yt-dlp is not installed. Run:  pip install yt-dlp")
        sys.exit(1)


def get_channel_name(url: str) -> str:
    result = subprocess.run(
        ["yt-dlp", "--playlist-end", "1", "--print", "%(channel)s", "--no-warnings", url],
        capture_output=True, text=True,
    )
    lines = result.stdout.strip().splitlines()
    name  = lines[0].strip() if lines else "channel"
    for ch in r'\/:*?"<>|':
        name = name.replace(ch, "_")
    return name


def _is_public(video: dict) -> bool:
    """Return True only if the video is publicly available."""
    availability = video.get("availability")
    # yt-dlp sets availability to "public" for normal videos.
    # Values like "private", "premium_only", "subscriber_only",
    # "needs_auth", "unlisted", or None all get skipped.
    if availability is None:
        # availability is absent in some flat-playlist responses;
        # fall back to checking the title isn't a placeholder.
        title = video.get("title", "")
        return title not in ("[Private video]", "[Deleted video]", "")
    return availability == "public"


def fetch_channel_videos(channel_url: str, top_x: int, min_mins: float) -> list[str]:
    min_secs = min_mins * 60
    step(f"Fetching up to 200 latest videos…")

    result = subprocess.run(
        [
            "yt-dlp", "--flat-playlist",
            "--playlist-end", "200",
            "--print", "%(.{id,title,duration,webpage_url,availability})j",
            "--no-warnings",
            channel_url,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        err(f"yt-dlp error:\n{result.stderr}")
        sys.exit(1)

    lines = [l.strip() for l in result.stdout.strip().splitlines() if l.strip()]
    if not lines:
        warn("No videos returned. Check the channel URL.")
        sys.exit(1)

    urls: list[str] = []
    skipped_private = 0
    for line in lines:
        try:
            v = json.loads(line)
        except json.JSONDecodeError:
            continue

        if not _is_public(v):
            skipped_private += 1
            continue

        dur = v.get("duration")
        if dur is None:
            continue  # live stream / premiere — no duration yet

        if dur > min_secs:
            url = v.get("webpage_url") or f"https://www.youtube.com/watch?v={v.get('id','')}"
            urls.append(url)

        if len(urls) >= top_x:
            break

    if skipped_private:
        warn(f"Skipped {skipped_private} private/unavailable video(s).")

    return urls


def fetch_playlist_videos(playlist_url: str) -> list[str]:
    step("Fetching all videos in playlist…")

    result = subprocess.run(
        [
            "yt-dlp", "--flat-playlist",
            "--print", "%(.{id,title,webpage_url,availability})j",
            "--no-warnings",
            playlist_url,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        err(f"yt-dlp error:\n{result.stderr}")
        sys.exit(1)

    lines = [l.strip() for l in result.stdout.strip().splitlines() if l.strip()]
    if not lines:
        warn("No videos returned. Check the playlist URL.")
        sys.exit(1)

    urls: list[str] = []
    skipped_private = 0
    for line in lines:
        try:
            v = json.loads(line)
        except json.JSONDecodeError:
            continue

        if not _is_public(v):
            skipped_private += 1
            continue

        url = v.get("webpage_url") or f"https://www.youtube.com/watch?v={v.get('id','')}"
        if url:
            urls.append(url)

    if skipped_private:
        warn(f"Skipped {skipped_private} private/unavailable video(s).")

    return urls


# ── Input helpers ────────────────────────────────────────────────────────────

def ask_int(label: str, hint: str = "") -> int:
    while True:
        raw = prompt(label, hint)
        try:
            val = int(raw)
            if val > 0:
                return val
            warn("Must be a positive number.")
        except ValueError:
            warn("Please enter a whole number.")


def ask_float(label: str, hint: str = "") -> float:
    while True:
        raw = prompt(label, hint)
        try:
            val = float(raw)
            if val >= 0:
                return val
            warn("Must be 0 or greater.")
        except ValueError:
            warn("Please enter a number (e.g. 5 or 7.5).")


def ask_choice(label: str, choices: list[str]) -> str:
    """Show a numbered menu and return the chosen value."""
    blank()
    print(f"  {C.B}{label}{C.R}")
    for i, ch in enumerate(choices, 1):
        print(f"    {C.DIM}{i}.{C.R}  {C.BWHT}{ch}{C.R}")
    blank()
    while True:
        raw = prompt("Enter number").lower()
        for i, ch in enumerate(choices, 1):
            if raw == str(i) or raw == ch.lower():
                return ch
        warn(f"Please enter a number between 1 and {len(choices)}.")


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    header("YouTube Video Filter")
    check_yt_dlp()

    mode = ask_choice("What would you like to filter?", ["Channel", "Playlist"])

    if mode == "Channel":
        blank()
        channel_url  = prompt("YouTube channel URL", "e.g. https://www.youtube.com/@mkbhd")
        blank()
        top_x        = ask_int  ("How many videos?",          "latest N videos that pass the filter")
        min_mins     = ask_float("Minimum duration (minutes)", "videos shorter than this will be skipped")

        blank()
        rule()
        step("Getting channel name…")
        channel_name = get_channel_name(channel_url)
        info(f"Channel  :  {channel_name}")
        info(f"Filter   :  latest {top_x} videos  ≥ {min_mins} min  (private videos excluded)")
        blank()

        urls = fetch_channel_videos(channel_url, top_x, min_mins)

    else:  # Playlist
        blank()
        playlist_url = prompt("YouTube playlist URL", "e.g. https://www.youtube.com/playlist?list=...")
        blank()
        rule()
        info("Private videos in the playlist will be excluded automatically.")
        blank()

        urls = fetch_playlist_videos(playlist_url)

    blank()

    if not urls:
        warn("No qualifying videos found.")
        return 0

    OUTPUT_FILE.write_text("\n".join(urls) + "\n", encoding="utf-8")

    ok(f"{len(urls)} URL(s) saved to:  {OUTPUT_FILE}")
    blank()
    info("Next step:")
    print(f"    {C.BCYN}uv run download_captions.py \"{OUTPUT_FILE}\"{C.R}")
    blank()
    return 0


if __name__ == "__main__":
    sys.exit(main())