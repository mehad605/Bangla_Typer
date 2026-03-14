import time
import threading
import os

last_heartbeat_time = time.time()
has_connected_once = False


enabled = True


def heartbeat_monitor():
    global last_heartbeat_time, has_connected_once, enabled
    while True:
        time.sleep(10)
        if not enabled:
            continue
        if has_connected_once and (time.time() - last_heartbeat_time > 60):
            print(
                "\n[Server] Browser tab closed (Heartbeat lost). Shutting down server..."
            )
            os._exit(0)


def start_monitor():
    threading.Thread(target=heartbeat_monitor, daemon=True).start()


def update_heartbeat():
    global last_heartbeat_time, has_connected_once
    has_connected_once = True
    last_heartbeat_time = time.time()
