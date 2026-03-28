# Quick Release Guide

This guide shows how to release a new version of Bangla Typer using GitHub Actions.

## Prerequisites

- [ ] All code changes committed and pushed to main/develop
- [ ] Version updated in `pyproject.toml`
- [ ] `CHANGES.md` updated with changelog
- [ ] All tests passing (if available)

## Quick Release (Automated)

### Step 1: Prepare the Release

Update `pyproject.toml`:
```toml
[project]
version = "1.1.0"  # Change this
```

Update `CHANGES.md` with what changed in this release.

Commit and push:
```bash
git add pyproject.toml CHANGES.md
git commit -m "Release v1.1.0"
git push origin main
```

### Step 2: Create Release Tag

```bash
git tag v1.1.0
git push origin v1.1.0
```

### Step 3: Wait for Build

Go to: **GitHub** → **Actions** → **Release**

Watch the workflow:
1. ✅ Validate version
2. ✅ Build Windows
3. ✅ Build Linux
4. ✅ Create Release

**Time:** ~10-15 minutes

### Step 4: Verify Release

Once complete:
1. Check [GitHub Releases](https://github.com/mehad605/Bangla_Typer/releases)
2. Download and test one or two packages
3. Verify release notes are correct

Done! 🎉

---

## Manual Release (If Automated Fails)

If the automated workflow fails:

1. Go to **GitHub** → **Actions** → **Release**
2. Click **Run workflow**
3. Enter:
   - `version_tag`: `v1.1.0`
   - `release_notes`: Custom notes (optional)
   - `auto_generate_notes`: true
   - `create_release`: true
4. Click **Run workflow**

---

## Test Build (No Release)

To test the build without creating a release:

1. Go to **GitHub** → **Actions** → **Release**
2. Click **Run workflow**
3. Leave `version_tag` blank
4. Set `create_release` to false
5. Click **Run workflow**

All packages build but no release is created.

---

## Troubleshooting

### "Tag already exists"
This tag is already released. Use a different version.

### "Version mismatch"
Git tag doesn't match `pyproject.toml` version.
- Tag: `v1.1.0`
- File: `version = "1.1.0"`

They must match exactly.

### "Workflow not running"
Ensure tag matches pattern: `v[0-9]+.[0-9]+.[0-9]+`
- ✅ `v1.0.0`
- ✅ `v2.5.13`
- ❌ `v1` (no patch version)
- ❌ `1.0.0` (no 'v' prefix)

### Build artifacts missing
Check the workflow logs. Usually:
1. Python syntax error → Fix code
2. Missing dependency → Check build.py
3. PyInstaller issue → Check spec file

---

## What Gets Released

Each release includes:

**Windows:**
- `bangla-typer-1.1.0.exe` - Standalone executable

**Linux:**
- `bangla-typer.deb` - Debian/Ubuntu package
- `bangla-typer-1.1.0.tar.gz` - Portable archive
- `bangla-typer-1.1.0-x86_64.rpm` - Fedora/RHEL (if built)
- `bangla-typer-1.1.0-x86_64.AppImage` - Universal (if built)

All files are listed on the GitHub Release page.

---

## Release Notes

Release notes are automatically generated from:
1. Recent commits and pull requests
2. Manual notes you provide (if specified)

The auto-generated notes include:
- Download links for each platform
- Installation instructions
- Links to docs

---

## Version Numbering

Use semantic versioning: **X.Y.Z**

- `X` = Major version (breaking changes)
- `Y` = Minor version (new features)
- `Z` = Patch version (bug fixes)

Examples:
- `1.0.0` → Initial release
- `1.1.0` → Added new feature
- `1.1.1` → Fixed bug in 1.1.0

---

For detailed information, see [WORKFLOW.md](./WORKFLOW.md)
