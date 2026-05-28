import sqlite3
from contextlib import contextmanager
from app import paths

_connection_pool = []
_pool_lock = __import__("threading").Lock()
_POOL_SIZE = 5

def get_db_file():
    return str(paths.DATA_DIR / "typer_data.db")

def reset_db_pool():
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
