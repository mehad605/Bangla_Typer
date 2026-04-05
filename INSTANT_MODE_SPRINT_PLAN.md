# INSTANT MODE REFACTORING & FIX SPRINT PLAN
## Bangla Typer Application

**Sprint Duration:** 2 Weeks (10 Working Days)  
**Sprint Goal:** Fix critical calculation inconsistencies, prevent gaming exploits, and improve code maintainability  
**Sprint Start:** April 6, 2026  
**Sprint End:** April 19, 2026  
**Team:** 1 Developer + 1 Lead (Code Review)

---

## 🎯 WHAT IS THIS SPRINT ABOUT?

### **Context:**
The Bangla Typer application has an **Instant Type Mode** where users practice Bangla typing on randomly generated text passages (20-60 words). The system tracks performance metrics like WPM (Words Per Minute), accuracy, and consistency. A comprehensive code review revealed several **critical flaws** that need immediate attention.

### **The Problems We're Solving:**

1. **CRITICAL: Users Can Cheat the System**
   - Users can press random keys repeatedly, then type correctly
   - This inflates WPM scores unrealistically (200+ WPM in Bangla is impossible)
   - Makes statistics and leaderboards meaningless
   - **Why it matters:** Undermines trust in the entire application

2. **CRITICAL: WPM Calculations Are Inconsistent**
   - Three different formulas exist for calculating WPM
   - User sees different WPM values in different contexts for same data
   - Interval chart shows different pattern than final results
   - **Why it matters:** Confuses users, makes data analysis unreliable

3. **MAJOR: Database Schema Has Misleading Names**
   - Column named `totalChars` actually stores keystroke count
   - Will cause developer confusion and incorrect queries
   - **Why it matters:** Technical debt that gets worse over time

4. **MAJOR: Useless Data Being Stored**
   - `missedChars` is always 0 (forced correction mechanic)
   - Wastes 4 bytes per record for no reason
   - **Why it matters:** Database bloat, misleading UI

5. **MAJOR: Illogical Fallback Behavior**
   - Consistency metric falls back to accuracy for short sessions
   - These measure completely different things (speed stability vs correctness)
   - **Why it matters:** Produces nonsensical statistics

### **What We're Building:**

1. **Gaming Prevention System**
   - Detects suspicious typing patterns
   - Flags invalid sessions in database
   - Shows clear warnings to users
   - Configurable thresholds for tuning

2. **Unified WPM Calculation Module**
   - Single source of truth for all WPM calculations
   - Consistent results across real-time, interval, and final contexts
   - Fully tested and documented

3. **Clean Database Schema**
   - Properly named columns that match what they store
   - No wasted storage on useless fields
   - Validation flags for data integrity

4. **Robust Error Handling**
   - Network failures don't lose user data
   - Automatic retry with offline queue
   - User notifications for transparency

5. **Comprehensive Test Suite**
   - 80%+ code coverage on calculation logic
   - Integration tests for full typing flow
   - Manual test plan for edge cases

### **How We're Doing It:**

This sprint is organized into **5 phases** across 10 working days:

- **Phase 1 (Days 1-3):** Fix the two CRITICAL issues first
- **Phase 2 (Days 4-5):** Address MAJOR issues (naming, cleanup)
- **Phase 3 (Days 6-7):** Build comprehensive test suite
- **Phase 4 (Day 8):** Refactor and improve code quality
- **Phase 5 (Days 9-10):** Document everything and do final testing

Each task has:
- **Problem Statement:** What's broken and why it matters
- **Acceptance Criteria:** How we know it's fixed
- **Technical Approach:** Step-by-step implementation with code
- **Testing Checklist:** Verification steps
- **Why This Works:** Rationale for design decisions

---

## 📋 SPRINT OVERVIEW

This sprint focuses on addressing critical and major issues identified in the Instant Type Mode code review. The work is organized into 5 days of feature work, 3 days of testing, and 2 days for refactoring and documentation.

**Success Criteria:**
- ✅ All CRITICAL issues resolved
- ✅ At least 3 of 4 MAJOR issues resolved
- ✅ 80%+ test coverage on calculation functions
- ✅ No regression in existing functionality
- ✅ Documentation updated

---

## 🗂️ FILE STRUCTURE REFERENCE

### **Key Files in This Project:**

**Frontend (JavaScript):**
- `static/js/app.js` (Lines 2788-4140) - Main instant mode implementation
- `static/js/api.js` (Lines 17-27) - API calls for saving stats
- We'll create: `static/js/wpm-calculator.js`, `static/js/instant-mode-config.js`

**Backend (Python):**
- `app/routers/stats.py` - REST API endpoints for statistics
- `app/models.py` - Pydantic data models
- `app/database.py` - SQLite database schema and operations

**Database:**
- `instant_stats` table stores all typing session data
- Located at: `data/typer_data.db` (SQLite)

**Tests (to be created):**
- `__tests__/wpm-calculator.test.js` - Unit tests for calculations
- `__tests__/integration.test.js` - Integration tests
- `__tests__/validation.test.js` - Gaming prevention tests

---

## 🚀 FOR NEW SESSIONS: QUICK START GUIDE

If you're resuming this sprint in a new session, here's what you need to know:

### **Current State:**
- Sprint started: April 5, 2026
- Current task: Check `SPRINT_PROGRESS.md` (if exists) or start with Task 1.1
- Files modified: Check git status

### **Your Role:**
- You are the **Developer** implementing this sprint plan
- Follow the tasks in order (Priority 1 → 2 → 3 → 4 → 5)
- Each task has checkboxes - mark completed items with [x]
- Commit after each major milestone

### **How to Navigate This Document:**
1. Read the task's **Problem Statement** to understand WHY
2. Review **Acceptance Criteria** to understand WHAT success looks like
3. Follow **Technical Approach** step-by-step for HOW to implement
4. Use **Testing Checklist** to verify it works
5. Mark task as complete and move to next

### **Commands You'll Need:**
```bash
# Run tests
npm test

# Start backend
python app/main.py

# Check database
sqlite3 data/typer_data.db "SELECT * FROM instant_stats LIMIT 5;"

# Git workflow
git add .
git commit -m "feat: task description"
```

### **Key Principles:**
- **Don't skip tests** - They prevent regressions
- **Don't hardcode values** - Use constants/config
- **Don't break existing features** - This is a fix sprint, not a rewrite
- **Do ask questions** - If something's unclear, clarify first
- **Do commit frequently** - Small, atomic commits

### **Emergency Contacts:**
- Stuck on a task? Check the **Why This Works** sections
- Test failing? Check the **Testing Checklist**
- Breaking change? Check the **Risk Assessment** section
- Need rollback? Check git history: `git log --oneline`

---

## SPRINT BACKLOG

### **PRIORITY 1: CRITICAL FIXES (Days 1-3)**

---

#### **TASK 1.1: Implement Gaming Prevention System**
**Story Points:** 5  
**Estimated Time:** 1.5 days  
**Priority:** CRITICAL  
**Assignee:** Developer

**Problem Statement:**
Users can currently achieve artificially high WPM scores by pressing random keys repeatedly before typing correctly. This undermines the entire statistics system and makes leaderboards meaningless.

**Acceptance Criteria:**
- [ ] System detects excessive wrong keystrokes per cluster
- [ ] Sessions with suspicious patterns are flagged as invalid
- [ ] Invalid sessions are not saved to database OR saved with `is_valid: false` flag
- [ ] User receives clear feedback when session is invalidated
- [ ] Configuration allows adjusting thresholds without code changes

**Technical Approach:**

**Step 1: Add Validation Constants (30 mins)**
```javascript
// Location: static/js/app.js (top of instant mode section, ~line 2787)

// Gaming Prevention Configuration
const INSTANT_MODE_CONFIG = {
    MAX_WRONG_ATTEMPTS_PER_CLUSTER: 5,  // Maximum wrong keys allowed per cluster
    MAX_WRONG_RATIO: 0.4,                // 40% wrong keystrokes threshold
    MIN_SESSION_TIME_MS: 2000,           // Minimum 2 seconds to prevent instant completion
    MAX_REASONABLE_WPM: 250,             // Flag sessions above this (world record ~230)
    MIN_ACCURACY_THRESHOLD: 30           // Flag sessions below 30% accuracy
};
```

**Why these thresholds?**
- **5 wrong attempts:** Allows legitimate mistakes (typos, keyboard slip) but prevents spam
- **40% wrong ratio:** Average typist makes 10-20% mistakes; 40% is generous buffer
- **2 seconds minimum:** Prevents gaming by instant completion exploits
- **250 WPM max:** Bangla world record is ~180 WPM; 250 allows outliers
- **30% accuracy:** Below this indicates random typing, not legitimate practice

**Step 2: Create Validation Module (2 hours)**
```javascript
// Location: static/js/app.js (~line 2810, after constants)

/**
 * Validates typing session to detect gaming/cheating patterns
 * @param {Object} sessionData - Complete session statistics
 * @returns {Object} { isValid: boolean, reason: string, flags: string[] }
 */
function validateTypingSession(sessionData) {
    const flags = [];
    let isValid = true;
    let reason = '';
    
    // Check 1: Wrong keystroke ratio
    const wrongRatio = sessionData.wrongKeystrokes / sessionData.totalKeystrokes;
    if (wrongRatio > INSTANT_MODE_CONFIG.MAX_WRONG_RATIO) {
        flags.push('EXCESSIVE_WRONG_RATIO');
        isValid = false;
        reason = `Too many wrong keystrokes (${Math.round(wrongRatio * 100)}%)`;
    }
    
    // Check 2: Unrealistic WPM
    if (sessionData.wpm > INSTANT_MODE_CONFIG.MAX_REASONABLE_WPM) {
        flags.push('UNREALISTIC_WPM');
        isValid = false;
        reason = `WPM too high (${sessionData.wpm})`;
    }
    
    // Check 3: Minimum session time
    if (sessionData.timeMs < INSTANT_MODE_CONFIG.MIN_SESSION_TIME_MS) {
        flags.push('SESSION_TOO_SHORT');
        isValid = false;
        reason = `Session too short (${sessionData.timeMs}ms)`;
    }
    
    // Check 4: Suspiciously low accuracy with high WPM
    if (sessionData.acc < INSTANT_MODE_CONFIG.MIN_ACCURACY_THRESHOLD && sessionData.wpm > 100) {
        flags.push('LOW_ACCURACY_HIGH_WPM');
        isValid = false;
        reason = `Low accuracy (${sessionData.acc}%) with high WPM`;
    }
    
    // Check 5: Per-cluster wrong attempt tracking (if available)
    if (sessionData.maxWrongAttemptsPerCluster > INSTANT_MODE_CONFIG.MAX_WRONG_ATTEMPTS_PER_CLUSTER) {
        flags.push('EXCESSIVE_CLUSTER_ATTEMPTS');
        isValid = false;
        reason = `Too many attempts on single character`;
    }
    
    return { isValid, reason, flags };
}
```

