import re
import os
from pathlib import Path
from app.database import get_db

# Bangla Unicode Ranges
BANGLA_RANGE = r'[\u0980-\u09FF]'
HASANTA = '\u09CD'

# Kars (Dependent Vowels)
KARS = set('\u09BE\u09BF\u09C0\u09C1\u09C2\u09C3\u09C7\u09C8\u09CB\u09CC')

# Phalas (Common Phala sequences in Unicode)
PHALA_MAP = {
    '\u09CD\u09AF': '্য', # Ya-phala
    '\u09CD\u09B0': '্র', # Ra-phala
    '\u09CD\u09B2': '্ল', # La-phala
    '\u09CD\u09AC': '্ব', # Ba-phala
    '\u09CD\u09AE': '্ম', # Ma-phala
    '\u09CD\u09A8': '্ন', # Na-phala
}

def analyze_word(word: str):
    """
    Decompose a Bangla word into its components for the 'Learn' mode.
    Returns (chars, kars, folas, has_juktakkhor, length)
    """
    chars = set()
    kars = set()
    folas = set()
    has_jukta = False
    
    i = 0
    clean_length = 0
    while i < len(word):
        char = word[i]
        
        # Check for Phala (Hasanta + Consonant)
        if char == HASANTA and i + 1 < len(word):
            seq = word[i:i+2]
            if seq in PHALA_MAP:
                folas.add(PHALA_MAP[seq])
                i += 2
                continue
            else:
                has_jukta = True
        
        if char in KARS:
            kars.add(char)
        elif re.match(BANGLA_RANGE, char):
            if char != HASANTA:
                chars.add(char)
                clean_length += 1
        
        i += 1

    return (
        "".join(sorted(list(chars))),
        "".join(sorted(list(kars))),
        "".join(sorted(list(folas))),
        1 if has_jukta else 0,
        len(word) # Use raw length for UI consistency or clean_length? 
                  # Learn mode seems to use raw length for UI word limit.
    )

def process_text_file(file_path: Path):
    """Extract unique words from a text file and save to learn_dictionary."""
    if not file_path.exists():
        return 0

    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return 0

    # Tokenize: split by non-Bangla characters
    raw_words = re.findall(rf'{BANGLA_RANGE}+', content)
    unique_words = set(w for w in raw_words if 2 <= len(w) <= 15)
    
    new_count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for word in unique_words:
            try:
                c, k, f, hj, l = analyze_word(word)
                cursor.execute("""
                    INSERT OR IGNORE INTO learn_dictionary 
                    (word, chars, kars, folas, has_juktakkhor, length, source)
                    VALUES (?, ?, ?, ?, ?, ?, 'user')
                """, (word, c, k, f, hj, l))
                if cursor.rowcount > 0:
                    new_count += 1
            except Exception:
                continue
        
        # Mark file as processed
        mtime = os.path.getmtime(file_path)
        cursor.execute("""
            INSERT OR REPLACE INTO processed_words_files (file_path, last_modified, word_count)
            VALUES (?, ?, ?)
        """, (str(file_path), mtime, len(unique_words)))
        
        conn.commit()
    
    return new_count

def sync_all_files(data_dir: Path, progress_callback=None):
    """Recursively scan data_dir for .txt files and process new/modified ones."""
    all_files = list(data_dir.rglob("*.txt"))
    total = len(all_files)
    processed = 0
    new_words_total = 0
    
    # Filter files that need processing
    files_to_process = []
    with get_db() as conn:
        cursor = conn.cursor()
        for f in all_files:
            if "temp" in str(f): continue
            
            mtime = os.path.getmtime(f)
            cursor.execute("SELECT last_modified FROM processed_words_files WHERE file_path = ?", (str(f),))
            row = cursor.fetchone()
            
            if not row or row[0] < mtime:
                files_to_process.append(f)
    
    if not files_to_process:
        return 0, 0, True # Already up to date

    for i, f in enumerate(files_to_process):
        new_words = process_text_file(f)
        new_words_total += new_words
        processed += 1
        if progress_callback:
            progress_callback(i + 1, len(files_to_process))
            
    return processed, new_words_total, False
