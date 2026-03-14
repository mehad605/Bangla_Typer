#!/usr/bin/env python3
"""
process_captions.py — Self-contained VTT → Book-formatted text pipeline.

Reads YouTube VTT caption files and produces clean, book-formatted Bangla text
structured as: Metadata → Parts (chapters) → Pages → Paragraphs.

Strategy: Pure local processing — no AI API calls. VTT files are cleaned using
rolling-duplicate removal and regex-based tag stripping (cinvert logic), then
structured into Parts and Pages based on word-count targets.

Queue:    Sorted by file size ascending — short files first, so you get results
          fast and can catch config issues early.

Usage:
    uv run ttt.py                      # all *.vtt in ./temp/
    uv run ttt.py path/to/video.vtt    # single specific file
    uv run ttt.py --force              # re-process already-done files
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from pathlib import Path


# =============================================================================
# TERMINAL OUTPUT  (pure ANSI — zero extra dependencies)
# =============================================================================


class _C:
    _ok = sys.stdout.isatty()
    R = "\033[0m" if _ok else ""
    B = "\033[1m" if _ok else ""
    DIM = "\033[2m" if _ok else ""
    RED = "\033[31m" if _ok else ""
    GRN = "\033[32m" if _ok else ""
    YLW = "\033[33m" if _ok else ""
    BLU = "\033[34m" if _ok else ""
    MAG = "\033[35m" if _ok else ""
    CYN = "\033[36m" if _ok else ""
    WHT = "\033[37m" if _ok else ""
    BRED = "\033[91m" if _ok else ""
    BGRN = "\033[92m" if _ok else ""
    BYLW = "\033[93m" if _ok else ""
    BCYN = "\033[96m" if _ok else ""
    BWHT = "\033[97m" if _ok else ""
    BG_RED = "\033[41m" if _ok else ""
    BG_GRN = "\033[42m" if _ok else ""
    BG_YLW = "\033[43m" if _ok else ""
    BG_BLK = "\033[40m" if _ok else ""
    BLK = "\033[30m" if _ok else ""


_W = 68  # box / rule width


def _plain(s: str) -> str:
    return re.sub(r"\033\[[\d;]*m", "", s)


def _rule(ch: str = "─", c: str = "") -> str:
    return f"{c}{ch * _W}{_C.R}"


def _box_top(c: str = _C.BLU) -> str:
    return f"{c}╭{'─' * (_W - 2)}╮{_C.R}"


def _box_bot(c: str = _C.BLU) -> str:
    return f"{c}╰{'─' * (_W - 2)}╯{_C.R}"


def _box_row(text: str, c: str = _C.BLU) -> str:
    inner = _W - 4
    pad = max(0, inner - len(_plain(text)))
    return f"{c}│{_C.R} {text}{' ' * pad} {c}│{_C.R}"


def _badge(label: str, bg: str, fg: str = "") -> str:
    return f"{bg}{fg}{_C.B} {label} {_C.R}"


def _trunc(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1] + "…"


def log_startup(total: int, src_dir: str) -> None:
    print()
    print(_rule("━", _C.DIM))
    print(
        f"  {_C.B}{_C.BCYN}process_captions{_C.R}  "
        f"{_C.DIM}queue{_C.R} {_C.B}{_C.BWHT}{total}{_C.R}  "
        f"{_C.DIM}src{_C.R} {_C.DIM}{src_dir}{_C.R}  "
        f"{_C.DIM}sorted by size ↑{_C.R}"
    )
    print(_rule("━", _C.DIM))
    print()


def log_index_loaded(n: int) -> None:
    print(
        f"  {_C.DIM}input.txt  {_C.BGRN}✓{_C.R}  "
        f"{_C.BWHT}{n}{_C.R}{_C.DIM} entries loaded{_C.R}"
    )


def log_index_missing() -> None:
    print(f"  {_C.DIM}input.txt  {_C.BYLW}⚠  not found — URL/Title will be N/A{_C.R}")


def log_file_header(i: int, total: int, name: str, size_kb: float) -> None:
    print()
    print(_box_top(_C.BLU))
    max_name = _W - 24
    display = _trunc(name, max_name)
    counter = f"{_C.DIM}[{i}/{total}]{_C.R}"
    fname = f"{_C.B}{_C.BWHT}{display}{_C.R}"
    size_str = f"{_C.DIM}{size_kb:.0f}kb{_C.R}"
    print(_box_row(f"{counter}  {fname}  {size_str}", _C.BLU))
    print(_box_bot(_C.BLU))


def log_meta(channel: str, title: str, url: str, out: str) -> None:
    max_v = _W - 14

    def row(key: str, val: str) -> None:
        print(f"  {_C.DIM}{key:<9}{_C.R}  {val}")

    row("channel", f"{_C.BCYN}{_trunc(channel, max_v)}{_C.R}")
    row("title", f"{_C.CYN}{_trunc(title, max_v)}{_C.R}")
    row(
        "url",
        (
            f"{_C.DIM}{_trunc(url, max_v)}{_C.R}"
            if url == "N/A"
            else f"{_C.BLU}{_trunc(url, max_v)}{_C.R}"
        ),
    )
    row("output", f"{_C.DIM}{_trunc(out, max_v)}{_C.R}")
    print(f"  {_C.DIM}{'─' * 56}{_C.R}")


def log_step(n: int, label: str) -> None:
    print(
        f"  {_C.BLU}{_C.B}●{_C.R}  {_C.DIM}step {n}{_C.R}  {_C.WHT}{label}{_C.R}",
        flush=True,
    )


def log_detail(key: str, val: str) -> None:
    print(f"       {_C.DIM}{key:<16}{_C.R}  {val}")


def log_skip(reason: str) -> None:
    print(f"  {_badge('SKIP', _C.BG_YLW, _C.BLK)}  {_C.BYLW}{reason}{_C.R}")


def log_warn(msg: str) -> None:
    print(f"  {_badge('WARN', _C.BG_YLW, _C.BLK)}  {_C.BYLW}{msg}{_C.R}")


def log_error(msg: str) -> None:
    print(f"  {_badge('ERROR', _C.BG_RED, _C.BWHT)}  {_C.BRED}{msg}{_C.R}")


def log_ok(
    out_file: str, parts: int, pages: int, elapsed: float
) -> None:
    fname = Path(out_file).name
    print(
        f"  {_badge('SAVED', _C.BG_GRN, _C.BLK)}  {_C.BGRN}{_trunc(fname, _W - 14)}{_C.R}"
    )
    print(
        f"       "
        f"{_C.DIM}parts{_C.R} {_C.BWHT}{parts}{_C.R}   "
        f"{_C.DIM}pages{_C.R} {_C.BWHT}{pages}{_C.R}   "
        f"{_C.DIM}time{_C.R} {_C.DIM}{elapsed:.1f}s{_C.R}"
    )


def log_channel_warn(data_dir: str) -> None:
    log_warn("No thumbnail found — writing alongside VTT")


def log_progress(done: int, total: int, ok: int, skipped: int, failed: int) -> None:
    pct = int(done / total * 100) if total else 0
    bar_w = 24
    filled = int(bar_w * done / total) if total else 0
    bar = f"{_C.BGRN}{'█' * filled}{_C.DIM}{'░' * (bar_w - filled)}{_C.R}"
    print(
        f"\n  {bar}  {_C.DIM}{pct:>3}%  {done}/{total}{_C.R}"
        f"   {_C.BGRN}✓ {ok}{_C.R}"
        f"   {_C.BYLW}↷ {skipped}{_C.R}"
        f"   {_C.BRED}✗ {failed}{_C.R}"
    )


def log_summary(ok: int, skipped: int, failed: int, total_time: float) -> None:
    print()
    print(_rule("━", _C.DIM))
    print(
        f"  {_C.B}Done.{_C.R}"
        f"   {_C.DIM}success{_C.R} {_C.BGRN}{_C.B}{ok}{_C.R}"
        f"   {_C.DIM}skipped{_C.R} {_C.BYLW}{_C.B}{skipped}{_C.R}"
        f"   {_C.DIM}failed{_C.R}  {_C.BRED}{_C.B}{failed}{_C.R}"
        f"   {_C.DIM}time{_C.R} {_C.DIM}{total_time:.1f}s{_C.R}"
    )
    print(_rule("━", _C.DIM))
    print()


# =============================================================================
# CONSTANTS
# =============================================================================

PAGE_TARGET_WORDS = 550

ASCII_TO_BANGLA_DIGIT = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
BIJOY_ALLOWED_PUNCT = frozenset("।,।.!?()-:;'\"%%*+=_@#^~`[]{}/<>|\\=")
SENTENCE_ENDERS = frozenset("।?!")

_BN_NUMS = [
    "",
    "১",
    "২",
    "৩",
    "৪",
    "৫",
    "৬",
    "৭",
    "৮",
    "৯",
    "১০",
    "১১",
    "১২",
    "১৩",
    "১৪",
    "১৫",
    "১৬",
    "১৭",
    "১৮",
    "১৯",
    "২০",
    "২১",
    "২২",
    "২৩",
    "২৪",
    "২৫",
    "২৬",
    "২৭",
    "২৮",
    "২৯",
    "৩০",
    "৩১",
    "৩২",
    "৩৩",
    "৩৪",
    "৩৫",
    "৩৬",
    "৩৭",
    "৩৮",
    "৩৯",
    "৪০",
    "৪১",
    "৪২",
    "৪৩",
    "৪৪",
    "৪৫",
    "৪৬",
    "৪৭",
    "৪৮",
    "৪৯",
    "৫০",
]


def _bn(n: int) -> str:
    return _BN_NUMS[n] if n < len(_BN_NUMS) else str(n)


# =============================================================================
# METADATA EXTRACTION
# =============================================================================


def _extract_vtt_header(content: str) -> tuple[str, str, dict]:
    marker = "==!!Meta Data!!=="
    if not content.lstrip().startswith(marker):
        return "", content, {}
    parts = content.split(marker, 2)
    if len(parts) < 3:
        return "", content, {}
    header_inner = parts[1]
    body = parts[2].lstrip()
    header_block = f"{marker}{header_inner}{marker}"
    parsed = {}
    for line in header_inner.strip().splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            parsed[key.strip()] = val.strip()
    return header_block, body, parsed


# =============================================================================
# STEP 1 — VTT CLEANING  (cinvert logic: rolling-dedup + tag stripping)
# =============================================================================

_INLINE_TIMESTAMP_RE = re.compile(r"<\d\d:\d\d:\d\d\.\d+>")
_TAG_STRIP_RE = re.compile(r"<.*?>")
_MUSIC_RE = re.compile(r"\[[^\]]{0,40}\]", re.IGNORECASE)
_SKIP_PREFIXES = ("WEBVTT", "Kind:", "Language:", "NOTE", "align:", "position:")
_CUE_TS_RE = re.compile(r"\d{1,2}:\d{2}:[\d.]+\s*-->")


def clean_vtt_lines(vtt_content: str) -> list[str]:
    """
    Extract clean text lines from VTT content using cinvert's rolling-dedup
    approach: strip cue headers, inline timestamps, HTML tags, music markers,
    then collapse rolling duplicates (partial-match dedup for caption overlap).
    """
    raw_lines: list[str] = []

    for line in vtt_content.splitlines():
        line = line.strip()

        if not line:
            continue

        # Skip VTT metadata and cue timestamp lines
        if any(line.startswith(p) for p in _SKIP_PREFIXES):
            continue
        if _CUE_TS_RE.search(line):
            continue

        # Strip inline word-level timestamps like <00:00:01.200>
        line = _INLINE_TIMESTAMP_RE.sub("", line)

        # Strip music/sound markers like [Music]
        line = _MUSIC_RE.sub("", line)

        # Strip remaining HTML tags (<c>, </c>, <b>, etc.)
        line = _TAG_STRIP_RE.sub("", line)

        line = line.strip()
        if line:
            raw_lines.append(line)

    # Rolling-duplicate collapse: if a new line starts with the previous line
    # (caption window overlap), extend rather than duplicate.
    deduped: list[str] = []
    for line in raw_lines:
        if deduped and line.startswith(deduped[-1]):
            deduped[-1] = line
        else:
            deduped.append(line)

    return deduped


# =============================================================================
# STEP 2 — PRE-PROCESSING
# =============================================================================

_RE_MUSIC_BRACKET = re.compile(r"\[[^\]]{0,40}\]", re.IGNORECASE)
_RE_ASCII_LETTERS = re.compile(r"[A-Za-z]+")
_RE_MULTI_SPACE = re.compile(r"\s+")
_RE_STRAY_SEMI = re.compile(r"\s*;\s*;\s*|\s+;\s+")
_RE_DOUBLE_SPACE = re.compile(r" {2,}")
_RE_QUAD_NEWLINE = re.compile(r"\n{4,}")
_MARKER_RE = re.compile(r"^\s*(==\*\*.*?\*\*==|==%%.*?%%==|==!!.*?!!==)\s*$")


def preprocess_transcript(text: str) -> str:
    text = _RE_MUSIC_BRACKET.sub(" ", text)
    text = text.replace("&", "").replace("$", "")
    text = _RE_ASCII_LETTERS.sub(" ", text)
    text = text.translate(ASCII_TO_BANGLA_DIGIT)
    return _RE_MULTI_SPACE.sub(" ", text).strip()


def sanitize_words_for_bijoy(words: list[str]) -> list[str]:
    cleaned: list[str] = []
    for word in words:
        out = []
        for ch in word:
            cp = ord(ch)
            if 0x0980 <= cp <= 0x09FF:
                out.append(ch)
            elif ch in (" ", "\t"):
                out.append(ch)
            elif ch in BIJOY_ALLOWED_PUNCT:
                out.append(ch)
        if out:
            cw = "".join(out)
            has_bangla = any(0x0980 <= ord(c) <= 0x09FF for c in cw)
            if has_bangla or cw in BIJOY_ALLOWED_PUNCT or cw in (" ", "\t"):
                cleaned.append(cw)
    return cleaned


# =============================================================================
# STEP 3 — PAGE BUILDING
# =============================================================================


def split_into_sentences(words: list[str]) -> list[list[str]]:
    sentences: list[list[str]] = []
    current: list[str] = []
    for w in words:
        current.append(w)
        if w and w[-1] in SENTENCE_ENDERS:
            sentences.append(current)
            current = []
    if current:
        sentences.append(current)
    return sentences


def build_candidate_pages(
    words: list[str], target: int = PAGE_TARGET_WORDS
) -> list[dict]:
    sentences = split_into_sentences(words)
    pages: list[dict] = []
    bucket: list[list[str]] = []
    count = 0
    idx = 1
    for sent in sentences:
        bucket.append(sent)
        count += len(sent)
        if count >= target:
            pages.append(
                {
                    "idx": idx,
                    "words": [w for s in bucket for w in s],
                    "sentences": bucket,
                }
            )
            idx += 1
            bucket = []
            count = 0
    if bucket:
        pages.append(
            {
                "idx": idx,
                "words": [w for s in bucket for w in s],
                "sentences": bucket,
            }
        )
    return pages


# =============================================================================
# STEP 4 — ASSEMBLE FINAL TEXT  (no-AI pass-through: all pages kept as-is)
# =============================================================================


PAGES_PER_PART = 6


def assemble_final_text(pages: list[dict]) -> str:
    """
    Assemble pages into book structure (Parts + Pages) without any AI
    restructuring. A new Part is opened every PAGES_PER_PART pages.
    """
    out: list[str] = []
    part_num = 1
    page_num = 1

    out.append(f"==**part {_bn(part_num)}**==")

    for i, pg in enumerate(pages):
        # Close current part and open a new one every PAGES_PER_PART pages
        if i > 0 and i % PAGES_PER_PART == 0:
            out.append(f"==**part {_bn(part_num)}**==")
            part_num += 1
            out.append(f"==**part {_bn(part_num)}**==")

        plabel = f"page{_bn(page_num)}"
        out.append(f"==%%{plabel}%%==")

        for sent in pg["sentences"]:
            out.append(" ".join(sent))

        out.append(f"==%%{plabel}%%==")
        page_num += 1

    out.append(f"==**part {_bn(part_num)}**==")

    return "\n".join(out)


# =============================================================================
# POST-PROCESSING
# =============================================================================


def _sanitize_for_bijoy(text: str) -> str:
    out: list[str] = []
    for line in text.split("\n"):
        if _MARKER_RE.match(line):
            out.append(line)
            continue
        cleaned = []
        for ch in line:
            cp = ord(ch)
            if 0x0980 <= cp <= 0x09FF:
                cleaned.append(ch)
            elif ch in (" ", "\t"):
                cleaned.append(ch)
            elif ch in BIJOY_ALLOWED_PUNCT or ch == "-":
                cleaned.append(ch)
        out.append("".join(cleaned))
    return "\n".join(out)


def post_process_content(text: str) -> str:
    text = _sanitize_for_bijoy(text)
    text = _RE_STRAY_SEMI.sub(" ", text)
    text = _RE_DOUBLE_SPACE.sub(" ", text)
    text = _RE_QUAD_NEWLINE.sub("\n\n\n", text)
    return text.strip()


# =============================================================================
# HELPERS
# =============================================================================


def _safe_name(text: str, max_len: int = 120) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", text).strip(". ")
    return cleaned[:max_len] or "untitled"


_INPUT_SEP = " | "


def _yt_dlp_stem(title: str) -> str:
    return re.sub(r'[ ,#!?:;\'\\"\\\\/*<>|]', "_", title).strip("_ ")


def _load_input_index(temp_dir: Path) -> dict[str, tuple[str, str]]:
    index: dict[str, tuple[str, str]] = {}
    input_file = temp_dir / "input.txt"
    if not input_file.exists():
        return index
    for raw in input_file.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        if _INPUT_SEP not in raw:
            continue
        url, _, title = raw.partition(_INPUT_SEP)
        url = url.strip()
        title = title.strip()
        if not url:
            continue
        entry = (url, title)
        vid_match = re.search(r"(?:v=|youtu\.be/)([\w-]{11})", url)
        if vid_match:
            index[vid_match.group(1)] = entry
        if title:
            index[_yt_dlp_stem(title)] = entry
            index[_safe_name(title)] = entry
    return index


def _lookup_video_meta(
    vtt_path: Path,
    index: dict[str, tuple[str, str]],
) -> tuple[str, str]:
    stem = vtt_path.stem
    if stem in index:
        return index[stem]
    vid_match = re.search(r"[\w-]{11}", stem)
    if vid_match and vid_match.group() in index:
        return index[vid_match.group()]
    return ("N/A", stem)


def _resolve_vtt_files(input_arg: str | None, temp_dir: Path) -> list[Path]:
    """Return VTT paths. When scanning temp/, sort ascending by file size so
    smaller (shorter) files are processed first — faster first results."""
    if not input_arg:
        if not temp_dir.exists():
            sys.exit(
                f"ERROR: temp directory not found: {temp_dir}\n"
                "       Pass a VTT path explicitly or create the temp/ folder."
            )
        files = list(temp_dir.glob("*.vtt"))
        if not files:
            log_warn(f"No .vtt files found in {temp_dir}.")
            sys.exit(0)
        files.sort(key=lambda p: p.stat().st_size)
        return files

    p = Path(input_arg)
    if not p.exists():
        sys.exit(f"ERROR: not found: {input_arg}")
    if p.suffix.lower() == ".txt":
        return [
            Path(ln.strip())
            for ln in p.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.startswith("#")
        ]
    return [p]


def _resolve_channel_dir(
    vtt_path: Path, data_dir: Path, fallback_channel: str
) -> tuple[str, Path]:
    """Resolve output dir from embedded metadata Channel field.
    Creates the channel folder under data_dir if it doesn't exist yet."""
    try:
        raw_content = vtt_path.read_text(encoding="utf-8")
        _, _, meta_vals = _extract_vtt_header(raw_content)
        channel = meta_vals.get("Channel", "").strip()
    except OSError:
        channel = ""

    if not channel:
        channel = fallback_channel

    channel_dir = data_dir / channel
    try:
        channel_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return channel, vtt_path.parent

    return channel, channel_dir


