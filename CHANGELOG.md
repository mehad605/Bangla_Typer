# Changelog

All notable changes to Bangla Typer are documented here.

## [1.1.0] - 2026-05-01

### Added
- **Multi-Platform CI/CD**: Added GitHub Actions support for Windows (MSI/EXE), Linux (DEB/RPM/AppImage/Tarball), and macOS (DMG - Intel & ARM).
- **Standardized App Data Pathing**: Switched to platform-standard directories for configuration and data (AppData on Windows, XDG standards on Linux, Application Support on macOS).
- **High-Quality Icon Assets**: Regenerated all application icons from SVG source for crystal-clear display on high-DPI screens and taskbars.
- **Themed UI Notifications**: Replaced native browser alerts with a custom-themed Toast system matching the app's aesthetic.
- **Manual AppImage Build**: Added a robust manual AppImage build process to ensure compatibility across modern Linux distributions.

### Fixed
- **Settings UX**: Improved the directory change process with auto-updating paths and automatic modal closure.
- **System Routes**: Restored missing backend endpoints for data directory management and server heartbeats.
- **Learn Mode Data**: Ensured the static learning database is correctly bundled and accessible in production builds.

### Changed
- **Project Structure**: Sanitized repository for public release, removing all personal identifiers and local build artifacts.
- **Documentation**: Updated README with modern installation and development instructions.

## [1.0.0] - 2026-04-06

### Added
- **Gaming Prevention System** (Task 1.1)
  - Validation thresholds configurable via INSTANT_MODE_CONFIG
  - 5 detection checks: excessive wrong ratio, unrealistic WPM, session too short, low accuracy + high WPM, excessive cluster attempts
  - Database fields: `isValid`, `validationFlags`

- **WPM Calculator Module** (Task 1.2)
  - Centralized calculation functions: calculateNetWPM, calculateRawWPM, calculateIntervalWPM, calculateAccuracy, calculateConsistency
  - Consistent formula across real-time, interval, and final results
  - Fix: consistency now returns null (not accuracy fallback) for short sessions

- **Test Suite** (Task 3.1, 3.2)
  - 53 unit tests for WPMCalculator and validation system
  - 100% coverage on WPMCalculator module

- **Configuration File** (Task 4.1)
  - `instant-mode-config.js` with centralized constants
  - Validation thresholds, UI settings, calculation constants

- **API Error Handling** (Task 4.2)
  - Retry logic (3 attempts) for failed requests
  - Offline queue via localStorage
  - Process queued stats on page load

### Changed
- **Database** (Task 2.1)
  - Column renamed: `totalChars` → `totalKeystrokes`
  - Migration handles existing data

- **UI Updates** (Task 2.2)
  - Removed `missedChars` from display (always 0 due to forced correction)
  - Consistency shows "N/A" for sessions < 3 seconds

### Removed
- **missedChars field** from payload and backend model (Task 2.2)

### Files Created
- `static/js/wpm-calculator.js`
- `static/js/instant-mode-config.js`
- `static/js/api.js`
- `__tests__/wpm-calculator.test.js`
- `__tests__/validation.test.js`

### Files Modified
- `app/database.py`
- `app/models.py`
- `app/routers/stats.py`
- `static/js/app.js`
- `static/js/state.js`
- `static/index.html`
- `package.json`

---

For detailed task instructions, see `INSTANT_MODE_SPRINT_PLAN.md`
For progress tracking, see `SPRINT_PROGRESS.md`