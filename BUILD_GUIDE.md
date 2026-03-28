# Build Guide for Bangla Typer

This document explains how to build and distribute Bangla Typer for different platforms.

## Overview

The build system is designed to create production-ready, portable packages that:
- Work on any machine (no hardcoded paths)
- Use a single version source (pyproject.toml)
- Include proper Linux integration (desktop files, icons, FreeDesktop compliance)
- Provide multiple distribution formats

## Prerequisites

### All Platforms
- Python 3.13+
- `uv` package manager
- Dependencies from `pyproject.toml` (installed via `uv sync --locked`)

### Linux
- `dpkg-deb` (for .deb packages) - usually pre-installed
- `rpmbuild` (for .rpm packages, optional) - install via: `sudo apt install rpm` or `sudo dnf install rpm-build`
- `wget` (for AppImage tool auto-download, optional)
- SVG rendering tools: `rsvg-convert` or `inkscape` (for AppImage icon conversion, optional)

### Windows
- Standard build tools (handled by PyInstaller)

## Building

### Linux Build
```bash
cd /path/to/Bangla_Typer
uv sync --locked
uv run build.py
```

**Output:**
- `dist/bangla-typer-1.0.0.tar.gz` - Portable Linux archive
- `bangla-typer.deb` - Debian package (installable via apt)
- `dist/bangla-typer-1.0.0-*.rpm` - RPM package (if rpmbuild available)
- `dist/bangla-typer-1.0.0-*.AppImage` - AppImage bundle (if appimagetool available)

### Windows Build
```bash
cd \path\to\Bangla_Typer
uv sync --locked
uv run build.py
```

**Output:**
- `dist/bangla-typer-1.0.0.exe` - Portable Windows executable

## Configuration

The application uses a config.json file for persistent settings:

- **Location (Portable Mode):** Same directory as the application
- **Location (Installed Mode):** `~/.bangla-typer/config.json`

The config file is created on first run if it doesn't exist. Users can modify:
- `data_dir`: Path to store user data (typing progress, downloaded videos, etc.)

## Distribution

### For General Public

1. **Windows Users:**
   - Distribute the `.exe` file directly
   - Users can run it without installation

2. **Linux Users (Debian/Ubuntu):**
   - Distribute the `.deb` package
   - Users install via: `sudo apt install ./bangla-typer.deb`

3. **Linux Users (Fedora/RHEL):**
   - Distribute the `.rpm` package
   - Users install via: `sudo dnf install ./bangla-typer-*.rpm`

4. **Linux Users (Universal):**
   - Distribute the `.AppImage` file
   - Users make it executable and run it
   - No installation needed

5. **Linux Users (Portable):**
   - Distribute the `.tar.gz` archive
   - Users extract and run the binary directly

## Reproducible Builds

To ensure consistent, reproducible builds across machines:

1. Always use locked dependencies:
   ```bash
   uv sync --locked
   ```

2. The version is automatically read from `pyproject.toml`

3. Ensure the icon at `static/icon.svg` exists

## Version Management

- **Single Source of Truth:** Version is defined in `pyproject.toml`
- **No Hardcoding:** All package versions, filenames, and version strings are derived from `pyproject.toml`
- **Update Process:** To bump the version, simply update the version field in `pyproject.toml`

## Troubleshooting

### "rpmbuild not found" during build
- This is not critical; the build will skip RPM creation
- To enable RPM builds: `sudo apt install rpm` (Debian) or `sudo dnf install rpm-build` (Fedora)

### "appimagetool not found" during build
- This is not critical; the build will attempt to download it automatically
- If download fails, AppImage creation will be skipped
- To provide appimagetool: download from [AppImageKit releases](https://github.com/AppImage/AppImageKit/releases)

### Icon not appearing in packaged app
- Verify `static/icon.svg` exists
- Ensure the icon file is valid SVG format
- The build script will automatically discover and bundle the icon

## Technical Details

### Build Process Flow

1. **Validation Phase**
   - Checks for required source files and directories
   - Verifies icon file exists
   - Confirms pyproject.toml is readable
   - Extracts version from pyproject.toml

2. **Configuration Phase**
   - Creates config.json from template if needed
   - Uses template-based approach for first-run configuration

3. **PyInstaller Phase**
   - Compiles Python code to binary
   - Bundles all dependencies
   - Includes static assets (icons, scripts)

4. **Packaging Phase**
   - Platform-specific packaging (deb, rpm, exe, AppImage, tar.gz)
   - Creates launcher scripts with proper permissions
   - Includes desktop integration files (Linux)

### File Structure in Packages

**Linux (Installed)**
```
/opt/bangla-typer/        # Main application directory
/usr/bin/bangla-typer     # Launcher script
/usr/share/applications/  # Desktop file
/usr/share/pixmaps/       # Application icon
```

**Windows (Portable)**
```
bangla-typer.exe          # Standalone executable
config.json               # User config (created on first run)
```

**Linux (Portable)**
```
bangla-typer/             # Extracted from tar.gz
  bangla-typer            # Main binary
  _internal/              # Dependencies
  static/                 # Static assets
```

## Support for First-Time Users

When users launch Bangla Typer for the first time:

1. The app detects if config.json exists
2. If not, it creates one with default settings
3. On frozen builds, data is stored in:
   - Portable mode: App directory (`/opt/bangla-typer/Bangla_Data`)
   - Installed mode: Home directory (`~/Bangla_Typer_Data`)
4. Users can change the data directory via the application GUI

## Maintenance

The build script requires minimal maintenance:
- Update `pyproject.toml` for version bumps
- Ensure `static/icon.svg` remains valid
- PyInstaller spec file is stable and rarely needs changes

