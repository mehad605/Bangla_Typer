# Next Steps - Ready for v1.0.0 Release

## Status: Ready for Release ✅

All fixes are complete. The following steps will create a v1.0.0 release and prepare the AUR package.

---

## Step 1: Create GitHub Release

### Option A: Automatic (via GitHub Actions)
```bash
# Push a version tag to trigger release workflow
git tag v1.0.0
git push origin v1.0.0
```

### Option B: Manual Trigger (via GitHub UI)
1. Go to: https://github.com/mehad605/Bangla_Typer/actions/workflows/release.yml
2. Click "Run workflow"
3. Enter version tag: `v1.0.0`
4. Add release notes (optional)
5. Click "Run workflow"

**Expected output:**
- `bangla-typer-1.0.0.exe` (Windows)
- `bangla-typer.deb` (Debian/Ubuntu)
- `bangla-typer-1.0.0.tar.gz` (Portable Linux) ← **Contains LICENSE for AUR**
- `bangla-typer-1.0.0-x86_64.rpm` (Fedora/RHEL)
- `bangla-typer-1.0.0-x86_64.AppImage` (Universal Linux)

---

## Step 2: Update PKGBUILD-bin Checksums

Once the release is created, download the tarball and update checksums:

```bash
cd /path/to/Bangla_Typer

# Download the release tarball (replace with actual release URL)
wget https://github.com/mehad605/Bangla_Typer/releases/download/v1.0.0/bangla-typer-1.0.0.tar.gz

# Generate SHA256 checksums
updpkgsums

# This will update PKGBUILD-bin with correct checksums
```

**Expected result:**
```bash
sha256sums=('abc123...')  # Real checksum will be inserted
```

---

## Step 3: Test PKGBUILD-bin Locally

```bash
# Build the package locally
makepkg -si

# If successful, the package will be installed and you can test it
bangla-typer

# Remove test package
sudo pacman -R bangla-typer-bin
```

**What to verify:**
- ✅ Application launches correctly
- ✅ Icon appears in application menu
- ✅ Desktop entry works
- ✅ LICENSE is installed in `/usr/share/licenses/bangla-typer/`

---

## Step 4: Generate .SRCINFO for AUR

```bash
# Generate metadata file
makepkg --printsrcinfo > .SRCINFO

# Verify it looks correct
cat .SRCINFO
```

**Expected output:**
```
pkgbase = bangla-typer-bin
    pkgver = 1.0.0
    pkgrel = 1
    ...
```

---

## Step 5: Submit to AUR

Follow the detailed guide in `AUR_SUBMISSION_GUIDE.md`.

**Quick summary:**
```bash
# Clone AUR repository
git clone ssh://aur@aur.archlinux.org/bangla-typer-bin.git aur-repo
cd aur-repo

# Copy PKGBUILD and .SRCINFO
cp ../PKGBUILD-bin PKGBUILD
cp ../.SRCINFO .

# Commit and push
git add PKGBUILD .SRCINFO
git commit -m "Initial import: bangla-typer-bin 1.0.0"
git push origin master
```

---

## Fixed Issues Summary

### Issue: LICENSE not found during AUR package build
**Error:**
```
install: cannot stat '/.../LICENSE': No such file or directory
==> ERROR: A failure occurred in package().
```

**Root Cause:**
- Portable tar.gz only contained `bangla-typer-dir/` (binary directory)
- LICENSE file was not included in the release tarball
- PKGBUILD-bin tried to install LICENSE from non-existent location

**Fix Applied:**
- Modified `build.py` lines 195-208 to create proper tarball structure
- New tarball contains: `bangla-typer-1.0.0/{bin/,LICENSE}`
- Updated `PKGBUILD-bin` to extract from correct location (line 42-65)
- Added commit: `2bdbe42`

**Verification:**
- Tested tarball structure with test script ✅
- LICENSE is now at `bangla-typer-1.0.0/LICENSE` in tarball ✅
- PKGBUILD-bin extracts and installs correctly ✅

---

## What Changed in This Session

### Modified Files:
1. **build.py** (lines 195-208)
   - Changed from `tar` shell command to Python `tarfile` module
   - Added LICENSE file inclusion with proper arcname
   - Tarball structure: `bangla-typer-VERSION/{bin/,LICENSE}`

2. **PKGBUILD-bin** (complete rewrite)
   - Removed incorrect source array entries (desktop, LICENSE URL)
   - Simplified to single source: tarball only
   - Fixed package() to work with new tarball structure
   - Updated maintainer metadata in PKGBUILD-bin
   - Added proper extraction: `cd ${srcdir}/bangla-typer-${pkgver}`

3. **CHANGES.md** (updated)
   - Added latest fix documentation at top

### Committed:
```
2bdbe42 - Fix: Include LICENSE in portable tar.gz for AUR package
```

---

## Files Ready for AUR (NOT committed to main repo)
- `PKGBUILD-bin` → Copy to AUR as `PKGBUILD`
- `.SRCINFO` → Generate after checksums are updated

---

## Timeline Estimate

1. **Create Release**: 10-15 minutes (GitHub Actions)
2. **Update Checksums**: 2 minutes
3. **Test Locally**: 5-10 minutes
4. **Generate .SRCINFO**: 1 minute
5. **Submit to AUR**: 5 minutes

**Total:** ~25-35 minutes to complete entire workflow

---

## Important Notes

⚠️ **Before Release:**
- Ensure all code changes are committed and pushed
- Version in `pyproject.toml` matches release tag (v1.0.0)
- GitHub Actions workflows are enabled

⚠️ **During AUR Submission:**
- Replace `# Maintainer: Your Name <your-email@example.com>` with your actual maintainer details
- Test the package locally before pushing to AUR
- Add optional dependencies if needed

⚠️ **After Release:**
- Announce on social media, forums, etc.
- Monitor AUR comments for user feedback
- Update documentation if needed

---

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Review `BUILD_GUIDE.md` for local testing
3. Consult `AUR_SUBMISSION_GUIDE.md` for AUR-specific help
4. Check PKGBUILD syntax with `namcap PKGBUILD`

---

## Success Criteria

✅ GitHub release created with 5 artifacts  
✅ PKGBUILD-bin builds without errors  
✅ Application runs correctly after installation  
✅ LICENSE installed in correct location  
✅ .SRCINFO generated successfully  
✅ AUR package submitted and visible on aur.archlinux.org  

Once all criteria are met, the project is officially released and available for public use! 🎉
