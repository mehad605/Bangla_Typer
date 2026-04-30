/**
 * WPM Calculation Module for Bangla Typer - Instant Mode
 * 
 * This module provides standardized calculation functions for typing metrics.
 * All WPM calculations in the application should use these functions to ensure
 * consistency across real-time displays, interval tracking, and final results.
 * 
 * Formula Reference (Industry Standard - Anti-Gaming):
 * - Gross WPM = (Total Keystrokes / 5) / Time in Minutes
 * - Net WPM = (Correct Keystrokes / 5) / Time in Minutes
 * 
 * Key Principles:
 * - 5 keystrokes = 1 "word" (industry standard)
 * - Net WPM uses only Correct Keystrokes to prevent system gaming via fast random typing.
 * 
 * @module WPMCalculator
 * @see INSTANT_MODE_SPRINT_PLAN.md - Task 1.2
 * @version 1.0.0
 * @date 2026-04-05
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Industry standard: 5 keystrokes = 1 word
 * This accounts for average word length including spaces in English typing.
 * For Bangla, this also accommodates Juktakkhor (compound characters) that
 * may require multiple keystrokes but represent a single visual character.
 */
const KEYSTROKES_PER_WORD = 5;

/**
 * Minimum data points required for consistency calculation.
 * Below this threshold, consistency metric is unreliable.
 */
const MIN_CONSISTENCY_DATA_POINTS = 3;

// ============================================================================
// WPM Calculator Object
// ============================================================================

const WPMCalculator = {
    
    /**
     * Calculate Net WPM (Words Per Minute based on correct typing).
     * 
     * Formula: Net WPM = ((Correct Keystrokes / 5) - Mistakes) / Time in Minutes
     * 
     * By subtracting word-level mistakes from the correct word count, we ensure
     * that errors are heavily penalized. This prevents "gaming" the system
     * where rapid random typing might accidentally hit some correct keys.
     * 
     * @param {number} totalKeystrokes - (Ignored in Net calculation)
     * @param {number} mistakes - Word-level mistake count
     * @param {number} timeMs - Time elapsed in milliseconds
     * @param {number} correctKeystrokes - Number of valid keystrokes produced
     * @returns {number} Net WPM (floored to integer, minimum 0)
     * 
     * @example
     * // User typed 300 keystrokes (250 correct) with 10 word mistakes in 1 minute
     * WPMCalculator.calculateNetWPM(300, 10, 60000, 250);
     * // Returns: 40 WPM
     * // Calculation: ((250 / 5) - 10) / 1 = 40
     */
    calculateNetWPM(totalKeystrokes, mistakes, timeMs, correctKeystrokes = null) {
        if (timeMs <= 0) return 0;
        
        // Effective correct count (fallback to total - penalty if explicit count missing)
        const effectiveCorrect = (correctKeystrokes !== null) ? correctKeystrokes : totalKeystrokes;
        const timeMin = timeMs / 60000;
        
        // Net Words = (Correct Keystrokes / 5) - Mistakes
        const netWords = (effectiveCorrect / KEYSTROKES_PER_WORD) - mistakes;
        const netWPM = netWords / timeMin;
        
        return Math.max(0, Math.floor(netWPM));
    },
    
    /**
     * Calculate Raw WPM (Gross WPM - total throughput including errors).
     * 
     * @param {number} totalKeystrokes - All keystrokes (correct + wrong)
     * @param {number} timeMs - Time elapsed in milliseconds
     * @returns {number} Raw WPM (floored to integer, minimum 0)
     */
    calculateRawWPM(totalKeystrokes, timeMs) {
        if (timeMs <= 0) return 0;
        
        const timeMin = timeMs / 60000;
        const grossWPM = (totalKeystrokes / KEYSTROKES_PER_WORD) / timeMin;
        
        return Math.max(0, Math.floor(grossWPM));
    },
    
    /**
     * Calculate interval snapshot stats.
     */
    calculateIntervalWPM(keystrokesInInterval, mistakesInInterval, intervalMs, correctInInterval = null) {
        const netWPM = this.calculateNetWPM(keystrokesInInterval, mistakesInInterval, intervalMs, correctInInterval);
        const rawWPM = this.calculateRawWPM(keystrokesInInterval, intervalMs);
        
        return { netWPM, rawWPM };
    },
    
    /**
     * Calculate accuracy percentage.
     * 
     * Accuracy = (Correct Keystrokes / Total Keystrokes) × 100
     * 
     * Tracks keystroke-level correctness, not character-level.
     * If user types 3 keystrokes correctly for one Juktakkhor, all 3 count
     * toward accuracy.
     * 
     * @param {number} correctKeystrokes - Number of correct keystrokes
     * @param {number} totalKeystrokes - Total keystrokes (correct + wrong)
     * @returns {number} Accuracy percentage (0-100, floored to integer)
     * 
     * @example
     * // 270 correct out of 300 total
     * WPMCalculator.calculateAccuracy(270, 300);
     * // Returns: 90
     * // Calculation: (270/300) * 100 = 90%
     */
    calculateAccuracy(correctKeystrokes, totalKeystrokes) {
        if (totalKeystrokes === 0) return 100; // No typing = perfect by default
        
        const accuracy = (correctKeystrokes / totalKeystrokes) * 100;
        return Math.floor(accuracy);
    },
    
    /**
     * Calculate consistency from WPM history using Coefficient of Variation.
     * 
     * Consistency measures how stable typing speed is throughout the session.
     * Uses statistical Coefficient of Variation (CV) mapped to 0-100% scale.
     * 
     * Process:
     * 1. Calculate mean WPM from history
     * 2. Calculate standard deviation
     * 3. Calculate CV = std dev / mean
     * 4. Map to percentage: 100% - (CV × 100%)
     * 5. Clamp to [0, 100] range
     * 
     * Interpretation:
     * - 90-100%: Very consistent typing
     * - 70-89%: Moderately consistent
     * - 50-69%: Somewhat inconsistent
     * - 0-49%: Highly variable typing speed
     * 
     * @param {Array<number>} wpmHistory - Array of per-second WPM values
     * @param {number|null} fallbackValue - Value to return if insufficient data (default: null)
     * @returns {number|null} Consistency percentage (0-100) or fallback value
     * 
     * @example
     * // Stable typing: [48, 52, 50, 51, 49, 53, 47, 50]
     * WPMCalculator.calculateConsistency([48, 52, 50, 51, 49, 53, 47, 50]);
     * // Returns: ~95 (very consistent)
     * 
     * @example
     * // Variable typing: [20, 60, 35, 75, 30, 65]
     * WPMCalculator.calculateConsistency([20, 60, 35, 75, 30, 65]);
     * // Returns: ~40 (inconsistent)
     * 
     * @example
     * // Insufficient data
     * WPMCalculator.calculateConsistency([50, 60], null);
     * // Returns: null
     */
    calculateConsistency(wpmHistory, fallbackValue = null) {
        // Need at least 3 data points for meaningful calculation
        if (wpmHistory.length < MIN_CONSISTENCY_DATA_POINTS) {
            return fallbackValue;
        }
        
        // Calculate mean
        const mean = wpmHistory.reduce((sum, wpm) => sum + wpm, 0) / wpmHistory.length;
        
        // Avoid division by zero
        if (mean === 0) return fallbackValue;
        
        // Calculate variance
        const variance = wpmHistory.reduce((sum, wpm) => {
            return sum + Math.pow(wpm - mean, 2);
        }, 0) / wpmHistory.length;
        
        // Calculate standard deviation
        const stdDev = Math.sqrt(variance);
        
        // Calculate Coefficient of Variation
        const cv = stdDev / mean;
        
        // Map CV to 0-100 scale (lower CV = higher consistency)
        // CV of 0 = 100% consistency
        // CV of 1 = 0% consistency
        const unmapped = 100 - (cv * 100);
        
        // Clamp to valid percentage range
        return Math.max(0, Math.min(100, Math.round(unmapped)));
    },
    
    /**
     * Get the keystrokes per word constant.
     * Exposed for use in other calculations or display.
     * 
     * @returns {number} The KEYSTROKES_PER_WORD constant (5)
     */
    getKeystrokesPerWord() {
        return KEYSTROKES_PER_WORD;
    },
    
    /**
     * Get the minimum consistency data points constant.
     * Exposed for validation checks.
     * 
     * @returns {number} The MIN_CONSISTENCY_DATA_POINTS constant (3)
     */
    getMinConsistencyDataPoints() {
        return MIN_CONSISTENCY_DATA_POINTS;
    }
};

