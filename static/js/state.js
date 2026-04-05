export const state = {
    theme: localStorage.getItem('theme') || 'tokyo-night',
    mode: 'instant', // 'instant' or 'youtube'
    apiConnected: false,
    
    // Instant Mode State
    instant: {
        wpm: 0,
        rawWpm: 0,
        acc: 100,
        consistency: 100,
        timeMs: 0,
        correctChars: 0,
        wrongChars: 0,
        extraChars: 0,
        missedChars: 0,
        totalKeystrokes: 0,
        startTime: null,
        isActive: false
    },
    
    // Listeners for state changes
    listeners: new Set(),
    
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    },
    
    notify(key, value) {
        this.listeners.forEach(listener => listener(key, value));
    },
    
    update(key, value) {
        if (typeof key === 'object') {
            for (const [k, v] of Object.entries(key)) {
                this[k] = v;
                this.notify(k, v);
            }
        } else {
            this[key] = value;
            this.notify(key, value);
        }
    }
};
