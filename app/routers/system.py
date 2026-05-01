from fastapi import APIRouter, HTTPException, Query
import sqlite3
import os
import sys
import random
import json
from pathlib import Path
from typing import Optional
from fastapi.responses import StreamingResponse
from app import paths
from app.services.word_processor import sync_all_files

router = APIRouter()
...
@router.get("/learn/sync-words")
async def sync_user_words():
    def event_generator():
        def send_event(data):
            return f"data: {json.dumps(data)}\n\n"

        try:
            yield send_event({"status": "starting", "message": "স্ক্যান করা হচ্ছে..."})
            
            def progress(current, total):
                # This is tricky since it's a synchronous callback in an async generator.
                # But for a local server, it's usually fine.
                pass 

            # We'll use a slightly different approach for streaming progress
            from app.services.word_processor import get_db
            import os
            
            data_dir = Path(paths.DATA_DIR)
            all_files = list(data_dir.rglob("*.txt"))
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
                yield send_event({"status": "done", "message": "ইতিমধ্যে আপডেট করা আছে", "new_words": 0, "processed": 0})
                return

            total = len(files_to_process)
            new_words_total = 0
            
            from app.services.word_processor import process_text_file
            for i, f in enumerate(files_to_process):
                yield send_event({
                    "status": "processing", 
                    "current": i + 1, 
                    "total": total, 
                    "file": f.name
                })
                new_words = process_text_file(f)
                new_words_total += new_words

            yield send_event({
                "status": "done", 
                "message": f"সফলভাবে {new_words_total} টি নতুন শব্দ যুক্ত করা হয়েছে", 
                "new_words": new_words_total, 
                "processed": total
            })

        except Exception as e:
            yield send_event({"status": "error", "message": str(e)})

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Two-tier database architecture
if getattr(sys, "frozen", False):
    # PyInstaller bundles files in sys._MEIPASS
    STATIC_DB = os.path.join(sys._MEIPASS, 'learn_static.db')
else:
    STATIC_DB = 'learn_static.db'  # Development root

USER_DB = 'Bangla Data/typer_data.db' # Dynamic user database

