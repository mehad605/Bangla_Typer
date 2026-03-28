# GitHub Actions Workflows Documentation

This document describes the GitHub Actions workflows used to build and release Bangla Typer.

## Overview

Two main workflows handle building and releasing:

1. **build.yml** - Continuous Integration (CI) workflow
2. **release.yml** - Release workflow for creating production releases

---

## CI Build Workflow (build.yml)

### Trigger Events

The workflow runs automatically on:

1. **Push to main/develop branches** - When code is pushed (only if build-related files changed)
2. **Pull requests to main/develop** - Code review builds
3. **Manual trigger** - Can be triggered manually from GitHub Actions UI

### Trigger Conditions

Workflow only runs if these files are modified:

```yaml
paths:
  - 'src/**'
  - 'app/**'
  - 'static/**'
  - 'scripts/**'
  - 'build.py'
  - 'pyproject.toml'
  - '.github/workflows/build.yml'
```

This prevents unnecessary builds for documentation or other changes.

### Workflow Jobs

#### 1. validate-version
**Purpose:** Extract and validate the version from `pyproject.toml`

**Validates:**
- Version exists and is readable
- Version follows semantic versioning (X.Y.Z)
- No special characters or invalid formats

**Outputs:**
- `version` - Application version (e.g., "1.0.0")
- `version_tag` - Git tag format (e.g., "v1.0.0")

#### 2. lint
**Purpose:** Check code quality and syntax

**Checks:**
- Python syntax validation for all .py files
- YAML syntax validation for workflow files
- No dependencies on external linters (uses built-in Python tools)

#### 3. build-linux
**Purpose:** Build Linux packages in parallel (4 different formats)

**Builds:**
- **Debian (.deb)** - For Ubuntu/Debian systems
- **tar.gz** - Portable archive
- **RPM (.rpm)** - For Fedora/RHEL (optional, skipped if rpmbuild unavailable)
- **AppImage** - Universal Linux binary (optional, skipped if appimagetool unavailable)

**Installs Dependencies:**
```bash
dpkg rpm wget rsvg-convert
```

**Outputs:**
- Separate artifacts for each format
- 90-day retention (configurable)

#### 4. build-windows
**Purpose:** Build Windows executable

**Builds:**
- Single-file executable (.exe)
- Portable, no installation needed

**Outputs:**
- Windows EXE artifact

#### 5. build-summary
**Purpose:** Provide final status report

**Reports:**
- Overall build success/failure
- Summary of all artifacts created
- Links to download artifacts

---

## Release Workflow (release.yml)

### Trigger Events

The workflow runs on:

1. **Git tag push** - When you push a tag matching `v[0-9]+.[0-9]+.[0-9]+`
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Manual workflow_dispatch** - Manual trigger from GitHub Actions UI with parameters

### Workflow Parameters (Manual Trigger)

When manually triggering, you can provide:

| Parameter | Description | Required |
|-----------|-------------|----------|
| `version_tag` | Version tag (e.g., v1.0.0) or blank for test build | No |
| `release_notes` | Custom release notes (overrides auto-generated) | No |
| `auto_generate_notes` | Auto-generate notes from commits? | No (default: true) |
| `create_release` | Create GitHub release? (set false for testing) | No (default: true) |

### Workflow Jobs

#### 1. validate
**Purpose:** Validate version and determine if this is a release build

**Checks:**
- Version in pyproject.toml is valid semantic versioning
- Git tag matches version in pyproject.toml (if applicable)
- Determines if this is a production release or test build

**Outputs:**
- `version` - Extracted version
- `version_tag` - Version as git tag
- `is_release` - Boolean: true if this is a release

#### 2. build-windows
**Purpose:** Build Windows EXE for release

**Process:**
- Installs dependencies with locked versions (`uv sync --frozen`)
- Runs build script
- Verifies executable exists
- Uploads as artifact

#### 3. build-linux
**Purpose:** Build all Linux packages for release