// ============================================================================
// Export for both browser and Node.js (for testing)
// ============================================================================

// CommonJS export for Node.js (Jest tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        WPMCalculator, 
        KEYSTROKES_PER_WORD,
        MIN_CONSISTENCY_DATA_POINTS
    };
}

// Browser global (will be available as window.WPMCalculator)
if (typeof window !== 'undefined') {
    window.WPMCalculator = WPMCalculator;
    window.KEYSTROKES_PER_WORD = KEYSTROKES_PER_WORD;
}

// ============================================================================
// WpmCalculator Class (for use with TypingEngine and learn.js)
// ============================================================================

class WpmCalculator {
    constructor() {
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.startTime = Date.now();
        this.endTime = null;
    }

    stop() {
        if (this.startTime && !this.endTime) {
            this.endTime = Date.now();
        }
    }

    reset() {
        this.startTime = null;
        this.endTime = null;
    }

    getElapsedTimeMs() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    getStats(totalKeystrokes, correctKeystrokes, mistakes) {
        const timeMs = this.getElapsedTimeMs();

        if (timeMs <= 0) {
            return { wpm: 0, accuracy: 100 };
        }

        const timeMin = timeMs / 60000;
        const grossWPM = (totalKeystrokes / KEYSTROKES_PER_WORD) / timeMin;
        const netWPM = Math.max(0, Math.floor(grossWPM - (mistakes / timeMin)));
        const accuracy = totalKeystrokes > 0 ? Math.floor((correctKeystrokes / totalKeystrokes) * 100) : 100;

        return { wpm: netWPM, accuracy };
    }
}

// Export the class for the browser
if (typeof window !== 'undefined') {
    window.WpmCalculator = WpmCalculator;
}
