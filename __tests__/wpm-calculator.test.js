const { WPMCalculator, KEYSTROKES_PER_WORD, MIN_CONSISTENCY_DATA_POINTS } = require('../static/js/wpm-calculator.js');

describe('WPMCalculator', () => {
    
    describe('KEYSTROKES_PER_WORD', () => {
        test('should be 5 (industry standard)', () => {
            expect(KEYSTROKES_PER_WORD).toBe(5);
        });
    });

    describe('MIN_CONSISTENCY_DATA_POINTS', () => {
        test('should be 3', () => {
            expect(MIN_CONSISTENCY_DATA_POINTS).toBe(3);
        });
    });

    describe('calculateNetWPM', () => {
        
        test('calculates standard case correctly', () => {
            const result = WPMCalculator.calculateNetWPM(300, 10, 60000);
            expect(result).toBe(50);
        });
        
        test('handles zero mistakes', () => {
            const result = WPMCalculator.calculateNetWPM(250, 0, 60000);
            expect(result).toBe(50);
        });
        
        test('handles high mistake count (negative prevention)', () => {
            const result = WPMCalculator.calculateNetWPM(100, 50, 60000);
            expect(result).toBe(0);
        });
        
        test('handles zero time gracefully', () => {
            const result = WPMCalculator.calculateNetWPM(100, 5, 0);
            expect(result).toBe(0);
        });
        
        test('handles fractional minutes correctly', () => {
            const result = WPMCalculator.calculateNetWPM(150, 5, 30000);
            expect(result).toBe(50); // (150/5 - 5) / 0.5 = 50
        });
        
        test('floors result to integer', () => {
            const result = WPMCalculator.calculateNetWPM(153, 0, 60000);
            expect(result).toBe(30);
        });
        
        test('realistic Bangla typing scenario', () => {
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
            const result = WPMCalculator.calculateRawWPM(300, 60000);
            expect(result).toBe(60);
        });
        
        test('handles zero time', () => {
            const result = WPMCalculator.calculateRawWPM(100, 0);
            expect(result).toBe(0);
        });
        
        test('handles fractional minutes', () => {
            const result = WPMCalculator.calculateRawWPM(200, 45000);
            expect(result).toBe(53);
        });

        test('handles negative time', () => {
            const result = WPMCalculator.calculateRawWPM(100, -1000);
            expect(result).toBe(0);
        });
    });
    
    describe('calculateIntervalWPM', () => {
        
        test('calculates 1-second interval correctly', () => {
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
            const result = WPMCalculator.calculateIntervalWPM(20, 0, 1000);
            expect(result.netWPM).toBe(240);
            expect(result.rawWPM).toBe(240);
        });
        
        test('interval with all mistakes', () => {
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
            const result = WPMCalculator.calculateAccuracy(67, 100);
            expect(result).toBe(67);
        });
        
        test('handles zero correct keystrokes', () => {
            const result = WPMCalculator.calculateAccuracy(0, 100);
            expect(result).toBe(0);
        });
        
        test('handles zero total keystrokes', () => {
            const result = WPMCalculator.calculateAccuracy(0, 0);
            expect(result).toBe(100);
        });
        
        test('realistic accuracy calculation', () => {
            const result = WPMCalculator.calculateAccuracy(385, 412);
            expect(result).toBe(93);
        });
    });
    
    describe('calculateConsistency', () => {
        
        test('calculates consistency for stable typing', () => {
            const history = [50, 51, 50, 49, 50];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThan(95);
        });
        
        test('calculates consistency for variable typing', () => {
            const history = [10, 80, 30, 90, 20];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeLessThan(50);
        });
        
        test('returns fallback for insufficient data (< 3 points)', () => {
            const result = WPMCalculator.calculateConsistency([50, 60], 42);
            expect(result).toBe(42);
        });
        
        test('returns null fallback if no fallback provided', () => {
            const result = WPMCalculator.calculateConsistency([50], null);
            expect(result).toBeNull();
        });
        
        test('handles all-zero history', () => {
            const result = WPMCalculator.calculateConsistency([0, 0, 0], null);
            expect(result).toBeNull();
        });
        
        test('handles perfect consistency (all same values)', () => {
            const history = [60, 60, 60, 60, 60];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBe(100);
        });
        
        test('clamps result to 0-100 range', () => {
            const history = [5, 200, 3, 180, 7, 190];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
        
        test('realistic consistent typing pattern', () => {
            const history = [48, 52, 50, 51, 49, 53, 47, 50, 51, 49];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeGreaterThan(90);
        });
        
        test('realistic inconsistent typing pattern', () => {
            const history = [35, 62, 48, 71, 39, 55, 44, 68, 33, 58];
            const result = WPMCalculator.calculateConsistency(history);
            expect(result).toBeLessThan(85);
        });
        
        test('handles empty history with fallback', () => {
            const result = WPMCalculator.calculateConsistency([], 50);
            expect(result).toBe(50);
        });
        
        test('handles empty history without fallback', () => {
            const result = WPMCalculator.calculateConsistency([], null);
            expect(result).toBeNull();
        });
    });
});