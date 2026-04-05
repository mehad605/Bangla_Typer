/**
 * Instant Mode Configuration
 * 
 * Centralized configuration for all instant mode constants
 * and thresholds. Modify these values to tune behavior.
 */

const InstantModeConfig = {
    
    // Calculation Constants
    KEYSTROKES_PER_WORD: 5,
    
    // Text Generation
    TEXT_MIN_WORDS: 20,
    TEXT_MAX_WORDS: 60,
    
    // Validation Thresholds
    VALIDATION: {
        MAX_WRONG_ATTEMPTS_PER_CLUSTER: 5,
        MAX_WRONG_RATIO: 0.40,
        MIN_SESSION_TIME_MS: 2000,
        MAX_REASONABLE_WPM: 250,
        MIN_ACCURACY_THRESHOLD: 30,
    },
    
    // UI Update Intervals
    TIMER_INTERVAL_MS: 1000,
    
    // Consistency Calculation
    MIN_CONSISTENCY_DATA_POINTS: 3,
    
    // Display Settings
    HISTORY_TABLE_ROWS: 15,
    HEATMAP_WEEKS: 52,
    
    // Chart Settings
    WPM_DISTRIBUTION_BIN_SIZE: 10,
    
};

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstantModeConfig };
}

if (typeof window !== 'undefined') {
    window.InstantModeConfig = InstantModeConfig;
}