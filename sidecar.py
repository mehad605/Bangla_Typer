#!/usr/bin/env python3
import uvicorn
import sys
import threading
import os
import argparse
from app.main import app
from app.services import heartbeat


def monitor_parent():
    try:
        # Blocks until stdin is closed (parent process exits)
        sys.stdin.read()
    except Exception:
        pass
    finally:
        print("[Sidecar] Parent process exited. Shutting down...")
        os._exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args, unknown = parser.parse_known_args()

    heartbeat.enabled = False

    # Start thread to monitor parent process via stdin pipe
    threading.Thread(target=monitor_parent, daemon=True).start()

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="error")
