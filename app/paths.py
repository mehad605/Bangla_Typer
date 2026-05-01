import os
import sys
import json
from pathlib import Path


def get_app_dirs():
    """
    Get application directories following platform-specific standards.
    Windows: AppData/Local/bangla-typer
    macOS: ~/Library/Application Support/bangla-typer
    Linux: ~/.config/bangla-typer and ~/.local/share/bangla-typer
    """
    app_name = "bangla-typer"
    
    # 1. Determine Base Directory (for config.json)
    if sys.platform == "win32":
        base_dir = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / app_name
    elif sys.platform == "darwin":
        base_dir = Path.home() / "Library" / "Application Support" / app_name
    else:  # Linux/Other
        base_dir = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / app_name

    base_dir.mkdir(parents=True, exist_ok=True)

    # 2. Check for custom data directory in config
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

    # 3. Determine Default Data Directory (if no custom one set)
    if custom_data_dir:
        data_dir = custom_data_dir
    else:
        if sys.platform == "win32":
            data_dir = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / app_name / "Data"
        elif sys.platform == "darwin":
            data_dir = Path.home() / "Library" / "Application Support" / app_name / "Data"
        else:  # Linux/Other
            data_dir = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / app_name

    # 4. Scripts Directory
    if getattr(sys, "frozen", False):
        app_dir = Path(sys.executable).parent.resolve()
        bundled_scripts = Path(getattr(sys, "_MEIPASS", app_dir)) / "scripts"
        scripts_dir = bundled_scripts
    else:
        app_dir = Path(__file__).parent.parent.resolve()
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
