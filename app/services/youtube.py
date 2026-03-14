import re
import time
# ── Tuning constants ──────────────────────────────────────────────────────────
PAGE_TARGET_WORDS = 425
PAGES_PER_PART = 5
SENTENCES_PER_PARA = 3

# ── Bangla digit map ──────────────────────────────────────────────────────────
ASCII_TO_BANGLA_DIGIT = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")

# ── Allowed character set (post-assembly sanitizer) ───────────────────────────
BIJOY_ALLOWED_PUNCTUATION = set("।,।.!?()-:;'\"%%*+=_@#^~`[]{}/<>|\\=")

# ── Sentence enders ───────────────────────────────────────────────────────────
SENTENCE_ENDERS = frozenset("।?!")

# ── SponsorBlock categories to remove ────────────────────────────────────────
SPONSORBLOCK_CATEGORIES = frozenset(
    {
        "sponsor",  # paid promotions
        "selfpromo",  # unpaid self-promotion
        "interaction",  # like/subscribe/bell reminders
        "intro",  # channel intro
        "outro",  # end-of-video outro
        "preview",  # preview of upcoming content
        "filler",  # filler tangents unrelated to topic
        "music_offtopic",  # background music sections
    }
)


# ── STEP 1: VTT parsers ───────────────────────────────────────────────────────
def parse_vtt(vtt_content: str) -> str:
    """Parse VTT, discarding timestamps. Returns plain text (fallback path)."""
    timestamp_re = re.compile(r"^\d{2}:\d{2}[\d:,.]+\s*-->")
    tag_re = re.compile(r"<[^>]+>")
    position_re = re.compile(r"align:\w+|position:\S+|line:\S+|size:\S+")
    skip_headers = ["WEBVTT", "Kind:", "Language:", "NOTE"]

    lines = []
    prev = None
    for line in vtt_content.splitlines():
        line = line.strip()
        if not line:
            continue
        if timestamp_re.match(line) or position_re.search(line):
            continue
        if any(line.startswith(h) for h in skip_headers):
            continue
        line = tag_re.sub("", line).strip()
        line = re.sub(r"^>>\s*", "", line)
        if not line or line == prev:
            continue
        prev = line
        lines.append(line)

    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def parse_vtt_with_timestamps(vtt_content: str) -> list[tuple[float, float, str]]:
    """
    Parse VTT keeping timing info. Returns list of (start_sec, end_sec, text).
    Inline timing tags like <00:00:01.234> are stripped from text.
    Duplicate/overlapping cues (common in auto-captions) are deduplicated.
    """
    timestamp_re = re.compile(
        r"(\d{1,2}):(\d{2}):([\d.]+)\s*-->\s*(\d{1,2}):(\d{2}):([\d.]+)"
    )
    tag_re = re.compile(r"<[^>]+>")
    position_re = re.compile(r"align:\w+|position:\S+|line:\S+|size:\S+")
    skip_headers = ["WEBVTT", "Kind:", "Language:", "NOTE"]

    def to_sec(h, m, s):
        return int(h) * 3600 + int(m) * 60 + float(s)

    cues: list[tuple[float, float, str]] = []
    current_start = current_end = None
    current_lines: list[str] = []

    def flush():
        nonlocal current_start, current_end, current_lines
        if current_start is not None and current_lines:
            text = " ".join(current_lines).strip()
            if text:
                cues.append((current_start, current_end, text))
        current_start = current_end = None
        current_lines = []

    for line in vtt_content.splitlines():
        raw = line.strip()
        if not raw:
            flush()
            continue

        m = timestamp_re.search(raw)
        if m:
            flush()
            current_start = to_sec(m.group(1), m.group(2), m.group(3))
            current_end = to_sec(m.group(4), m.group(5), m.group(6))
            continue

        if any(raw.startswith(h) for h in skip_headers):
            continue
        if position_re.search(raw):
            continue

        cleaned = tag_re.sub("", raw).strip()
        cleaned = re.sub(r"^>>\s*", "", cleaned)
        if cleaned and current_start is not None:
            current_lines.append(cleaned)

    flush()

    # Deduplicate: YouTube auto-captions use rolling text.
    # If a new cue starts with the exact text of the previous cue,
    # it is an extension (e.g. "I" -> "I am" -> "I am here").
    # We collapse them into the final longest string.
    deduped: list[tuple[float, float, str]] = []
    for start, end, text in cues:
        if deduped and text.startswith(deduped[-1][2]):
            # Overwrite the previous cue, taking the new longer text
            # but preserving the original start time
            deduped[-1] = (deduped[-1][0], end, text)
        else:
            deduped.append((start, end, text))

    return deduped