**Process:**
- Installs all optional build dependencies
- Builds all available formats:
  - Debian package (required)
  - tar.gz portable archive (required)
  - RPM package (optional)
  - AppImage (optional)
- Verifies each output exists
- Uploads artifacts separately

**Optional Builds:**
If rpmbuild or appimagetool are unavailable, they're skipped gracefully.

#### 4. release
**Purpose:** Create GitHub Release with all assets

**Process:**
1. Downloads all build artifacts
2. Organizes assets into release directory
3. Generates comprehensive release notes (with download links)
4. Creates GitHub release with all assets
5. Release is marked as "production" (not draft, not prerelease)

**Release Notes Include:**
- Download links for each platform
- Installation instructions
- Link to documentation
- Issue tracker link
- Build timestamp

#### 5. summary
**Purpose:** Final status report

**Reports:**
- Overall workflow success/failure
- Release URL
- Assets included
- Build results for all platforms

---

## Usage Guide

### Automated Release (Tag-based)

1. Update version in `pyproject.toml`:
   ```toml
   version = "1.1.0"
   ```

2. Commit changes:
   ```bash
   git add pyproject.toml
   git commit -m "Bump version to 1.1.0"
   ```

3. Create and push tag:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. GitHub Actions automatically:
   - ✅ Validates version
   - ✅ Builds for Windows and Linux
   - ✅ Creates GitHub Release
   - ✅ Uploads all assets

**Time to completion:** ~10-15 minutes

### Manual Release (Workflow Dispatch)

1. Go to GitHub repository → **Actions** → **Release**

2. Click **Run workflow**

3. Fill in parameters:
   - `version_tag`: `v1.1.0` (or blank for test)
   - `release_notes`: Custom notes (optional)
   - `auto_generate_notes`: true
   - `create_release`: true (or false for testing)

4. Click **Run workflow**

### Test Build (No Release)

For testing the build pipeline without creating a release:

1. Go to **Actions** → **Release**

2. Click **Run workflow**

3. Leave parameters blank or set:
   - `version_tag`: (blank)
   - `create_release`: false

4. Click **Run workflow**

This builds all artifacts but skips release creation.

---

## Build Environment

### CI Build Environment
- **Linux:** `ubuntu-latest`
- **Windows:** `windows-latest`
- **Python:** 3.13
- **Package Manager:** uv (with locked dependencies)

### Dependency Locking

All workflows use `uv sync --frozen` to:
- Ensure reproducible builds
- Use exact dependency versions from `uv.lock`
- Prevent unexpected dependency changes

---

## Artifacts & Retention

### Artifact Names
Artifacts are named clearly for easy identification:

**CI Build Artifacts:**
- `bangla-typer-debian-1.0.0`
- `bangla-typer-portable-linux-1.0.0`
- `bangla-typer-rpm-1.0.0`
- `bangla-typer-appimage-1.0.0`
- `bangla-typer-windows-1.0.0`

**Retention:** 90 days (configurable in workflow)

### Release Assets
Final release includes:
- `bangla-typer-1.0.0.exe` - Windows executable
- `bangla-typer.deb` - Debian package
- `bangla-typer-1.0.0.tar.gz` - Portable Linux archive
- `bangla-typer-1.0.0-x86_64.rpm` - RPM package (optional)
- `bangla-typer-1.0.0-x86_64.AppImage` - AppImage bundle (optional)

**Retention:** Permanent (on GitHub Releases)

---

## Version Management

### Version Source of Truth
Version is defined **once** in `pyproject.toml`:
```toml
version = "1.0.0"
```

### Version Validation
Workflow validates:
1. Version exists and is readable
2. Version is valid semantic versioning (X.Y.Z)
3. Git tag matches version (if tag-triggered)

### Version in Filenames
All output files include version:
- `bangla-typer-1.0.0.exe`
- `bangla-typer-1.0.0.tar.gz`
- `bangla-typer-1.0.0-x86_64.rpm`

---

## Error Handling & Recovery

### Build Failures

If a build job fails:

