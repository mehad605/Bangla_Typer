from fastapi import APIRouter, HTTPException, Query
import sqlite3
import os
import random
from typing import Optional

router = APIRouter()

# Two-tier database architecture
STATIC_DB = 'learn_static.db'  # Shipped with app
USER_DB = 'Bangla Data/typer_data.db' # Dynamic user database

def get_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/learn/words")
async def get_learn_words(
    section: str, # 'letters', 'kar', or 'fola'
    allowed_chars: str, # e.g. "অআকখ"
    allowed_kars: Optional[str] = "", # e.g. "াি"
    allowed_folas: Optional[str] = "", # e.g. "্য"
    min_len: int = 2,
    max_len: int = 10,
    limit: int = 20
):
    """
    Fetch words using progressive filtering rules.
    1. Letters Mode: ONLY allowed_chars, no markings.
    2. Kar Mode: allowed_chars + allowed_kars, no folas/jukta.
    3. Fola Mode: allowed_chars + allowed_kars + allowed_folas.
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
                # Fola section MUST have at least one fola (which IS a juktakkhor).
                if section == 'fola':
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
                
                # For subset check, we ignore Hasantas (handled by conjunct check)
                all_allowed_base = allowed_chars_set | allowed_kars_set | allowed_folas_set
                if '্' in all_allowed_base: all_allowed_base.remove('্')
                
                # Identify allowed fola sequences (e.g., '্য', '্র', 'র্')
                # These are extracted from the allowed_folas string which contains the fola signs.
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
                    
                    # Check 1: Base Character Set (excluding conjunct structure)
                    # Every char in word (except hasanta) must be in our allowed set.
                    word_base_chars = {c for c in word if c != '্'}
                    if not word_base_chars.issubset(all_allowed_base):
                        continue
                    
                    # Check 2: Conjunct Integrity (For Fola section)
                    has_mandatory = False
                    has_illegal_jukta = False
                    
                    if section == 'fola':
                        # Every hasanta MUST be part of an allowed fola sequence.
                        # No other conjuncts or folas allowed.
                        j = 0
                        while j < len(word):
                            if word[j] == '্':
                                found_allowed = False
                                # Try to match an allowed sequence at this position
                                for seq in legal_fola_seqs:
                                    if seq[0] == '্': # Standard Fola (্ + char)
                                        if j < len(word)-1 and word[j+1] == seq[1]:
                                            found_allowed = True; has_mandatory = True; break
                                    else: # Reph (char + ্)
                                        if j > 0 and word[j-1] == seq[0]:
                                            found_allowed = True; has_mandatory = True; break
                                
                                if not found_allowed:
                                    has_illegal_jukta = True; break
                            j += 1
                        
                        if has_illegal_jukta or not has_mandatory:
                            continue
                    
                    # Check 3: Mandatory Inclusion for non-fola sections
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
