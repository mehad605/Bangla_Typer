/**
 * Integration Tests for Instant Mode Validation System
 * 
 * These tests verify the gaming prevention and validation logic
 * works correctly across different scenarios.
 */

const INSTANT_MODE_CONFIG = {
    MAX_WRONG_ATTEMPTS_PER_CLUSTER: 5,
    MAX_WRONG_RATIO: 0.4,
    MIN_SESSION_TIME_MS: 2000,
    MAX_REASONABLE_WPM: 250,
    MIN_ACCURACY_THRESHOLD: 30
};

function validateTypingSession(sessionData) {
    const flags = [];
    let isValid = true;
    let reason = '';
    
    const wrongRatio = sessionData.totalKeystrokes > 0 
        ? sessionData.wrongKeystrokes / sessionData.totalKeystrokes 
        : 0;
    
    if (wrongRatio > INSTANT_MODE_CONFIG.MAX_WRONG_RATIO) {
        flags.push('EXCESSIVE_WRONG_RATIO');
        isValid = false;
        reason = `Too many wrong keystrokes (${Math.round(wrongRatio * 100)}%)`;
    }
    
    if (sessionData.wpm > INSTANT_MODE_CONFIG.MAX_REASONABLE_WPM) {
        flags.push('UNREALISTIC_WPM');
        isValid = false;
        reason = `WPM too high (${sessionData.wpm})`;
    }
    
    if (sessionData.timeMs < INSTANT_MODE_CONFIG.MIN_SESSION_TIME_MS) {
        flags.push('SESSION_TOO_SHORT');
        isValid = false;
        reason = `Session too short (${Math.round(sessionData.timeMs / 1000)}s)`;
    }
    
    if (sessionData.acc < INSTANT_MODE_CONFIG.MIN_ACCURACY_THRESHOLD && sessionData.wpm > 100) {
        flags.push('LOW_ACCURACY_HIGH_WPM');
        isValid = false;
        reason = `Low accuracy (${sessionData.acc}%) with high WPM`;
    }
    
    if (sessionData.maxWrongAttemptsPerCluster > INSTANT_MODE_CONFIG.MAX_WRONG_ATTEMPTS_PER_CLUSTER) {
        flags.push('EXCESSIVE_CLUSTER_ATTEMPTS');
        isValid = false;
        reason = `Too many attempts on single character (${sessionData.maxWrongAttemptsPerCluster} attempts)`;
    }
    
    return { isValid, reason, flags };
}

