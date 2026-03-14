import sqlite3
import os
from contextlib import contextmanager
from sqlite3 import Connection

from app import paths


def get_db_file():
    return str(paths.DATA_DIR / "typer_data.db")


_connection_pool = []
_pool_lock = __import__("threading").Lock()
_POOL_SIZE = 5


def init_db():
    paths.ensure_data_dirs()
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS progress (
                video_id TEXT PRIMARY KEY,
                progress_idx INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS part_stats (
                video_id TEXT,
                part_idx INTEGER,
                wpm INTEGER,
                acc INTEGER,
                PRIMARY KEY (video_id, part_idx)
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS part_stats_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT,
                part_idx INTEGER,
                timestamp INTEGER,
                wpm INTEGER,
                acc INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS instant_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                wpm INTEGER,
                rawWpm INTEGER,
                acc INTEGER,
                consistency INTEGER,
                timeMs INTEGER,
                correctChars INTEGER,
                wrongChars INTEGER,
                extraChars INTEGER,
                missedChars INTEGER,
                totalChars INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS video_sessions (
                session_id TEXT PRIMARY KEY,
                video_id TEXT,
                status TEXT,
                started_at INTEGER,
                completed_at INTEGER,
                total_wpm INTEGER,
                total_acc INTEGER
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS video_session_parts (
                session_id TEXT,
                part_idx INTEGER,
                correct_words INTEGER,
                total_time_ms INTEGER,
                total_keys INTEGER,
                correct_keys INTEGER,
                mistakes INTEGER DEFAULT 0,
                pages_completed INTEGER DEFAULT 0,
                PRIMARY KEY (session_id, part_idx)
            )
        """)

        try:
            c.execute(
                "ALTER TABLE video_session_parts ADD COLUMN mistakes INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        try:
            c.execute(
                "ALTER TABLE video_session_parts ADD COLUMN pages_completed INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        c.execute("""
            CREATE TABLE IF NOT EXISTS video_page_states (
                session_id TEXT,
                part_idx INTEGER,
                page_idx INTEGER,
                current_index INTEGER DEFAULT 0,
                correctness_json TEXT,
                completed_words INTEGER DEFAULT 0,
                time_spent_ms INTEGER DEFAULT 0,
                keys_total INTEGER DEFAULT 0,
                keys_correct INTEGER DEFAULT 0,
                keys_wrong INTEGER DEFAULT 0,
                mistakes INTEGER DEFAULT 0,
                page_chars_correct INTEGER DEFAULT 0,
                page_chars_wrong INTEGER DEFAULT 0,
                page_keystrokes_total INTEGER DEFAULT 0,
                page_keystrokes_correct INTEGER DEFAULT 0,
                page_keystrokes_wrong INTEGER DEFAULT 0,
                last_updated INTEGER,
                PRIMARY KEY (session_id, part_idx, page_idx)
            )
        """)

        try:
            c.execute(
                "ALTER TABLE video_page_states ADD COLUMN page_chars_correct INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        try:
            c.execute(
                "ALTER TABLE video_page_states ADD COLUMN page_chars_wrong INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        try:
            c.execute(
                "ALTER TABLE video_page_states ADD COLUMN page_keystrokes_total INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        try:
            c.execute(
                "ALTER TABLE video_page_states ADD COLUMN page_keystrokes_correct INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        try:
            c.execute(
                "ALTER TABLE video_page_states ADD COLUMN page_keystrokes_wrong INTEGER DEFAULT 0"
            )
        except sqlite3.OperationalError:
            pass

        c.execute("""
            CREATE TABLE IF NOT EXISTS playlists (
                playlist_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS playlist_videos (
                playlist_id TEXT NOT NULL,
                video_id TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                added_at INTEGER NOT NULL,
                PRIMARY KEY (playlist_id, video_id)
            )
        """)

        conn.commit()


def reset_db_pool():
    """Clear the connection pool. Useful when DATA_DIR changes."""
    global _connection_pool
    with _pool_lock:
        for conn in _connection_pool:
            try:
                conn.close()
            except Exception:
                pass
        _connection_pool = []


@contextmanager
def get_db():
    conn = None
    try:
        with _pool_lock:
            if _connection_pool:
                conn = _connection_pool.pop()
        if conn is None:
            conn = sqlite3.connect(get_db_file(), check_same_thread=False)
            conn.row_factory = sqlite3.Row
        yield conn
    finally:
        if conn:
            try:
                with _pool_lock:
                    if len(_connection_pool) < _POOL_SIZE:
                        _connection_pool.append(conn)
                    else:
                        conn.close()
            except Exception:
                pass
