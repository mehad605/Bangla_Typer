import os
import sys
import shutil
import platform
import subprocess
import tarfile
import re
from pathlib import Path

# --- Configuration (Read from pyproject.toml) ---
PROJECT_ROOT = Path(__file__).parent.absolute()


# Parse version from pyproject.toml using regex (no external deps)
def get_version_from_pyproject():
    """Extract version from pyproject.toml without external dependencies."""
    try:
        with open(PROJECT_ROOT / "pyproject.toml", "r") as f:
            content = f.read()
            # Match version = "X.Y.Z" in [project] section
            match = re.search(r'version\s*=\s*["\']([^"\']+)["\']', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Warning: Could not read version from pyproject.toml: {e}")
    return "1.0.0"


VERSION = get_version_from_pyproject()

APP_NAME = "bangla-typer"
DIST_DIR = PROJECT_ROOT / "dist"
BUILD_SPEC = PROJECT_ROOT / "bangla-typer.spec"
STATIC_DIR = PROJECT_ROOT / "static"
ICON_FILE = STATIC_DIR / "icon.svg"

DESCRIPTION = "A modern Bangla typing trainer and YouTube subtitle processor."


def run(cmd, cwd=None, env=None):
    """Helper to run shell commands."""
    print(f"Executing: {' '.join(cmd)}")
    # In CI/GitHub Actions, nested 'uv run' can cause environment conflicts.
    # Since build.py is already running via 'uv run', we can call tools directly.
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True)
    if result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def tool_available(name):
    """Check if a command-line tool is available on PATH."""
    return shutil.which(name) is not None