**Step 3: Track Per-Cluster Wrong Attempts (1.5 hours)**
```javascript
// Location: static/js/app.js (~line 2793, update state)

// ADD to instTypingState initialization:
let instTypingState = {
    startTime: null,
    endTime: null,
    wpmHistory: [],
    rawHistory: [],
    errHistory: [],
    mistakesHistory: [],
    lastCorr: 0,
    lastTotal: 0,
    lastErr: 0,
    lastMistakes: 0,
    clusterAttempts: {},  // NEW: Track wrong attempts per cluster
    maxWrongAttemptsPerCluster: 0  // NEW: Track maximum attempts
};
```

```javascript
// Location: static/js/app.js (~line 3190, in keystroke handler)

// MODIFY the wrong keystroke handling:
} else {
    instKeystrokes.total++;
    instKeystrokes.wrong++;
    
    // Track per-cluster wrong attempts
    if (isLastInCluster) {
        const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === curStep.targetEnd);
        
        // Increment attempt counter for this cluster
        if (!instTypingState.clusterAttempts[ci]) {
            instTypingState.clusterAttempts[ci] = 0;
        }
        instTypingState.clusterAttempts[ci]++;
        
        // Update maximum
        if (instTypingState.clusterAttempts[ci] > instTypingState.maxWrongAttemptsPerCluster) {
            instTypingState.maxWrongAttemptsPerCluster = instTypingState.clusterAttempts[ci];
        }
        
        typedCorrectness[ci] = false;
        currentIndex++;
    } else {
        const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === curStep.clusterEnd);
        
        // Track attempts even for partial cluster
        if (!instTypingState.clusterAttempts[ci]) {
            instTypingState.clusterAttempts[ci] = 0;
        }
        instTypingState.clusterAttempts[ci]++;
        
        if (instTypingState.clusterAttempts[ci] > instTypingState.maxWrongAttemptsPerCluster) {
            instTypingState.maxWrongAttemptsPerCluster = instTypingState.clusterAttempts[ci];
        }
        
        typedCorrectness[ci] = false;
        currentIndex++;
    }
}
```

**Step 4: Integrate Validation into Results (2 hours)**
```javascript
// Location: static/js/app.js (~line 3308, showInstResults function)

function showInstResults() {
    // ... existing time calculations ...
    
    // Prepare session data for validation
    const sessionData = {
        wpm: wpm,
        rawWpm: rawWpm,
        acc: acc,
        consistency: consistency,
        timeMs: timeMs,
        totalKeystrokes: instKeystrokes.total,
        wrongKeystrokes: instKeystrokes.wrong,
        correctKeystrokes: instKeystrokes.correct,
        maxWrongAttemptsPerCluster: instTypingState.maxWrongAttemptsPerCluster
    };
    
    // Validate session
    const validation = validateTypingSession(sessionData);
    
    // Display validation warning if invalid
    if (!validation.isValid) {
        document.getElementById('validation-warning').style.display = 'block';
        document.getElementById('validation-reason').textContent = validation.reason;
        console.warn('Invalid session detected:', validation.flags);
    } else {
        document.getElementById('validation-warning').style.display = 'none';
    }
    
    // ... existing display code ...
    
    // Save to database with validation flag
    const payload = {
        timestamp: Date.now(),
        wpm: wpm,
        rawWpm: rawWpm,
        acc: acc,
        consistency: consistency,
        timeMs: timeMs,
        correctChars: correctChars,
        wrongChars: wrongChars,
        extraChars: extraChars,
        missedChars: missedChars,
        totalChars: instKeystrokes.total,
        isValid: validation.isValid,  // NEW FIELD
        validationFlags: validation.flags.join(',')  // NEW FIELD
    };
    
    saveInstantStats(payload);
}
```

**Step 5: Update Database Schema (1 hour)**
```python
# Location: app/database.py (~line 54, instant_stats table)

# ADD migration to add new columns:
c.execute("""
    CREATE TABLE IF NOT EXISTS instant_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER,
        wpm INTEGER,
        rawWpm INTEGER,
        acc INTEGER,
        consistency INTEGER,
        timeMs INTEGER,
        correctChars INTEGER,
        wrongChars INTEGER,
        extraChars INTEGER,
        missedChars INTEGER,
        totalChars INTEGER,
        isValid INTEGER DEFAULT 1,           -- NEW: 1 = valid, 0 = invalid
        validationFlags TEXT DEFAULT ''      -- NEW: Comma-separated flags
    )
""")

# Add migration for existing databases:
try:
    c.execute("ALTER TABLE instant_stats ADD COLUMN isValid INTEGER DEFAULT 1")
except sqlite3.OperationalError:
    pass  # Column already exists

try:
    c.execute("ALTER TABLE instant_stats ADD COLUMN validationFlags TEXT DEFAULT ''")
except sqlite3.OperationalError:
    pass
```

```python
# Location: app/models.py (~line 3, InstantStatRequest)

class InstantStatRequest(BaseModel):
    timestamp: int
    wpm: int
    rawWpm: int
    acc: int
    consistency: int
    timeMs: int
    correctChars: int
    wrongChars: int
    extraChars: int
    missedChars: int
    totalChars: int
    isValid: bool = True              # NEW
    validationFlags: str = ""         # NEW
```

```python
# Location: app/routers/stats.py (~line 9, add_inst_stat)

@router.post("/inst_stats")
def add_inst_stat(req: InstantStatRequest):
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO instant_stats 
                (timestamp, wpm, rawWpm, acc, consistency, timeMs, correctChars, 
                 wrongChars, extraChars, missedChars, totalChars, isValid, validationFlags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    req.timestamp,
                    req.wpm,
                    req.rawWpm,
                    req.acc,
                    req.consistency,
                    req.timeMs,
                    req.correctChars,
                    req.wrongChars,
                    req.extraChars,
                    req.missedChars,
                    req.totalChars,
                    1 if req.isValid else 0,      # NEW
                    req.validationFlags            # NEW
                ),
            )
            conn.commit()
        return {"status": "ok"}
    except sqlite3.OperationalError as e:
        print("SQLite Error on POST /api/inst_stats:", e)
        return {"status": "db_error"}
```

**Step 6: Add UI Warning Display (30 mins)**
```html
<!-- Location: index.html (in instant mode results modal) -->

<div id="validation-warning" class="validation-warning" style="display: none;">
    <div class="warning-icon">⚠️</div>
    <div class="warning-content">
        <h4>Session Flagged</h4>
        <p id="validation-reason">This session shows unusual patterns.</p>
        <p class="warning-note">Statistics saved but marked as invalid. This may be due to too many mistakes or unusual typing behavior.</p>
    </div>
</div>
```

**Testing Checklist:**
- [ ] Normal typing session passes validation
- [ ] Session with >40% wrong keystrokes gets flagged
- [ ] Session with >5 attempts per cluster gets flagged
- [ ] Session with >250 WPM gets flagged
- [ ] Session <2 seconds gets flagged
- [ ] Invalid sessions saved with `isValid=0` in database
- [ ] Warning message displays correctly in UI
- [ ] Statistics view can filter out invalid sessions

**Why This Approach?**
1. **Non-breaking:** Existing functionality unchanged; validation is additive
2. **Configurable:** Thresholds in constants allow easy tuning
3. **Transparent:** Users see why session was flagged
4. **Recoverable:** Data still saved for analysis, just marked invalid
5. **Future-proof:** Can add ML-based detection later

---

#### **TASK 1.2: Standardize WPM Calculation Formula**
**Story Points:** 3  
**Estimated Time:** 1.5 days  
**Priority:** CRITICAL  
**Assignee:** Developer

**Problem Statement:**
Three different WPM calculation formulas exist in the codebase (interval, real-time, final), producing inconsistent results. This undermines user trust and makes data analysis unreliable.

**Current Formulas:**
```javascript
// Interval (WRONG):
const wpm = Math.max(0, Math.floor((tot / 5 - mistakesInInterval) * 60));

// Real-time (CORRECT):
currentWpm = Math.max(0, Math.floor((instKeystrokes.total / 5 - mistakes) / elapsedMin));

// Final (CORRECT):
const wpm = timeMin > 0 ? Math.max(0, Math.floor((instKeystrokes.total / 5 - mistakes) / timeMin)) : 0;
```

**Acceptance Criteria:**
- [ ] Single source of truth for WPM calculation
- [ ] All three contexts (interval, real-time, final) use same formula
- [ ] Formula documented with rationale
- [ ] Test suite validates consistency
- [ ] No regression in displayed values for valid sessions

**Technical Approach:**

