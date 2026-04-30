class TypingEngine {
    constructor(options) {
        this.containerId = options.containerId;
        this.prefix = options.prefix || '';
        this.onComplete = options.onComplete || (() => {});
        this.onStatsUpdate = options.onStatsUpdate || (() => {});
        this.onRestart = options.onRestart || (() => {});
        this.onHintToggle = options.onHintToggle || (() => {});
        this.customTopLeft = options.customTopLeft || (() => '');
        this.customTopRight = options.customTopRight || (() => '');
        this.customBottomNav = options.customBottomNav || (() => '');

        this.sequence = [];
        this.nText = '';
        this.currentIndex = 0;
        this.typedCorrectness = [];
        this.keystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0, clusterAttempts: {}, maxWrongAttemptsPerCluster: 0 };
        this.typingInterval = null;
        this.wpmCalc = typeof WpmCalculator !== 'undefined' ? new WpmCalculator() : null;
        this.isFinished = false;
        
        // Ensure standard keyboard logic is available (from app.js)
        this.drawKeyboard = window.drawKeyboard;
        this.highlightKeysForStep = window.highlightKeysForStep;
        this.getClusterBoundaries = window.getClusterBoundaries;
        this.getDisplayClusters = window.getDisplayClusters;
        this.getCompletedMistakes = window.getCompletedMistakes;

        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._updateStats = this._updateStats.bind(this);
    }

    renderUI() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const p = this.prefix;

        container.innerHTML = `
            <div class="screen-header">
                ${this.customTopLeft()}
                ${this.customTopRight()}
            </div>
            <div class="console-body" style="flex:1; display:flex; flex-direction:column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 1.5rem 0; width: 100%;">
                    <div class="controls">
                        <button class="btn" onclick="document.getElementById('${p}hidden-input').blur(); this.dispatchEvent(new CustomEvent('restart-typing', {bubbles:true}))">↺ Reset</button>
                        <div class="hints-wrap">
                            <button class="btn" id="${p}btn-hints" onclick="document.getElementById('${p}hints-panel').classList.toggle('open'); this.classList.toggle('active');">⚙ Hints ▾</button>
                            <div class="hints-panel" id="${p}hints-panel">
                                <div class="hint-row"><span class="hint-label">✦ Glow effect</span><label class="toggle"><input type="checkbox" id="${p}tog-glow" checked onchange="this.dispatchEvent(new CustomEvent('hint-toggle', {bubbles:true}))"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">✋ Show hands</span><label class="toggle"><input type="checkbox" id="${p}tog-hands" checked onchange="this.dispatchEvent(new CustomEvent('hint-toggle', {bubbles:true}))"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">⌨ Show keyboard</span><label class="toggle"><input type="checkbox" id="${p}tog-keyboard" checked onchange="this.dispatchEvent(new CustomEvent('hint-toggle', {bubbles:true}))"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">💬 Step guide</span><label class="toggle"><input type="checkbox" id="${p}tog-guide" checked onchange="this.dispatchEvent(new CustomEvent('hint-toggle', {bubbles:true}))"><span class="toggle-slider"></span></label></div>
                            </div>
                        </div>
                    </div>
                    <div class="stats" style="flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <div style="display:flex; gap: 0.8rem;">
                            <span>Chars: <span class="stat-val stat-total" id="${p}stat-chars">০</span></span>
                            <span>✓ <span class="stat-val stat-correct" id="${p}stat-correct">০</span></span>
                            <span>✗ <span class="stat-val stat-wrong" id="${p}stat-wrong">০</span></span>
                        </div>
                    </div>
                </div>
                
                <div class="step-guide" id="${p}step-guide" style="margin-top: 1rem;">
                    <span class="step-guide-label">Type this</span>
                    <div class="step-divider"></div>
                    <span class="step-bn-char" id="${p}step-bn">—</span>
                    <span class="step-arrow">→</span>
                    <span class="key-pill" id="${p}step-keys"></span>
                    <span class="step-context" id="${p}step-context"></span>
                </div>

                <div class="yt-typing-area" onclick="document.getElementById('${p}hidden-input').focus()" style="margin-top: 1rem; border: none; background: transparent;">
                    <div id="${p}typed-display"></div>
                    <input type="text" id="${p}hidden-input" class="hidden-input" autocomplete="off" autocorrect="off" spellcheck="false">
                </div>

                <div class="yt-bottom-area" style="padding: 1rem 0;">
                    <div class="keyboard-wrap" id="${p}svg-container"></div>
                </div>

                ${this.customBottomNav()}
            </div>
        `;

        if (this.drawKeyboard) {
            this.drawKeyboard(`${p}svg-container`, this.prefix);
        }

        const input = document.getElementById(`${p}hidden-input`);
        if (input) {
            input.removeEventListener('keydown', this._handleKeyDown);
            input.addEventListener('keydown', this._handleKeyDown);
        }

        container.addEventListener('restart-typing', () => this.onRestart());
        container.addEventListener('hint-toggle', () => this.applyHints());
    }

    start(sequence, nText) {
        this.sequence = sequence;
        this.nText = nText;
        this.currentIndex = 0;
        this.typedCorrectness = [];
        this.keystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0, clusterAttempts: {}, maxWrongAttemptsPerCluster: 0 };
        this.isFinished = false;

        if (this.typingInterval) clearInterval(this.typingInterval);
        this.typingInterval = null;
        if (this.wpmCalc) this.wpmCalc.reset();

        this.updateDisplay();
        this.updateStepGuide();
        this._updateStats();

        const input = document.getElementById(`${this.prefix}hidden-input`);
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    _handleKeyDown(e) {
        if (this.isFinished) return;
        if (["Tab", "Shift", "Control", "Alt", "CapsLock", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();

        if (e.key === 'Backspace') {
            if (this.currentIndex === 0) return;
            this.currentIndex--;
            const prevStep = this.sequence[this.currentIndex];
            const bounds = this.getClusterBoundaries(this.sequence);
            const ci = bounds.findIndex(b => b.end === prevStep.clusterEnd || b.end === prevStep.targetEnd);
            if (ci >= 0 && this.typedCorrectness[ci] !== undefined) {
                if (this.typedCorrectness[ci] === true) this.keystrokes.correct--;
                else if (this.typedCorrectness[ci] === false) this.keystrokes.wrong--;
                this.typedCorrectness[ci] = undefined;
            }
            this._updateStats();
            this.updateDisplay();
            this.updateStepGuide();
            return;
        }

        if (this.currentIndex >= this.sequence.length) return;

        if (this.keystrokes.total === 0 && this.wpmCalc) {
            this.wpmCalc.start();
            if (this.typingInterval) clearInterval(this.typingInterval);
            this.typingInterval = setInterval(this._updateStats, 500);
        }

        const step = this.sequence[this.currentIndex].key;
        const key = e.key;
        const isShift = e.shiftKey;
        let matched = false;

        if (step.startsWith('Shift+')) {
            const kp = step.split('+')[1];
            if (isShift) {
                if (key.toUpperCase() === kp.toUpperCase()) matched = true;
                const shiftMap = {
                    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
                    '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?', '`': '~'
                };
                if (key === shiftMap[kp] || key === kp) matched = true;
            }
        } else if (step === 'Space') {
            if (key === ' ') matched = true;
        } else if (step === 'Enter') {
            if (key === 'Enter') matched = true;
        } else {
            if (!isShift && key === step) matched = true;
        }

        const curStep = this.sequence[this.currentIndex];
        const isLastInCluster = curStep.targetEnd >= 0;

        if (matched) {
            this.keystrokes.total++;
            this.keystrokes.correct++;
            if (isLastInCluster) {
                const ci = this.getClusterBoundaries(this.sequence).findIndex(b => b.end === curStep.targetEnd);
                if (this.typedCorrectness[ci] === undefined) this.typedCorrectness[ci] = true;
            }
            this.currentIndex++;
        } else {
            this.keystrokes.total++;
            this.keystrokes.wrong++;
            
            const bounds = this.getClusterBoundaries(this.sequence);
            const ci = isLastInCluster 
                ? bounds.findIndex(b => b.end === curStep.targetEnd)
                : bounds.findIndex(b => b.end === curStep.clusterEnd);
                
            this.typedCorrectness[ci] = false;
            
            if (!this.keystrokes.clusterAttempts[ci]) this.keystrokes.clusterAttempts[ci] = 0;
            this.keystrokes.clusterAttempts[ci]++;
            if (this.keystrokes.clusterAttempts[ci] > this.keystrokes.maxWrongAttemptsPerCluster) {
                this.keystrokes.maxWrongAttemptsPerCluster = this.keystrokes.clusterAttempts[ci];
            }
            
            this.currentIndex++;
        }

        if (this.currentIndex >= this.sequence.length) {
            this.isFinished = true;
            if (this.typingInterval) clearInterval(this.typingInterval);
            if (this.wpmCalc) this.wpmCalc.stop();
            this._updateStats();
            this.updateDisplay();
            this.updateStepGuide();
            
            const mistakes = this.getCompletedMistakes(this.typedCorrectness, this.getClusterBoundaries(this.sequence), this.nText);
            const stats = this.wpmCalc ? this.wpmCalc.getStats(this.keystrokes.total, this.keystrokes.correct, mistakes) : null;
            
            this.onComplete({
                wpm: stats ? stats.wpm : 0,
                acc: stats ? stats.accuracy : 0,
                keystrokes: this.keystrokes,
                mistakes: mistakes
            });
        } else {
            this._updateStats();
            this.updateDisplay();
            this.updateStepGuide();
        }
    }

    _updateStats() {
        if (!this.wpmCalc) return;
        const p = this.prefix;
        const mistakes = this.getCompletedMistakes(this.typedCorrectness, this.getClusterBoundaries(this.sequence), this.nText);
        const stats = this.wpmCalc.getStats(this.keystrokes.total, this.keystrokes.correct, mistakes);

        this.onStatsUpdate(stats);

        const charsEl = document.getElementById(`${p}stat-chars`);
        const correctEl = document.getElementById(`${p}stat-correct`);
        const wrongEl = document.getElementById(`${p}stat-wrong`);

        const done = this.typedCorrectness.filter(v => v !== undefined).length;
        const correct = this.typedCorrectness.filter(v => v === true).length;
        const wrong = this.typedCorrectness.filter(v => v === false).length;
        
        if (charsEl) charsEl.textContent = toBn(done);
        if (correctEl) correctEl.textContent = toBn(correct);
        if (wrongEl) wrongEl.textContent = toBn(wrong);
    }

    updateDisplay() {
        const display = document.getElementById(`${this.prefix}typed-display`);
        if (!display) return;
        
        display.innerHTML = '';
        const bounds = this.getClusterBoundaries(this.sequence);
        const displayClusters = this.getDisplayClusters(bounds, this.nText);

        let currentClusterIdx = -1;
        for (let ci = 0; ci < bounds.length; ci++) {
            const stepsInCluster = this.sequence.filter(s => s.clusterEnd === bounds[ci].end);
            const stepsBeforeThis = this.sequence.indexOf(stepsInCluster[0]);
            if (this.currentIndex >= stepsBeforeThis && this.currentIndex < stepsBeforeThis + stepsInCluster.length) {
                currentClusterIdx = ci;
                break;
            }
            if (this.currentIndex >= stepsBeforeThis + stepsInCluster.length) currentClusterIdx = ci + 1;
        }

        displayClusters.forEach(dc => {
            const span = document.createElement('span');
            span.textContent = dc.text;
            span.className = 'char';

            const indices = dc.clusterIndices;
            const minIdx = indices[0];
            const maxIdx = indices[indices.length - 1];

            if (maxIdx < currentClusterIdx) {
                const allCorrect = indices.every(ci => this.typedCorrectness[ci] !== false);
                span.classList.add(allCorrect ? 'correct' : 'wrong');
            } else if (minIdx <= currentClusterIdx && currentClusterIdx <= maxIdx) {
                span.classList.add('current');
            }
            display.appendChild(span);
        });

        // Auto-scroll
        const currentSpan = display.querySelector('.char.current');
        if (currentSpan) {
            const container = display.parentElement;
            if (currentSpan.offsetTop + currentSpan.offsetHeight > container.scrollTop + container.clientHeight - 40 ||
                currentSpan.offsetTop < container.scrollTop + 40) {
                container.scrollTo({
                    top: currentSpan.offsetTop - container.clientHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    }

    updateStepGuide() {
        const p = this.prefix;
        const guide = document.getElementById(`${p}step-guide`);
        if (!guide) return;

        if (this.currentIndex >= this.sequence.length) {
            document.getElementById(`${p}step-bn`).textContent = '✓';
            document.getElementById(`${p}step-keys`).innerHTML = '';
            document.getElementById(`${p}step-context`).textContent = 'সম্পন্ন!';
            if(this.highlightKeysForStep) this.highlightKeysForStep(null, this.prefix);
            return;
        }

        const step = this.sequence[this.currentIndex];
        const clusterEnd = step.clusterEnd;
        const clusterBounds = this.getClusterBoundaries(this.sequence);
        const clusterBound = clusterBounds.find(b => b.end === clusterEnd);
        const clusterText = clusterBound ? this.nText.slice(clusterBound.start, clusterBound.end) : step.char;

        const stepsInCluster = this.sequence.filter(s => s.clusterEnd === clusterEnd);
        const stepIdxInCluster = stepsInCluster.indexOf(step);
        const totalStepsInCluster = stepsInCluster.length;

        if (clusterText === '\n') {
            document.getElementById(`${p}step-bn`).innerHTML = '&crarr;';
        } else {
            document.getElementById(`${p}step-bn`).textContent = clusterText || step.char;
        }

        const keysDiv = document.getElementById(`${p}step-keys`);
        keysDiv.innerHTML = '';
        const keys = step.key.split('+');
        keys.forEach((k, i) => {
            const badge = document.createElement('span');
            badge.className = 'key-badge';
            badge.textContent = k;
            keysDiv.appendChild(badge);
            if (i < keys.length - 1) {
                const plus = document.createElement('span');
                plus.textContent = ' + ';
                plus.style.color = 'var(--subtext)';
                plus.style.fontFamily = "'JetBrains Mono', monospace";
                keysDiv.appendChild(plus);
            }
        });

        if (totalStepsInCluster > 1) {
            document.getElementById(`${p}step-context`).textContent = `ধাপ ${toBn(stepIdxInCluster + 1)} / ${toBn(totalStepsInCluster)} — এই অক্ষরের জন্য`;
        } else {
            document.getElementById(`${p}step-context`).textContent = '';
        }

        if(this.highlightKeysForStep) this.highlightKeysForStep(step.key, this.prefix);
    }

    applyHints() {
        const p = this.prefix;
        const hands = document.getElementById(`${p}tog-hands`)?.checked;
        const keyboard = document.getElementById(`${p}tog-keyboard`)?.checked;
        const guide = document.getElementById(`${p}tog-guide`)?.checked;

        document.querySelectorAll(`.${p}finger-shape, .${p}palm-shape`).forEach(el => {
            el.style.visibility = hands ? '' : 'hidden';
        });

        const svg = document.querySelector(`#${p}svg-container svg`);
        if (svg) {
            const totalWidth = 15 * 58 + 14 * 5; // keySize=58, gap=5
            const baseHeight = 5 * 58 + 4 * 5;
            const heightWithHands = baseHeight + 110;
            const newHeight = hands ? heightWithHands : baseHeight + 10;
            svg.setAttribute("viewBox", `0 0 ${totalWidth} ${newHeight}`);
        }

        const keyboardWrap = document.getElementById(`${p}svg-container`);
        if (keyboardWrap) keyboardWrap.style.display = keyboard ? 'block' : 'none';

        const guideWrap = document.getElementById(`${p}step-guide`);
        if (guideWrap) guideWrap.style.display = guide ? 'flex' : 'none';

        if (this.sequence && this.sequence[this.currentIndex]) {
            if(this.highlightKeysForStep) this.highlightKeysForStep(this.sequence[this.currentIndex].key, this.prefix);
        } else {
            if(this.highlightKeysForStep) this.highlightKeysForStep(null, this.prefix);
        }
        
        this.onHintToggle();
    }
}
window.TypingEngine = TypingEngine;
