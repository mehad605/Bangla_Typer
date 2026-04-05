# Migration Guide - Instant Mode Sprint

This guide documents database and API changes from the Instant Mode sprint.

## Database Changes

### Task 2.1: Rename totalChars to totalKeystrokes

**Migration:** Automatic on app startup

The migration function `migrate_instant_stats_rename_column()` in `app/database.py` handles:
- SQLite 3.25.0+: Uses `ALTER TABLE instant_stats RENAME COLUMN totalChars TO totalKeystrokes`
- Older versions: Recreates table with new column name

**Rollback:** Not recommended - data is migrated, not lost

### New Columns Added

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `isValid` | INTEGER | 1 | Session validation flag (1=valid, 0=invalid) |
| `validationFlags` | TEXT | '' | Comma-separated validation flags |
| `totalKeystrokes` | INTEGER | - | Renamed from totalChars (migration) |

## API Changes

### Request Payload (POST /api/inst_stats)

**Before:**
```json
{
  "timestamp": 1234567890,
  "wpm": 45,
  "totalChars": 300,
  ...
}
```

**After:**
```json
{
  "timestamp": 1234567890,
  "wpm": 45,
  "totalKeystrokes": 300,
  "isValid": true,
  "validationFlags": ""
}
```

**Breaking Change:** Field renamed from `totalChars` to `totalKeystrokes`

**Optional Fields:**
- `isValid`: Defaults to `true` if not provided
- `validationFlags`: Defaults to empty string if not provided

## Field Reference

### Frontend → Backend Mapping

| Frontend Variable | Backend Field | Notes |
|-------------------|---------------|-------|
| `instKeystrokes.total` | `totalKeystrokes` | Renamed from totalChars |
| `validation.isValid` | `isValid` | Boolean (sent as 0/1) |
| `validation.flags.join(',')` | `validationFlags` | Comma-separated |

### Removed Fields

| Field | Reason |
|-------|--------|
| `missedChars` | Always 0 due to forced correction - removed from UI, payload, and model |

## Rollback Instructions

### Revert Code (Git):
```bash
git revert HEAD
# or
git checkout <previous-commit>
```

### Rollback Database (Manual - NOT RECOMMENDED):
```sql
-- Rename back (if using SQLite 3.25.0+)
ALTER TABLE instant_stats RENAME COLUMN totalKeystrokes TO totalChars;

-- Remove new columns
ALTER TABLE instant_stats DROP COLUMN isValid;
ALTER TABLE instant_stats DROP COLUMN validationFlags;
```

## Compatibility Notes

- **Backward Compatible:** Old data with `totalChars` column is migrated automatically
- **Forward Compatible:** New code works with existing data (migration adds new columns)
- **No Breaking Changes:** All existing functionality preserved

---

For detailed task instructions, see `INSTANT_MODE_SPRINT_PLAN.md`