**Step 1: Create Centralized Calculation Module (2 hours)**
```javascript
// Location: static/js/app.js (~line 2850, after generateSequence function)

/**
 * WPM Calculation Module
 * 
 * Standard Formula (Industry + Bangladesh Computer Council):
 * - Gross WPM = (Total Keystrokes / 5) / Time in Minutes
 * - Net WPM = Gross WPM - (Mistakes / Time in Minutes)
 * - Simplified: Net WPM = ((Total Keystrokes / 5) - Mistakes) / Time in Minutes
 * 
 * Constants:
 * - KEYSTROKES_PER_WORD = 5 (industry standard)
 * - Mistakes = Word-level errors (not character-level)
 * - Time in Minutes (not seconds)
 */

const KEYSTROKES_PER_WORD = 5;  // Industry standard: 5 keystrokes = 1 word

const WPMCalculator = {
    /**
     * Calculate Net WPM (standard formula)
     * @param {number} totalKeystrokes - All keystrokes including wrong ones
     * @param {number} mistakes - Word-level mistake count
     * @param {number} timeMs - Time elapsed in milliseconds
     * @returns {number} Net WPM (floored, minimum 0)
     */
    calculateNetWPM(totalKeystrokes, mistakes, timeMs) {
        if (timeMs <= 0) return 0;
        const timeMin = timeMs / 60000;
        const grossWPM = totalKeystrokes / KEYSTROKES_PER_WORD;
        const netWPM = (grossWPM - mistakes) / timeMin;
        return Math.max(0, Math.floor(netWPM));
    },
    
    /**
     * Calculate Raw WPM (no mistake penalty)
     * @param {number} totalKeystrokes - All keystrokes
     * @param {number} timeMs - Time elapsed in milliseconds
     * @returns {number} Raw WPM (floored, minimum 0)
     */
    calculateRawWPM(totalKeystrokes, timeMs) {
        if (timeMs <= 0) return 0;
        const timeMin = timeMs / 60000;
        const grossWPM = (totalKeystrokes / KEYSTROKES_PER_WORD) / timeMin;
        return Math.max(0, Math.floor(grossWPM));
    },
    
    /**
     * Calculate interval WPM (for per-second tracking)
     * Uses same formula but with interval data
     * @param {number} keystrokesInInterval - Keystrokes in this time slice
     * @param {number} mistakesInInterval - Mistakes in this time slice
     * @param {number} intervalMs - Time slice duration (usually 1000ms)
     * @returns {Object} { netWPM, rawWPM }
     */
    calculateIntervalWPM(keystrokesInInterval, mistakesInInterval, intervalMs) {
        const netWPM = this.calculateNetWPM(keystrokesInInterval, mistakesInInterval, intervalMs);
        const rawWPM = this.calculateRawWPM(keystrokesInInterval, intervalMs);
        return { netWPM, rawWPM };
    },
    
    /**
     * Calculate accuracy percentage
     * @param {number} correctKeystrokes
     * @param {number} totalKeystrokes
     * @returns {number} Accuracy percentage (0-100, floored)
     */
    calculateAccuracy(correctKeystrokes, totalKeystrokes) {
        if (totalKeystrokes === 0) return 100;
        return Math.floor((correctKeystrokes / totalKeystrokes) * 100);
    },
    
    /**
     * Calculate consistency from WPM history
     * @param {Array<number>} wpmHistory - Array of per-second WPM values
     * @param {number} fallbackValue - Value to return if insufficient data
     * @returns {number|null} Consistency percentage (0-100) or null
     */
    calculateConsistency(wpmHistory, fallbackValue = null) {
        if (wpmHistory.length < 3) {
            return fallbackValue;  // Not enough data
        }
        
        const mean = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
        
        // Avoid division by zero
        if (mean === 0) return fallbackValue;
        
        const variance = wpmHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmHistory.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        
        // Map CV to 0-100 scale (lower CV = higher consistency)
        const unmapped = 100 - (cv * 100);
        return Math.max(0, Math.min(100, Math.round(unmapped)));
    }
};
```

**Why This Design?**
1. **Single Source of Truth:** All calculations in one object
2. **Testable:** Pure functions with clear inputs/outputs
3. **Documented:** Formula rationale in comments
4. **Reusable:** Can be extracted to separate file later
5. **Consistent:** Same logic for all WPM calculations

**Step 2: Update Interval WPM Calculation (30 mins)**
```javascript
// Location: static/js/app.js (~line 3145, in setInterval timer)

// REPLACE lines 3158-3168 with:

/**
 * Per-Second Interval Tracking
 * 
 * Captures WPM snapshots every second for:
 * - Consistency calculation
 * - Performance graphs
 * - Trend analysis
 */
if (elapsed >= 1000) {
    const now = Date.now();
    
    // Calculate keystrokes and mistakes since last interval
    const keystrokesInInterval = instKeystrokes.total - instTypingState.lastTotal;
    const errorsInInterval = instKeystrokes.wrong - instTypingState.lastErr;
    const currentMistakes = getCompletedMistakes(
        typedCorrectness, 
        getClusterBoundaries(currentSequence), 
        currentNText
    );
    const mistakesInInterval = currentMistakes - instTypingState.lastMistakes;
    
    // Use standardized calculation (1000ms interval)
    const { netWPM, rawWPM } = WPMCalculator.calculateIntervalWPM(
        keystrokesInInterval,
        mistakesInInterval,
        1000
    );
    
    instTypingState.wpmHistory.push(netWPM);
    instTypingState.rawHistory.push(rawWPM);
    instTypingState.errHistory.push(errorsInInterval);
    instTypingState.mistakesHistory.push(mistakesInInterval);
    
    // Update interval trackers
    instTypingState.lastCorr = instKeystrokes.correct;
    instTypingState.lastTotal = instKeystrokes.total;
    instTypingState.lastErr = instKeystrokes.wrong;
    instTypingState.lastMistakes = currentMistakes;
}
```

**Step 3: Update Real-Time WPM Display (15 mins)**
```javascript
// Location: static/js/app.js (~line 3224, in updateStats function)

// REPLACE lines 3224-3242 with:

let currentWpm = 0;
let currentAcc = 100;

if (instTypingState && instTypingState.startTime) {
    const elapsedMs = Date.now() - instTypingState.startTime;
    
    if (elapsedMs > 0) {
        const mistakes = getCompletedMistakes(
            typedCorrectness, 
            getClusterBoundaries(currentSequence), 
            currentNText
        );
        instKeystrokes.mistakes = mistakes;
        
        // Use standardized calculation
        currentWpm = WPMCalculator.calculateNetWPM(
            instKeystrokes.total,
            mistakes,
            elapsedMs
        );
    }
}

if (instKeystrokes.total > 0) {
    currentAcc = WPMCalculator.calculateAccuracy(
        instKeystrokes.correct,
        instKeystrokes.total
    );
}
```

**Step 4: Update Final Results Calculation (15 mins)**
```javascript
// Location: static/js/app.js (~line 3322, in showInstResults function)

// REPLACE lines 3322-3352 with:

/**
 * Final Session Results
 * Uses standardized WPM calculation module
 */
const mistakes = getCompletedMistakes(
    typedCorrectness, 
    getClusterBoundaries(currentSequence), 
    currentNText
);

// Calculate metrics using standardized module
const wpm = WPMCalculator.calculateNetWPM(instKeystrokes.total, mistakes, timeMs);
const rawWpm = WPMCalculator.calculateRawWPM(instKeystrokes.total, timeMs);
const acc = WPMCalculator.calculateAccuracy(instKeystrokes.correct, instKeystrokes.total);

// Calculate consistency with proper fallback
const consistency = WPMCalculator.calculateConsistency(
    instTypingState.wpmHistory,
    null  // Don't fallback to accuracy - return null if insufficient data
);
```

**Step 5: Update UI to Handle Null Consistency (30 mins)**
```javascript
// Location: static/js/app.js (~line 3363)

// Update display logic:
if (consistency !== null) {
    document.getElementById('res-cons').textContent = toBn(consistency) + '%';
} else {
    document.getElementById('res-cons').textContent = 'N/A';
    document.getElementById('res-cons').title = 'Session too short for consistency measurement';
}
```

**Testing Checklist:**
- [ ] Interval WPM matches final WPM when aggregated
- [ ] Real-time WPM updates correctly during typing
- [ ] Final results show consistent WPM across all displays
- [ ] Consistency calculation doesn't fallback to accuracy
- [ ] Null consistency displays as "N/A" with tooltip
- [ ] All calculations use WPMCalculator module
- [ ] No magic numbers in calculation code

**Why This Fixes The Problem?**
1. **Mathematical Consistency:** All formulas now identical
2. **Transparent:** User sees same WPM everywhere
3. **Maintainable:** One place to update formula if needed
4. **Testable:** Can unit test WPMCalculator independently
5. **Professional:** Matches industry-standard implementation

---

### **PRIORITY 2: MAJOR FIXES (Days 4-5)**

---

#### **TASK 2.1: Rename totalChars to totalKeystrokes**
**Story Points:** 2  
**Estimated Time:** 0.5 days  
**Priority:** MAJOR  
**Assignee:** Developer

**Problem Statement:**
Database column `totalChars` stores keystroke count but is named as if it stores character count. This is misleading and will cause developer confusion.

**Acceptance Criteria:**
- [ ] Database column renamed to `totalKeystrokes`
- [ ] Model field renamed
- [ ] All JavaScript references updated
- [ ] Migration handles existing data
- [ ] No data loss

**Technical Approach:**

