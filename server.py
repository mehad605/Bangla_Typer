#!/usr/bin/env python3
"""
Bangla YouTube Subtitle Processor - Local Server (Runner)
------------------------------------------------
Run: uv run server.py
"""

import sys
import uvicorn
import argparse


def main():
    parser = argparse.ArgumentParser(description="Bangla Typer Server")
    parser.add_argument(
        "--demo", action="store_true", help="Run with demo data for visualization"
    )
    args, unknown = parser.parse_known_args()

    if args.demo:
        from app.database import get_db, DATA_DIR

        # For simplicity, we skip demo generation here, recommend using an import from a db setup script
        print(
            "Demo flag is passed but generation script was moved. Starting server normally."
        )

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
