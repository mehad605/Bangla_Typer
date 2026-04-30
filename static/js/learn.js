const LEARN_DATA = {
    letters: {
        title: "অক্ষর",
        lessons: [
            // Stage 1
            { id: 'l1', num: 1, chars: ['অ', 'আ', 'ক', 'খ'] },
            { id: 'l2', num: 2, chars: ['ই', 'ঈ', 'ত', 'থ'] },
            { id: 'l3', num: 3, chars: ['অ', 'আ', 'ই', 'ঈ', 'ক', 'খ', 'ত', 'থ'] },
            { id: 'l4', num: 4, chars: ['উ', 'ঊ', 'দ', 'ধ'] },
            { id: 'l5', num: 5, chars: ['ঋ', 'ৎ', 'ঃ'] },
            { id: 'l6', num: 6, chars: ['উ', 'ঊ', 'ঋ', 'দ', 'ধ', 'ৎ', 'ঃ'] },
            { id: 'l7', num: 7, chars: ['ব', 'ভ', '্', '।'] },
            { id: 'l8', num: 8, chars: ['উ', 'ঊ', 'ঋ', 'ব', 'ভ', '্', '।'] },
            { id: 'l9', num: 9, chars: ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'ক', 'খ', 'ত', 'থ', 'দ', 'ধ', 'ব', 'ভ', '্', '।', 'ৎ', 'ঃ'] },
            // Stage 2
            { id: 'l10', num: 10, chars: ['প', 'ফ', 'ট', 'ঠ', 'চ', 'ছ', 'জ', 'ঝ'] },
            { id: 'l11', num: 11, chars: ['ড', 'ঢ', 'হ', 'ঞ', 'গ', 'ঘ'] },
            { id: 'l12', num: 12, chars: ['প', 'ফ', 'ট', 'ঠ', 'চ', 'ছ', 'জ', 'ঝ', 'ড', 'ঢ', 'হ', 'ঞ', 'গ', 'ঘ'] },
            { id: 'l13', num: 13, chars: ['য', 'য়'] },
            { id: 'l14', num: 14, chars: ['ঙ', 'ড়', 'ঢ়', 'ং'] },
            { id: 'l15', num: 15, chars: ['য', 'য়', 'ঙ', 'ড়', 'ঢ়', 'ং'] },
            { id: 'l16', num: 16, chars: ['ঙ', 'য', 'য়', 'ড', 'ঢ', 'প', 'ফ', 'ট', 'ঠ', 'চ', 'ছ', 'জ', 'ঝ', 'হ', 'ঞ', 'গ', 'ঘ', 'ড়', 'ঢ়'] },
            // Stage 3
            { id: 'l17', num: 17, chars: ['স', 'ষ', 'শ', 'ম'] },
            { id: 'l18', num: 18, chars: ['ও', 'ঔ'] },
            { id: 'l19', num: 19, chars: ['স', 'ষ', 'শ', 'ম', 'ও', 'ঔ'] },
            { id: 'l20', num: 20, chars: ['এ', 'ঐ'] },
            { id: 'l21', num: 21, chars: ['র', 'ল', 'ন', 'ণ'] },
            { id: 'l22', num: 22, chars: ['এ', 'ঐ', 'র', 'ল', 'ন', 'ণ'] },
            { id: 'l23', num: 23, chars: ['স', 'ষ', 'শ', 'ম', 'ও', 'ঔ', 'এ', 'ঐ', 'র', 'ল', 'ন', 'ণ'] }
        ]
    },
    kar: {
        title: "কার",
        lessons: [
            { id: 'k1', num: 1, chars: ['া'] },
            { id: 'k2', num: 2, chars: ['ি', 'ী'] },
            { id: 'k3', num: 3, chars: ['ু', 'ূ'] },
            { id: 'k4', num: 4, chars: ['ৃ'] },
            { id: 'k5', num: 5, chars: ['ে', 'ৈ'] },
            { id: 'k6', num: 6, chars: ['ৗ'] },
            { id: 'k7', num: 7, chars: ['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ৗ'] }
        ]
    },
    modifiers: {
        title: "যুক্তবর্ণ",
        lessons: [
            { id: 'm1', num: 1, chars: ['্'] },
            { id: 'm2', num: 2, chars: ['্র'] }
        ]
    }
};

const DIFFICULTIES = {
    easy:      { id: 'easy',      name: 'Easy',      wpm: 15, length: 42  },
    medium:    { id: 'medium',    name: 'Medium',    wpm: 25, length: 75  },
    hard:      { id: 'hard',      name: 'Hard',      wpm: 40, length: 120 },
    very_hard: { id: 'very_hard', name: 'Very Hard', wpm: 55, length: 200 }
};