**Step 1: Create Database Migration (1 hour)**
```python
# Location: app/database.py (~line 68, after instant_stats table creation)

# Add migration function
def migrate_instant_stats_rename_column():
    """
    Migrate totalChars column to totalKeystrokes
    SQLite doesn't support RENAME COLUMN directly in older versions,
    so we use ALTER TABLE approach for compatibility
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if old column exists
        cursor.execute("PRAGMA table_info(instant_stats)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'totalChars' in columns and 'totalKeystrokes' not in columns:
            print("Migrating instant_stats: totalChars -> totalKeystrokes")
            
            # For SQLite 3.25.0+, use simple rename
            try:
                cursor.execute(
                    "ALTER TABLE instant_stats RENAME COLUMN totalChars TO totalKeystrokes"
                )
                conn.commit()
                print("✓ Column renamed successfully")
                return
            except sqlite3.OperationalError:
                # Fallback for older SQLite versions
                pass
            
            # Fallback: Create new table and copy data
            cursor.execute("""
                CREATE TABLE instant_stats_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp INTEGER,
                    wpm INTEGER,
                    rawWpm INTEGER,
                    acc INTEGER,
                    consistency INTEGER,
                    timeMs INTEGER,
                    correctChars INTEGER,
                    wrongChars INTEGER,
                    extraChars INTEGER,
                    missedChars INTEGER,
                    totalKeystrokes INTEGER,
                    isValid INTEGER DEFAULT 1,
                    validationFlags TEXT DEFAULT ''
                )
            """)
            
            # Copy data (mapping totalChars -> totalKeystrokes)
            cursor.execute("""
                INSERT INTO instant_stats_new 
                SELECT id, timestamp, wpm, rawWpm, acc, consistency, timeMs,
                       correctChars, wrongChars, extraChars, missedChars,
                       totalChars, isValid, validationFlags
                FROM instant_stats
            """)
            
            # Drop old table and rename new
            cursor.execute("DROP TABLE instant_stats")
            cursor.execute("ALTER TABLE instant_stats_new RENAME TO instant_stats")
            
            conn.commit()
            print("✓ Table recreated with new column name")

# Call migration in init_db()
# Location: app/database.py (~line 185, before final conn.commit())

def init_db():
    # ... existing table creation code ...
    
    # Run migrations
    migrate_instant_stats_rename_column()
    
    conn.commit()
```

**Step 2: Update Backend Model (5 mins)**
```python
# Location: app/models.py (~line 14)

class InstantStatRequest(BaseModel):
    timestamp: int
    wpm: int
    rawWpm: int
    acc: int
    consistency: int
    timeMs: int
    correctChars: int
    wrongChars: int
    extraChars: int
    missedChars: int
    totalKeystrokes: int  # RENAMED from totalChars
    isValid: bool = True
    validationFlags: str = ""
```

**Step 3: Update Backend Router (5 mins)**
```python
# Location: app/routers/stats.py (~line 16 and 30)

conn.execute(
    """
    INSERT INTO instant_stats 
    (timestamp, wpm, rawWpm, acc, consistency, timeMs, correctChars, 
     wrongChars, extraChars, missedChars, totalKeystrokes, isValid, validationFlags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
    (
        req.timestamp,
        req.wpm,
        req.rawWpm,
        req.acc,
        req.consistency,
        req.timeMs,
        req.correctChars,
        req.wrongChars,
        req.extraChars,
        req.missedChars,
        req.totalKeystrokes,  # RENAMED
        1 if req.isValid else 0,
        req.validationFlags
    ),
)
```

**Step 4: Update Frontend Payload (5 mins)**
```javascript
// Location: static/js/app.js (~line 3381)

const payload = {
    timestamp: Date.now(),
    wpm: wpm,
    rawWpm: rawWpm,
    acc: acc,
    consistency: consistency,
    timeMs: timeMs,
    correctChars: correctChars,
    wrongChars: wrongChars,
    extraChars: extraChars,
    missedChars: missedChars,
    totalKeystrokes: instKeystrokes.total,  // RENAMED from totalChars
    isValid: validation.isValid,
    validationFlags: validation.flags.join(',')
};
```

**Testing Checklist:**
- [ ] Migration runs without errors on existing database
- [ ] All existing data preserved
- [ ] New sessions save with `totalKeystrokes` field
- [ ] Backend accepts payload with new field name
- [ ] No console errors in frontend
- [ ] Statistics display correctly

---

#### **TASK 2.2: Remove or Fix missedChars**
**Story Points:** 2  
**Estimated Time:** 0.5 days  
**Priority:** MAJOR  
**Assignee:** Developer

**Problem Statement:**
`missedChars` is hardcoded to 0 due to forced correction mechanics. This wastes database space and misleads users/developers about what's being tracked.

**Acceptance Criteria:**
- [ ] Decision: Remove entirely OR implement skip feature
- [ ] Database column handled appropriately
- [ ] UI updated to reflect decision
- [ ] No wasted storage

**Recommended Approach: Remove Entirely**

**Technical Approach:**

**Step 1: Remove from Frontend (15 mins)**
```javascript
// Location: static/js/app.js (~line 3319)

// DELETE this line:
// const missedChars = 0; // Forced correction mechanics

// Location: static/js/app.js (~line 3361)
// DELETE this line:
// document.getElementById('res-char-m').textContent = toBn(missedChars);
```

```html
<!-- Location: index.html (instant results modal) -->
<!-- REMOVE or comment out missed chars display -->
<!--
<div class="stat-item">
    <span class="stat-label">Missed:</span>
    <span id="res-char-m" class="stat-value">0</span>
</div>
-->
```

**Step 2: Remove from Payload (5 mins)**
```javascript
// Location: static/js/app.js (~line 3380)

const payload = {
    timestamp: Date.now(),
    wpm: wpm,
    rawWpm: rawWpm,
    acc: acc,
    consistency: consistency,
    timeMs: timeMs,
    correctChars: correctChars,
    wrongChars: wrongChars,
    extraChars: extraChars,
    // missedChars: missedChars,  // REMOVED
    totalKeystrokes: instKeystrokes.total,
    isValid: validation.isValid,
    validationFlags: validation.flags.join(',')
};
```

**Step 3: Update Backend Model (5 mins)**
```python
# Location: app/models.py

class InstantStatRequest(BaseModel):
    timestamp: int
    wpm: int
    rawWpm: int
    acc: int
    consistency: int
    timeMs: int
    correctChars: int
    wrongChars: int
    extraChars: int
    # missedChars: int  # REMOVED
    totalKeystrokes: int
    isValid: bool = True
    validationFlags: str = ""
```

