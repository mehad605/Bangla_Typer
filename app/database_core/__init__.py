from app.database_core.connection import get_db, reset_db_pool, get_db_file
from app.database_core.schema import create_tables
from app.database_core.migrations import run_migrations
from app import paths

def init_db():
    paths.ensure_data_dirs()
    with get_db() as conn:
        c = conn.cursor()
        create_tables(c)
        run_migrations(c)
        conn.commit()

__all__ = ['get_db', 'init_db', 'reset_db_pool', 'get_db_file']
