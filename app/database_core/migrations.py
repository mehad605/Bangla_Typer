import sqlite3

def safe_add_column(c, table, column_def):
    try:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
    except sqlite3.OperationalError:
        pass

def run_migrations(c):
    safe_add_column(c, "video_session_parts", "mistakes INTEGER DEFAULT 0")
    safe_add_column(c, "video_session_parts", "pages_completed INTEGER DEFAULT 0")
    safe_add_column(c, "video_page_states", "page_chars_correct INTEGER DEFAULT 0")
    safe_add_column(c, "video_page_states", "page_chars_wrong INTEGER DEFAULT 0")
    safe_add_column(c, "video_page_states", "page_keystrokes_total INTEGER DEFAULT 0")
    safe_add_column(c, "video_page_states", "page_keystrokes_correct INTEGER DEFAULT 0")
    safe_add_column(c, "video_page_states", "page_keystrokes_wrong INTEGER DEFAULT 0")
    safe_add_column(c, "instant_stats", "isValid INTEGER DEFAULT 1")
    safe_add_column(c, "instant_stats", "validationFlags TEXT DEFAULT ''")
    _migrate_instant_stats(c)

def _migrate_instant_stats(c):
    try:
        c.execute("PRAGMA table_info(instant_stats)")
        columns = [col[1] for col in c.fetchall()]
        if "totalChars" in columns and "totalKeystrokes" not in columns:
            try:
                c.execute("ALTER TABLE instant_stats RENAME COLUMN totalChars TO totalKeystrokes")
                return
            except sqlite3.OperationalError:
                pass
            c.execute("CREATE TABLE IF NOT EXISTS instant_stats_new (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, wpm INTEGER, rawWpm INTEGER, acc INTEGER, consistency INTEGER, timeMs INTEGER, correctChars INTEGER, wrongChars INTEGER, extraChars INTEGER, missedChars INTEGER, totalKeystrokes INTEGER, isValid INTEGER DEFAULT 1, validationFlags TEXT DEFAULT '')")
            c.execute("INSERT INTO instant_stats_new SELECT id, timestamp, wpm, rawWpm, acc, consistency, timeMs, correctChars, wrongChars, extraChars, missedChars, totalChars, isValid, validationFlags FROM instant_stats")
            c.execute("DROP TABLE instant_stats")
            c.execute("ALTER TABLE instant_stats_new RENAME TO instant_stats")
    except sqlite3.OperationalError:
        pass