let learnProgress = {};
let currentLearnLesson = null;
let currentDifficulty = null;
let learnNText = '';
let learnSequence = [];
let learnCurrentIndex = 0;
let learnTypedCorrectness = [];
let learnTypingInterval = null;
let learnKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
let learnTypingState = { 
    startTime: null, 
    endTime: null,
    wpmHistory: [], 
    errHistory: [], 
    lastCorr: 0, 
    lastTotal: 0, 
    lastErr: 0, 
    lastMistakes: 0 
};
let learnCurrentView = 'main';
let learnChartInstance = null;

function saveLearnProgress() {
    try {
        localStorage.setItem('bangla_typer_learn_progress', JSON.stringify(learnProgress));
    } catch (e) {
        console.error('Failed to save learn progress:', e);
    }
}

function loadLearnProgress() {
    try {
        const saved = localStorage.getItem('bangla_typer_learn_progress');
        if (saved) {
            learnProgress = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load learn progress:', e);
        learnProgress = {};
    }
}

function resetLearnTypingState() {
    learnCurrentIndex = 0;
    learnTypedCorrectness = [];
    learnKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
    learnTypingState = { 
        startTime: null, 
        endTime: null,
        wpmHistory: [], 
        errHistory: [], 
        lastCorr: 0, 
        lastTotal: 0, 
        lastErr: 0, 
        lastMistakes: 0 
    };
}

// Initialize Learn Mode UI
window.initLearnMode = function() {
    loadLearnProgress();
    renderLearnMain();
    learnCurrentView = 'main';
};

window.restoreLearnView = function() {
    if (learnCurrentView === 'console') {
        renderLearnConsole();
    } else if (learnCurrentView === 'lesson') {
        renderLessonDetail();
    } else {
        renderLearnMain();
    }
};

function renderLearnMain() {
    learnCurrentView = 'main';
    const container = document.getElementById('app-learn');
    let html = `<div class="learn-screen active" id="learn-main-screen" style="flex:1; overflow-y:auto; padding: 2rem;">`;

    // Add Legend
    html += `
        <div class="learn-legend" style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem; background: var(--surface); padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid var(--border); align-items: center;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--subtext); margin-right: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Progress Legend:</div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--border); border: 1px solid rgba(255,255,255,0.1);"></div> Not Touched
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--blue); border: 1px solid rgba(255,255,255,0.1);"></div> Easy Done
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--yellow); border: 1px solid rgba(255,255,255,0.1);"></div> Medium Done
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--purple); border: 1px solid rgba(255,255,255,0.1);"></div> Hard Done
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text);">
                <div style="width: 12px; height: 12px; border-radius: 3px; background: var(--correct); border: 1px solid rgba(255,255,255,0.1);"></div> Very Hard Done
            </div>
        </div>
    `;

    for (const [sectionKey, section] of Object.entries(LEARN_DATA)) {
        html += `
            <div class="learn-section" style="margin-bottom: 2rem;">
                <h2 style="color: var(--text); font-size: 1.5rem; margin-bottom: 1rem;">${section.title}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        `;

        section.lessons.forEach(lesson => {
            let highestDiff = null;
            if (learnProgress[`${lesson.id}_very_hard`]?.completed) highestDiff = 'very_hard';
            else if (learnProgress[`${lesson.id}_hard`]?.completed) highestDiff = 'hard';
            else if (learnProgress[`${lesson.id}_medium`]?.completed) highestDiff = 'medium';
            else if (learnProgress[`${lesson.id}_easy`]?.completed) highestDiff = 'easy';

            let borderColor = 'var(--border)';
            let glowColor = 'transparent';
            
            if (highestDiff === 'very_hard') {
                borderColor = 'var(--correct)';
                glowColor = 'var(--correct)';
            } else if (highestDiff === 'hard') {
                borderColor = 'var(--purple)';
                glowColor = 'var(--purple)';
            } else if (highestDiff === 'medium') {
                borderColor = 'var(--yellow)';
                glowColor = 'var(--yellow)';
            } else if (highestDiff === 'easy') {
                borderColor = 'var(--blue)';
                glowColor = 'var(--blue)';
            }

            const boxShadow = highestDiff ? `0 0 10px ${glowColor}33` : '0 4px 6px rgba(0,0,0,0.1)';
            
            html += `
                <div class="lesson-card" style="border-radius: 12px; background: var(--surface); width: 160px; cursor: pointer; display: flex; flex-direction: column; overflow: hidden; padding: 0; align-items: stretch; border: 2px solid ${borderColor}; box-shadow: ${boxShadow}; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.openLearnLesson('${sectionKey}', '${lesson.id}')">
                    <div style="text-align: center; padding: 10px; font-size: 0.95rem; color: var(--text); font-family: 'JetBrains Mono', monospace; font-weight: 600; border-bottom: 2px solid var(--border); background: rgba(0,0,0,0.1);">
                        Lesson ${toBn(lesson.num)}
                    </div>
                    <div style="text-align: center; padding: 10px 10px 14px; font-size: 1.3rem; color: var(--accent); line-height: 1.8; min-height: 44px; word-break: break-word;">
                        ${lesson.chars.join(' ')}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

window.openLearnLesson = function(sectionKey, lessonId) {
    const section = LEARN_DATA[sectionKey];
    currentLearnLesson = section.lessons.find(l => l.id === lessonId);
    if (!currentLearnLesson) return;
    renderLessonDetail();
};

function renderLessonDetail() {
    learnCurrentView = 'lesson';
    const section = Object.values(LEARN_DATA).find(s => s.lessons.includes(currentLearnLesson));
    if (!section || !currentLearnLesson) return;

    const container = document.getElementById('app-learn');
    let html = `
        <div class="learn-screen active" id="learn-detail-screen" style="flex:1; display:flex; flex-direction:column; padding: 2rem;">
            <div style="margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">
                <span style="color: var(--subtext); cursor: pointer;" onclick="renderLearnMain()">Learn</span>
                <span style="color: var(--border);">/</span>
                <span style="color: var(--text); font-weight: 600;">${section.title} - Lesson ${toBn(currentLearnLesson.num)}</span>
            </div>
            
            <div style="background: var(--surface); border: 1px solid var(--border); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="color: var(--subtext); margin-bottom: 0.8rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'JetBrains Mono', monospace;">Characters in this lesson</div>
                <div style="font-size: 1.8rem; color: var(--accent); letter-spacing: 8px; font-weight: 500;">${currentLearnLesson.chars.join(' ')}</div>
            </div>

            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 6px; color: var(--subtext);">
                    <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--border);"></div> Untouched
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: var(--subtext);">
                    <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--yellow);"></div> Unbeaten
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: var(--subtext);">
                    <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--correct);"></div> Beaten
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 800px; margin: 0 auto;">
    `;

    Object.values(DIFFICULTIES).forEach(diff => {
        const progKey = `${currentLearnLesson.id}_${diff.id}`;
        const prog = learnProgress[progKey] || { started: false, completed: false, bestWpm: 0, lastWpm: null };
        
        let statusColor = 'var(--border)';
        let shadowColor = 'transparent';
        
        if (prog.completed) {
            statusColor = 'var(--correct)';
            shadowColor = 'var(--correct)';
        } else if (prog.started) {
            statusColor = 'var(--yellow)';
            shadowColor = 'var(--yellow)';
        }

        html += `
            <div style="background: var(--surface); border: 2px solid ${statusColor}; padding: 1.2rem 1.5rem; border-radius: 12px; cursor: pointer; transition: transform 0.2s; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 0 12px ${shadowColor}1A;" onclick="window.startLearnTyping('${diff.id}')">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h3 style="margin:0; color: var(--text); font-size: 1.2rem;">${diff.name}</h3>
                        ${prog.completed ? '<span style="font-size: 0.65rem; background: var(--correct); color: var(--bg); padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: \'JetBrains Mono\', monospace;">BEATEN</span>' : (prog.started ? '<span style="font-size: 0.65rem; background: var(--yellow); color: var(--bg); padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: \'JetBrains Mono\', monospace;">UNBEATEN</span>' : '')}
                    </div>
                    <div style="color: var(--subtext); font-size: 0.85rem; font-family: 'JetBrains Mono', monospace;">Target WPM: <span style="color:var(--accent); font-weight:bold;">${toBn(diff.wpm)}</span></div>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); color: var(--subtext); background: var(--bg); display: flex; gap: 6px; align-items: center;">
                        BST <span style="color: var(--correct); font-weight: bold; font-size: 0.85rem;">${prog.bestWpm > 0 ? toBn(prog.bestWpm) : '-'}</span>
                    </div>
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); color: var(--subtext); background: var(--bg); display: flex; gap: 6px; align-items: center;">
                        LST <span style="color: var(--text); font-weight: bold; font-size: 0.85rem;">${prog.lastWpm !== undefined && prog.lastWpm !== null ? toBn(prog.lastWpm) : '-'}</span>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function generateRandomLessonText(chars, length) {
    let result = '';
    let charsAdded = 0;
    while (charsAdded < length) {
        const wordLen = Math.floor(Math.random() * 4) + 2; 
        let word = '';
        for (let i = 0; i < wordLen; i++) {
            const rndChar = chars[Math.floor(Math.random() * chars.length)];
            if (['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ৗ', '্', '্র'].includes(rndChar) && i === 0) {
                const baseChars = chars.filter(c => !['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ৗ', '্', '্র'].includes(c));
                if (baseChars.length > 0) word += baseChars[Math.floor(Math.random() * baseChars.length)];
                else word += 'ক' + rndChar;
            } else word += rndChar;
        }
        result += word + ' ';
        charsAdded += wordLen + 1;
    }
    return result.trim();
}