def validate_build_environment():
    """Validate that all required files and directories exist before building."""
    print("--- Validating Build Environment ---")

    errors = []

    # Check spec file
    if not BUILD_SPEC.exists():
        errors.append(f"PyInstaller spec file not found: {BUILD_SPEC}")

    # Check icon file
    if not ICON_FILE.exists():
        errors.append(f"Icon file not found: {ICON_FILE}")

    # Check required source files
    required_files = [
        "gui.py",
        "server.py",
        "app/__init__.py",
        "app/main.py",
    ]
    for file_path in required_files:
        full_path = PROJECT_ROOT / file_path
        if not full_path.exists():
            errors.append(f"Required source file not found: {full_path}")

    # Check required directories
    required_dirs = ["app", "static", "scripts"]
    for dir_path in required_dirs:
        full_path = PROJECT_ROOT / dir_path
        if not full_path.exists():
            errors.append(f"Required directory not found: {full_path}")

    # Check pyproject.toml
    if not (PROJECT_ROOT / "pyproject.toml").exists():
        errors.append("pyproject.toml not found")

    if errors:
        print("[ERROR] Build environment validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

    print(f"[OK] Build environment valid (Version: {VERSION})")
    print(f"[OK] App icon found: {ICON_FILE}")


def initialize_config():
    """Initialize config.json if it doesn't exist (first-run setup)."""
    config_file = PROJECT_ROOT / "config.json"

    if not config_file.exists():
        print("Initializing config.json from template...")
        template_file = PROJECT_ROOT / "config.json.template"
        if template_file.exists():
            shutil.copy2(template_file, config_file)
        else:
            # Fallback: create empty config
            config_file.write_text('{\n    "data_dir": null\n}\n')

    print(f"[OK] Config file ready: {config_file}")


def find_icon(source_dir):
    """Find the icon file in PyInstaller output (may be in _internal/)."""
    candidates = [
        source_dir / "_internal" / "static" / "icon.svg",
        source_dir / "static" / "icon.svg",
        ICON_FILE,
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


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
    portable_linux = DIST_DIR / f"{APP_NAME}-{VERSION}.tar.gz"
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

    # 5. Build RPM package
    build_rpm(source_dir)

    # 6. Build AppImage
    build_appimage(source_dir)


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
    final_exe = DIST_DIR / f"bangla-typer-{VERSION}.exe"

    if not source_exe.exists():
        print(f"Error: Build output not found at {source_exe}")
        sys.exit(1)

    # Move and rename to standard name with version
    if final_exe.exists():
        final_exe.unlink()
    shutil.move(str(source_exe), str(final_exe))
    print(f"[SUCCESS] Portable EXE created: {final_exe}")


def build_rpm(source_dir):
    """Build an RPM package from the PyInstaller directory output."""
    print("\n--- Creating RPM package ---")

    if not tool_available("rpmbuild"):
        print(
            "[SKIP] 'rpmbuild' not found. Install with: sudo apt install rpm / sudo dnf install rpm-build"
        )
        return

    # 1. Create staging root with all files pre-arranged
    staging = PROJECT_ROOT / "rpm-staging"
    if staging.exists():
        shutil.rmtree(staging)

    opt_dir = staging / "opt" / APP_NAME
    bin_dir = staging / "usr" / "bin"
    apps_dir = staging / "usr" / "share" / "applications"
    icons_dir = staging / "usr" / "share" / "pixmaps"

    for d in [opt_dir, bin_dir, apps_dir, icons_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Copy PyInstaller output to /opt/bangla-typer/
    shutil.copytree(source_dir, opt_dir, dirs_exist_ok=True)

    # Launcher script
    launcher = bin_dir / APP_NAME
    launcher.write_text(f'#!/bin/bash\nexec /opt/{APP_NAME}/{APP_NAME} "$@"\n')
    launcher.chmod(0o755)

    # Icon — look in PyInstaller output (may be in _internal/)
    icon_src = find_icon(source_dir)
    if icon_src:
        shutil.copy2(icon_src, icons_dir / f"{APP_NAME}.svg")

    # Desktop file
    (apps_dir / f"{APP_NAME}.desktop").write_text(
        f"""[Desktop Entry]
Name=Bangla Typer
Comment=Modern Bangla typing trainer
Exec={APP_NAME}
Icon={APP_NAME}
Terminal=false
Type=Application
Categories=Education;Utility;
"""
    )

    # 2. Create source tarball for rpmbuild
    rpm_build = PROJECT_ROOT / "rpm-build"
    if rpm_build.exists():
        shutil.rmtree(rpm_build)

    for subdir in ["BUILD", "RPMS", "SOURCES", "SPECS", "SRPMS"]:
        (rpm_build / subdir).mkdir(parents=True, exist_ok=True)

    tarball_name = f"{APP_NAME}-{VERSION}"
    source_tar = rpm_build / "SOURCES" / f"{tarball_name}.tar.gz"

    with tarfile.open(source_tar, "w:gz") as tar:
        tar.add(staging, arcname=tarball_name)

    # 3. Generate RPM spec file
    has_icon = icon_src is not None

    icon_install = ""
    icon_files = ""
    if has_icon:
        icon_install = f"cp -a usr/share/pixmaps/{APP_NAME}.svg %{{buildroot}}%{{_datadir}}/pixmaps/{APP_NAME}.svg"
        icon_files = f"%{{_datadir}}/pixmaps/{APP_NAME}.svg"

    spec_content = f"""%define debug_package %{{nil}}
Name:           {APP_NAME}
Version:        {VERSION}
Release:        1%{{?dist}}
Summary:        Bangla typing trainer and YouTube subtitle processor
License:        MIT
URL:            https://github.com/mehad605/Bangla_Typer
Source0:        {tarball_name}.tar.gz
BuildArch:      x86_64

%description
{DESCRIPTION}

%prep
%setup -q

%build

%install
mkdir -p %{{buildroot}}/opt/{APP_NAME}
mkdir -p %{{buildroot}}%{{_bindir}}
mkdir -p %{{buildroot}}%{{_datadir}}/applications
mkdir -p %{{buildroot}}%{{_datadir}}/pixmaps

cp -a opt/{APP_NAME}/* %{{buildroot}}/opt/{APP_NAME}/
cp -a usr/bin/{APP_NAME} %{{buildroot}}%{{_bindir}}/{APP_NAME}
chmod 755 %{{buildroot}}%{{_bindir}}/{APP_NAME}
cp -a usr/share/applications/{APP_NAME}.desktop %{{buildroot}}%{{_datadir}}/applications/{APP_NAME}.desktop
{icon_install}

%files
/opt/{APP_NAME}
%{{_bindir}}/{APP_NAME}
%{{_datadir}}/applications/{APP_NAME}.desktop
{icon_files}
"""
    spec_file = rpm_build / "SPECS" / f"{APP_NAME}.spec"
    spec_file.write_text(spec_content, encoding="utf-8")

    # 4. Build RPM
    run(
        [
            "rpmbuild",
            "-bb",
            "--define",
            f"_topdir {rpm_build.resolve()}",
            str(spec_file),
        ],
        cwd=PROJECT_ROOT,
    )

    # 5. Copy output to dist/
    rpm_candidates = list((rpm_build / "RPMS").rglob("*.rpm"))
    if rpm_candidates:
        rpm_output = rpm_candidates[0]
        final_rpm = DIST_DIR / f"{APP_NAME}-{VERSION}-{platform.machine()}.rpm"
        shutil.copy2(rpm_output, final_rpm)
        print(f"[SUCCESS] RPM package created: {final_rpm}")
    else:
        print("[WARN] RPM build completed but output file not found")

    # Cleanup staging
    shutil.rmtree(staging, ignore_errors=True)


def build_appimage(source_dir):
    """Build an AppImage from the PyInstaller directory output."""
    print("\n--- Creating AppImage ---")

    appimagetool = PROJECT_ROOT / "appimagetool"

    # Auto-download appimagetool if not on PATH and not already downloaded
    if not tool_available("appimagetool") and not appimagetool.exists():
        print("Downloading appimagetool...")
        url = (
            "https://github.com/AppImage/AppImageKit/releases/download/"
            "continuous/appimagetool-x86_64.AppImage"
        )
        try:
            subprocess.run(
                ["wget", "-q", "-O", str(appimagetool), url],
                check=True,
            )
            appimagetool.chmod(0o755)
            print("[OK] appimagetool downloaded")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(
                "[SKIP] Could not download appimagetool (wget not found or download failed)"
            )
            return

    appimage_cmd = (
        ["appimagetool"] if tool_available("appimagetool") else [str(appimagetool)]
    )

    # 1. Create AppDir structure
    appdir = PROJECT_ROOT / "AppDir"
    if appdir.exists():
        shutil.rmtree(appdir)

    bin_dir = appdir / "usr" / "bin"
    apps_dir = appdir / "usr" / "share" / "applications"
    icons_dir = appdir / "usr" / "share" / "icons" / "hicolor" / "scalable" / "apps"

    for d in [bin_dir, apps_dir, icons_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 2. Copy PyInstaller output into usr/bin/
    shutil.copytree(source_dir, bin_dir / APP_NAME)
    os.chmod(bin_dir / APP_NAME / APP_NAME, 0o755)

    # 2a. Fix executable stack on shared libraries (required for modern Linux kernels)
    # AppImage fails if libpython has executable stack flag set
    print("Fixing executable stack flags on shared libraries...")
    if tool_available("execstack"):
        # Find all .so files and clear executable stack
        for so_file in (bin_dir / APP_NAME).rglob("*.so*"):
            try:
                subprocess.run(
                    ["execstack", "-c", str(so_file)],
                    capture_output=True,
                    check=False,  # Don't fail if execstack can't process some files
                )
            except Exception:
                pass
        print("[OK] Cleared executable stack flags")
    else:
        print(
            "[WARN] execstack not found - AppImage may fail on systems with strict security"
        )
        print("       Install with: sudo apt-get install execstack")

    # 3. Icon — at root and in the standard hicolor location
    icon_src = find_icon(source_dir)
    if icon_src:
        shutil.copy2(icon_src, icons_dir / f"{APP_NAME}.svg")
        shutil.copy2(icon_src, appdir / f"{APP_NAME}.svg")

        # appimagetool also accepts .svg but some versions prefer .png
        # Try to convert SVG to PNG for better compatibility
        png_icon = appdir / f"{APP_NAME}.png"
        if tool_available("rsvg-convert"):
            subprocess.run(
                [
                    "rsvg-convert",
                    "-w",
                    "256",
                    "-h",
                    "256",
                    "-o",
                    str(png_icon),
                    str(icon_src),
                ],
                capture_output=True,
            )
        elif tool_available("inkscape"):
            subprocess.run(
                [
                    "inkscape",
                    str(icon_src),
                    "--export-type=png",
                    f"--export-filename={png_icon}",
                    "-w",
                    "256",
                ],
                capture_output=True,
            )

    # 4. Desktop file — at root and in applications/
    desktop_content = f"""[Desktop Entry]
Name=Bangla Typer
Comment=Modern Bangla typing trainer
Exec={APP_NAME}
Icon={APP_NAME}
Terminal=false
Type=Application
Categories=Education;Utility;
"""
    (apps_dir / f"{APP_NAME}.desktop").write_text(desktop_content)
    (appdir / f"{APP_NAME}.desktop").write_text(desktop_content)

    # 5. AppRun — symlink to the main binary
    apprun = appdir / "AppRun"
    if apprun.exists() or apprun.is_symlink():
        apprun.unlink()
    apprun.symlink_to(f"usr/bin/{APP_NAME}/{APP_NAME}")

    # 6. Build AppImage
    output = DIST_DIR / f"{APP_NAME}-{VERSION}-{platform.machine()}.AppImage"
    env = os.environ.copy()
    env["ARCH"] = platform.machine()

    try:
        result = subprocess.run(
            appimage_cmd + ["--no-appstream", str(appdir), str(output)],
            cwd=PROJECT_ROOT,
            env=env,
            text=True,
            capture_output=True,
        )

        if result.returncode != 0:
            print(f"[WARN] AppImage creation failed: {result.stderr}")
            if "libfuse" in result.stderr or "dlopen" in result.stderr:
                print("[WARN] FUSE 2 not available - AppImage skipped")
                print("       (AppImage requires FUSE for runtime execution)")
            else:
                print("[WARN] Continuing with other build formats...")
        elif output.exists():
            print(f"[SUCCESS] AppImage created: {output}")
        else:
            print("[WARN] AppImage build completed but output file not found")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"[WARN] AppImage creation failed: {e}")
        print("[WARN] Continuing with other build formats...")
    except Exception as e:
        print(f"[WARN] Unexpected error during AppImage creation: {e}")
        print("[WARN] Continuing with other build formats...")

    # Cleanup
    shutil.rmtree(appdir, ignore_errors=True)


def main():
    print("=" * 70)
    print(f"Bangla Typer Build Script v{VERSION}")
    print("=" * 70)

    # Step 1: Validate environment
    validate_build_environment()
    print()

    # Step 2: Initialize config
    initialize_config()
    print()

    current_os = platform.system().lower()

    if current_os == "linux":
        build_linux()
    elif current_os == "windows":
        build_windows()
    else:
        print(f"Unsupported OS: {current_os}")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("[SUCCESS] Build completed successfully!")
    print("=" * 70)
    print(f"\nOutput files are in: {DIST_DIR}")
    print("\nFor reproducible builds, ensure you're using:")
    print("  uv sync --locked")


if __name__ == "__main__":
    main()
