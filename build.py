import os
import sys
import shutil
import platform
import subprocess
import tempfile
from pathlib import Path

# --- Configuration ---
APP_NAME = "bangla-typer"
VERSION = "1.0.0"
PROJECT_ROOT = Path(__file__).parent.absolute()
DIST_DIR = PROJECT_ROOT / "dist"
BUILD_SPEC = PROJECT_ROOT / "bangla-typer.spec"


def run(cmd, cwd=None, env=None):
    """Helper to run shell commands."""
    print(f"Executing: {' '.join(cmd)}")
    # In CI/GitHub Actions, nested 'uv run' can cause environment conflicts.
    # Since build.py is already running via 'uv run', we can call tools directly.
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def build_linux():
    print("--- Starting Optimized Linux Build ---")

    # 1. Ensure scripts is a package
    (PROJECT_ROOT / "scripts" / "__init__.py").touch()

    # 2. Run PyInstaller
    spec_file = "bangla-typer.spec"
    if not (PROJECT_ROOT / spec_file).exists():
        print(f"Error: {spec_file} not found in {PROJECT_ROOT}")
        print(f"Current Directory: {os.getcwd()}")
        print(f"Directory contents: {os.listdir(PROJECT_ROOT)}")
        sys.exit(1)

    print("Executing PyInstaller...")
    # Use sys.executable -m PyInstaller for better environment consistency
    run(
        [sys.executable, "-m", "PyInstaller", "--noconfirm", spec_file],
        cwd=PROJECT_ROOT,
    )

    # 3. Setup Dist Directory
    DIST_DIR.mkdir(exist_ok=True)
    source_dir = PROJECT_ROOT / "dist" / "bangla-typer-dir"

    if not source_dir.exists():
        print(f"Error: Build output not found at {source_dir}")
        if (PROJECT_ROOT / "dist").exists():
            print(f"dist/ contents: {os.listdir(PROJECT_ROOT / 'dist')}")
        sys.exit(1)

    # 4. Build .deb package
    print("Creating Debian package...")
    pkg_root = PROJECT_ROOT / "bangla-typer-pkg"

    # Ensure directories exist
    opt_dest = pkg_root / "opt" / APP_NAME
    (pkg_root / "usr" / "bin").mkdir(parents=True, exist_ok=True)

    # Efficiently sync build output to pkg directory
    if opt_dest.exists():
        shutil.rmtree(opt_dest)
    shutil.copytree(source_dir, opt_dest)

    # Create launcher script
    launcher = pkg_root / "usr" / "bin" / APP_NAME
    launcher.write_text(
        f'#!/bin/bash\n# Standard launcher for the Debian package\nexec /opt/{APP_NAME}/{APP_NAME} "$@"\n'
    )
    launcher.chmod(0o755)

    # Build the deb
    control_file = pkg_root / "DEBIAN" / "control"
    if not control_file.exists():
        print(f"Error: Debian control file missing at {control_file}")
        sys.exit(1)

    run(
        ["dpkg-deb", "--build", "bangla-typer-pkg", f"{APP_NAME}.deb"],
        cwd=PROJECT_ROOT,
    )
    print(f"[SUCCESS] Debian package created: {APP_NAME}.deb")

    # Linux version (Portable)
    portable_linux = DIST_DIR / f"{APP_NAME}.tar.gz"
    print(f"Creating Linux archive: {portable_linux}")
    run(
        [
            "tar",
            "-czf",
            str(portable_linux),
            "-C",
            str(PROJECT_ROOT / "dist"),
            "bangla-typer-dir",
        ]
    )
    print(f"[SUCCESS] Linux portable version created: {portable_linux}")


def build_windows():
    print("--- Starting Windows Build (Single EXE) ---")
    spec_file = "bangla-typer.spec"
    if not (PROJECT_ROOT / spec_file).exists():
        print(f"Error: {spec_file} not found in {PROJECT_ROOT}")
        sys.exit(1)

    print("Executing PyInstaller...")
    run(
        [sys.executable, "-m", "PyInstaller", "--noconfirm", spec_file],
        cwd=PROJECT_ROOT,
    )

    DIST_DIR.mkdir(exist_ok=True)
    source_exe = PROJECT_ROOT / "dist" / "bangla-typer-portable.exe"
    final_exe = DIST_DIR / "bangla-typer.exe"

    if not source_exe.exists():
        print(f"Error: Build output not found at {source_exe}")
        sys.exit(1)

    # Move and rename to standard name
    if final_exe.exists():
        final_exe.unlink()
    shutil.move(str(source_exe), str(final_exe))
    print(f"[SUCCESS] Portable EXE created: {final_exe}")


def main():
    current_os = platform.system().lower()

    if current_os == "linux":
        build_linux()
    elif current_os == "windows":
        build_windows()
    else:
        print(f"Unsupported OS: {current_os}")
        sys.exit(1)

    print("\nBuild completed successfully!")


if __name__ == "__main__":
    main()