window.startLearnTyping = function(difficultyId) {
    learnCurrentView = 'console';
    currentDifficulty = DIFFICULTIES[difficultyId];
    const rawText = generateRandomLessonText(currentLearnLesson.chars, currentDifficulty.length);
    const result = generateSequence(rawText);
    
    learnSequence = result.seq;
    learnNText = result.nText;
    resetLearnTypingState();
    
    // Mark as started (Untouched -> Tried)
    const progKey = `${currentLearnLesson.id}_${currentDifficulty.id}`;
    if (!learnProgress[progKey]) {
        learnProgress[progKey] = { started: true, completed: false, bestWpm: 0, lastWpm: null };
    } else {
        learnProgress[progKey].started = true;
    }
    saveLearnProgress();

    renderLearnConsole();
    setTimeout(() => window.focusLearnInput(), 0);
};

function renderLearnConsole() {
    const container = document.getElementById('app-learn');
    const section = Object.values(LEARN_DATA).find(s => s.lessons.includes(currentLearnLesson));
    
    let html = `
        <div class="learn-screen active" id="learn-console-screen" style="flex:1; display:flex; flex-direction:column; background: var(--bg);">
            <div class="screen-header">
                <div class="breadcrumb">
                    <a onclick="renderLearnMain()">Learn</a>
                    <span class="sep">/</span>
                    <a onclick="window.openLearnLesson('${Object.keys(LEARN_DATA).find(k => LEARN_DATA[k].lessons.includes(currentLearnLesson))}', '${currentLearnLesson.id}')">${section.title} - L${toBn(currentLearnLesson.num)}</a>
                    <span class="sep">/</span>
                    <span class="current">${currentDifficulty.name}</span>
                </div>
                <div class="console-stats">
                    <div class="console-stat">
                        <span style="color:var(--subtext);">Target:</span>
                        <span class="console-stat-val" style="color:var(--accent);">${toBn(currentDifficulty.wpm)}</span>
                        <span style="font-size:0.65rem; color:var(--subtext);">WPM</span>
                    </div>
                </div>
            </div>

            <div class="console-body" style="flex:1; display:flex; flex-direction:column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 1.5rem 0; width: 100%;">
                    <div class="controls">
                        <button class="btn" onclick="newLearnContent()">✦ নতুন</button>
                        <button class="btn" onclick="resetLearnTyping()">⟳ রিসেট</button>
                        <div class="hints-wrap">
                            <button class="btn" id="learn-btn-hints" onclick="toggleLearnHintsPanel()">⚙ Hints ▾</button>
                            <div class="hints-panel" id="learn-hints-panel">
                                <div class="hint-row"><span class="hint-label">✦ Glow effect</span><label class="toggle"><input type="checkbox" id="learn-tog-glow" checked onchange="applyLearnHints()"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">✋ Show hands</span><label class="toggle"><input type="checkbox" id="learn-tog-hands" checked onchange="applyLearnHints()"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">⌨ Show keyboard</span><label class="toggle"><input type="checkbox" id="learn-tog-keyboard" checked onchange="applyLearnHints()"><span class="toggle-slider"></span></label></div>
                                <div class="hints-divider"></div>
                                <div class="hint-row"><span class="hint-label">💬 Step guide</span><label class="toggle"><input type="checkbox" id="learn-tog-guide" checked onchange="applyLearnHints()"><span class="toggle-slider"></span></label></div>
                            </div>
                        </div>
                    </div>
                    <div class="stats" style="flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <div style="display:flex; gap: 0.8rem;">
                            <span>অক্ষর: <span class="stat-val stat-total" id="learn-stat-chars">০</span></span>
                            <span>✓ <span class="stat-val stat-correct" id="learn-stat-correct">০</span></span>
                            <span>✗ <span class="stat-val stat-wrong" id="learn-stat-wrong">০</span></span>
                        </div>
                        <div style="display:flex; gap: 0.8rem; font-size: 0.9em;">
                            <span>কীস্ট্রোক: <span class="stat-val stat-total" id="learn-stat-keys-total">০</span></span>
                            <span>✓ <span class="stat-val stat-correct" id="learn-stat-keys-correct">০</span></span>
                            <span>✗ <span class="stat-val stat-wrong" id="learn-stat-keys-wrong">০</span></span>
                        </div>
                        <div style="display:flex; gap: 0.8rem; font-size: 0.95em; color: var(--accent); margin-top: 2px;">
                            <span>গতি (WPM): <span class="stat-val stat-correct" id="learn-stat-wpm">০</span></span>
                            <span>সঠিকতা: <span class="stat-val stat-correct" id="learn-stat-acc">১০০%</span></span>
                        </div>
                    </div>
                </div>

                <div class="step-guide" id="learn-step-guide" style="margin-top: 1rem;">
                    <span class="step-guide-label">Type this</span>
                    <div class="step-divider"></div>
                    <span class="step-bn-char" id="learn-step-bn">—</span>
                    <span class="step-arrow">→</span>
                    <span class="key-pill" id="learn-step-keys"></span>
                    <span class="step-context" id="learn-step-context"></span>
                </div>

                <div class="yt-typing-area" onclick="window.focusLearnInput()" style="margin-top: 1rem; border: none; background: transparent;">
                    <div id="learn-typed-display"></div>
                    <input type="text" id="learn-hidden-input" class="hidden-input" autocomplete="off" autocorrect="off" spellcheck="false">
                </div>

                <div class="yt-bottom-area" style="padding: 1rem 0;">
                    <div class="keyboard-wrap" id="learn-svg-container"></div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    if (typeof drawKeyboard !== 'undefined') drawKeyboard('learn-svg-container', 'learn-');
    const input = document.getElementById('learn-hidden-input');
    if (input) input.addEventListener('keydown', handleLearnInput);
    updateLearnDisplay();
    updateLearnStepGuide();
}

window.focusLearnInput = function() {
    const input = document.getElementById('learn-hidden-input');
    if (input) input.focus();
};

window.handleLearnInput = function(e) {
    if (["Tab", "Shift", "Control", "Alt", "CapsLock"].includes(e.key)) return;
    e.preventDefault();

    if (e.key === 'Backspace') {
        if (learnCurrentIndex === 0) return;
        learnCurrentIndex--;
        const prevStep = learnSequence[learnCurrentIndex];
        const bounds = getClusterBoundaries(learnSequence);
        const ci = bounds.findIndex(b => b.end === prevStep.clusterEnd || b.end === prevStep.targetEnd);
        
        // Note: totalKeystrokes is NOT decremented on Backspace.
        // This is industry standard: accuracy = correct / total_physical_keystrokes.
        // But we must decrease the 'correct' or 'wrong' counter to keep total = correct + wrong + extra.
        // Actually, let's keep it simple: total only increases, but we track correct/wrong at the end.
        if (ci >= 0 && learnTypedCorrectness[ci] !== undefined) {
            if (learnTypedCorrectness[ci] === true) learnKeystrokes.correct--;
            else if (learnTypedCorrectness[ci] === false) learnKeystrokes.wrong--;
            learnTypedCorrectness[ci] = undefined;
        }
        updateLearnStats();
        updateLearnDisplay();
        updateLearnStepGuide();
        return;
    }

    if (learnCurrentIndex >= learnSequence.length) return;

    if (learnKeystrokes.total === 0) {
        learnTypingState.startTime = Date.now();
        if (learnTypingInterval) clearInterval(learnTypingInterval);
        learnTypingInterval = setInterval(() => {
            const tot = learnKeystrokes.total - learnTypingState.lastTotal;
            const corr = learnKeystrokes.correct - learnTypingState.lastCorr;
            const err = learnKeystrokes.wrong - learnTypingState.lastErr;
            const mists = getCompletedMistakes(learnTypedCorrectness, getClusterBoundaries(learnSequence), learnNText);
            const mistakesInInterval = mists - learnTypingState.lastMistakes;
            const { netWPM } = WPMCalculator.calculateIntervalWPM(tot, mistakesInInterval, 1000, corr);

            learnTypingState.wpmHistory.push(netWPM);
            learnTypingState.errHistory.push(err);
            learnTypingState.lastTotal = learnKeystrokes.total;
            learnTypingState.lastCorr = learnKeystrokes.correct;
            learnTypingState.lastErr = learnKeystrokes.wrong;
            learnTypingState.lastMistakes = mists;
            updateLearnStats();
        }, 1000);
    }

    const step = learnSequence[learnCurrentIndex].key;
    const key = e.key;
    const isShift = e.shiftKey;
    let matched = false;

    if (step.startsWith('Shift+')) {
        const kp = step.split('+')[1];
        if (isShift) {
            if (key.toUpperCase() === kp.toUpperCase()) matched = true;
            const shiftMap = {'1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')','-':'_','=':'+','[':'{',']':'}','\\':'|',';':':',"'":'"',',':'<','.':'>','/':'?','`':'~'};
            if (key === shiftMap[kp] || key === kp) matched = true;
        }
    } else if (step === 'Space') { if (key === ' ') matched = true; }
    else if (step === 'Enter') { if (key === 'Enter') matched = true; }
    else { if (!isShift && key === step) matched = true; }

    const curStep = learnSequence[learnCurrentIndex];
    const isLastInCluster = curStep.targetEnd >= 0;

    if (matched) {
        learnKeystrokes.total++;
        learnKeystrokes.correct++;
        if (isLastInCluster) {
            const ci = getClusterBoundaries(learnSequence).findIndex(b => b.end === curStep.targetEnd);
            if (learnTypedCorrectness[ci] === undefined) learnTypedCorrectness[ci] = true;
        }
        learnCurrentIndex++;
    } else {
        learnKeystrokes.total++;
        learnKeystrokes.wrong++;
        const ci = getClusterBoundaries(learnSequence).findIndex(b => b.end === (isLastInCluster ? curStep.targetEnd : curStep.clusterEnd));
        learnTypedCorrectness[ci] = false;
        learnCurrentIndex++;
    }

    if (learnCurrentIndex >= learnSequence.length) finishLearnTyping();
    else {
        updateLearnStats();
        updateLearnDisplay();
        updateLearnStepGuide();
    }
};

