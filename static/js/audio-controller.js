/**
 * AudioController — Keypress sound manager
 *
 * Uses the Web Audio API for zero-latency playback.
 * Automatically handles resuming the AudioContext upon user interaction.
 */
window.AudioController = {
    volume: 0.5,
    audioCtx: null,
    audioBuffer: null,
    _isReady: false,
    _scrollTimeout: null,

    /**
     * Initializes the Web Audio API, fetches the MP3, and decodes it immediately.
     */
    async init() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            // Create context. It may start in 'suspended' state until user gesture.
            this.audioCtx = new AudioContextClass();

            // Fetch and decode the audio file
            const response = await fetch('static/audio/keypress.mp3');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            
            this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this._isReady = true;

            // Global listener to cleanly resume context on the very first interaction
            const resumeAudioContext = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume().catch(() => {});
                }
            };
            document.addEventListener('keydown', resumeAudioContext, true);
            document.addEventListener('mousedown', resumeAudioContext, true);

        } catch (e) {
            console.warn('AudioController initialization failed:', e);
        }
    },

    /**
     * Play the keypress sound. Zero latency.
     * Fires immediately via BufferSource.
     */
    play() {
        if (!this._isReady || this.volume <= 0 || !this.audioCtx || !this.audioBuffer) return;

        // Ensure context is running just in case
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffer;
        
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = this.volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    },

    /**
     * Volume scroll handler — bound from onwheel in the HTML template.
     * Only adjusts volume; does NOT play a preview sound.
     */
    handleScroll(event, indicatorId) {
        event.preventDefault();
        const delta = Math.sign(event.deltaY) * -0.05;
        this.volume = Math.max(0, Math.min(1, this.volume + delta));

        const ind = document.getElementById(indicatorId);
        if (ind) {
            ind.textContent = Math.round(this.volume * 100) + '%';
            ind.style.display = 'block';
            if (this._scrollTimeout) clearTimeout(this._scrollTimeout);
            this._scrollTimeout = setTimeout(() => {
                ind.style.display = 'none';
            }, 1500);
        }
    }
};

// Initialize as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.AudioController.init();
});
