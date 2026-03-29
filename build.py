import os
import sys
import shutil
import platform
import subprocess
import tarfile
import re
from pathlib import Path

# --- Configuration ---
PROJECT_ROOT = Path(__file__).parent.absolute()


def get_version_from_pyproject():
    try:
        with open(PROJECT_ROOT / "pyproject.toml", "r") as f:
            content = f.read()
            match = re.search(r'version\s*=\s*["\']([^"\']+)["\']', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Warning: Could not read version from pyproject.toml: {e}")
    return "1.0.0"


VERSION = get_version_from_pyproject()
APP_NAME = "bangla-typer"
DIST_DIR = PROJECT_ROOT / "dist"
SIDE_DIR = PROJECT_ROOT / "src-tauri" / "server"


def get_target_triple():
    """Get the Rust target triple for the current platform."""
    machine = platform.machine().lower()
    system = platform.system().lower()

    if system == "linux":
        if machine in ("x86_64", "amd64"):
            return "x86_64-unknown-linux-gnu"
        elif machine in ("aarch64", "arm64"):
            return "aarch64-unknown-linux-gnu"
    elif system == "windows":
        if machine in ("x86_64", "amd64"):
            return "x86_64-pc-windows-msvc"
    elif system == "darwin":
        if machine in ("x86_64", "amd64"):
            return "x86_64-apple-darwin"
        elif machine in ("aarch64", "arm64"):
            return "aarch64-apple-darwin"

    print(
        f"Warning: Unknown platform {system}/{machine}, defaulting to x86_64-unknown-linux-gnu"
    )
    return "x86_64-unknown-linux-gnu"


def run(cmd, cwd=None, env=None):
    print(f"  > {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def tool_available(name):
    return shutil.which(name) is not None


def validate_environment():
    print("--- Validating Build Environment ---")
    errors = []

    required_files = [
        "sidecar.py",
        "app/__init__.py",
        "app/main.py",
        "src-tauri/Cargo.toml",
        "src-tauri/tauri.conf.json",
    ]
    for f in required_files:
        if not (PROJECT_ROOT / f).exists():
            errors.append(f"Required file not found: {f}")

    required_dirs = ["app", "static", "scripts", "src-tauri"]
    for d in required_dirs:
        if not (PROJECT_ROOT / d).exists():
            errors.append(f"Required directory not found: {d}")

    if not tool_available("cargo"):
        errors.append(
            "Rust toolchain (cargo) not found. Install from https://rustup.rs"
        )

    if errors:
        print("[ERROR] Build environment validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

    print(f"[OK] Build environment valid (Version: {VERSION})")


def build_sidecar():
    """Build the Python sidecar binary using PyInstaller."""
    print("\n--- Building Python Sidecar ---")

    # Ensure scripts is a package
    (PROJECT_ROOT / "scripts" / "__init__.py").touch()

    run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--onefile",
            "--name",
            "bangla-typer-server",
            "--add-data",
            "app:app",
            "--add-data",
            "scripts:scripts",
            "--add-data",
            "static:static",
            "--hidden-import",
            "uvicorn",
            "--hidden-import",
            "fastapi",
            "sidecar.py",
        ],
        cwd=PROJECT_ROOT,
    )

    # Find the built sidecar
    if platform.system().lower() == "windows":
        sidecar_name = "bangla-typer-server.exe"
    else:
        sidecar_name = "bangla-typer-server"

    built_sidecar = PROJECT_ROOT / "dist" / sidecar_name
    if not built_sidecar.exists():
        print(f"Error: Sidecar binary not found at {built_sidecar}")
        sys.exit(1)

    # Copy to Tauri sidecar directory with target triple suffix
    target = get_target_triple()
    sidecar_ext = ".exe" if platform.system().lower() == "windows" else ""
    sidecar_target_name = f"bangla-typer-server-{target}{sidecar_ext}"

    SIDE_DIR.mkdir(parents=True, exist_ok=True)
    dest = SIDE_DIR / sidecar_target_name
    shutil.copy2(built_sidecar, dest)
    dest.chmod(0o755)

    print(
        f"[OK] Sidecar built: {dest} ({built_sidecar.stat().st_size / 1024 / 1024:.1f} MB)"
    )
    return dest


def build_tauri():
    """Build the Tauri application. Continues even if some bundle formats fail."""
    print("\n--- Building Tauri Application ---")

    result = subprocess.run(
        ["cargo", "tauri", "build"],
        cwd=PROJECT_ROOT,
        text=True,
    )
    if result.returncode != 0:
        print("[WARN] Some bundle formats may have failed (e.g. AppImage).")
        print("       Checking for successfully built packages...")
    else:
        print("[OK] Tauri build completed successfully")


def collect_outputs():
    """Collect and organize build outputs."""
    print("\n--- Collecting Build Outputs ---")
    DIST_DIR.mkdir(exist_ok=True)

    tauri_bundle = PROJECT_ROOT / "src-tauri" / "target" / "release" / "bundle"

    system = platform.system().lower()
    if system == "linux":
        # Copy .deb
        for deb in tauri_bundle.rglob("*.deb"):
            dest = DIST_DIR / deb.name
            shutil.copy2(deb, dest)
            print(f"[OK] {dest}")

        # Copy AppImage
        for appimage in tauri_bundle.rglob("*.AppImage"):
            dest = DIST_DIR / appimage.name
            shutil.copy2(appimage, dest)
            print(f"[OK] {dest}")

        # Copy RPM
        for rpm in tauri_bundle.rglob("*.rpm"):
            dest = DIST_DIR / rpm.name
            shutil.copy2(rpm, dest)
            print(f"[OK] {dest}")

        # Create portable tar.gz
        binary = PROJECT_ROOT / "src-tauri" / "target" / "release" / APP_NAME
        if binary.exists():
            portable = DIST_DIR / f"{APP_NAME}-{VERSION}-linux-x86_64.tar.gz"
            with tarfile.open(portable, "w:gz") as tar:
                tar.add(binary, arcname=f"{APP_NAME}-{VERSION}/{APP_NAME}")
            print(f"[OK] {portable}")

    elif system == "windows":
        for exe in tauri_bundle.rglob("*.msi"):
            dest = DIST_DIR / exe.name
            shutil.copy2(exe, dest)
            print(f"[OK] {dest}")
        for exe in tauri_bundle.rglob("*.exe"):
            dest = DIST_DIR / exe.name
            shutil.copy2(exe, dest)
            print(f"[OK] {dest}")


def initialize_config():
    config_file = PROJECT_ROOT / "config.json"
    if not config_file.exists():
        template = PROJECT_ROOT / "config.json.template"
        if template.exists():
            shutil.copy2(template, config_file)
        else:
            config_file.write_text('{\n    "data_dir": null\n}\n')
    print(f"[OK] Config file ready")


def main():
    print("=" * 70)
    print(f"Bangla Typer Build Script v{VERSION} (Tauri)")
    print("=" * 70)

    validate_environment()
    initialize_config()

    # Build sidecar first
    build_sidecar()

    # Build Tauri app
    build_tauri()

    # Collect outputs
    collect_outputs()

    print("\n" + "=" * 70)
    print("[SUCCESS] Build completed!")
    print("=" * 70)
    print(f"\nOutput files are in: {DIST_DIR}")


if __name__ == "__main__":
    main()