function updateLearnStats() {
    const done = learnTypedCorrectness.filter(v => v !== undefined).length;
    const correct = learnTypedCorrectness.filter(v => v === true).length;
    const wrong = learnTypedCorrectness.filter(v => v === false).length;
    
    if (document.getElementById('learn-stat-chars')) document.getElementById('learn-stat-chars').textContent = toBn(done);
    if (document.getElementById('learn-stat-correct')) document.getElementById('learn-stat-correct').textContent = toBn(correct);
    if (document.getElementById('learn-stat-wrong')) document.getElementById('learn-stat-wrong').textContent = toBn(wrong);

    if (document.getElementById('learn-stat-keys-total')) document.getElementById('learn-stat-keys-total').textContent = toBn(learnKeystrokes.total);
    if (document.getElementById('learn-stat-keys-correct')) document.getElementById('learn-stat-keys-correct').textContent = toBn(learnKeystrokes.correct);
    if (document.getElementById('learn-stat-keys-wrong')) document.getElementById('learn-stat-keys-wrong').textContent = toBn(learnKeystrokes.wrong);

    let currentWpm = 0;
    let currentAcc = 100;

    if (learnTypingState && learnTypingState.startTime) {
        const elapsedMs = Date.now() - learnTypingState.startTime;
        if (elapsedMs > 0) {
            const mists = getCompletedMistakes(learnTypedCorrectness, getClusterBoundaries(learnSequence), learnNText);
            currentWpm = WPMCalculator.calculateNetWPM(learnKeystrokes.total, mists, elapsedMs, learnKeystrokes.correct);
        }
    }
    if (learnKeystrokes.total > 0) currentAcc = WPMCalculator.calculateAccuracy(learnKeystrokes.correct, learnKeystrokes.total);

    if (document.getElementById('learn-stat-wpm')) document.getElementById('learn-stat-wpm').textContent = toBn(currentWpm);
    if (document.getElementById('learn-stat-acc')) document.getElementById('learn-stat-acc').textContent = toBn(currentAcc) + '%';
}

