#!/usr/bin/env python3
import os
import sys
import threading
import time
import webview
import uvicorn

# Force PyInstaller to bundle these
try:
    import qtpy
    import PySide6
    from PySide6 import QtCore, QtGui, QtWidgets, QtWebEngineCore, QtWebEngineWidgets
except ImportError:
    pass

from app.main import app
from app.services import heartbeat


class Api:
    def close_window(self):
        webview.active_window().destroy()

    def minimize_window(self):
        webview.active_window().minimize()

    def toggle_fullscreen(self):
        webview.active_window().toggle_fullscreen()

    def select_folder(self):
        # Using webview.FileDialog.FOLDER to avoid deprecation warning
        result = webview.active_window().create_file_dialog(webview.FileDialog.FOLDER)
        if result and len(result) > 0:
            return result[0]
        return None


def run_server():
    # Disable the browser-based heartbeat shutdown logic for the standalone app
    heartbeat.enabled = False
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")


def main():
    api = Api()
    # Start server in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Wait a moment for server to initialize
    time.sleep(1)

    # Determine icon path
    if getattr(sys, "frozen", False):
        icon_path = os.path.join(sys._MEIPASS, "static", "icon.svg")
    else:
        icon_path = os.path.join(os.path.dirname(__file__), "static", "icon.svg")

    # Create and start the webview window
    window = webview.create_window(
        "Bangla Typer",
        "http://127.0.0.1:8000",
        width=1200,
        height=800,
        min_size=(800, 600),
        frameless=True,
        easy_drag=False,  # We will use a dedicated drag region
        js_api=api,
    )

    # Start the GUI
    webview.start(gui="qt", icon=icon_path)

    # Exit the entire process when the window is closed
    os._exit(0)


if __name__ == "__main__":
    main()