describe('Validation System Integration Tests', () => {
    
    describe('Valid Session Scenarios', () => {
        
        test('normal typing session should be valid', () => {
            const result = validateTypingSession({
                wpm: 45,
                rawWpm: 50,
                acc: 90,
                consistency: 85,
                timeMs: 60000,
                totalKeystrokes: 300,
                wrongKeystrokes: 30,
                correctKeystrokes: 270,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(true);
            expect(result.flags).toHaveLength(0);
            expect(result.reason).toBe('');
        });
        
        test('perfect typing session should be valid', () => {
            const result = validateTypingSession({
                wpm: 50,
                rawWpm: 50,
                acc: 100,
                consistency: 95,
                timeMs: 60000,
                totalKeystrokes: 250,
                wrongKeystrokes: 0,
                correctKeystrokes: 250,
                maxWrongAttemptsPerCluster: 0
            });
            
            expect(result.isValid).toBe(true);
        });
        
        test('slow but accurate session should be valid', () => {
            const result = validateTypingSession({
                wpm: 25,
                rawWpm: 27,
                acc: 92,
                consistency: 80,
                timeMs: 120000,
                totalKeystrokes: 300,
                wrongKeystrokes: 24,
                correctKeystrokes: 276,
                maxWrongAttemptsPerCluster: 1
            });
            
            expect(result.isValid).toBe(true);
        });
        
        test('session at exactly max WPM should be valid', () => {
            const result = validateTypingSession({
                wpm: 250,
                rawWpm: 260,
                acc: 96,
                consistency: 70,
                timeMs: 60000,
                totalKeystrokes: 1300,
                wrongKeystrokes: 50,
                correctKeystrokes: 1250,
                maxWrongAttemptsPerCluster: 3
            });
            
            expect(result.isValid).toBe(true);
        });
    });
    
    describe('Invalid Session - Excessive Wrong Ratio', () => {
        
        test('should flag session with 50% wrong keystrokes', () => {
            const result = validateTypingSession({
                wpm: 25,
                acc: 50,
                timeMs: 60000,
                totalKeystrokes: 250,
                wrongKeystrokes: 125,
                correctKeystrokes: 125,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('EXCESSIVE_WRONG_RATIO');
            expect(result.reason).toContain('50%');
        });
        
        test('should flag session with 45% wrong keystrokes', () => {
            const result = validateTypingSession({
                wpm: 27,
                acc: 55,
                timeMs: 60000,
                totalKeystrokes: 200,
                wrongKeystrokes: 90,
                correctKeystrokes: 110,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('EXCESSIVE_WRONG_RATIO');
        });
    });
    
    describe('Invalid Session - Unrealistic WPM', () => {
        
        test('should flag session with 300 WPM', () => {
            const result = validateTypingSession({
                wpm: 300,
                rawWpm: 320,
                acc: 94,
                consistency: 60,
                timeMs: 60000,
                totalKeystrokes: 1600,
                wrongKeystrokes: 96,
                correctKeystrokes: 1504,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('UNREALISTIC_WPM');
            expect(result.reason).toContain('300');
        });
        
        test('should flag session with 500 WPM', () => {
            const result = validateTypingSession({
                wpm: 500,
                rawWpm: 520,
                acc: 96,
                consistency: 40,
                timeMs: 30000,
                totalKeystrokes: 1300,
                wrongKeystrokes: 50,
                correctKeystrokes: 1250,
                maxWrongAttemptsPerCluster: 1
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('UNREALISTIC_WPM');
        });
    });
    
    describe('Invalid Session - Session Too Short', () => {
        
        test('should flag 1-second session', () => {
            const result = validateTypingSession({
                wpm: 60,
                rawWpm: 65,
                acc: 92,
                consistency: 90,
                timeMs: 1000,
                totalKeystrokes: 65,
                wrongKeystrokes: 5,
                correctKeystrokes: 60,
                maxWrongAttemptsPerCluster: 1
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('SESSION_TOO_SHORT');
            expect(result.reason).toContain('1s');
        });
        
        test('should flag 0.5-second session', () => {
            const result = validateTypingSession({
                wpm: 120,
                rawWpm: 130,
                acc: 92,
                consistency: 80,
                timeMs: 500,
                totalKeystrokes: 65,
                wrongKeystrokes: 5,
                correctKeystrokes: 60,
                maxWrongAttemptsPerCluster: 1
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('SESSION_TOO_SHORT');
        });
    });
    
    describe('Invalid Session - Low Accuracy with High WPM', () => {
        
        test('should flag 25% accuracy with 150 WPM', () => {
            const result = validateTypingSession({
                wpm: 150,
                rawWpm: 200,
                acc: 25,
                consistency: 30,
                timeMs: 30000,
                totalKeystrokes: 600,
                wrongKeystrokes: 450,
                correctKeystrokes: 150,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('LOW_ACCURACY_HIGH_WPM');
            expect(result.reason).toContain('25%');
        });
        
        test('should NOT flag low accuracy with low WPM', () => {
            const result = validateTypingSession({
                wpm: 30,
                rawWpm: 40,
                acc: 25,
                consistency: 20,
                timeMs: 60000,
                totalKeystrokes: 100,
                wrongKeystrokes: 25,  // 25% wrong ratio - below 40% threshold
                correctKeystrokes: 75,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(true);
            expect(result.flags).not.toContain('LOW_ACCURACY_HIGH_WPM');
        });
    });
    
    describe('Invalid Session - Excessive Cluster Attempts', () => {
        
        test('should flag 7 attempts on single character', () => {
            const result = validateTypingSession({
                wpm: 45,
                rawWpm: 50,
                acc: 90,
                consistency: 85,
                timeMs: 60000,
                totalKeystrokes: 300,
                wrongKeystrokes: 30,
                correctKeystrokes: 270,
                maxWrongAttemptsPerCluster: 7
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('EXCESSIVE_CLUSTER_ATTEMPTS');
            expect(result.reason).toContain('7 attempts');
        });
        
        test('should flag exactly 6 attempts', () => {
            const result = validateTypingSession({
                wpm: 45,
                rawWpm: 50,
                acc: 90,
                consistency: 85,
                timeMs: 60000,
                totalKeystrokes: 300,
                wrongKeystrokes: 30,
                correctKeystrokes: 270,
                maxWrongAttemptsPerCluster: 6
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('EXCESSIVE_CLUSTER_ATTEMPTS');
        });
        
        test('should NOT flag 5 attempts (boundary)', () => {
            const result = validateTypingSession({
                wpm: 45,
                rawWpm: 50,
                acc: 90,
                consistency: 85,
                timeMs: 60000,
                totalKeystrokes: 300,
                wrongKeystrokes: 30,
                correctKeystrokes: 270,
                maxWrongAttemptsPerCluster: 5
            });
            
            expect(result.isValid).toBe(true);
            expect(result.flags).not.toContain('EXCESSIVE_CLUSTER_ATTEMPTS');
        });
    });
    
    describe('Multiple Validation Flags', () => {
        
        test('should catch multiple issues and report first failure reason', () => {
            const result = validateTypingSession({
                wpm: 400,
                rawWpm: 500,
                acc: 20,
                consistency: 10,
                timeMs: 500,
                totalKeystrokes: 250,
                wrongKeystrokes: 200,
                correctKeystrokes: 50,
                maxWrongAttemptsPerCluster: 10
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags.length).toBeGreaterThan(1);
        });
    });
    
    describe('Edge Cases', () => {
        
        test('handles zero total keystrokes', () => {
            const result = validateTypingSession({
                wpm: 0,
                rawWpm: 0,
                acc: 100,
                consistency: 100,
                timeMs: 0,
                totalKeystrokes: 0,
                wrongKeystrokes: 0,
                correctKeystrokes: 0,
                maxWrongAttemptsPerCluster: 0
            });
            
            expect(result.isValid).toBe(false);
            expect(result.flags).toContain('SESSION_TOO_SHORT');
        });
        
        test('handles minimum valid session', () => {
            const result = validateTypingSession({
                wpm: 30,
                rawWpm: 35,
                acc: 85,
                consistency: 80,
                timeMs: 2000,
                totalKeystrokes: 70,
                wrongKeystrokes: 10,
                correctKeystrokes: 60,
                maxWrongAttemptsPerCluster: 2
            });
            
            expect(result.isValid).toBe(true);
        });
    });
});

module.exports = { validateTypingSession, INSTANT_MODE_CONFIG };