def get_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/learn/words")
async def get_learn_words(
    section: str, # 'letters', 'kar', 'fola', or 'juktakkhor'
    allowed_chars: str, # e.g. "অআকখ"
    allowed_kars: Optional[str] = "", # e.g. "াি"
    allowed_folas: Optional[str] = "", # e.g. "্য"
    allowed_juktakkhor: Optional[str] = "", # e.g. "ক্ক" (comma separated or raw string)
    min_len: int = 2,
    max_len: int = 10,
    limit: int = 20
):
    """
    Fetch words using progressive filtering rules.
    1. Letters Mode: ONLY allowed_chars, no markings.
    2. Kar Mode: allowed_chars + allowed_kars, no folas/jukta.
    3. Fola Mode: allowed_chars + allowed_kars + allowed_folas.
    4. Juktakkhor Mode: letters + kars + folas + target juktakkhor.
    """
    
    def fetch_pool(cur_min, cur_max):
        pool = []
        for db_path in [STATIC_DB, USER_DB]:
            if not os.path.exists(db_path): continue
            
            try:
                conn = get_connection(db_path)
                cursor = conn.cursor()
                
                # Section-aware juktakkhor filtering:
                # Letters and Kar sections MUST have NO juktakkhor.
                # Fola and Juktakkhor sections MUST have juktakkhor.
                if section in ['fola', 'juktakkhor']:
                    jukta_clause = "AND has_juktakkhor = 1"
                else:
                    jukta_clause = "AND has_juktakkhor = 0"

                # Fetch words within length range
                table_name = 'dictionary' if db_path == STATIC_DB else 'learn_dictionary'
                
                if db_path == USER_DB:
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='learn_dictionary'")
                    if not cursor.fetchone(): 
                        conn.close()
                        continue

                cursor.execute(f"""
                    SELECT word FROM {table_name}
                    WHERE length >= ? AND length <= ? {jukta_clause}
                """, (cur_min, cur_max))
                
                rows = cursor.fetchall()
                conn.close()
                
                # 1. Identify allowed base characters and fola sequences
                allowed_chars_set = set(allowed_chars)
                allowed_kars_set = set(allowed_kars) if allowed_kars else set()
                allowed_folas_set = set(allowed_folas) if allowed_folas else set()
                
                # Parse juktakkhor into a list if it's comma separated or just raw
                # Note: Juktakkhor are complex sequences like 'ক্ক'
                target_jukta_list = []
                if allowed_juktakkhor:
                    if ',' in allowed_juktakkhor:
                        target_jukta_list = [j.strip() for j in allowed_juktakkhor.split(',')]
                    else:
                        # If not comma separated, we might have multiple jukta in one string
                        # This is tricky since they are variable length. 
                        # But for single lessons, it's usually one juktakkhor.
                        target_jukta_list = [allowed_juktakkhor]

                # For subset check, we ignore Hasantas (handled by conjunct check)
                all_allowed_base = allowed_chars_set | allowed_kars_set | allowed_folas_set
                # Also add base letters from target juktakkhor to all_allowed_base
                for jukta in target_jukta_list:
                    all_allowed_base.update(set(jukta))
                
                if '্' in all_allowed_base: all_allowed_base.remove('্')
                
                # Identify allowed fola sequences
                legal_fola_seqs = []
                fstr = allowed_folas if allowed_folas else ""
                k = 0
                while k < len(fstr):
                    if fstr[k] == '্':
                        if k < len(fstr)-1: legal_fola_seqs.append('্' + fstr[k+1])
                    elif k < len(fstr)-1 and fstr[k+1] == '্':
                        legal_fola_seqs.append(fstr[k] + '্')
                    k += 1

                for row in rows:
                    word = row['word']
                    
                    # Check 1: Base Character Set
                    word_base_chars = {c for c in word if c != '্'}
                    if not word_base_chars.issubset(all_allowed_base):
                        continue
                    
                    # Check 2: Conjunct Integrity
                    has_mandatory = False
                    has_illegal_jukta = False
                    
                    if section in ['fola', 'juktakkhor']:
                        # We need to find every conjunct in the word and see if it's allowed
                        # A conjunct is char + hasanta + char (or multiple)
                        # We'll use a sliding window/regex or simple walk
                        j = 0
                        while j < len(word):
                            if word[j] == '্':
                                # This is a joiner. Check if the structure it belongs to is allowed.
                                is_valid_structure = False
                                
                                # Check against target juktakkhor
                                for jukta in target_jukta_list:
                                    if jukta in word:
                                        # Note: This is a bit loose but effective for single-jukta lessons
                                        # To be precise, we check if this SPECIFIC hasanta is part of it
                                        h_idx = jukta.find('্')
                                        if h_idx != -1:
                                            # If jukta is 'ক্ক' (ক+্+ক)
                                            # and word has 'ক্ক' at index 'start'
                                            # then word[start+1] is the hasanta.
                                            start_search = 0
                                            while True:
                                                found_at = word.find(jukta, start_search)
                                                if found_at == -1: break
                                                if found_at + h_idx == j:
                                                    is_valid_structure = True
                                                    has_mandatory = True
                                                    break
                                                start_search = found_at + 1
                                        if is_valid_structure: break
                                
                                if not is_valid_structure:
                                    # Check against legal fola sequences
                                    for seq in legal_fola_seqs:
                                        if seq[0] == '্': 
                                            if j < len(word)-1 and word[j+1] == seq[1]:
                                                is_valid_structure = True
                                                if section == 'fola': has_mandatory = True
                                                break
                                        else: 
                                            if j > 0 and word[j-1] == seq[0]:
                                                is_valid_structure = True
                                                if section == 'fola': has_mandatory = True
                                                break
                                
                                if not is_valid_structure:
                                    has_illegal_jukta = True; break
                            j += 1
                        
                        if has_illegal_jukta or not has_mandatory:
                            continue
                    
                    # Check 3: Mandatory Inclusion for non-complex sections
                    if section == 'letters':
                        if not (set(word) & allowed_chars_set): continue
                    elif section == 'kar':
                        if not (set(word) & allowed_kars_set): continue
                    
                    pool.append(word)
                    
            except Exception as e:
                print(f"Error reading {db_path}: {e}")
        return pool

    # 1. Attempt with strict length constraints
    all_words = fetch_pool(min_len, max_len)
    
    # 2. Fallback: If no words found, retry with any length (up to a reasonable 20)
    if not all_words:
        all_words = fetch_pool(2, 20)

    # 3. Return randomized subset
    random.shuffle(all_words)
    return {"words": all_words[:limit]}
