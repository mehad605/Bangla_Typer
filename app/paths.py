import os
import sys
import json
from pathlib import Path


def get_app_dirs():
    """
    Get application directories that work both in development and frozen (exe) mode.

    Returns:
        tuple: (base_dir, data_dir, scripts_dir)
    """
    if getattr(sys, "frozen", False):
        # Path to the directory containing the executable
        app_dir = Path(sys.executable).parent.resolve()
    else:
        # Path to the project root in development
        app_dir = Path(__file__).parent.parent.resolve()

    # Determine where the config file should live.
    # If app_dir is writable (Portable Mode), use it.
    # Otherwise (Installed Mode), use user's home directory.
    if os.access(app_dir, os.W_OK):
        base_dir = app_dir
    else:
        # For Linux/Windows installed apps, use a standard hidden config folder
        base_dir = Path.home() / ".bangla-typer"
        base_dir.mkdir(parents=True, exist_ok=True)

    config_file = base_dir / "config.json"
    custom_data_dir = None

    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
                if "data_dir" in config:
                    custom_data_dir = Path(config["data_dir"])
        except Exception:
            pass

    # For frozen mode (exe/binary)
    if getattr(sys, "frozen", False):
        # If no custom data dir set, use a folder in base_dir
        if custom_data_dir:
            data_dir = custom_data_dir
        else:
            if os.access(app_dir, os.W_OK):
                data_dir = base_dir / "Bangla_Data"
            else:
                # If installed in /opt, put the data in a visible place in Home
                data_dir = Path.home() / "Bangla_Typer_Data"

        # Scripts directory: Use bundled scripts by default
        # For PyInstaller, bundled files are in sys._MEIPASS
        bundled_scripts = Path(getattr(sys, "_MEIPASS", app_dir)) / "scripts"
        scripts_dir = bundled_scripts
    else:
        # In development
        data_dir = custom_data_dir or (app_dir / "Bangla Data")
        scripts_dir = app_dir / "scripts"

    return base_dir, data_dir, scripts_dir


BASE_DIR, DATA_DIR, SCRIPTS_DIR = get_app_dirs()


def update_data_dir(new_path: str):
    """Update the data directory in config.json."""
    global DATA_DIR
    config_file = BASE_DIR / "config.json"
    config = {}
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
        except Exception:
            pass

    config["data_dir"] = new_path
    with open(config_file, "w") as f:
        json.dump(config, f, indent=4)

    # Update current process state
    DATA_DIR = Path(new_path)
    ensure_data_dirs()


def resolve_data_path(relative_path: str) -> Path:
    """Resolve a path relative to the data directory."""
    return DATA_DIR / relative_path


def ensure_data_dirs():
    """Ensure all required data directories exist."""
    # Create DATA_DIR and temp
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "temp").mkdir(parents=True, exist_ok=True)

    # Only try to create scripts_dir if it's not internal to the bundle
    if not getattr(sys, "frozen", False):
        SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    else:
        # If frozen, scripts are usually read-only in the bundle.
        # We don't try to create them.
        pass