def vtt_timed_words(cues: list[tuple[float, float, str]]) -> list[tuple[float, str]]:
    """
    Expand cues into individual (timestamp, word) pairs.
    Each word in a cue is assigned the cue's start time.
    """
    result: list[tuple[float, str]] = []
    for start, _end, text in cues:
        for word in text.split():
            if word:
                result.append((start, word))
    return result


def filter_sponsorblock(
    timed_words: list[tuple[float, str]],
    sponsor_segments: list[dict],
) -> list[str]:
    """
    Remove words whose timestamps fall inside any SponsorBlock segment
    belonging to a relevant category. Returns plain word list.
    """
    if not sponsor_segments:
        return [w for _, w in timed_words]

    # Build flat list of (start, end) intervals to drop
    drop_intervals: list[tuple[float, float]] = []
    for seg in sponsor_segments:
        cat = seg.get("category", "")
        if cat in SPONSORBLOCK_CATEGORIES:
            # yt-dlp surfaces these as start_time/end_time on chapter dicts
            s = float(seg.get("start_time", seg.get("start", 0)))
            e = float(seg.get("end_time", seg.get("end", 0)))
            if e > s:
                drop_intervals.append((s, e))

    if not drop_intervals:
        return [w for _, w in timed_words]

    def in_drop(t: float) -> bool:
        return any(s <= t <= e for s, e in drop_intervals)

    kept = [w for t, w in timed_words if not in_drop(t)]
    dropped = len(timed_words) - len(kept)
    if dropped:
        print(
            f"[SponsorBlock] Removed {dropped} words across "
            f"{len(drop_intervals)} segment(s)"
        )
    return kept


# ── STEP 1b: Python pre-processor ────────────────────────────────────────────
def preprocess_transcript(text: str) -> str:
    """
    Clean the raw VTT transcript using pure Python — no AI needed.
    1. Strip bracketed noise/sound tags like [মিউজিক], [Music], [Applause].
    2. Remove & and $ characters.
    3. Remove all ASCII letters (stray English chars left by captions).
    4. Replace ASCII digits 0-9 with Bangla digits ০-৯.
    5. Collapse extra whitespace.
    """
    text = re.sub(r"\[[^\]]{0,40}\]", " ", text, flags=re.IGNORECASE)
    text = text.replace("&", "").replace("$", "")
    text = re.sub(r"[A-Za-z]+", " ", text)
    text = text.translate(ASCII_TO_BANGLA_DIGIT)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_into_sentences(words: list[str]) -> list[list[str]]:
    """
    Group words into sentences, splitting after each sentence-ending word
    or forcefully splitting after roughly 15-20 words to ensure readable chunks
    when processing YouTube's punctuation-free auto-captions.
    """
    sentences: list[list[str]] = []
    current: list[str] = []
    
    for w in words:
        current.append(w)
        
        # Split condition: natural punctuation OR chunk gets too long
        if (w and w[-1] in SENTENCE_ENDERS) or len(current) >= 18:
            sentences.append(current)
            current = []
            
    if current:
        sentences.append(current)
    return sentences


def build_candidate_pages(
    words: list[str], target_words: int = PAGE_TARGET_WORDS
) -> list[dict]:
    """
    Split words into candidate pages of ~target_words, always cutting at a
    sentence boundary. Returns a list of page dicts:
      { 'idx': 1-based int, 'words': [...], 'sentences': [[...], ...] }
    """
    sentences = split_into_sentences(words)
    pages: list[dict] = []
    current_sents: list[list[str]] = []
    current_count = 0
    page_idx = 1

    for sent in sentences:
        current_sents.append(sent)
        current_count += len(sent)
        if current_count >= target_words:
            page_words = [w for s in current_sents for w in s]
            pages.append(
                {"idx": page_idx, "words": page_words, "sentences": current_sents}
            )
            page_idx += 1
            current_sents = []
            current_count = 0

    if current_sents:
        page_words = [w for s in current_sents for w in s]
        pages.append({"idx": page_idx, "words": page_words, "sentences": current_sents})

    return pages




# ── STEP 3: Local Assembly ────────────────────────────────────────────────────