def _is_done(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        return len(path.read_text(encoding="utf-8").strip()) > 100
    except OSError:
        return False


# =============================================================================
# CORE: SINGLE FILE
# =============================================================================


def process_single_vtt(
    vtt_path: Path,
    out_dir: Path,
    force: bool = False,
    channel: str = "Unknown",
    url: str = "N/A",
    upload_date: str = "N/A",
    title_override: str | None = None,
) -> str:
    """Full pipeline for one VTT file. Returns 'ok' | 'skipped' | 'failed'."""
    t0 = time.monotonic()

    try:
        raw_content = vtt_path.read_text(encoding="utf-8")
    except OSError as e:
        log_error(f"Cannot read VTT: {e}")
        return "failed"

    embedded_header, vtt_body, meta_vals = _extract_vtt_header(raw_content)

    title = meta_vals.get(
        "Title",
        title_override
        if title_override and title_override != "N/A"
        else _safe_name(vtt_path.stem),
    )
    channel = meta_vals.get("Channel", channel)
    url = meta_vals.get("URL", url)

    out_file = out_dir / f"{_safe_name(vtt_path.stem)}.txt"

    log_meta(channel, title, url, str(out_file))

    if not force and _is_done(out_file):
        log_skip("Already processed.")
        return "skipped"

    # ------------------------------------------------------------------
    # Step 1 — Clean VTT using cinvert rolling-dedup logic
    # ------------------------------------------------------------------
    log_step(1, "Cleaning VTT  (cinvert rolling-dedup)")
    clean_lines = clean_vtt_lines(vtt_body)
    if not clean_lines:
        log_error("No lines extracted from VTT.")
        return "failed"
    log_detail("lines extracted", f"{_C.BWHT}{len(clean_lines)}{_C.R}")

    # ------------------------------------------------------------------
    # Step 2 — Preprocessing  (normalise, Bijoy-safe)
    # ------------------------------------------------------------------
    log_step(2, f"Preprocessing  ({len(clean_lines)} clean lines)")
    joined = " ".join(clean_lines)
    cleaned = preprocess_transcript(joined)
    words = sanitize_words_for_bijoy(cleaned.split())
    wc = len(words)
    log_detail("words kept", f"{_C.BWHT}{wc}{_C.R}")

    if wc == 0:
        log_error("No words survived preprocessing.")
        return "failed"
    if wc < 50:
        log_warn(f"Only {wc} words — output may be sparse.")

    # ------------------------------------------------------------------
    # Step 3 — Build candidate pages
    # ------------------------------------------------------------------
    log_step(3, "Building candidate pages")
    pages = build_candidate_pages(words, PAGE_TARGET_WORDS)
    pc = len(pages)
    log_detail("pages built", f"{_C.BWHT}{pc}{_C.R}")
    if not pages:
        log_error("No pages built.")
        return "failed"

    # ------------------------------------------------------------------
    # Step 4 — Assemble book text  (no AI — direct pass-through)
    # ------------------------------------------------------------------
    log_step(4, "Assembling book text  (local, no AI)")
    final_text = post_process_content(assemble_final_text(pages))

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        log_error(f"Cannot create output dir: {e}")
        return "failed"

    if embedded_header:
        meta = embedded_header + "\n\n"
    else:
        meta = (
            "==!!Meta Data!!==\n"
            "Source: YouTube\n"
            f"Title: {title}\n"
            f"Channel: {channel}\n"
            f"URL: {url}\n"
            f"Upload Date: {upload_date}\n"
            "==!!Meta Data!!==\n\n"
        )

    if not final_text.strip():
        stub = meta + "# No usable content found in this file.\n"
        try:
            out_file.write_text(stub, encoding="utf-8")
        except OSError as e:
            log_error(f"Cannot write stub file: {e}")
            return "failed"
        elapsed = time.monotonic() - t0
        log_warn(f"All {pc} page(s) produced no content. Stub written.")
        log_ok(str(out_file), 0, 0, elapsed)
        return "ok"

    try:
        out_file.write_text(meta + final_text.strip() + "\n", encoding="utf-8")
    except OSError as e:
        log_error(f"Cannot write output file: {e}")
        return "failed"

    parts_n = len(re.findall(r"==\*\*part", final_text, re.IGNORECASE))
    pages_n = len(re.findall(r"==%%page", final_text, re.IGNORECASE))
    elapsed = time.monotonic() - t0
    log_ok(str(out_file), parts_n, pages_n, elapsed)
    return "ok"


# =============================================================================
# CLI
# =============================================================================


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert YouTube VTT captions to book-formatted Bangla text.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "input",
        nargs="?",
        default=None,
        help="VTT file, .txt list, or omit to scan ./temp/ (sorted by size)",
    )
    parser.add_argument("--out", default=None, help="Output directory")
    parser.add_argument(
        "--force", action="store_true", help="Re-process already-done files"
    )
    parser.add_argument(
        "--channel", default="Unknown", help="Channel name for metadata"
    )
    args = parser.parse_args()

    _base_dir = Path.cwd()
    _data_dir = _base_dir / "Bangla Data"
    _temp_dir = _data_dir / "temp"

    vtt_files = _resolve_vtt_files(args.input, _temp_dir)
    input_index = _load_input_index(_temp_dir)

    if input_index:
        log_index_loaded(len(input_index))
    else:
        log_index_missing()

    total = len(vtt_files)
    log_startup(total, str(_temp_dir))

    out_dir_override = Path(args.out) if args.out else None

    ok = skipped = failed = 0
    wall_start = time.monotonic()

    for i, vtt_path in enumerate(vtt_files, 1):
        size_kb = vtt_path.stat().st_size / 1024 if vtt_path.exists() else 0.0
        log_file_header(
            i, total, vtt_path.name if vtt_path.exists() else str(vtt_path), size_kb
        )

        if not vtt_path.exists():
            log_skip(f"Not found: {vtt_path}")
            skipped += 1
            log_progress(i, total, ok, skipped, failed)
            continue

        if out_dir_override:
            out_dir = out_dir_override
            resolved_channel = args.channel
        else:
            resolved_channel, out_dir = _resolve_channel_dir(
                vtt_path, _data_dir, args.channel
            )

        vid_url, vid_title = _lookup_video_meta(vtt_path, input_index)

        result = process_single_vtt(
            vtt_path=vtt_path,
            out_dir=out_dir,
            force=args.force,
            channel=resolved_channel,
            url=vid_url,
            title_override=vid_title,
        )

        if result == "ok":
            ok += 1
        elif result == "skipped":
            skipped += 1
        else:
            failed += 1

        log_progress(i, total, ok, skipped, failed)

    log_summary(ok, skipped, failed, time.monotonic() - wall_start)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())