function finishLearnTyping() {
    if (learnTypingInterval) clearInterval(learnTypingInterval);
    learnTypingState.endTime = Date.now();
    
    const timeMs = Math.max(0, learnTypingState.endTime - learnTypingState.startTime);
    const mistakes = getCompletedMistakes(learnTypedCorrectness, getClusterBoundaries(learnSequence), learnNText);
    const wpm = WPMCalculator.calculateNetWPM(learnKeystrokes.total, mistakes, timeMs, learnKeystrokes.correct);
    const acc = WPMCalculator.calculateAccuracy(learnKeystrokes.correct, learnKeystrokes.total);
    
    const progKey = `${currentLearnLesson.id}_${currentDifficulty.id}`;
    let prog = learnProgress[progKey];
    if (wpm >= currentDifficulty.wpm) prog.completed = true;
    if (wpm > prog.bestWpm) prog.bestWpm = wpm;
    prog.lastWpm = wpm;
    
    saveLearnProgress();
    showLearnResults(wpm, acc, timeMs);
}

function showLearnResults(wpm, acc, timeMs) {
    const targetWpm = currentDifficulty.wpm;
    const isPassed = wpm >= targetWpm;

    document.getElementById('learn-res-wpm').textContent = toBn(wpm);
    document.getElementById('learn-res-acc').textContent = toBn(acc) + '%';
    document.getElementById('learn-res-target-wpm').textContent = toBn(targetWpm);
    document.getElementById('learn-res-time').textContent = toBn(Math.round(timeMs / 1000)) + 's';
    
    // Keystroke-level stats only
    const totalKeys = learnKeystrokes.total;
    const correctKeys = learnKeystrokes.correct;
    const wrongKeys = learnKeystrokes.wrong;

    const statsContainer = document.getElementById('learn-res-bottom-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="display:flex; gap: 2.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--subtext);">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 2px;">total keys</span>
                    <span style="color: var(--text); font-size: 1.4rem; font-weight: 700;">${toBn(totalKeys)}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 2px;">correct</span>
                    <span style="color: var(--correct); font-size: 1.4rem; font-weight: 700;">${toBn(correctKeys)}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 2px;">wrong</span>
                    <span style="color: var(--wrong); font-size: 1.4rem; font-weight: 700;">${toBn(wrongKeys)}</span>
                </div>
            </div>
        `;
    }
    
    const header = document.getElementById('learn-res-header');
    const icon = document.getElementById('learn-res-status-icon');
    const msg = document.getElementById('learn-res-status-msg');
    
    if (isPassed) {
        header.style.borderColor = 'var(--correct)';
        header.style.background = 'rgba(158, 206, 106, 0.1)';
        icon.textContent = '🎉';
        msg.textContent = 'Target Met! Well done!';
        msg.style.color = 'var(--correct)';
    } else {
        header.style.borderColor = 'var(--wrong)';
        header.style.background = 'rgba(255, 107, 107, 0.1)';
        icon.textContent = '😅';
        msg.textContent = 'Not quite there. Try again!';
        msg.style.color = 'var(--wrong)';
    }

    document.getElementById('modal-learn-results').classList.add('open');
    renderLearnChart();
}

function renderLearnChart() {
    const ctx = document.getElementById('learnWpmChart').getContext('2d');
    if (learnChartInstance) learnChartInstance.destroy();

    const labels = Array.from({ length: learnTypingState.wpmHistory.length }, (_, i) => i + 1);
    learnChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'wpm',
                    data: learnTypingState.wpmHistory,
                    borderColor: getThemeColor('--accent'),
                    backgroundColor: getThemeColor('--accent') + '22',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'errors',
                    data: learnTypingState.errHistory.map(e => e > 0 ? e : null),
                    type: 'line',
                    showLine: false,
                    pointStyle: 'crossRot',
                    pointRadius: 6,
                    pointBorderWidth: 2,
                    borderColor: getThemeColor('--wrong'),
                    backgroundColor: getThemeColor('--wrong'),
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: getThemeColor('--subtext'), usePointStyle: true, font: { family: "'JetBrains Mono', monospace", size: 12 } }
                }
            },
            scales: {
                x: { grid: { color: getThemeColor('--surface2'), drawBorder: false }, ticks: { color: getThemeColor('--subtext'), font: { family: "'JetBrains Mono', monospace" } } },
                y: { display: true, position: 'left', grid: { color: getThemeColor('--surface2'), drawBorder: false }, ticks: { color: getThemeColor('--subtext'), stepSize: 20, font: { family: "'JetBrains Mono', monospace" } }, beginAtZero: true },
                y1: { display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: getThemeColor('--wrong'), stepSize: 1, precision: 0, font: { family: "'JetBrains Mono', monospace" } }, beginAtZero: true }
            }
        }
    });
}

window.retryLearnLesson = function() {
    document.getElementById('modal-learn-results').classList.remove('open');
    resetLearnTyping();
};

window.finishLearnLesson = function() {
    document.getElementById('modal-learn-results').classList.remove('open');
    window.openLearnLesson(Object.keys(LEARN_DATA).find(k => LEARN_DATA[k].lessons.includes(currentLearnLesson)), currentLearnLesson.id);
};

function updateLearnDisplay() {
    const display = document.getElementById('learn-typed-display');
    if (!display) return;
    display.innerHTML = '';
    const bounds = getClusterBoundaries(learnSequence);
    const displayClusters = getDisplayClusters(bounds, learnNText);
    let currentClusterIdx = -1;
    for (let ci = 0; ci < bounds.length; ci++) {
        const stepsInCluster = learnSequence.filter(s => s.clusterEnd === bounds[ci].end);
        const stepsBeforeThis = learnSequence.indexOf(stepsInCluster[0]);
        if (learnCurrentIndex >= stepsBeforeThis && learnCurrentIndex < stepsBeforeThis + stepsInCluster.length) {
            currentClusterIdx = ci;
            break;
        }
        if (learnCurrentIndex >= stepsBeforeThis + stepsInCluster.length) currentClusterIdx = ci + 1;
    }
    displayClusters.forEach(dc => {
        const span = document.createElement('span');
        span.textContent = dc.text;
        span.className = 'char';
        const indices = dc.clusterIndices;
        if (indices[indices.length - 1] < currentClusterIdx) {
            const allCorrect = indices.every(ci => learnTypedCorrectness[ci] !== false);
            span.classList.add(allCorrect ? 'correct' : 'wrong');
        } else if (indices[0] <= currentClusterIdx && currentClusterIdx <= indices[indices.length - 1]) span.classList.add('current');
        display.appendChild(span);
    });
}

function updateLearnStepGuide() {
    const guide = document.getElementById('learn-step-guide');
    if (!guide) return;
    if (learnCurrentIndex >= learnSequence.length) {
        document.getElementById('learn-step-bn').textContent = '✓';
        document.getElementById('learn-step-keys').innerHTML = '';
        document.getElementById('learn-step-context').textContent = 'সম্পন্ন!';
        highlightKeysForStep(null, 'learn-');
        return;
    }
    const step = learnSequence[learnCurrentIndex];
    const clusterBounds = getClusterBoundaries(learnSequence);
    const clusterBound = clusterBounds.find(b => b.end === step.clusterEnd);
    document.getElementById('learn-step-bn').textContent = (clusterBound ? learnNText.slice(clusterBound.start, clusterBound.end) : step.char) || step.char;
    const keysDiv = document.getElementById('learn-step-keys');
    keysDiv.innerHTML = '';
    step.key.split('+').forEach((k, i, arr) => {
        const badge = document.createElement('span');
        badge.className = 'key-badge';
        badge.textContent = k;
        keysDiv.appendChild(badge);
        if (i < arr.length - 1) {
            const plus = document.createElement('span');
            plus.textContent = ' + ';
            plus.style.color = 'var(--subtext)';
            plus.style.fontFamily = "'JetBrains Mono', monospace";
            keysDiv.appendChild(plus);
        }
    });
    const stepsInCluster = learnSequence.filter(s => s.clusterEnd === step.clusterEnd);
    const stepIdxInCluster = stepsInCluster.indexOf(step);
    document.getElementById('learn-step-context').textContent = stepsInCluster.length > 1 ? `ধাপ ${toBn(stepIdxInCluster + 1)} / ${toBn(stepsInCluster.length)}` : '';
    highlightKeysForStep(step.key, 'learn-');
}

function toggleLearnHintsPanel() {
    const panel = document.getElementById('learn-hints-panel');
    const btn = document.getElementById('learn-btn-hints');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
}

function applyLearnHints() {
    const glow = document.getElementById('learn-tog-glow').checked;
    const hands = document.getElementById('learn-tog-hands').checked;
    const keyboard = document.getElementById('learn-tog-keyboard').checked;
    const guide = document.getElementById('learn-tog-guide').checked;

    document.querySelectorAll('.learn-finger-shape, .learn-palm-shape').forEach(el => el.style.visibility = hands ? '' : 'hidden');

    const svg = document.querySelector('#learn-svg-container svg');
    if (svg) {
        const keySize = 58; const gap = 5;
        const totalWidth = 15 * keySize + 14 * gap;
        const baseHeight = 5 * keySize + 4 * gap;
        svg.setAttribute("viewBox", `0 0 ${totalWidth} ${hands ? baseHeight + 110 : baseHeight + 10}`);
    }
    const keyboardWrap = document.getElementById('learn-svg-container');
    if (keyboardWrap) keyboardWrap.style.display = keyboard ? 'block' : 'none';
    const guideWrap = document.getElementById('learn-step-guide');
    if (guideWrap) guideWrap.style.display = guide ? 'flex' : 'none';

    if (learnSequence && learnSequence[learnCurrentIndex]) {
        highlightKeysForStep(learnSequence[learnCurrentIndex].key, 'learn-');
    } else {
        highlightKeysForStep(null, 'learn-');
    }
}

function resetLearnTyping() {
    if (learnTypingInterval) clearInterval(learnTypingInterval);
    learnTypingInterval = null;
    resetLearnTypingState();
    updateLearnStats();
    updateLearnDisplay();
    updateLearnStepGuide();
    window.focusLearnInput();
}

function newLearnContent() {
    if (!currentLearnLesson || !currentDifficulty) return;
    const rawText = generateRandomLessonText(currentLearnLesson.chars, currentDifficulty.length);
    const result = generateSequence(rawText);
    learnNText = result.nText;
    learnSequence = result.seq;
    if (learnTypingInterval) clearInterval(learnTypingInterval);
    learnTypingInterval = null;
    resetLearnTypingState();
    updateLearnStats();
    updateLearnDisplay();
    updateLearnStepGuide();
    window.focusLearnInput();
}