1. **Check the logs:** Click the failed job to see detailed output
2. **Common issues:**
   - Python syntax errors → Fix in code
   - Missing dependencies → Add to build.py
   - PyInstaller issues → Check spec file

3. **Re-run:** After fixing, push a commit or manually trigger workflow

### Optional Tools

Some tools are optional; build skips them if unavailable:

- **rpmbuild** → RPM build skipped, others continue
- **appimagetool** → AppImage skipped, others continue
- **rsvg-convert** → SVG to PNG conversion skipped

### Release Failures

If release creation fails:

1. Check permissions (requires `contents: write`)
2. Verify version format matches semantic versioning
3. Check if tag already exists

To retry: Delete the failed release and manually re-trigger workflow

---

## Security Considerations

### Permissions

Release workflow requires:
```yaml
permissions:
  contents: write
```

This allows creating releases. No other elevated permissions needed.

### No Secrets Needed

Workflow uses no secrets:
- ✅ No API keys required
- ✅ No credentials stored
- ✅ Uses GitHub's GITHUB_TOKEN (auto-provided)

### Reproducible Builds

Locked dependencies (`uv.lock`) ensure:
- Same dependencies everywhere
- No unexpected updates
- Verifiable builds

---

## Monitoring & Notifications

### Workflow Status

Access from:
- **GitHub UI:** Actions → Select workflow → View runs
- **GitHub API:** See workflow status
- **GitHub Desktop:** Shows workflow status

### Email Notifications

GitHub automatically sends:
- ✅ Workflow success notifications
- ❌ Workflow failure notifications
- ℹ️ Available in GitHub notification settings

---

## Best Practices

### Before Releasing

1. ✅ Update `pyproject.toml` version
2. ✅ Update `CHANGES.md` with changelog
3. ✅ Run tests locally (if available)
4. ✅ Review code changes
5. ✅ Commit and push all changes

### Creating Release

1. ✅ Tag should match `v[0-9]+.[0-9]+.[0-9]+` format
2. ✅ Version in tag should match `pyproject.toml`
3. ✅ Push tag: `git push origin v1.0.0`
4. ✅ Wait for workflow to complete (~15 minutes)

### After Release

1. ✅ Verify release on GitHub Releases page
2. ✅ Test downloading assets
3. ✅ Update documentation links if needed
4. ✅ Announce release on social media/forums

---

## Troubleshooting

### Workflow won't trigger on tag push

**Solution:** Ensure tag matches pattern `v[0-9]+.[0-9]+.[0-9]+`

Valid: `v1.0.0`, `v0.1.0`, `v2.5.13`
Invalid: `v1`, `release-1.0.0`, `1.0.0` (no 'v' prefix)

### Build fails on Windows

**Common cause:** Path issues or missing dependencies

**Solution:** 
1. Check build.py for platform-specific issues
2. Ensure all required tools are in PATH
3. Review Windows runner setup in workflow

### Build fails on Linux

**Common cause:** Missing system dependencies

**Solution:**
1. Check `apt-get install` step in workflow
2. Verify all build dependencies are listed
3. Check spec file for missing includes

### Release notes not auto-generating

**Solution:**
1. Ensure `auto_generate_notes: true` in workflow
2. Check that commits have proper messages
3. Manually provide notes using `release_notes` parameter

---

## File References

**Workflow Files:**
- `.github/workflows/build.yml` - CI workflow
- `.github/workflows/release.yml` - Release workflow

**Configuration Files:**
- `pyproject.toml` - Version source
- `build.py` - Build script
- `bangla-typer.spec` - PyInstaller configuration

**Documentation:**
- `BUILD_GUIDE.md` - Build documentation
- `CHANGES.md` - Changelog
- This file - Workflow documentation

---

## Support & Feedback

For workflow issues:
1. Check this documentation
2. Review workflow logs in GitHub Actions
3. Open an issue with workflow logs attached
4. Check [GitHub Actions documentation](https://docs.github.com/en/actions)