def assemble_final_text(pages: list[dict]) -> str:
    """
    Apply local rules to the pre-segmented pages and produce the final
    marked-up text with ==**part**== / ==%%page%%== / newline structure.
    """
    print(f"[ASSEMBLER] Starting with {len(pages)} pages")
    output_lines: list[str] = []
    
    current_part = 1
    current_page_in_part = 1
    
    # ── Re-using existing bangla_nums mapping or simple logic ────────────────
    bangla_digits = "০১২৩৪৫৬৭৮৯"
    def to_bn(n: int) -> str:
        return "".join(bangla_digits[int(d)] for d in str(n))

    part_open = False
    
    for i, page in enumerate(pages):
        # Open new Part if first page or after PAGES_PER_PART
        if i % PAGES_PER_PART == 0:
            if part_open:
                # Close previous part
                output_lines.append(f"==**part {to_bn(current_part - 1)}**==")
                output_lines.append("")
                
            part_label = f"part {to_bn(current_part)}"
            output_lines.append(f"==**{part_label}**==")
            part_open = True
            current_part += 1
            current_page_in_part = 1

        # Open page
        page_label = f"page{to_bn(current_page_in_part)}"
        output_lines.append(f"==%%{page_label}%%==")

        # Emit sentences with paragraph breaks
        for s_idx, sent in enumerate(page["sentences"], 1):
            output_lines.append(" ".join(sent))
            # Insert paragraph break every SENTENCES_PER_PARA sentences
            if s_idx % SENTENCES_PER_PARA == 0 and s_idx < len(page["sentences"]):
                output_lines.append("")

        # Close page
        output_lines.append(f"==%%{page_label}%%==")
        current_page_in_part += 1

    if part_open:
        output_lines.append(f"==**part {to_bn(current_part - 1)}**==")

    return "\n".join(output_lines)


# ── Post-processing ───────────────────────────────────────────────────────────


# ── Early Sanitization (runs before page building) ───────────────────────────
def sanitize_words_for_bijoy(words: list[str]) -> list[str]:
    """
    Remove non-Bijoy characters from words before building pages.
    This ensures word counts stay accurate and coordinates don't drift
    after the sentences are grouped.
    """
    cleaned = []
    for word in words:
        out = []
        for ch in word:
            cp = ord(ch)
            # Bengali Unicode range
            if 0x0980 <= cp <= 0x09FF:
                out.append(ch)
            # Allow spaces and tabs
            elif ch in (" ", "\t"):
                out.append(ch)
            # Allow allowed punctuation (but not the whole word if it's only punctuation)
            elif ch in BIJOY_ALLOWED_PUNCTUATION:
                out.append(ch)
        if out:
            cleaned_word = "".join(out)
            # Only keep words that have at least one Bangla character or are punctuation
            has_bangla = any(0x0980 <= ord(c) <= 0x09FF for c in cleaned_word)
            if has_bangla or cleaned_word in BIJOY_ALLOWED_PUNCTUATION:
                cleaned.append(cleaned_word)
            elif cleaned_word in (" ", "\t"):
                cleaned.append(cleaned_word)
    return cleaned


def sanitize_for_bijoy(text: str) -> str:
    """Strip non-Bijoy characters from content lines. Marker lines untouched."""
    marker_re = re.compile(r"^\s*(==\*\*.*?\*\*==|==%%.*?%%==|==!!.*?!!==)\s*$")
    cleaned = []
    for line in text.split("\n"):
        if marker_re.match(line):
            cleaned.append(line)
            continue
        out = []
        for ch in line:
            cp = ord(ch)
            if 0x0980 <= cp <= 0x09FF:
                out.append(ch)
            elif ch in (" ", "\t"):
                out.append(ch)
            elif ch in BIJOY_ALLOWED_PUNCTUATION or ch == "-":
                out.append(ch)
        cleaned.append("".join(out))
    return "\n".join(cleaned)


def post_process_content(text: str) -> str:
    text = sanitize_for_bijoy(text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


# ── SponsorBlock segment extractor ───────────────────────────────────────────
def extract_sponsorblock_segments(info: dict) -> list[dict]:
    """
    Pull SponsorBlock segments from the yt-dlp info dict.
    yt-dlp stores them under 'sponsorblock_chapters' when the
    sponsorblock_api option is provided. Each entry looks like:
      {'category': 'sponsor', 'start_time': 12.3, 'end_time': 45.6, ...}
    Falls back to an empty list if the key is absent or data is malformed.
    """
    segments = info.get("sponsorblock_chapters", [])
    if not isinstance(segments, list):
        return []
    return segments


# ── Main processing endpoint ──────────────────────────────────────────────────
