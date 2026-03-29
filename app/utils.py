import re

def safe_name(text: str, max_len: int = 80) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", text).strip(". ")
    return cleaned[:max_len] or "untitled"
