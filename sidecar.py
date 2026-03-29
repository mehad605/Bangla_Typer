#!/usr/bin/env python3
import uvicorn
from app.main import app
from app.services import heartbeat

if __name__ == "__main__":
    heartbeat.enabled = False
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")
