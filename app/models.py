from pydantic import BaseModel


class InstantStatRequest(BaseModel):
    timestamp: int
    wpm: int
    rawWpm: int
    acc: int
    consistency: int
    timeMs: int
    correctChars: int
    wrongChars: int
    extraChars: int
    missedChars: int
    totalKeystrokes: int  # RENAMED from totalChars
    isValid: bool = True  # NEW: Validation flag for gaming prevention
    validationFlags: str = ""  # NEW: Comma-separated validation flags


class ProgressRequest(BaseModel):
    progress: int


class StatRequest(BaseModel):
    correct_words: int
    time_ms: int
    total_keys: int
    correct_keys: int
    mistakes: int = 0
    is_completed: bool = False
    pages_completed: int = 0