**Step 4: Mark Column as Deprecated (Don't Drop Yet) (10 mins)**
```python
# Location: app/database.py (~line 65)

# Keep column for backward compatibility but stop using it
# Add comment:
# missedChars INTEGER,  -- DEPRECATED: Always 0 due to forced correction. Will remove in v2.0
```

**Why Not Drop Column Immediately?**
- Existing databases might have this column
- Backward compatibility for analytics queries
- Can drop in major version update

**Testing Checklist:**
- [ ] New sessions don't send missedChars in payload
- [ ] Backend accepts payload without missedChars
- [ ] UI doesn't display missed chars
- [ ] No console errors
- [ ] Existing database records still readable

---

#### **TASK 2.3: Fix Consistency Fallback Logic**
**Story Points:** 1  
**Estimated Time:** 0.5 days  
**Priority:** MAJOR  
**Assignee:** Developer

**Problem Statement:**
Consistency falls back to accuracy for short sessions, which is illogical (they measure different things).

**Already Fixed In Task 1.2**
This is resolved by the WPMCalculator module which returns `null` for insufficient data.

**Additional Work: Update Statistics Display**

**Step 1: Handle Null in Stats View (30 mins)**
```javascript
// Location: static/js/app.js (~line 3706, renderInstStatsView)

// When displaying consistency in history table:
rows.forEach(row => {
    const consistencyDisplay = row.consistency !== null && row.consistency !== undefined 
        ? toBn(row.consistency) + '%' 
        : '<span class="stat-na" title="Session too short">N/A</span>';
    
    // ... use consistencyDisplay in table cell
});

// When calculating averages:
function calculateAverageConsistency(records) {
    // Filter out null/undefined consistency values
    const validRecords = records.filter(r => r.consistency !== null && r.consistency !== undefined);
    
    if (validRecords.length === 0) return null;
    
    const sum = validRecords.reduce((acc, r) => acc + r.consistency, 0);
    return Math.round(sum / validRecords.length);
}
```

**Step 2: Update Database to Allow Null (15 mins)**
```python
# Location: app/models.py

class InstantStatRequest(BaseModel):
    timestamp: int
    wpm: int
    rawWpm: int
    acc: int
    consistency: Optional[int] = None  # Allow None for short sessions
    # ... rest of fields
```

**Step 3: Update Save Logic (15 mins)**
```javascript
// Location: static/js/app.js (~line 3370)

const payload = {
    timestamp: Date.now(),
    wpm: wpm,
    rawWpm: rawWpm,
    acc: acc,
    consistency: consistency !== null ? consistency : -1,  // Use -1 to indicate N/A in database
    // ... rest of fields
};
```

**Testing Checklist:**
- [ ] Sessions < 3 seconds show "N/A" for consistency
- [ ] Sessions ≥ 3 seconds show calculated consistency
- [ ] Average calculations exclude N/A values
- [ ] Database stores -1 for unavailable consistency
- [ ] UI displays tooltip explaining N/A

---

### **PRIORITY 3: TESTING INFRASTRUCTURE (Days 6-7)**

---

#### **TASK 3.1: Create Unit Test Suite for WPM Calculator**
**Story Points:** 3  
**Estimated Time:** 1 day  
**Priority:** HIGH  
**Assignee:** Developer

**Goal:** Achieve 90%+ test coverage on WPMCalculator module

**Technical Approach:**

**Step 1: Set Up Testing Framework (1 hour)**
```bash
# Install testing dependencies
npm init -y  # If no package.json exists
npm install --save-dev jest @types/jest
```

```json
// Location: package.json (add scripts)
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "collectCoverageFrom": [
      "static/js/app.js",
      "!static/js/**/*.min.js"
    ]
  }
}
```

**Step 2: Extract WPMCalculator to Separate File (30 mins)**
```javascript
// Location: static/js/wpm-calculator.js (NEW FILE)

/**
 * WPM Calculation Module for Bangla Typer
 * 
 * Provides standardized calculation functions for:
 * - Net WPM (with mistake penalty)
 * - Raw WPM (without penalty)
 * - Accuracy
 * - Consistency
 */

const KEYSTROKES_PER_WORD = 5;

const WPMCalculator = {
    // ... (copy implementation from Task 1.2)
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WPMCalculator, KEYSTROKES_PER_WORD };
}
```

```html
<!-- Location: index.html -->
<!-- Add before app.js -->
<script src="/static/js/wpm-calculator.js"></script>
```

**Step 3: Write Comprehensive Test Suite (4 hours)**
```javascript
// Location: __tests__/wpm-calculator.test.js (NEW FILE)

const { WPMCalculator, KEYSTROKES_PER_WORD } = require('../static/js/wpm-calculator.js');

describe('WPMCalculator', () => {
    
    describe('calculateNetWPM', () => {
        
        test('calculates standard case correctly', () => {
            // 300 keystrokes, 10 mistakes, 1 minute
            // Expected: (300/5 - 10) / 1 = 50 WPM
            const result = WPMCalculator.calculateNetWPM(300, 10, 60000);
            expect(result).toBe(50);
        });
        
        test('handles zero mistakes', () => {
            // 250 keystrokes, 0 mistakes, 1 minute
            // Expected: (250/5 - 0) / 1 = 50 WPM
            const result = WPMCalculator.calculateNetWPM(250, 0, 60000);
            expect(result).toBe(50);
        });
        
        test('handles high mistake count (negative prevention)', () => {
            // 100 keystrokes, 50 mistakes, 1 minute
            // Expected: (100/5 - 50) / 1 = -30, but floored to 0
            const result = WPMCalculator.calculateNetWPM(100, 50, 60000);
            expect(result).toBe(0);
        });
        
        test('handles zero time gracefully', () => {
            const result = WPMCalculator.calculateNetWPM(100, 5, 0);
            expect(result).toBe(0);
        });
        
        test('handles fractional minutes correctly', () => {
            // 150 keystrokes, 5 mistakes, 30 seconds
            // Expected: (150/5 - 5) / 0.5 = 40 WPM
            const result = WPMCalculator.calculateNetWPM(150, 5, 30000);
            expect(result).toBe(40);
        });
        
        test('floors result to integer', () => {
            // 153 keystrokes, 0 mistakes, 1 minute
            // Expected: (153/5) / 1 = 30.6, floored to 30
            const result = WPMCalculator.calculateNetWPM(153, 0, 60000);
            expect(result).toBe(30);
        });
        
        test('realistic Bangla typing scenario', () => {
            // User types for 2 minutes
            // 450 keystrokes (accounting for Juktakkhor)
            // 8 word-level mistakes
            // Expected: (450/5 - 8) / 2 = 41 WPM
            const result = WPMCalculator.calculateNetWPM(450, 8, 120000);
            expect(result).toBe(41);
        });
        
        test('negative time returns zero', () => {
            const result = WPMCalculator.calculateNetWPM(100, 5, -1000);
            expect(result).toBe(0);
        });
    });
    
    describe('calculateRawWPM', () => {
        
        test('calculates without mistake penalty', () => {
            // 300 keystrokes, 1 minute
            // Expected: (300/5) / 1 = 60 WPM
            const result = WPMCalculator.calculateRawWPM(300, 60000);
            expect(result).toBe(60);
        });
        
        test('handles zero time', () => {
            const result = WPMCalculator.calculateRawWPM(100, 0);
            expect(result).toBe(0);
        });
        
        test('handles fractional minutes', () => {
            // 200 keystrokes, 45 seconds
            // Expected: (200/5) / 0.75 = 53.33, floored to 53
            const result = WPMCalculator.calculateRawWPM(200, 45000);
            expect(result).toBe(53);
        });
    });
    
    describe('calculateIntervalWPM', () => {
        
        test('calculates 1-second interval correctly', () => {
            // In 1 second: 25 keystrokes, 2 mistakes
            // Net: ((25/5) - 2) / (1/60) = 180 WPM
            const result = WPMCalculator.calculateIntervalWPM(25, 2, 1000);
            expect(result.netWPM).toBe(180);
        });
        
        test('returns both net and raw WPM', () => {
            const result = WPMCalculator.calculateIntervalWPM(30, 1, 1000);
            expect(result).toHaveProperty('netWPM');
            expect(result).toHaveProperty('rawWPM');
            expect(typeof result.netWPM).toBe('number');
            expect(typeof result.rawWPM).toBe('number');
        });
        
        test('interval with no mistakes', () => {
            // 20 keystrokes, 0 mistakes, 1 second
            // Net = Raw = (20/5) / (1/60) = 240 WPM
            const result = WPMCalculator.calculateIntervalWPM(20, 0, 1000);
            expect(result.netWPM).toBe(240);
            expect(result.rawWPM).toBe(240);
        });
        
        test('interval with all mistakes', () => {
            // 10 keystrokes, 5 mistakes, 1 second
            // Net = ((10/5) - 5) / (1/60) = -180, floored to 0
            const result = WPMCalculator.calculateIntervalWPM(10, 5, 1000);
            expect(result.netWPM).toBe(0);
            expect(result.rawWPM).toBeGreaterThan(0);
        });
    });
    
    describe('calculateAccuracy', () => {
        
        test('calculates perfect accuracy', () => {
            const result = WPMCalculator.calculateAccuracy(100, 100);
            expect(result).toBe(100);
        });
        
        test('calculates 50% accuracy', () => {
            const result = WPMCalculator.calculateAccuracy(50, 100);
            expect(result).toBe(50);
        });
        
        test('floors decimal accuracy', () => {
            // 67 correct / 100 total = 67%
            const result = WPMCalculator.calculateAccuracy(67, 100);
            expect(result).toBe(67);
        });
        
        test('handles zero correct keystrokes', () => {
            const result = WPMCalculator.calculateAccuracy(0, 100);
            expect(result).toBe(0);
        });
        
        test('handles zero total keystrokes', () => {
            const result = WPMCalculator.calculateAccuracy(0, 0);
            expect(result).toBe(100);  // No typing = perfect by default
        });
        
        test('realistic accuracy calculation', () => {
            // 385 correct out of 412 total
            // 385/412 = 93.44%, floored to 93
            const result = WPMCalculator.calculateAccuracy(385, 412);
            expect(result).toBe(93);
        });
    });
    
    describe('calculateConsistency', () => {
        
        test('calculates consistency for stable typing', () => {
            // Very consistent: [50, 51, 50, 49, 50]
            const history = [50, 51, 50, 49, 50];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThan(95);  // High consistency
        });
        
        test('calculates consistency for variable typing', () => {
            // Very inconsistent: [10, 80, 30, 90, 20]
            const history = [10, 80, 30, 90, 20];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeLessThan(50);  // Low consistency
        });
        
        test('returns fallback for insufficient data (< 3 points)', () => {
            const result = WPMCalculator.calculateConsistency([50, 60], 42);
            expect(result).toBe(42);  // Returns fallback
        });
        
        test('returns null fallback if no fallback provided', () => {
            const result = WPMCalculator.calculateConsistency([50], null);
            expect(result).toBeNull();
        });
        
        test('handles all-zero history', () => {
            // Edge case: user hasn't typed yet
            const result = WPMCalculator.calculateConsistency([0, 0, 0], null);
            expect(result).toBeNull();  // Can't calculate
        });
        
        test('handles perfect consistency (all same values)', () => {
            // All 60 WPM: [60, 60, 60, 60, 60]
            const history = [60, 60, 60, 60, 60];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBe(100);  // Perfect consistency
        });
        
        test('clamps result to 0-100 range', () => {
            // Extreme variance might produce values outside range
            const history = [5, 200, 3, 180, 7, 190];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
        
        test('realistic consistent typing pattern', () => {
            // Realistic: user types at 45-55 WPM consistently
            const history = [48, 52, 50, 51, 49, 53, 47, 50, 51, 49];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThan(90);
        });
        
        test('realistic inconsistent typing pattern', () => {
            // Realistic: user varies 30-70 WPM
            const history = [35, 62, 48, 71, 39, 55, 44, 68, 33, 58];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeLessThan(75);
        });
    });
    
    describe('Edge Cases & Error Handling', () => {
        
        test('handles negative keystrokes gracefully', () => {
            const result = WPMCalculator.calculateNetWPM(-100, 0, 60000);
            expect(result).toBe(0);
        });
        
        test('handles negative mistakes gracefully', () => {
            const result = WPMCalculator.calculateNetWPM(300, -10, 60000);
            expect(result).toBeGreaterThan(0);  // Should handle gracefully
        });
        
        test('handles very large numbers', () => {
            // User types for 10 hours (unlikely but possible)
            const result = WPMCalculator.calculateNetWPM(180000, 500, 36000000);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1000);
        });
        
        test('handles floating point precision', () => {
            // Ensure consistent results with floating point
            const result1 = WPMCalculator.calculateNetWPM(333, 10, 60000);
            const result2 = WPMCalculator.calculateNetWPM(333, 10, 60000);
            expect(result1).toBe(result2);
        });
    });
    
    describe('Integration: Net vs Raw WPM', () => {
        
        test('net WPM always less than or equal to raw WPM', () => {
            const totalKeystrokes = 400;
            const mistakes = 15;
            const timeMs = 60000;
            
            const net = WPMCalculator.calculateNetWPM(totalKeystrokes, mistakes, timeMs);
            const raw = WPMCalculator.calculateRawWPM(totalKeystrokes, timeMs);
            
            expect(net).toBeLessThanOrEqual(raw);
        });
        
        test('net equals raw when no mistakes', () => {
            const totalKeystrokes = 300;
            const timeMs = 60000;
            
            const net = WPMCalculator.calculateNetWPM(totalKeystrokes, 0, timeMs);
            const raw = WPMCalculator.calculateRawWPM(totalKeystrokes, timeMs);
            
            expect(net).toBe(raw);
        });
    });
    
});

describe('KEYSTROKES_PER_WORD constant', () => {
    
    test('is set to industry standard value', () => {
        expect(KEYSTROKES_PER_WORD).toBe(5);
    });
    
});
```

**Step 4: Write Validation Tests (1 hour)**
```javascript
// Location: __tests__/validation.test.js (NEW FILE)

// Mock the validateTypingSession function
// (Will need to extract to separate file similar to WPMCalculator)

describe('Gaming Prevention Validation', () => {
    
    test('valid session passes all checks', () => {
        const session = {
            wpm: 45,
            rawWpm: 50,
            acc: 90,
            consistency: 85,
            timeMs: 60000,
            totalKeystrokes: 300,
            wrongKeystrokes: 30,
            correctKeystrokes: 270,
            maxWrongAttemptsPerCluster: 2
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(true);
        expect(result.flags).toHaveLength(0);
    });
    
    test('detects excessive wrong ratio', () => {
        const session = {
            wpm: 50,
            timeMs: 60000,
            totalKeystrokes: 500,
            wrongKeystrokes: 250,  // 50% wrong
            correctKeystrokes: 250,
            acc: 50,
            maxWrongAttemptsPerCluster: 3
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags).toContain('EXCESSIVE_WRONG_RATIO');
    });
    
    test('detects unrealistic WPM', () => {
        const session = {
            wpm: 300,  // Impossible
            rawWpm: 320,
            acc: 95,
            timeMs: 60000,
            totalKeystrokes: 1600,
            wrongKeystrokes: 80,
            correctKeystrokes: 1520,
            maxWrongAttemptsPerCluster: 1
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags).toContain('UNREALISTIC_WPM');
    });
    
    test('detects session too short', () => {
        const session = {
            wpm: 100,
            timeMs: 1500,  // 1.5 seconds
            totalKeystrokes: 50,
            wrongKeystrokes: 5,
            correctKeystrokes: 45,
            acc: 90,
            maxWrongAttemptsPerCluster: 1
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags).toContain('SESSION_TOO_SHORT');
    });
    
    test('detects low accuracy with high WPM (spam pattern)', () => {
        const session = {
            wpm: 150,
            acc: 25,  // Very low
            timeMs: 30000,
            totalKeystrokes: 1000,
            wrongKeystrokes: 750,
            correctKeystrokes: 250,
            maxWrongAttemptsPerCluster: 10
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags).toContain('LOW_ACCURACY_HIGH_WPM');
    });
    
    test('detects excessive cluster attempts', () => {
        const session = {
            wpm: 40,
            acc: 80,
            timeMs: 60000,
            totalKeystrokes: 300,
            wrongKeystrokes: 60,
            correctKeystrokes: 240,
            maxWrongAttemptsPerCluster: 12  // Way too many
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags).toContain('EXCESSIVE_CLUSTER_ATTEMPTS');
    });
    
    test('can detect multiple violations', () => {
        const session = {
            wpm: 280,  // Too high
            acc: 20,   // Too low
            timeMs: 1000,  // Too short
            totalKeystrokes: 600,
            wrongKeystrokes: 480,
            correctKeystrokes: 120,
            maxWrongAttemptsPerCluster: 15
        };
        
        const result = validateTypingSession(session);
        expect(result.isValid).toBe(false);
        expect(result.flags.length).toBeGreaterThan(1);
    });
    
});
```

**Step 5: Run Tests and Fix Issues (1 hour)**
```bash
# Run tests
npm test

# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

**Testing Checklist:**
- [ ] All WPM calculation tests pass
- [ ] All validation tests pass
- [ ] Coverage > 90% for WPMCalculator
- [ ] Edge cases covered
- [ ] Tests run in CI/CD (if configured)

---

#### **TASK 3.2: Integration Testing**
**Story Points:** 2  
**Estimated Time:** 1 day  
**Priority:** HIGH  
**Assignee:** Developer

**Goal:** Verify all components work together correctly

**Technical Approach:**

**Step 1: Manual Test Plan (2 hours execution)**
```markdown
# Location: MANUAL_TEST_PLAN.md (NEW FILE)

## Instant Mode Manual Test Plan

### Test Case 1: Normal Typing Session
**Objective:** Verify normal session completes successfully

**Steps:**
1. Open Instant Mode
2. Type the displayed text accurately at moderate speed (30-50 WPM)
3. Make 2-3 mistakes and correct them
4. Complete the passage

**Expected Results:**
- [ ] WPM displayed correctly (30-50 range)
- [ ] Accuracy displayed correctly (>85%)
- [ ] Consistency displayed as percentage (not N/A)
- [ ] Session marked as valid (`isValid: true`)
- [ ] Results saved to database
- [ ] No console errors

---

### Test Case 2: Short Session
**Objective:** Verify consistency shows N/A for short sessions

**Steps:**
1. Open Instant Mode
2. Type only first 2-3 words quickly (<3 seconds)
3. Complete

**Expected Results:**
- [ ] WPM calculated correctly
- [ ] Consistency shows "N/A" with tooltip
- [ ] Session saved successfully

---

### Test Case 3: Gaming Attempt - Random Keys
**Objective:** Verify random key spam is detected

**Steps:**
1. Open Instant Mode
2. Press random keys rapidly for 10 seconds (not matching text)
3. Then type correctly to complete

**Expected Results:**
- [ ] Session flagged as invalid
- [ ] Warning message displayed
- [ ] Reason explains "too many wrong keystrokes"
- [ ] Session saved with `isValid: false`
- [ ] validationFlags contains appropriate flag

---

### Test Case 4: Gaming Attempt - Excessive Cluster Attempts
**Objective:** Verify excessive retry detection

**Steps:**
1. Open Instant Mode
2. On first character, press wrong key 6+ times
3. Then press correct key
4. Continue normally

**Expected Results:**
- [ ] Session flagged as invalid
- [ ] Warning shows "too many attempts"
- [ ] Flag: EXCESSIVE_CLUSTER_ATTEMPTS

---

### Test Case 5: Perfect Typing
**Objective:** Verify 100% accuracy handling

**Steps:**
1. Open Instant Mode
2. Type entire passage without any mistakes
3. Complete

**Expected Results:**
- [ ] Accuracy = 100%
- [ ] Net WPM = Raw WPM
- [ ] Consistency calculated correctly
- [ ] Session valid

---

### Test Case 6: Very Fast Typing
**Objective:** Verify unrealistic WPM detection

**Steps:**
1. **Cannot simulate realistically - use console manipulation:**
   ```javascript
   // In browser console during session:
   instKeystrokes.total = 5000;
   instKeystrokes.correct = 4800;
   instTypingState.startTime = Date.now() - 10000;  // 10 seconds ago
   ```
2. Complete session

**Expected Results:**
- [ ] Session flagged as invalid
- [ ] Flag: UNREALISTIC_WPM
- [ ] WPM > 250 detected

---

### Test Case 7: Database Persistence
**Objective:** Verify data saves correctly

**Steps:**
1. Complete 3 typing sessions
2. Check database: `SELECT * FROM instant_stats ORDER BY timestamp DESC LIMIT 3`

**Expected Results:**
- [ ] 3 records present
- [ ] All fields populated correctly
- [ ] totalKeystrokes (not totalChars) contains keystroke count
- [ ] isValid field present
- [ ] Timestamps in milliseconds

---

### Test Case 8: Statistics Display
**Objective:** Verify stats view works with new data

**Steps:**
1. Complete 5 sessions (mix of valid/invalid)
2. Open Statistics view
3. Check displays

**Expected Results:**
- [ ] All sessions shown in history table
- [ ] Invalid sessions marked/highlighted
- [ ] Averages calculated correctly
- [ ] Charts render without errors
- [ ] Consistency N/A values handled

---

### Test Case 9: Cross-Browser Testing
**Objective:** Verify compatibility

**Steps:**
1. Test in Chrome, Firefox, Safari (if available)
2. Complete one session in each
3. Check console for errors

**Expected Results:**
- [ ] Chrome: Works perfectly
- [ ] Firefox: Works perfectly
- [ ] Safari: Works perfectly

---

### Test Case 10: Reload During Session
**Objective:** Verify session recovery/reset

**Steps:**
1. Start typing
2. Reload page mid-session
3. Start new session

**Expected Results:**
- [ ] No console errors
- [ ] New session starts fresh
- [ ] No corrupted data
```

**Step 2: Automated Integration Tests (4 hours)**
```javascript
// Location: __tests__/integration.test.js (NEW FILE)

/**
 * Integration Tests for Instant Mode
 * 
 * These tests simulate user interactions and verify
 * that all components work together correctly.
 */

// Mock DOM elements and functions
beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
        <div id="stat-wpm-rt"></div>
        <div id="stat-acc-rt"></div>
        <div id="res-wpm"></div>
        <div id="res-acc"></div>
        <div id="res-raw"></div>
        <div id="res-cons"></div>
        <div id="validation-warning" style="display:none"></div>
        <div id="validation-reason"></div>
    `;
    
    // Reset state
    instKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
    instTypingState = {
        startTime: null,
        endTime: null,
        wpmHistory: [],
        rawHistory: [],
        errHistory: [],
        mistakesHistory: [],
        lastCorr: 0,
        lastTotal: 0,
        lastErr: 0,
        lastMistakes: 0,
        clusterAttempts: {},
        maxWrongAttemptsPerCluster: 0
    };
});

describe('Complete Typing Session Flow', () => {
    
    test('normal session calculates metrics correctly', () => {
        // Simulate typing session
        const startTime = Date.now() - 60000;  // 1 minute ago
        instTypingState.startTime = startTime;
        instTypingState.endTime = Date.now();
        
        // Simulate keystrokes
        instKeystrokes.total = 300;
        instKeystrokes.correct = 280;
        instKeystrokes.wrong = 20;
        
        // Simulate WPM history (stable typing)
        instTypingState.wpmHistory = [48, 52, 50, 51, 49, 53, 47, 50, 51, 49];
        
        // Mock mistake calculation
        const mistakes = 8;
        
        // Calculate metrics
        const wpm = WPMCalculator.calculateNetWPM(300, 8, 60000);
        const rawWpm = WPMCalculator.calculateRawWPM(300, 60000);
        const acc = WPMCalculator.calculateAccuracy(280, 300);
        const consistency = WPMCalculator.calculateConsistency(instTypingState.wpmHistory);
        
        // Validate results
        expect(wpm).toBe(52);  // (300/5 - 8) / 1
        expect(rawWpm).toBe(60);  // (300/5) / 1
        expect(acc).toBe(93);  // 280/300 = 93.33%
        expect(consistency).toBeGreaterThan(90);  // Stable typing
        
        // Validate session
        const validation = validateTypingSession({
            wpm, rawWpm, acc, consistency,
            timeMs: 60000,
            totalKeystrokes: 300,
            wrongKeystrokes: 20,
            correctKeystrokes: 280,
            maxWrongAttemptsPerCluster: 2
        });
        
        expect(validation.isValid).toBe(true);
    });
    
    test('invalid session gets flagged correctly', () => {
        // Simulate gaming attempt
        instKeystrokes.total = 1000;
        instKeystrokes.correct = 400;
        instKeystrokes.wrong = 600;  // 60% wrong
        instTypingState.maxWrongAttemptsPerCluster = 8;
        
        const validation = validateTypingSession({
            wpm: 80,
            rawWpm: 100,
            acc: 40,
            consistency: 60,
            timeMs: 30000,
            totalKeystrokes: 1000,
            wrongKeystrokes: 600,
            correctKeystrokes: 400,
            maxWrongAttemptsPerCluster: 8
        });
        
        expect(validation.isValid).toBe(false);
        expect(validation.flags.length).toBeGreaterThan(0);
    });
    
});

describe('WPM Consistency Across Contexts', () => {
    
    test('interval WPM aggregates to final WPM', () => {
        // Simulate 5-second session with per-second data
        const intervals = [
            { keystrokes: 30, mistakes: 1 },
            { keystrokes: 32, mistakes: 0 },
            { keystrokes: 28, mistakes: 2 },
            { keystrokes: 31, mistakes: 1 },
            { keystrokes: 29, mistakes: 1 }
        ];
        
        // Calculate interval WPMs
        const intervalWPMs = intervals.map(int => 
            WPMCalculator.calculateIntervalWPM(int.keystrokes, int.mistakes, 1000)
        );
        
        // Calculate final WPM
        const totalKeystrokes = intervals.reduce((sum, int) => sum + int.keystrokes, 0);
        const totalMistakes = intervals.reduce((sum, int) => sum + int.mistakes, 0);
        const finalWPM = WPMCalculator.calculateNetWPM(totalKeystrokes, totalMistakes, 5000);
        
        // Final should be in reasonable range of interval average
        const avgIntervalWPM = intervalWPMs.reduce((sum, wpm) => sum + wpm.netWPM, 0) / intervalWPMs.length;
        
        // Allow 10% variance due to calculation differences
        expect(finalWPM).toBeGreaterThan(avgIntervalWPM * 0.9);
        expect(finalWPM).toBeLessThan(avgIntervalWPM * 1.1);
    });
    
});

describe('Database Payload Structure', () => {
    
    test('payload matches model structure', () => {
        const payload = {
            timestamp: Date.now(),
            wpm: 45,
            rawWpm: 50,
            acc: 90,
            consistency: 85,
            timeMs: 60000,
            correctChars: 50,
            wrongChars: 5,
            extraChars: 3,
            totalKeystrokes: 275,
            isValid: true,
            validationFlags: ''
        };
        
        // Verify all required fields present
        expect(payload).toHaveProperty('timestamp');
        expect(payload).toHaveProperty('wpm');
        expect(payload).toHaveProperty('rawWpm');
        expect(payload).toHaveProperty('acc');
        expect(payload).toHaveProperty('consistency');
        expect(payload).toHaveProperty('timeMs');
        expect(payload).toHaveProperty('totalKeystrokes');
        expect(payload).toHaveProperty('isValid');
        expect(payload).toHaveProperty('validationFlags');
        
        // Verify types
        expect(typeof payload.timestamp).toBe('number');
        expect(typeof payload.wpm).toBe('number');
        expect(typeof payload.isValid).toBe('boolean');
        expect(typeof payload.validationFlags).toBe('string');
        
        // Verify no missedChars field
        expect(payload).not.toHaveProperty('missedChars');
        
        // Verify no totalChars field (renamed to totalKeystrokes)
        expect(payload).not.toHaveProperty('totalChars');
    });
    
});
```

**Step 3: Execute Manual Tests (2 hours)**
- Follow MANUAL_TEST_PLAN.md
- Document any failures
- Take screenshots of validation warnings
- Verify database contents

**Testing Checklist:**
- [ ] All manual tests pass
- [ ] All integration tests pass
- [ ] No console errors during testing
- [ ] Database schema matches expectations
- [ ] Valid sessions save correctly
- [ ] Invalid sessions flagged correctly

---

### **PRIORITY 4: REFACTORING & CLEANUP (Day 8)**

---

#### **TASK 4.1: Extract Constants and Configuration**
**Story Points:** 1  
**Estimated Time:** 0.5 days  
**Priority:** MEDIUM  
**Assignee:** Developer

**Goal:** Remove all magic numbers and centralize configuration

**Technical Approach:**

**Step 1: Create Configuration File (1 hour)**
```javascript
// Location: static/js/instant-mode-config.js (NEW FILE)

/**
 * Instant Mode Configuration
 * 
 * Centralized configuration for all instant mode constants
 * and thresholds. Modify these values to tune behavior.
 */

const InstantModeConfig = {
    
    // Calculation Constants
    KEYSTROKES_PER_WORD: 5,  // Industry standard
    
    // Text Generation
    TEXT_MIN_WORDS: 20,
    TEXT_MAX_WORDS: 60,
    
    // Validation Thresholds
    VALIDATION: {
        MAX_WRONG_ATTEMPTS_PER_CLUSTER: 5,
        MAX_WRONG_RATIO: 0.40,           // 40%
        MIN_SESSION_TIME_MS: 2000,       // 2 seconds
        MAX_REASONABLE_WPM: 250,
        MIN_ACCURACY_THRESHOLD: 30,      // 30%
    },
    
    // UI Update Intervals
    TIMER_INTERVAL_MS: 1000,  // Update every second
    
    // Consistency Calculation
    MIN_CONSISTENCY_DATA_POINTS: 3,
    
    // Display Settings
    HISTORY_TABLE_ROWS: 15,
    HEATMAP_WEEKS: 52,
    
    // Chart Settings
    WPM_DISTRIBUTION_BIN_SIZE: 10,
    
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstantModeConfig };
}
```

**Step 2: Update References (1.5 hours)**
```javascript
// Throughout app.js, replace hardcoded values:

// BEFORE:
let ytPassage = getRandomYouTubePassage(20, 60);

// AFTER:
let ytPassage = getRandomYouTubePassage(
    InstantModeConfig.TEXT_MIN_WORDS,
    InstantModeConfig.TEXT_MAX_WORDS
);

// BEFORE:
if (wpmHistory.length < 3) {

// AFTER:
if (wpmHistory.length < InstantModeConfig.MIN_CONSISTENCY_DATA_POINTS) {

// etc.
```

**Testing Checklist:**
- [ ] All references updated
- [ ] No hardcoded magic numbers remain
- [ ] Functionality unchanged
- [ ] Config file loaded correctly

---

#### **TASK 4.2: Add Error Handling to API Calls**
**Story Points:** 2  
**Estimated Time:** 0.5 days  
**Priority:** MEDIUM  
**Assignee:** Developer

**Goal:** Gracefully handle network/database failures

**Technical Approach:**

**Step 1: Update API Service (2 hours)**
```javascript
// Location: static/js/api.js (~line 17)

/**
 * Save instant typing statistics with retry logic
 * @param {Object} statsPayload - Statistics to save
 * @returns {Promise<Object>} Response object
 */
async function saveInstantStats(statsPayload) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch('/api/inst_stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(statsPayload)
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            
            if (data.status === 'db_error') {
                throw new Error('Database error on server');
            }
            
            console.log('✓ Statistics saved successfully');
            return data;
            
        } catch (error) {
            console.error(`Failed to save stats (attempt ${attempt}/${MAX_RETRIES}):`, error);
            
            if (attempt === MAX_RETRIES) {
                // Final failure - queue for later retry
                console.warn('Queueing stats for later retry');
                queueStatsForRetry(statsPayload);
                
                // Show user notification
                showNotification('Statistics could not be saved. Will retry automatically.', 'warning');
                
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
    }
}

/**
 * Queue statistics for retry (stores in localStorage)
 * @param {Object} payload - Statistics payload
 */
function queueStatsForRetry(payload) {
    try {
        const queue = JSON.parse(localStorage.getItem('stats_retry_queue') || '[]');
        queue.push(payload);
        localStorage.setItem('stats_retry_queue', JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to queue stats for retry:', e);
    }
}

/**
 * Process any queued statistics (call on page load)
 */
async function processQueuedStats() {
    try {
        const queue = JSON.parse(localStorage.getItem('stats_retry_queue') || '[]');
        
        if (queue.length === 0) return;
        
        console.log(`Processing ${queue.length} queued statistics...`);
        
        const successful = [];
        for (const payload of queue) {
            try {
                await saveInstantStats(payload);
                successful.push(payload);
            } catch (e) {
                // Leave in queue for next attempt
                console.warn('Queued stat still failing, will retry later');
            }
        }
        
        // Remove successful saves from queue
        const remaining = queue.filter(p => !successful.includes(p));
        localStorage.setItem('stats_retry_queue', JSON.stringify(remaining));
        
        if (successful.length > 0) {
            showNotification(`${successful.length} saved statistics synced`, 'success');
        }
        
    } catch (e) {
        console.error('Error processing queued stats:', e);
    }
}

/**
 * Show user notification
 * @param {string} message
 * @param {string} type - 'success', 'warning', 'error'
 */
function showNotification(message, type = 'info') {
    // Simple implementation - can be enhanced with toast library
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    processQueuedStats();
});
```

**Step 2: Add Notification Styles (30 mins)**
```css
/* Location: static/css/style.css */

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-success {
    background: #4caf50;
    color: white;
}

.notification-warning {
    background: #ff9800;
    color: white;
}

.notification-error {
    background: #f44336;
    color: white;
}
```

**Testing Checklist:**
- [ ] Normal save works
- [ ] Network failure queues for retry
- [ ] Queued stats sync on next page load
- [ ] User sees notification on failure
- [ ] No data loss during failures

---

### **PRIORITY 5: DOCUMENTATION & DEPLOYMENT (Days 9-10)**

---

#### **TASK 5.1: Update Code Documentation**
**Story Points:** 2  
**Estimated Time:** 0.5 days  
**Priority:** MEDIUM  
**Assignee:** Developer

**Deliverables:**
- [ ] Inline code comments for all new functions
- [ ] JSDoc comments for public API
- [ ] Update README with new features
- [ ] Create CHANGELOG.md

**Example:**
```javascript
/**
 * Validates a typing session for gaming/cheating patterns
 * 
 * Checks multiple indicators:
 * - Wrong keystroke ratio (should be < 40%)
 * - Unrealistic WPM (should be < 250)
 * - Session duration (should be > 2 seconds)
 * - Accuracy vs WPM correlation
 * - Per-cluster attempt count
 * 
 * @param {Object} sessionData - Complete session statistics
 * @param {number} sessionData.wpm - Net WPM
 * @param {number} sessionData.rawWpm - Raw WPM
 * @param {number} sessionData.acc - Accuracy percentage (0-100)
 * @param {number} sessionData.timeMs - Session duration in milliseconds
 * @param {number} sessionData.totalKeystrokes - All keystrokes
 * @param {number} sessionData.wrongKeystrokes - Wrong keystrokes
 * @param {number} sessionData.maxWrongAttemptsPerCluster - Max attempts on single character
 * 
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - True if session passes all checks
 * @returns {string} returns.reason - Human-readable failure reason (if invalid)
 * @returns {string[]} returns.flags - Array of validation flags triggered
 * 
 * @example
 * const result = validateTypingSession({
 *   wpm: 45,
 *   rawWpm: 50,
 *   acc: 90,
 *   timeMs: 60000,
 *   totalKeystrokes: 300,
 *   wrongKeystrokes: 30,
 *   maxWrongAttemptsPerCluster: 2
 * });
 * // => { isValid: true, reason: '', flags: [] }
 */
function validateTypingSession(sessionData) {
    // ...
}
```

---

#### **TASK 5.2: Create Migration Guide**
**Story Points:** 1  
**Estimated Time:** 0.5 days  
**Priority:** MEDIUM  
**Assignee:** Developer

**Deliverables:**
- [ ] Create MIGRATION_GUIDE.md
- [ ] Document database changes
- [ ] Document breaking changes (if any)
- [ ] Provide rollback instructions

---

#### **TASK 5.3: Final Testing & Bug Fixes**
**Story Points:** 3  
**Estimated Time:** 1 day  
**Priority:** HIGH  
**Assignee:** Developer + Lead

**Activities:**
- [ ] Full regression testing
- [ ] Performance testing (large history)
- [ ] Cross-browser testing
- [ ] Mobile testing (if applicable)
- [ ] Fix any discovered bugs
- [ ] Code review with Lead
- [ ] Address review feedback

---

## SPRINT TIMELINE (GANTT-STYLE)

```
Day 1:  [=============== TASK 1.1: Gaming Prevention (75%) ===============]
Day 2:  [====== TASK 1.1 (25%) ======][======= TASK 1.2: WPM Standardization (50%) =======]
Day 3:  [======= TASK 1.2 (50%) =======][== TASK 2.1: Rename ==][== TASK 2.2: Remove ==]
Day 4:  [== TASK 2.3 ==][================ TASK 3.1: Unit Tests =================]
Day 5:  [================ TASK 3.1: Unit Tests (cont) =================]
Day 6:  [================ TASK 3.2: Integration Tests ==================]
Day 7:  [================ TASK 3.2 (cont) ==============][= TASK 4.1 =]
Day 8:  [======= TASK 4.2: Error Handling =======][======= Documentation =======]
Day 9:  [================ TASK 5.3: Final Testing & Bug Fixes ==================]
Day 10: [================ TASK 5.3 (cont) + Deployment Prep ==================]
```

---

## DEFINITION OF DONE

Each task is considered "done" when:
- [ ] Code written and follows project style guide
- [ ] Unit tests written and passing (where applicable)
- [ ] Integration tested manually
- [ ] No console errors or warnings
- [ ] Code reviewed by Lead
- [ ] Documentation updated
- [ ] Merged to main branch

Sprint is considered "done" when:
- [ ] All CRITICAL tasks complete
- [ ] At least 3/4 MAJOR tasks complete
- [ ] Test coverage > 80%
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Deployed to production (or staging)

---

## RISK ASSESSMENT

| **Risk** | **Probability** | **Impact** | **Mitigation** |
|----------|----------------|------------|----------------|
| Formula change breaks existing stats | Medium | High | Keep both formulas initially, flag old records |
| Database migration fails | Low | Critical | Test on copy first, have rollback script |
| Tests take longer than estimated | High | Medium | Reduce coverage goal to 70% if needed |
| Gaming detection too strict | Medium | High | Make thresholds configurable, monitor false positives |
| Browser compatibility issues | Low | Medium | Test early, have polyfills ready |

---

## SUCCESS METRICS

**Code Quality:**
- Test coverage: **Target 80%+**
- Console errors: **0**
- Performance: No regression (measure WPM calculation time)

**Functionality:**
- Valid sessions work identically to before
- Invalid sessions get flagged appropriately
- False positive rate: **< 5%**

**User Experience:**
- No UX disruption for legitimate users
- Clear feedback on validation failures
- No data loss

---

## POST-SPRINT REVIEW AGENDA

1. Demo new features (15 mins)
   - Gaming prevention in action
   - Consistent WPM calculations
   - Validation warnings

2. Review metrics (10 mins)
   - Test coverage achieved
   - Tasks completed vs planned
   - Bugs found/fixed

3. Retrospective (20 mins)
   - What went well?
   - What could improve?
   - Action items for next sprint

4. Planning next sprint (15 mins)
   - Long-term refactoring items
   - New features
   - Technical debt

---

## APPENDIX: COMMANDS REFERENCE

```bash
# Testing
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# Development
npm run dev                # Start dev server (if configured)
python app/main.py         # Start backend

# Database
sqlite3 data/typer_data.db # Open database
.schema instant_stats      # View schema

# Git
git checkout -b sprint/instant-mode-fixes
git add .
git commit -m "feat: implement gaming prevention"
git push origin sprint/instant-mode-fixes
```

---

## APPENDIX: VALIDATION THRESHOLD TUNING

If validation produces too many false positives, adjust these values:

```javascript
// In instant-mode-config.js

VALIDATION: {
    MAX_WRONG_ATTEMPTS_PER_CLUSTER: 7,     // Increase from 5 if too strict
    MAX_WRONG_RATIO: 0.50,                 // Increase from 0.40 if too strict
    MIN_SESSION_TIME_MS: 1500,             // Decrease from 2000 if too strict
    MAX_REASONABLE_WPM: 280,               // Increase from 250 for experts
    MIN_ACCURACY_THRESHOLD: 25,            // Decrease from 30 if too strict
}
```

Monitor flagged sessions in database:
```sql
SELECT 
    COUNT(*) as total_sessions,
    SUM(CASE WHEN isValid = 0 THEN 1 ELSE 0 END) as invalid_count,
    ROUND(SUM(CASE WHEN isValid = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as invalid_percentage,
    validationFlags,
    COUNT(*) as flag_count
FROM instant_stats
WHERE timestamp > strftime('%s', 'now', '-7 days') * 1000
GROUP BY validationFlags
ORDER BY flag_count DESC;
```

Target invalid rate: **5-10%** (too low = detection not working, too high = too strict)

---

## 📊 SPRINT PROGRESS TRACKER

**Last Updated:** April 5, 2026 23:22:10 +06:00  
**Current Day:** Day 0 (Sprint starts Day 1)  
**Completed Tasks:** 0/13  
**Overall Progress:** 0%

### **Task Completion Status:**

#### **Priority 1: CRITICAL FIXES**
- [ ] TASK 1.1: Gaming Prevention System (0% complete)
- [ ] TASK 1.2: WPM Calculation Standardization (0% complete)

#### **Priority 2: MAJOR FIXES**
- [ ] TASK 2.1: Rename totalChars to totalKeystrokes (0% complete)
- [ ] TASK 2.2: Remove missedChars (0% complete)
- [ ] TASK 2.3: Fix Consistency Fallback (0% complete)

#### **Priority 3: TESTING**
- [ ] TASK 3.1: Unit Test Suite (0% complete)
- [ ] TASK 3.2: Integration Testing (0% complete)

#### **Priority 4: REFACTORING**
- [ ] TASK 4.1: Extract Constants (0% complete)
- [ ] TASK 4.2: Error Handling (0% complete)

#### **Priority 5: DOCUMENTATION**
- [ ] TASK 5.1: Code Documentation (0% complete)
- [ ] TASK 5.2: Migration Guide (0% complete)
- [ ] TASK 5.3: Final Testing (0% complete)

### **Currently Working On:**
- **Task:** Not started yet
- **Status:** Ready to begin
- **Blockers:** None

### **Notes & Decisions Log:**
```
[April 5, 2026 23:22] - Sprint plan created and enhanced with context
[April 5, 2026 23:22] - Ready to start implementation
```

### **Files Modified This Sprint:**
```
(None yet - sprint starts Day 1)
```

### **Commits Made:**
```
(None yet - sprint starts Day 1)
```

---

**END OF SPRINT PLAN**

---

**Notes for Agents:**
- This is a living document - update as needed during sprint
- If blocked on a task, escalate immediately
- If ahead of schedule, pull from next priority
- If behind schedule, discuss scope reduction with Lead
- All code changes must be tested before marking complete
- When in doubt, ask for clarification

**Communication:**
- Daily standup: What done yesterday, what doing today, any blockers
- Slack/email for quick questions
- Schedule pair programming session for complex tasks (Task 1.1, 1.2)

**Good luck with the sprint! 🚀**
