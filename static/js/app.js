// =====================================================================
//  SERVER HEARTBEAT (Auto Shutdown)
// =====================================================================
setInterval(() => {
    fetch('/api/heartbeat', { method: 'POST' }).catch(() => { });
}, 30000);

// =====================================================================
//  DATA DIRECTORY WATCHDOG (Real-time Sync)
// =====================================================================
let lastFingerprint = null;
setInterval(async () => {
    try {
        const res = await fetch('/api/fingerprint');
        const data = await res.json();
        
        if (lastFingerprint === null) {
            lastFingerprint = data.fingerprint;
            return;
        }

        if (data.fingerprint !== lastFingerprint) {
            console.log('Detected directory change, refreshing library...');
            lastFingerprint = data.fingerprint;
            
            // Only refresh if we're not in the middle of a delicate state (like console)
            // or if the user is explicitly in the library or detail view.
            if (activeYTScreen === 'library' || activeYTScreen === 'yt-stats') {
                await fetchLibrary(true);
            } else if (activeYTScreen === 'detail') {
                // If in detail view, refresh library and reopen detail to show updated content
                await fetchLibrary(true);
                if (currentVideoId) openDetail(currentVideoId);
            } else if (activeYTScreen === 'console') {
                // If in console, we just refresh the library in background so when they go back it's ready
                await fetchLibrary(true);
            } else if (currentMode === 'instant') {
                // In instant mode, directory changes might mean new texts are available
                await fetchLibrary(true);
            }
        }
    } catch (e) {
        // Silently handle errors (server might be down or restarting)
    }
}, 3000);

// =====================================================================
//  BANGLA NUMERAL CONVERTER
// =====================================================================
const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
function toBn(num) {
    if (num === null || num === undefined) return '';
    return num.toString().split('').map(c => enToBn[c] || c).join('');
}

// =====================================================================
//  GLOBAL APP SWITCHING
// =====================================================================
let activeYTScreen = 'library'; // Keeps track of last open screen in YT Mode
let currentMode = 'instant'; // Default mode

function switchMode(mode) {
    currentMode = mode;
    const tabInstant = document.getElementById('tab-instant');
    const tabYoutube = document.getElementById('tab-youtube');
    const appInstant = document.getElementById('app-instant');
    const appYoutube = document.getElementById('app-youtube');
    const instTabsContainer = document.getElementById('inst-tabs-container');
    const ytNav = document.getElementById('yt-nav-unified');

    if (mode === 'instant') {
        tabInstant.classList.add('active');
        tabYoutube.classList.remove('active');
        appInstant.style.display = 'flex';
        appYoutube.style.display = 'none';
        if (instTabsContainer) instTabsContainer.style.display = 'flex';
        if (ytNav) ytNav.style.display = 'none';
        focusInput();
    } else {
        tabYoutube.classList.add('active');
        tabInstant.classList.remove('active');
        appYoutube.style.display = 'flex';
        appInstant.style.display = 'none';
        if (instTabsContainer) instTabsContainer.style.display = 'none';
        showScreen(activeYTScreen);
        if (activeYTScreen === 'console') focusYTTyping();
    }
}

// =====================================================================
//  YOUTUBE MODE LOGIC
// =====================================================================
let globalStatsChartInstance = null;
let globalAccStatsChartInstance = null;
let globalInstDistChartInstance = null;

// Theme System
function initTheme() {
    const savedTheme = localStorage.getItem('bijoy-typer-theme') || 'tokyonight';
    setTheme(savedTheme, false);
}

function setTheme(themeName, save = true) {
    document.body.setAttribute('data-theme', themeName);
    if (save) {
        localStorage.setItem('bijoy-typer-theme', themeName);
    }
    updateThemeActiveState(themeName);
    closeThemeDropdown();
}

function updateThemeActiveState(activeTheme) {
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === activeTheme);
    });
}

function toggleThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.classList.toggle('open');
}

function closeThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.classList.remove('open');
}

document.addEventListener('click', function (e) {
    const themeSelector = document.querySelector('.theme-selector');
    const themeBtn = document.getElementById('theme-btn');
    if (themeSelector && !themeSelector.contains(e.target) && e.target !== themeBtn) {
        closeThemeDropdown();
    }
});

window.ALL_VIDEOS = [];
function getThemeColor(varName) {
    return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

let currentVideoId = null;
let currentPartIdx = 0;
let currentPageIdx = 0;
let ytSessionResults = []; // Track results for the current continuous session
let activeTasksCount = 0;
const YT_MAX_TASKS = 3;

let ytTypingState = { startTime: null, lastStartTime: null, timeSpentMs: 0, correct: 0, wrong: 0, mistakes: 0, lastKeystrokeTime: null };
let ytKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
let ytPageKeystrokes = { total: 0, correct: 0, wrong: 0 };
let ytPageChars = { correct: 0, wrong: 0 };
let ytWpmInterval = null;
let ytSequence = [];
let ytNText = '';
let ytCurrentIndex = 0;
let ytTypedCorrectness = [];

function showScreen(name) {
    document.querySelectorAll('#app-youtube .screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    activeYTScreen = name;

    const ytNav = document.getElementById('yt-nav-unified');
    if (ytNav) {
        // Persistent toolbar for library and stats screens
        ytNav.style.display = (name === 'library' || name === 'yt-stats') ? 'flex' : 'none';
    }
}

function switchYTMainTab(tab) {
    const libTab = document.getElementById('yt-tab-library');
    const statsTab = document.getElementById('yt-tab-stats');

    if (tab === 'library') {
        libTab.classList.add('active');
        statsTab.classList.remove('active');
        showScreen('library');
    } else {
        statsTab.classList.add('active');
        libTab.classList.remove('active');
        showScreen('yt-stats');
        renderYTStatsView();
    }
}

function getRank(words) {
    if (words < 5000) return "Beginner Reader";
    if (words < 15000) return "Word Explorer";
    if (words < 40000) return "Page Turner";
    if (words < 80000) return "Book Dolphin";
    if (words < 150000) return "Literary Shark";
    if (words < 300000) return "Library Guardian";
    return "Grand Typist";
}

async function renderYTStatsView() {
    try {
        const res = await fetch('/api/completed_videos');
        const data = await res.json();

        console.log('Stats data:', data);

        document.getElementById('stats-total-words').textContent = toBn(data.total_words.toLocaleString());
        document.getElementById('stats-total-videos').textContent = toBn(data.videos_completed);
        document.getElementById('stats-avg-wpm').textContent = toBn(data.avg_wpm);
        document.getElementById('stats-avg-acc').textContent = toBn(data.avg_acc);

        const list = document.getElementById('completed-videos-list');
        const emptyState = document.getElementById('stats-empty');

        if (!list || !emptyState) {
            console.error('Stats elements not found');
            return;
        }

        if (!data.completed_videos || data.completed_videos.length === 0) {
            list.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        list.style.display = 'flex';
        emptyState.style.display = 'none';
        list.innerHTML = '';

        data.completed_videos.forEach(v => {
            const card = document.createElement('div');
            card.className = 'completed-video-card';
            card.onclick = () => openDetail(v.id);

            let thumbSrc = v.thumb_path ? `/thumbs/${v.thumb_path.split('/').map(encodeURIComponent).join('/')}` : '';
            let thumbHtml = thumbSrc
                ? `<img class="c-video-thumb" src="${thumbSrc}" loading="lazy" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%2290%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2220%22>▶</text></svg>'">`
                : `<div class="c-video-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--surface2);color:var(--subtext);">▶</div>`;

            card.innerHTML = `
                        ${thumbHtml}
                        <div class="c-video-info">
                            <div class="c-video-title">${v.title}</div>
                            <div class="c-video-stats">
                                <div class="c-stat-group">
                                    <div class="c-stat-group-label">সর্বশেষ (Last)</div>
                                    <div class="c-stat-row">
                                        <div class="c-stat">
                                            <span class="c-stat-label">WPM</span>
                                            <span class="c-stat-value last">${toBn(v.last_wpm)}</span>
                                        </div>
                                        <div class="c-stat">
                                            <span class="c-stat-label">ACC</span>
                                            <span class="c-stat-value last">${toBn(v.last_acc)}<span class="c-stat-unit">%</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div class="c-stat-group">
                                    <div class="c-stat-group-label">সেরা (Best)</div>
                                    <div class="c-stat-row">
                                        <div class="c-stat">
                                            <span class="c-stat-label">WPM</span>
                                            <span class="c-stat-value best">${toBn(v.best_wpm)}</span>
                                        </div>
                                        <div class="c-stat">
                                            <span class="c-stat-label">ACC</span>
                                            <span class="c-stat-value best">${toBn(v.best_acc)}<span class="c-stat-unit">%</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
            list.appendChild(card);
        });
    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

function renderActivityHeatmapForYT(history) {
    const grid = document.getElementById('yt-activity-grid');
    const monthRow = document.getElementById('yt-month-labels');
    const totalTestsEl = document.getElementById('yt-total-tests');
    const leftLabels = document.getElementById('yt-labels-left');
    if (!grid || !monthRow) return;

    grid.innerHTML = '';
    monthRow.innerHTML = '';
    if (totalTestsEl) totalTestsEl.textContent = `${history.length} tests`;

    // Sync left labels height to grid height
    setTimeout(() => {
        if (leftLabels && grid) {
            leftLabels.style.height = grid.offsetHeight + 'px';
        }
    }, 50);

    const now = new Date();
    let start = new Date(now);
    start.setDate(now.getDate() - 364);
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

    const activityMap = {};
    history.forEach(h => {
        const dateKey = new Date(h.timestamp * 1000).toDateString();
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    });

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let lastMonth = -1;

    for (let i = 0; i < 371; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const count = activityMap[d.toDateString()] || 0;
        const dayEl = document.createElement('div');
        dayEl.className = 'activity-day';
        let level = 0;
        if (count > 0) level = 1;
        if (count > 1) level = 2; // YouTube parts are longer than instant tests
        if (count > 3) level = 3;
        if (count > 5) level = 4;
        dayEl.setAttribute('data-level', level);
        dayEl.title = `${count} sessions on ${d.toDateString()}`;
        grid.appendChild(dayEl);

        if (i % 7 === 0) {
            const monthCol = document.createElement('div');
            const curMonth = d.getMonth();
            if (curMonth !== lastMonth) {
                monthCol.textContent = months[curMonth];
                lastMonth = curMonth;
            }
            monthRow.appendChild(monthCol);
        }
    }
}

let ytWpmChart = null;
let ytDistChart = null;

function renderYTCharts(history) {
    const ctxWpm = document.getElementById('yt-wpm-chart').getContext('2d');
    const ctxDist = document.getElementById('yt-dist-chart').getContext('2d');

    if (ytWpmChart) ytWpmChart.destroy();
    if (ytDistChart) ytDistChart.destroy();

    const last30 = history.slice(-30);
    const wpmLabels = last30.map((_, i) => i + 1);
    const wpmData = last30.map(h => h.wpm);
    const accData = last30.map(h => h.acc);

    const mainColor = getThemeColor('--accent');
    const subColor = getThemeColor('--subtext');

    ytWpmChart = new Chart(ctxWpm, {
        type: 'line',
        data: {
            labels: wpmLabels,
            datasets: [
                {
                    label: 'WPM',
                    data: wpmData,
                    borderColor: mainColor,
                    backgroundColor: mainColor + '22',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Accuracy',
                    data: accData,
                    borderColor: getThemeColor('--correct'),
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { position: 'left', grid: { color: subColor + '22' } },
                y1: { position: 'right', min: 0, max: 100, display: false }
            }
        }
    });

    const bins = {};
    history.forEach(h => {
        const bin = Math.floor(h.wpm / 10) * 10;
        const label = `${bin}-${bin + 9}`;
        bins[label] = (bins[label] || 0) + 1;
    });
    const distLabels = Object.keys(bins).sort((a, b) => parseInt(a) - parseInt(b));
    const distData = distLabels.map(l => bins[l]);

    ytDistChart = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: distLabels,
            datasets: [{
                data: distData,
                backgroundColor: mainColor + '88',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: subColor + '22' } },
                x: { grid: { display: false } }
            }
        }
    });
}



function updateAddBtnState() {
    const btn = document.getElementById('add-btn');
    const manualBtn = document.getElementById('manual-add-btn');
    const disabled = activeTasksCount >= YT_MAX_TASKS;

    if (btn) {
        btn.classList.toggle('disabled', disabled);
        btn.style.opacity = disabled ? '0.5' : '1';
        btn.style.pointerEvents = disabled ? 'none' : 'auto';
    }
    
    if (manualBtn) {
        manualBtn.classList.toggle('disabled', disabled);
        manualBtn.style.opacity = disabled ? '0.5' : '1';
        manualBtn.style.pointerEvents = disabled ? 'none' : 'auto';
    }
}



function getDefaultSystemPrompt() {
    return `তুমি একজন বাংলা সাহিত্যিক সম্পাদক। তোমাকে একটি YouTube ভিডিওর বাংলা ট্রান্সক্রিপ্ট দেওয়া হবে। ট্রান্সক্রিপ্টটি Python দিয়ে আগে থেকেই ছোট ছোট Page-এ ভাগ করা হয়েছে (প্রতিটি ~৪২৫ শব্দ)। প্রতিটি Page-এর ভেতরে বাক্যগুলো S1, S2, S3... দিয়ে চিহ্নিত।

তোমার কাজ পাঁচটি — নিচের অগ্রাধিকার অনুযায়ী:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ১ — পুরো ফিলার Page বাদ দাও (সর্বোচ্চ অগ্রাধিকার):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
যে Page-এ মূলত এইসব আছে সেটা REMOVE করো:
- লাইক/সাবস্ক্রাইব/বেল আইকন/কমেন্ট করার আবেদন
- চ্যানেল বা সোশ্যাল মিডিয়া প্রচার
- স্পনসর বা পণ্যের বিজ্ঞাপন
- Intro/Outro ফিলার ("আজকের ভিডিওতে স্বাগতম", "আজকের মতো এখানেই শেষ")

মূল গল্প, নাটক, বা শিক্ষামূলক বিষয়বস্তু কখনো REMOVE করবে না।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ২ — মিশ্র বাক্য থেকে ফিলার অংশ বাদ দাও (STRIP_SENT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
যদি কোনো বাক্যে একই সাথে আসল বিষয়বস্তু এবং ফিলার (সাবস্ক্রাইব/স্পনসর ইত্যাদি) মিশে থাকে,
তাহলে সেই বাক্যটিকে REMOVE করো না — শুধু ফিলার অংশ বাদ দিয়ে পরিষ্কার বাক্যটি লিখে দাও।

ফরম্যাট:
STRIP_SENT P[page] S[sentence] [পরিষ্কার বাক্যটি এখানে]

উদাহরণ:
মূল বাক্য S3: "রাজা বললেন আমাদের এগিয়ে যেতে হবে আর হ্যাঁ চ্যানেলটি সাবস্ক্রাইব করতে ভুলো না।"
সঠিক আউটপুট: STRIP_SENT P2 S3 রাজা বললেন আমাদের এগিয়ে যেতে হবে।

নিয়ম:
- পরিষ্কার বাক্যটি সরাসরি লিখবে — কোনো কোটেশন মার্ক বা অতিরিক্ত চিহ্ন নেই।
- বাক্যের শেষে মূল বিরামচিহ্ন (। বা ? বা !) রাখবে।
- যদি পুরো বাক্যটাই ফিলার হয় তাহলে STRIP_SENT নয়, পরিবর্তে REMOVE_SENT ব্যবহার করো।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ২b — একটি পুরো বাক্য বাদ দাও (REMOVE_SENT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
যদি একটি নির্দিষ্ট বাক্য সম্পূর্ণ ফিলার কিন্তু বাকি Page ঠিক আছে:
REMOVE_SENT P[page] S[sentence]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ৩ — প্রয়োজনে পাশাপাশি Page MERGE করো:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
যদি দুটো পাশাপাশি Page একই দৃশ্য বা চিন্তার মাঝখানে ভেঙে গেছে, তাহলে MERGE করো।
অতিরিক্ত MERGE করবে না — শুধু যেখানে সত্যিই দরকার।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ৪ — Part বিভাজন করো:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
একটি Part শেষ হবে শুধুমাত্র যেখানে গল্পে একটি স্বাভাবিক ও সম্পূর্ণ ছেদ আছে:
  - একটি দৃশ্য বা ঘটনার পরিসমাপ্তি
  - একটি বিষয়ের আলোচনা শেষ হয়ে নতুন বিষয় শুরু
  - একটি সংলাপ বিনিময় সম্পূর্ণ হওয়ার পরে
  - একটি চিন্তা বা যুক্তির পূর্ণ সমাপ্তি

নিষিদ্ধ: বাক্যের মাঝখানে বা প্রশ্নের ঠিক পরে Part শেষ করা।

শব্দ সীমা (narrative logic সবসময় আগে):
  প্রতিটি Part: ~৫টি Page (১৫০০–৩০০০ শব্দ)। কোনো Part ৭টি Page-এর বেশি নয়।
  ভালো ছেদ না পেলে ৬টি Page পর্যন্ত অপেক্ষা করো।

PART_BREAK মানে: এই Page-এর পরে নতুন Part শুরু হবে।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কাজ ৫ — Page-এর ভেতরে Newline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
প্রতিটি Page-এর ভেতরে যেখানে স্বাভাবিক অনুচ্ছেদ বিরতি হওয়া উচিত সেখানে NEWLINE দাও।
কখন NEWLINE দেবে: বক্তা বদলানোর পরে, দৃশ্য বা মেজাজ বদলালে, নতুন বিষয় শুরু হলে।
কখন দেবে না: শুধু কয়েকটি বাক্য পার হলেই নয়।

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
আউটপুট ফরম্যাট (শুধুমাত্র এই ফরম্যাটে — কোনো ব্যাখ্যা নেই):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMOVE P[নম্বর]
REMOVE_SENT P[নম্বর] S[নম্বর]
STRIP_SENT P[নম্বর] S[নম্বর] [পরিষ্কার বাক্য]
MERGE P[নম্বর] P[নম্বর]
PART_BREAK P[নম্বর]
NEWLINE P[নম্বর] S[নম্বর]

উদাহরণ (কাল্পনিক):
REMOVE P1
REMOVE_SENT P3 S5
STRIP_SENT P3 S7 রাজা বললেন আমাদের এগিয়ে যেতে হবে।
MERGE P4 P5
PART_BREAK P7
NEWLINE P2 S3
NEWLINE P2 S7
NEWLINE P6 S4
PART_BREAK P12
NEWLINE P9 S2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
কঠোর নিয়ম — প্রতিটি লাইন আউটপুট করার আগে নিজে যাচাই করো:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
১. REMOVE করা Page-এ PART_BREAK, NEWLINE, REMOVE_SENT বা STRIP_SENT দেবে না।
২. MERGE শুধু পাশাপাশি দুটো Page-এ (যেমন P3 P4) — তিনটি বা বেশি নয়।
৩. প্রথম Part-এর আগে PART_BREAK লাগবে না।
৪. STRIP_SENT-এ পরিষ্কার বাক্যটি সম্পূর্ণ ও অর্থপূর্ণ হতে হবে — ছেঁটে ফেললে বাক্যের মূল অর্থ থাকতে হবে।
৫. প্রতিটি লাইন উপরের ৬টি command-এর একটি দিয়ে শুরু হবে — অন্য কোনো লেখা নেই।
৬. সন্দেহ হলে REMOVE-এর চেয়ে STRIP_SENT বেছে নাও — আসল বিষয়বস্তু কখনো হারাবে না।`;
}

async function goBackToLibrary() {
    await fetchLibrary();
    showScreen('library');
}

async function goBackToDetail() {
    await fetchLibrary();
    if (currentVideoId) {
        openDetail(currentVideoId);
    }
}

async function fetchLibrary(forceRefresh = false) {
    try {
        const url = forceRefresh ? '/api/videos?force_refresh=true' : '/api/videos';
        const res = await fetch(url);
        ALL_VIDEOS = await res.json();
        renderLibrary();

        // Update the watchdog fingerprint to prevent redundant refresh
        const fRes = await fetch('/api/fingerprint');
        const fData = await fRes.json();
        lastFingerprint = fData.fingerprint;

        // Refresh the instant text so the very first load uses a YT passage instead of fallback
        if (ALL_VIDEOS && ALL_VIDEOS.length > 0) {
            loadNewText();
        }
    } catch (e) { console.error(e); }
}

let editThumbData = null;
let editThumbExt = null;

function editVideo(vid) {
    fetch(`/api/videos/${encodeURIComponent(vid)}/content`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error('Error loading video:', data.error);
                return;
            }

            document.getElementById('modal-edit-vid').value = vid;
            document.getElementById('modal-edit-channel').value = data.channel_dir;
            document.getElementById('modal-edit-base').value = data.base_name;
            document.getElementById('edit-content').value = data.content;

            // Set thumbnail preview
            const thumbPreview = document.getElementById('edit-thumb-preview');
            const thumbPlaceholder = document.getElementById('edit-thumb-placeholder');

            if (data.thumb_path) {
                thumbPreview.src = `/thumbs/${data.thumb_path.split('/').map(encodeURIComponent).join('/')}`;
                thumbPreview.style.display = 'block';
                thumbPlaceholder.style.display = 'none';
            } else {
                thumbPreview.style.display = 'none';
                thumbPlaceholder.style.display = 'flex';
            }

            // Reset stored thumbnail data
            editThumbData = null;
            editThumbExt = null;

            document.getElementById('modal-edit-video').classList.add('open');
        })
        .catch(err => console.error('Error fetching video content:', err));
}

function handleEditThumbnailSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result.split(',')[1];
        editThumbData = base64;
        editThumbExt = '.' + file.name.split('.').pop().toLowerCase();

        // Preview the new thumbnail
        const thumbPreview = document.getElementById('edit-thumb-preview');
        const thumbPlaceholder = document.getElementById('edit-thumb-placeholder');
        thumbPreview.src = e.target.result;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function closeEditModal() {
    document.getElementById('modal-edit-video').classList.remove('open');
    document.getElementById('modal-edit-vid').value = '';
    document.getElementById('modal-edit-channel').value = '';
    document.getElementById('modal-edit-base').value = '';
    document.getElementById('edit-content').value = '';
    editThumbData = null;
    editThumbExt = null;
}

async function saveEditedVideo() {
    const vid = document.getElementById('modal-edit-vid').value;
    const content = document.getElementById('edit-content').value;

    if (!vid || !content) {
        console.error('Missing video ID or content');
        return;
    }

    const body = {
        content: content
    };

    if (editThumbData && editThumbExt) {
        body.thumbnail_base64 = editThumbData;
        body.thumbnail_ext = editThumbExt;
    }

    try {
        const res = await fetch(`/api/videos/${encodeURIComponent(vid)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            closeEditModal();
            await fetchLibrary();
        } else {
            console.error('Failed to save video');
        }
    } catch (e) {
        console.error('Error saving video:', e);
    }
}

// Manual Add Logic
let manualThumbData = null;
let manualThumbExt = null;

window.openManualAddModal = function() {
    console.log("Opening manual add modal...");
    const template = `==!!Meta Data!!==
Title: [শিরোনাম]
Channel: [বিভাগ/বইয়ের নাম]
Source: Manual
URL: 
Upload Date: ${new Date().toLocaleDateString()}
==!!Meta Data!!==

==**অধ্যায় ১**==
==%%পাতা ১%%==
এখানে আপনার কন্টেন্ট পেস্ট করুন...
==%%পাতা ১%%==
==**অধ্যায় ১**==`;

    const contentArea = document.getElementById('manual-content');
    if (contentArea) {
        contentArea.value = template;
    }
    
    // Reset thumbnail preview
    const thumbPreview = document.getElementById('manual-thumb-preview');
    const thumbPlaceholder = document.getElementById('manual-thumb-placeholder');
    if (thumbPreview) thumbPreview.style.display = 'none';
    if (thumbPlaceholder) thumbPlaceholder.style.display = 'flex';
    
    manualThumbData = null;
    manualThumbExt = null;

    const modal = document.getElementById('modal-manual-add');
    if (modal) {
        modal.classList.add('open');
    } else {
        console.error("Could not find modal-manual-add element");
    }
}

function handleManualThumbnailSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result.split(',')[1];
        manualThumbData = base64;
        manualThumbExt = '.' + file.name.split('.').pop().toLowerCase();

        const thumbPreview = document.getElementById('manual-thumb-preview');
        const thumbPlaceholder = document.getElementById('manual-thumb-placeholder');
        if (thumbPreview) {
            thumbPreview.src = e.target.result;
            thumbPreview.style.display = 'block';
        }
        if (thumbPlaceholder) thumbPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

window.closeManualAddModal = function() {
    const modal = document.getElementById('modal-manual-add');
    if (modal) {
        modal.classList.remove('open');
    }
}

window.saveManualVideo = async function() {
    const contentArea = document.getElementById('manual-content');
    if (!contentArea) return;
    const content = contentArea.value;
    if (!content) return;

    const saveBtn = document.getElementById('manual-save-btn');
    if (!saveBtn) return;
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'সেভ হচ্ছে...';

    const body = {
        content: content,
        thumbnail_base64: manualThumbData,
        thumbnail_ext: manualThumbExt
    };

    try {
        const res = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            window.closeManualAddModal();
            await fetchLibrary();
        } else {
            const data = await res.json();
            alert('Error: ' + (data.error || 'Failed to save content'));
        }
    } catch (e) {
        console.error('Error saving manual video:', e);
        alert('Error saving content');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function deleteVideo(vid) {
    document.getElementById('modal-delete-vid').value = vid;
    document.getElementById('modal-delete-video').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('modal-delete-video').classList.remove('open');
    document.getElementById('modal-delete-vid').value = '';
}

async function confirmDeleteVideo() {
    const vid = document.getElementById('modal-delete-vid').value;
    if (!vid) return;

    closeDeleteModal();

    try {
        const res = await fetch(`/api/videos/${encodeURIComponent(vid)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            await fetchLibrary();
        } else {
            console.error('Failed to delete video');
        }
    } catch (e) {
        console.error('Error deleting video:', e);
    }
}

function handleYTSearch() {
    const input = document.getElementById('yt-library-search');
    if (!input) return;
    const query = input.value.trim().toLowerCase();
    
    if (!query) {
        renderLibrary();
        return;
    }

    const filtered = ALL_VIDEOS.filter(v => matchesQuery(v, query));
    renderLibrary(filtered);
}

function matchesQuery(v, query) {
    // 1. Split by & (AND)
    const andParts = query.split('&').map(p => p.trim());
    return andParts.every(part => {
        if (!part) return true;
        // 2. Handle ~ (NOT) within each AND part
        const notParts = part.split('~').map(p => p.trim());
        const primaryPart = notParts[0];
        const exceptParts = notParts.slice(1);

        // Check if it matches the primary part (OR within primary)
        const orParts = primaryPart.split('|').map(p => p.trim());
        const matchesPrimary = orParts.some(op => matchesField(v, op));

        if (!matchesPrimary) return false;

        // Check if it matches any except parts
        const matchesExcept = exceptParts.some(ep => matchesField(v, ep));
        return !matchesExcept;
    });
}

function matchesField(v, part) {
    if (!part) return false;
    
    if (part.includes(':')) {
        const [field, val] = part.split(':').map(s => s.trim());
        if (!val) return false;
        
        if (field === 'title' || field === 't') return v.title.toLowerCase().includes(val);
        if (field === 'channel' || field === 'ch' || field === 'c') return (v.channel || '').toLowerCase().includes(val);
        if (field === 'source' || field === 'src' || field === 's') return (v.source || '').toLowerCase().includes(val);
        
        // Fallback to searching everything if field not recognized
        return v.title.toLowerCase().includes(part) || 
               (v.channel || '').toLowerCase().includes(part) || 
               (v.source || '').toLowerCase().includes(part);
    }
    
    // Default: search title, channel, and source
    return v.title.toLowerCase().includes(part) || 
           (v.channel || '').toLowerCase().includes(part) || 
           (v.source || '').toLowerCase().includes(part);
}

function renderLibrary(filteredVideos = null) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';

    const videosToShow = filteredVideos || ALL_VIDEOS;

    if (videosToShow.length === 0) {
        const msg = filteredVideos 
            ? 'সার্চের সাথে মিলে এমন কোনো ভিডিও পাওয়া যায়নি।' 
            : 'আপনার সংগ্রহে কোনো ভিডিও নেই। "YouTube লিংক যোগ করুন" এ ক্লিক করে ভিডিও যোগ করুন।';
        grid.innerHTML = `<div style="color:var(--subtext); padding: 1rem;">${msg}</div>`;
        return;
    }

    videosToShow.forEach(v => {
        const total = v.parts ? v.parts.length : 0;
        const done = v.progress || 0;
        const pct = total ? Math.round(done / total * 100) : 0;

        let encodedPath = v.thumb_path ? v.thumb_path.split('/').map(encodeURIComponent).join('/') : '';
        let thumbHtml = encodedPath
            ? `<img class="video-thumb" src="/thumbs/${encodedPath}" loading="lazy" alt="Thumb" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="video-thumb-placeholder" style="display:none">▶</div>`
            : `<div class="video-thumb-placeholder">▶</div>`;

        const channelDisplay = v.source === 'YouTube' ? `<div class="video-channel">${v.channel}</div>` : '';
        const totalWordsBn = toBn((v.total_words || 0).toLocaleString('en-US'));
        const totalCharsBn = toBn((v.total_chars || 0).toLocaleString('en-US'));

        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = (e) => {
            if (e.target.closest('.video-card-btn')) return;
            openDetail(v.id);
        };
        card.innerHTML = `
      ${thumbHtml}
      <div class="video-info">
        <div>
          <div class="video-title">${v.title}</div>
          ${channelDisplay}
        </div>
        <div class="video-meta-row">
          <span class="video-parts">${totalWordsBn} শব্দ | ${totalCharsBn} অক্ষর</span>
        </div>
      </div>
      <div class="video-card-actions">
        <button class="video-card-btn edit" title="Edit" onclick="editVideo('${v.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="video-card-btn delete" title="Delete" onclick="deleteVideo('${v.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>`;
        grid.appendChild(card);
    });
}

function openDetail(vid) {
    const v = ALL_VIDEOS.find(x => x.id === vid);
    if (!v) return;
    currentVideoId = vid;
    ytSessionResults = []; // Reset session for a new direct detail-start

    let shortTitle = v.title.slice(0, 30) + (v.title.length > 30 ? '…' : '');
    document.getElementById('detail-breadcrumb').textContent = shortTitle;
    document.getElementById('detail-title').textContent = v.title;

    if (v.source === 'YouTube') {
        document.getElementById('detail-channel').textContent = v.channel;
        document.getElementById('detail-channel').style.display = 'block';
    } else {
        document.getElementById('detail-channel').style.display = 'none';
    }

    let totalPages = 0;
    v.parts.forEach(p => totalPages += (p.pages ? p.pages.length : 0));

    document.getElementById('detail-parts-count').textContent = toBn(v.parts.length);
    document.getElementById('detail-pages-count').textContent = toBn(totalPages);
    document.getElementById('detail-words').textContent = toBn((v.total_words || 0).toLocaleString('en-US'));
    document.getElementById('detail-chars').textContent = toBn((v.total_chars || 0).toLocaleString('en-US'));

    // Video-level stats now come from server (proper cumulative Net WPM calculation)
    const curWpm = v.cur_wpm;
    const curAcc = v.cur_acc;
    const lastWpm = v.last_wpm;
    const lastAcc = v.last_acc;
    const bestWpm = v.best_wpm;
    const bestAcc = v.best_acc;

    document.getElementById('detail-avg-wpm').innerHTML = `
                <div style="display:flex; flex-wrap:nowrap; gap:6px; margin-top:8px; font-size:0.8rem; font-family:'JetBrains Mono',monospace;">
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--accent); border:1px solid rgba(137,180,250,0.2); white-space:nowrap;" title="Current Session WPM"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">CUR</span>${curWpm !== null ? toBn(curWpm) : '-'}</div>
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--subtext); border:1px solid var(--border); white-space:nowrap;" title="Last Completed Session WPM"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">LST</span>${lastWpm !== null ? toBn(lastWpm) : '-'}</div>
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--correct); border:1px solid rgba(166,227,161,0.2); white-space:nowrap;" title="All-Time Best WPM"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">BST</span>${bestWpm !== null ? toBn(bestWpm) : '-'}</div>
                </div>
            `;
    document.getElementById('detail-avg-acc').innerHTML = `
                <div style="display:flex; flex-wrap:nowrap; gap:6px; margin-top:8px; font-size:0.8rem; font-family:'JetBrains Mono',monospace;">
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--accent); border:1px solid rgba(137,180,250,0.2); white-space:nowrap;" title="Current Session Accuracy"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">CUR</span>${curAcc !== null ? toBn(curAcc) + '%' : '-'}</div>
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--subtext); border:1px solid var(--border); white-space:nowrap;" title="Last Completed Session Accuracy"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">LST</span>${lastAcc !== null ? toBn(lastAcc) + '%' : '-'}</div>
                    <div style="background:var(--surface2); padding:2px 6px; border-radius:4px; color:var(--correct); border:1px solid rgba(166,227,161,0.2); white-space:nowrap;" title="All-Time Best Accuracy"><span style="opacity:0.6;font-size:0.65rem;margin-right:3px">BST</span>${bestAcc !== null ? toBn(bestAcc) + '%' : '-'}</div>
                </div>
            `;

    const thumbContainer = document.getElementById('detail-thumb-container');
    if (v.thumb_path) {
        let encodedPath = v.thumb_path.split('/').map(encodeURIComponent).join('/');
        thumbContainer.innerHTML = `<img class="detail-thumb" src="/thumbs/${encodedPath}" loading="lazy" alt="Thumb" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="detail-thumb-placeholder" style="display:none">▶</div>`;
    } else {
        thumbContainer.innerHTML = `<div class="detail-thumb-placeholder">▶</div>`;
    }

    // ADD RESET BUTTON
    const actionArea = document.querySelector('.detail-actions');
    if (actionArea && !document.getElementById('btn-reset-book')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'btn-reset-book';
        resetBtn.className = 'detail-btn secondary';
        resetBtn.style.background = 'rgba(243, 139, 168, 0.1)';
        resetBtn.style.color = getThemeColor('--wrong');
        resetBtn.innerHTML = 'আবার শুরু করুন (Reset)';
        resetBtn.onclick = () => resetBook(v.id);
        actionArea.appendChild(resetBtn);
    }

    const savedStateStr = localStorage.getItem(`yt_active_state_${v.id}`);
    let savedPart = -1;
    let savedPage = 0;
    if (savedStateStr) {
        try {
            let st = JSON.parse(savedStateStr);
            savedPart = st.part;
            savedPage = st.page;
        } catch (e) { }
    }

    let completedWords = 0;
    const isVideoCompleted = v.last_wpm !== null;

    // Check if there's ANY current session progress
    const hasCurrentProgress = v.parts.some(p => (p.cur_pages_completed || 0) > 0 || p.cur_wpm !== null);

    if (hasCurrentProgress) {
        // Active session exists - show progress based on current session only
        v.parts.forEach((p) => {
            if (p.cur_wpm !== null) {
                // Part fully completed in current session
                completedWords += (p.cur_words || 0);
            } else if ((p.cur_pages_completed || 0) > 0) {
                // Part partially completed - estimate based on pages
                const totalPages = p.total_pages || (p.pages ? p.pages.length : 1);
                const pagesCompleted = p.cur_pages_completed || 0;
                const partWords = p.pages ? p.pages.reduce((sum, pg) => sum + (pg.content || '').split(/\s+/).length, 0) : 0;
                completedWords += Math.floor(partWords * (pagesCompleted / totalPages));
            }
        });
    } else if (isVideoCompleted) {
        // No current session but video was completed before - show 100%
        completedWords = v.total_words;
    }

    const pct = v.total_words > 0 ? Math.floor((completedWords / v.total_words) * 100) : 0;
    document.getElementById('detail-progress-fill').style.width = pct + '%';
    document.getElementById('detail-progress-label').textContent = toBn(pct) + '% Complete';

    const list = document.getElementById('parts-list');
    list.innerHTML = '';
    v.parts.forEach((p, i) => {
        // Determine part status using pages_completed
        const totalPages = p.total_pages || (p.pages ? p.pages.length : 1);
        const pagesCompleted = p.cur_pages_completed || 0;
        const hasBest = p.wpm !== null && p.wpm !== undefined;
        const hasLast = p.last_wpm !== null && p.last_wpm !== undefined;
        const isVideoCompleted = v.last_wpm !== null; // Video has a previous completion

        // Part is complete in current session only if ALL pages are done
        const isPartCompleteInCurrentSession = pagesCompleted >= totalPages && p.cur_wpm !== null;
        // Part is in progress if some pages done but not all
        const isInProgress = pagesCompleted > 0 && pagesCompleted < totalPages;
        const hasAnyProgress = pagesCompleted > 0 || p.cur_wpm !== null;

        let itemClass = 'part-item';
        let itemStyle = '';
        let doneMark = '';
        let statusIndicator = '';

        if (isVideoCompleted) {
            // Video fully completed - neutral styling, show data
            itemClass += ' history-done';
        } else if (isPartCompleteInCurrentSession) {
            // Part completed in current session - GREEN
            itemClass += ' done';
            doneMark = '<span class="part-done-icon">✓</span>';
            statusIndicator = '<span style="margin-left:6px; font-size:0.6rem; background:rgba(166,227,161,0.2); color:#a6e3a1; padding:1px 5px; border-radius:3px;">সম্পন্ন</span>';
        } else if (isInProgress) {
            // Part started but not complete - CYAN
            itemClass += ' in-progress';
            itemStyle = 'border-left: 4px solid #89b4fa; background: rgba(137, 180, 250, 0.08);';
            statusIndicator = `<span style="margin-left:6px; font-size:0.6rem; background:rgba(137,180,250,0.2); color:#89b4fa; padding:1px 5px; border-radius:3px;">${toBn(pagesCompleted)}/${toBn(totalPages)}</span>`;
        } else if (hasBest || hasLast) {
            // Part has history from previous sessions but not current
            itemClass += ' history-done';
        }

        let pagesCount = p.pages ? p.pages.length : 0;
        let labelBn = toBn(p.label.replace('Part', 'অধ্যায়'));

        // Reset button: Show when part has ANY progress (partial or complete)
        // Hide when video is fully completed (isVideoCompleted)
        let resetBtnHtml = '';
        if (!isVideoCompleted && hasAnyProgress) {
            resetBtnHtml = `<button class="part-reset-btn btn" style="padding: 2px 8px; font-size: 0.7rem; background: rgba(243, 139, 168, 0.1); color: #f38ba8; border: 1px solid rgba(243,139,168,0.2); white-space:nowrap; margin-left:auto; height: 24px; display:inline-flex; align-items:center;" title="এই অংশ রিসেট করুন">↺</button>`;
        }

        // Show Current vs Last vs Best for part
        let statsHtml = `
                    <div class="part-stats-row" style="display:flex; flex-wrap:nowrap; gap:6px; align-items:center; font-family:'JetBrains Mono',monospace;">
                        <div style="background:rgba(137,180,250,0.1); padding:2px 6px; border-radius:4px; font-size:0.75rem; color:#89b4fa; border:1px solid rgba(137,180,250,0.3); white-space:nowrap;" title="Current Session WPM">
                            <span style="opacity:0.7;font-size:0.65rem;margin-right:3px">CUR</span>${p.cur_wpm !== null && p.cur_wpm !== undefined ? toBn(p.cur_wpm) + ' | ' + toBn(p.cur_acc) + '%' : '-'}
                        </div>
                        <div style="background:rgba(249,226,175,0.1); padding:2px 6px; border-radius:4px; font-size:0.75rem; color:#f9e2af; border:1px solid rgba(249,226,175,0.3); white-space:nowrap;" title="Last Completed Session WPM">
                            <span style="opacity:0.7;font-size:0.65rem;margin-right:3px">PRV</span>${p.last_wpm !== null && p.last_wpm !== undefined ? toBn(p.last_wpm) + ' | ' + toBn(p.last_acc) + '%' : '-'}
                        </div>
                        <div style="background:rgba(166,227,161,0.1); padding:2px 6px; border-radius:4px; font-size:0.75rem; color:#a6e3a1; border:1px solid rgba(166,227,161,0.3); white-space:nowrap;" title="All-Time Best Session WPM">
                            <span style="opacity:0.7;font-size:0.65rem;margin-right:3px">BST</span>${p.wpm !== null && p.wpm !== undefined ? toBn(p.wpm) + ' | ' + toBn(p.acc) + '%' : '-'}
                        </div>
                        <div style="text-align:right; font-size:0.8rem; color:var(--subtext); white-space:nowrap; margin-left:10px;">${toBn(pagesCount)} পাতা</div>
                    </div>
                `;

        const item = document.createElement('div');
        item.className = itemClass;
        if (itemStyle) item.style.cssText = itemStyle;
        item.innerHTML = `
                    <div style="display:flex; align-items:center; width:100%; gap: 10px;">
                        <div class="part-name" style="display:flex; align-items:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${doneMark}
                            ${labelBn}
                            ${statusIndicator}
                        </div>
                        <div style="flex:1;"></div>
                        ${statsHtml}
                        ${resetBtnHtml}
                    </div>
                `;
        item.onclick = (e) => {
            if (e.target.closest('.part-reset-btn')) {
                e.stopPropagation();
                resetPart(v.id, i);
                return;
            }
            openConsole(vid, i);
        };
        list.appendChild(item);
    });

    showScreen('detail');
}

function openConsole(vid, partIdx) {
    const v = ALL_VIDEOS.find(x => x.id === vid);
    if (!v) return;
    currentVideoId = vid;
    currentPartIdx = partIdx;

    const saved = localStorage.getItem(`yt_active_state_${vid}`);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            // Match the exact part, otherwise start from page 0
            if (state.part === partIdx) {
                currentPageIdx = state.page || 0;
            } else {
                currentPageIdx = 0;
            }
        } catch (e) { currentPageIdx = 0; }
    } else {
        currentPageIdx = 0;
    }

    document.getElementById('console-bc-video').textContent = v.title.slice(0, 30) + '…';

    loadPage();
    showScreen('console');
}

// ── State Persistence to Database (Portable) ──
let pageStateSaveTimeout = null;

function savePageStateToApi() {
    if (!currentVideoId) return;
    const correctnessJson = JSON.stringify(ytTypedCorrectness);
    fetch(`/api/videos/${encodeURIComponent(currentVideoId)}/page_state/${currentPartIdx}/${currentPageIdx}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            current_index: ytCurrentIndex,
            correctness_json: correctnessJson,
            completed_words: ytTypingState.completedWords || 0,
            time_spent_ms: ytTypingState.timeSpentMs || 0,
            keys_total: ytKeystrokes.total || 0,
            keys_correct: ytKeystrokes.correct || 0,
            keys_wrong: ytKeystrokes.wrong || 0,
            mistakes: ytKeystrokes.mistakes || 0,
            page_chars_correct: ytPageChars.correct || 0,
            page_chars_wrong: ytPageChars.wrong || 0,
            page_keystrokes_total: ytPageKeystrokes.total || 0,
            page_keystrokes_correct: ytPageKeystrokes.correct || 0,
            page_keystrokes_wrong: ytPageKeystrokes.wrong || 0
        })
    }).catch(e => console.error('Failed to save page state:', e));
}

function debouncedSavePageState() {
    if (pageStateSaveTimeout) clearTimeout(pageStateSaveTimeout);
    pageStateSaveTimeout = setTimeout(savePageStateToApi, 3000);
}

function saveCurrentPageStateImmediate() {
    if (pageStateSaveTimeout) clearTimeout(pageStateSaveTimeout);
    savePageStateToApi();
}

async function loadPageStateFromApi() {
    if (!currentVideoId) return null;
    try {
        const res = await fetch(`/api/videos/${encodeURIComponent(currentVideoId)}/page_state/${currentPartIdx}/${currentPageIdx}`);
        const data = await res.json();
        if (data.found) {
            return {
                currentIndex: data.current_index,
                correctness: JSON.parse(data.correctness_json || '[]'),
                completedWords: data.completed_words,
                timeSpentMs: data.time_spent_ms,
                keysTotal: data.keys_total,
                keysCorrect: data.keys_correct,
                keysWrong: data.keys_wrong,
                mistakes: data.mistakes,
                pageCharsCorrect: data.page_chars_correct || 0,
                pageCharsWrong: data.page_chars_wrong || 0,
                pageKeystrokesTotal: data.page_keystrokes_total || 0,
                pageKeystrokesCorrect: data.page_keystrokes_correct || 0,
                pageKeystrokesWrong: data.page_keystrokes_wrong || 0
            };
        }
    } catch (e) {
        console.error('Failed to load page state:', e);
    }
    return null;
}

// ── Local Storage for Position Only ──
function saveYTState() {
    if (!currentVideoId) return;
    const state = {
        vid: currentVideoId,
        part: currentPartIdx,
        page: currentPageIdx,
        idx: ytCurrentIndex,
        correctness: ytTypedCorrectness,
        correct: ytTypingState.correct,
        wrong: ytTypingState.wrong,
        completedWords: ytTypingState.completedWords,
        timeSpentMs: ytTypingState.timeSpentMs,
        keysTotal: ytKeystrokes.total,
        keysCorrect: ytKeystrokes.correct,
        keysWrong: ytKeystrokes.wrong,
        mistakes: ytKeystrokes.mistakes || 0,
        completedMistakes: ytTypingState.completedMistakes || 0
    };
    localStorage.setItem(`yt_active_state_${currentVideoId}`, JSON.stringify(state));
    debouncedSavePageState();
}

async function restoreYTState() {
    const saved = localStorage.getItem(`yt_active_state_${currentVideoId}`);
    if (saved) {
        const state = JSON.parse(saved);
        if (state.part === currentPartIdx && state.page === currentPageIdx) {
            ytCurrentIndex = state.idx || 0;
            ytTypedCorrectness = state.correctness || [];
            ytTypingState.correct = state.correct || 0;
            ytTypingState.wrong = state.wrong || 0;
            ytTypingState.completedWords = state.completedWords || 0;
            ytTypingState.timeSpentMs = state.timeSpentMs || 0;
            ytTypingState.startTime = null;
            ytTypingState.lastStartTime = null;
            ytTypingState.lastKeystrokeTime = null;
            ytTypingState.isPaused = false;
            ytKeystrokes = {
                total: state.keysTotal || 0,
                correct: state.keysCorrect || 0,
                wrong: state.keysWrong || 0,
                mistakes: state.mistakes || 0
            };
            ytTypingState.completedMistakes = state.completedMistakes || 0;
            return true;
        }
    }
    return false;
}

function showYTPausedIndicator(show) {
    let ind = document.getElementById('yt-paused-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.id = 'yt-paused-indicator';
        ind.style.position = 'absolute';
        ind.style.top = '10px';
        ind.style.right = '10px';
        ind.style.background = 'var(--text-wrong)';
        ind.style.color = '#fff';
        ind.style.padding = '4px 8px';
        ind.style.borderRadius = '4px';
        ind.style.fontSize = '0.8rem';
        ind.style.fontWeight = 'bold';
        ind.style.zIndex = '10';
        ind.textContent = 'PAUSED';
        const area = document.querySelector('.yt-typing-area');
        if (area) area.appendChild(ind);
    }
    if (ind) ind.style.display = show ? 'block' : 'none';
}

async function loadPage() {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v || !v.parts || !v.parts[currentPartIdx]) return;

    const part = v.parts[currentPartIdx];
    if (!part.pages || part.pages.length === 0) {
        part.pages = [{ label: 'Page 1', content: part.content || '' }];
    }
    const page = part.pages[currentPageIdx];

    let partLabelBn = toBn(part.label.replace('Part', 'অধ্যায়'));
    document.getElementById('console-bc-part').textContent = partLabelBn;
    document.getElementById('console-part-label').textContent = `${partLabelBn}`;
    document.getElementById('stat-pos').textContent = `পাতা ${toBn(currentPageIdx + 1)}/${toBn(part.pages.length)}`;

    const result = generateSequence(page.content);
    ytSequence = result.seq;
    ytNText = result.nText;

    // Load page state from API (portable storage) - this is the source of truth
    const apiState = await loadPageStateFromApi();
    
    // Check if there's any saved progress (cursor position OR keystrokes OR chars)
    const hasProgress = apiState && (
        apiState.currentIndex > 0 ||
        apiState.pageKeystrokesTotal > 0 ||
        apiState.pageCharsCorrect > 0 ||
        apiState.pageCharsWrong > 0
    );
    
    if (hasProgress) {
        // Restore from API
        ytCurrentIndex = apiState.currentIndex || 0;
        ytTypedCorrectness = apiState.correctness || [];
        ytTypingState.completedWords = apiState.completedWords || 0;
        ytTypingState.timeSpentMs = apiState.timeSpentMs || 0;
        ytKeystrokes = {
            total: apiState.keysTotal || 0,
            correct: apiState.keysCorrect || 0,
            wrong: apiState.keysWrong || 0,
            mistakes: apiState.mistakes || 0
        };
        ytTypingState.correct = apiState.keysCorrect || 0;
        ytTypingState.wrong = apiState.keysWrong || 0;
        ytTypingState.startTime = null;
        ytTypingState.lastStartTime = null;
        ytTypingState.lastKeystrokeTime = null;
        ytTypingState.isPaused = false;
        
        // Restore page-specific stats
        ytPageChars = {
            correct: apiState.pageCharsCorrect || 0,
            wrong: apiState.pageCharsWrong || 0
        };
        ytPageKeystrokes = {
            total: apiState.pageKeystrokesTotal || 0,
            correct: apiState.pageKeystrokesCorrect || 0,
            wrong: apiState.pageKeystrokesWrong || 0
        };
        
        // Sync to localStorage for backup
        saveYTState();
        
        clearInterval(ytWpmInterval);
        updateYTWpm();
        renderYTTypingArea();
        updateYTStepGuide();
        showYTPausedIndicator(true);
    } else {
        // No saved progress - initialize fresh
        resetYTPageTyping();
    }

    // Update navigation UI
    updateNavigationUI();

    // Navigation visibility check if already complete upon load
    if (ytCurrentIndex >= ytSequence.length) {
        if (currentPageIdx + 1 < part.pages.length) {
            setTimeout(nextPage, 500);
        }
    }

    setTimeout(focusYTTyping, 100);
}

function resetYTPageTyping() {
    ytCurrentIndex = 0;
    ytTypedCorrectness = [];
    ytTypingState = { startTime: null, lastStartTime: null, timeSpentMs: 0, completedWords: 0, correct: 0, wrong: 0, completedMistakes: 0, lastKeystrokeTime: null };
    ytKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
    ytPageKeystrokes = { total: 0, correct: 0, wrong: 0 };
    ytPageChars = { correct: 0, wrong: 0 };

    clearInterval(ytWpmInterval);

    updateYTWpm(); // zero out
    renderYTTypingArea();
    updateYTStepGuide();
    focusYTTyping();
    saveYTState();
}

function resetYTTyping() {
    document.getElementById('modal-reset-page').classList.add('open');
}

function closeResetPageModal() {
    document.getElementById('modal-reset-page').classList.remove('open');
}

function confirmResetPage() {
    closeResetPageModal();
    
    // Delete page state from database
    if (currentVideoId) {
        fetch(`/api/videos/${encodeURIComponent(currentVideoId)}/page_state/${currentPartIdx}/${currentPageIdx}`, {
            method: 'DELETE'
        }).catch(e => console.error('Failed to delete page state:', e));
    }
    
    // Clear localStorage
    if (currentVideoId) {
        localStorage.removeItem(`yt_active_state_${currentVideoId}`);
    }
    
    // Reset all typing state
    ytCurrentIndex = 0;
    ytTypedCorrectness = [];
    ytTypingState = { startTime: null, lastStartTime: null, timeSpentMs: 0, completedWords: 0, correct: 0, wrong: 0, completedMistakes: 0, lastKeystrokeTime: null };
    ytKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
    ytPageKeystrokes = { total: 0, correct: 0, wrong: 0 };
    ytPageChars = { correct: 0, wrong: 0 };

    clearInterval(ytWpmInterval);

    updateYTWpm(); // zero out
    renderYTTypingArea();
    updateYTStepGuide();
    focusYTTyping();
    saveYTState();
}

function renderYTTypingArea() {
    const display = document.getElementById('yt-typed-display');
    display.innerHTML = '';
    const bounds = getClusterBoundaries(ytSequence);
    const displayClusters = getDisplayClusters(bounds, ytNText);

    let currentClusterIdx = -1;
    for (let ci = 0; ci < bounds.length; ci++) {
        const stepsInCluster = ytSequence.filter(s => s.clusterEnd === bounds[ci].end);
        if (stepsInCluster.length === 0) continue;
        const stepsBeforeThis = ytSequence.indexOf(stepsInCluster[0]);
        if (ytCurrentIndex >= stepsBeforeThis && ytCurrentIndex < stepsBeforeThis + stepsInCluster.length) {
            currentClusterIdx = ci;
            break;
        }
        if (ytCurrentIndex >= stepsBeforeThis + stepsInCluster.length) currentClusterIdx = ci + 1;
    }

    displayClusters.forEach(dc => {
        const span = document.createElement('span');
        span.textContent = dc.text;
        span.className = 'char';

        const indices = dc.clusterIndices;
        const minIdx = indices[0];
        const maxIdx = indices[indices.length - 1];

        if (maxIdx < currentClusterIdx) {
            const allCorrect = indices.every(ci => ytTypedCorrectness[ci] !== false);
            span.classList.add(allCorrect ? 'correct' : 'wrong');
        } else if (minIdx <= currentClusterIdx && currentClusterIdx <= maxIdx) {
            span.classList.add('current');
        }
        display.appendChild(span);
    });

    // Auto-scroll logic: ensures active cursor is comfortably in view
    const currentSpan = display.querySelector('.char.current');
    if (currentSpan) {
        const container = document.querySelector('.yt-typing-area');
        if (currentSpan.offsetTop + currentSpan.offsetHeight > container.scrollTop + container.clientHeight - 40 ||
            currentSpan.offsetTop < container.scrollTop + 40) {
            container.scrollTo({
                top: currentSpan.offsetTop - container.clientHeight / 2,
                behavior: 'smooth'
            });
        }
    }
}

function updateYTStepGuide() {
    if (ytCurrentIndex >= ytSequence.length) {
        document.getElementById('yt-step-bn').textContent = '✓';
        document.getElementById('yt-step-keys').innerHTML = '';
        document.getElementById('yt-step-context').textContent = 'সম্পন্ন!';
        highlightKeysForStep(null, 'yt-');
        return;
    }

    const step = ytSequence[ytCurrentIndex];
    if (!step) return;

    const clusterEnd = step.clusterEnd;
    const clusterBounds = getClusterBoundaries(ytSequence);
    const clusterBound = clusterBounds.find(b => b.end === clusterEnd);
    const clusterText = clusterBound ? ytNText.slice(clusterBound.start, clusterBound.end) : step.char;

    const stepsInCluster = ytSequence.filter(s => s.clusterEnd === clusterEnd);
    const stepIdxInCluster = stepsInCluster.indexOf(step);
    const totalStepsInCluster = stepsInCluster.length;

    // Handle newlines gracefully in step guide
    if (clusterText === '\n') {
        document.getElementById('yt-step-bn').innerHTML = '&crarr;'; // Enter symbol
    } else {
        document.getElementById('yt-step-bn').textContent = clusterText || step.char;
    }

    const keysDiv = document.getElementById('yt-step-keys');
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
        document.getElementById('yt-step-context').textContent = `ধাপ ${toBn(stepIdxInCluster + 1)} / ${toBn(totalStepsInCluster)} — এই অক্ষরের জন্য`;
    } else {
        document.getElementById('yt-step-context').textContent = '';
    }

    highlightKeysForStep(step.key, 'yt-');
}

// Click anywhere inside typing area focuses invisible input
document.querySelector('.yt-typing-area').addEventListener('click', () => {
    focusYTTyping();
});

function focusYTTyping() {
    document.getElementById('yt-console-input').focus();
}

document.getElementById('yt-console-input').addEventListener('keydown', e => {
    if (["Enter", "Tab", "Shift", "Control", "Alt", "CapsLock"].includes(e.key) && e.key !== 'Enter') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
        if (ytCurrentIndex === 0) return;
        ytCurrentIndex--;
        const prevStep = ytSequence[ytCurrentIndex];
        const ci = getClusterBoundaries(ytSequence).findIndex(b => b.end === prevStep.clusterEnd || b.end === prevStep.targetEnd);
        if (ci >= 0 && ytTypedCorrectness[ci] !== undefined) {
            if (ytTypedCorrectness[ci] === true) ytTypingState.correct--;
            else if (ytTypedCorrectness[ci] === false) ytTypingState.wrong--;
            ytTypedCorrectness[ci] = undefined;
        }
        renderYTTypingArea();
        updateYTStepGuide();
        updateYTWpm();
        saveYTState();
        return;
    }

    if (ytCurrentIndex >= ytSequence.length) return;

    ytTypingState.lastKeystrokeTime = Date.now();

    if (!ytTypingState.startTime) {
        ytTypingState.startTime = Date.now();
        ytTypingState.lastStartTime = Date.now();
        ytTypingState.isPaused = false;
        showYTPausedIndicator(false);

        let statsSyncTicks = 0;
        ytWpmInterval = setInterval(() => {
            const now = Date.now();
            if (now - ytTypingState.lastKeystrokeTime > 5000) {
                if (!ytTypingState.isPaused) {
                    ytTypingState.isPaused = true;
                    ytTypingState.timeSpentMs += (now - 5000 - ytTypingState.lastStartTime);
                    ytTypingState.lastStartTime = null;
                    showYTPausedIndicator(true);
                    updateYTWpm();
                    saveYTState();
                    syncCurrentStatsToServer(); // ensure paused state is synced
                }
            } else {
                if (ytTypingState.isPaused) {
                    ytTypingState.isPaused = false;
                    ytTypingState.lastStartTime = now;
                    showYTPausedIndicator(false);
                }
                updateYTWpm();
                saveYTState();

                // Sync to server every 5 seconds to avoid flooding
                statsSyncTicks++;
                if (statsSyncTicks >= 5) {
                    syncCurrentStatsToServer();
                    statsSyncTicks = 0;
                }
            }
        }, 1000);
    } else if (ytTypingState.isPaused) {
        ytTypingState.isPaused = false;
        ytTypingState.lastStartTime = Date.now();
        showYTPausedIndicator(false);
    }

    const step = ytSequence[ytCurrentIndex].key;
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

    const curStep = ytSequence[ytCurrentIndex];
    const isLastInCluster = curStep.targetEnd >= 0;

    if (matched) {
        ytKeystrokes.total++;
        ytKeystrokes.correct++;
        ytPageKeystrokes.total++;
        ytPageKeystrokes.correct++;
        if (isLastInCluster) {
            const ci = getClusterBoundaries(ytSequence).findIndex(b => b.end === curStep.targetEnd);
            if (ytTypedCorrectness[ci] === undefined) {
                ytTypedCorrectness[ci] = true;
                ytTypingState.correct++;
                ytPageChars.correct++;
            }
        }
        ytCurrentIndex++;
    } else {
        ytKeystrokes.total++;
        ytKeystrokes.wrong++;
        ytPageKeystrokes.total++;
        ytPageKeystrokes.wrong++;
        if (isLastInCluster) {
            const ci = getClusterBoundaries(ytSequence).findIndex(b => b.end === curStep.targetEnd);
            if (ytTypedCorrectness[ci] === undefined) {
                ytTypedCorrectness[ci] = false;
                ytTypingState.wrong++;
                ytPageChars.wrong++;
            }
            ytCurrentIndex++;
        } else {
            const ci = getClusterBoundaries(ytSequence).findIndex(b => b.end === curStep.clusterEnd);
            if (ytTypedCorrectness[ci] === undefined) {
                ytTypedCorrectness[ci] = false;
                ytTypingState.wrong++;
                ytPageChars.wrong++;
            }
            ytCurrentIndex++;
        }
    }

    renderYTTypingArea();
    updateYTStepGuide();
    updateYTWpm();
    saveYTState();

    if (ytCurrentIndex >= ytSequence.length) {
        clearInterval(ytWpmInterval);
        ytTypingState.timeSpentMs += (Date.now() - ytTypingState.lastStartTime);
        updateYTWpm();
        saveYTState();
        saveCurrentPageStateImmediate(); // Save page state before auto-advance
        syncCurrentStatsToServer(); // final sync for this page

        const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
        const part = v.parts[currentPartIdx];
        const totalPagesInPart = part.pages ? part.pages.length : 1;
        const hasNextPage = currentPageIdx + 1 < totalPagesInPart;
        const hasNextPart = currentPartIdx + 1 < v.parts.length;

        if (hasNextPage || hasNextPart) {
            setTimeout(nextPage, 500);
        } else {
            // Update progress and stats for the current part
            if (v && currentPartIdx >= v.progress) {
                v.progress = currentPartIdx + 1;
                fetch(`/api/videos/${encodeURIComponent(v.id)}/progress`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ progress: v.progress })
                });
            }

            const elapsed = ytTypingState.timeSpentMs;
            const words = ytTypingState.completedWords + getCompletedWords();
            const mins = elapsed / 60000;
            const mistakes = ytKeystrokes.mistakes || 0;
            /**
             * Final Part Stats Net WPM:
             * Net WPM = ((Total Keystrokes / 5) - Word-Level Mistakes) / Minutes
             * Sent to server for session aggregation and best score tracking.
             */
            const wpm = mins > 0 ? Math.max(0, Math.floor((ytKeystrokes.total / 5.0 - mistakes) / mins)) : 0;
            const acc = ytKeystrokes.total > 0 ? Math.floor(ytKeystrokes.correct / ytKeystrokes.total * 100) : 100;
            const isCompleted = (currentPartIdx + 1 >= v.parts.length);
            const totalPagesInPart = part.pages ? part.pages.length : 1;

            console.log(`Sending final stats for ${v.id}, Part ${currentPartIdx}: words=${words}`);

            // Send stats and get best status
            fetch(`/api/videos/${encodeURIComponent(v.id)}/parts/${currentPartIdx}/stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correct_words: words,
                    time_ms: Math.round(elapsed),
                    total_keys: ytKeystrokes.total,
                    correct_keys: ytKeystrokes.correct,
                    mistakes: ytKeystrokes.mistakes || 0,
                    pages_completed: totalPagesInPart,
                    is_completed: isCompleted
                })
            }).then(res => res.json().then(data => {
                console.log(`Stats response:`, data);
                if (activeYTScreen === 'yt-stats') renderYTStatsView();
                ytSessionResults.push({
                    partIdx: currentPartIdx,
                    words: words,
                    timeMs: elapsed,
                    keys: ytKeystrokes.total,
                    ckeys: ytKeystrokes.correct,
                    mistakes: ytKeystrokes.mistakes || 0,
                    wpm: wpm,
                    acc: acc
                });

                // Check if there is another part
                if (currentPartIdx + 1 < v.parts.length) {
                    setTimeout(() => {
                        currentPartIdx++;
                        currentPageIdx = 0;
                        loadPage();
                    }, 800);
                } else {
                    // All parts finished
                    showYTSummary(v);
                }
            }));
        }
    }
});

function getCompletedWords() {
    if (ytCurrentIndex === 0) return 0;
    const bounds = getClusterBoundaries(ytSequence);
    const end = Math.max(
        ytSequence[ytCurrentIndex - 1].targetEnd || 0,
        ytSequence[ytCurrentIndex - 1].clusterEnd || 0
    );
    const textTyped = ytNText.slice(0, end).trim();
    if (!textTyped) return 0;

    let correctWords = 0;
    let inWord = false;
    let wordIsCorrect = true;

    for (let i = 0; i < bounds.length; i++) {
        if (bounds[i].end > end) break;
        const clusterText = ytNText.slice(bounds[i].start, bounds[i].end);
        const isSpace = /\s/.test(clusterText) || clusterText === '\n';

        if (!isSpace) {
            if (!inWord) {
                inWord = true;
                wordIsCorrect = true;
            }
            if (ytTypedCorrectness[i] === false) {
                wordIsCorrect = false;
            }
        } else {
            if (inWord && wordIsCorrect) correctWords++;
            inWord = false;
        }
    }
    if (inWord && wordIsCorrect) correctWords++;
    return correctWords;
}

function syncCurrentStatsToServer() {
    if (!currentVideoId || ytCurrentIndex === 0) return;
    const elapsed = ytTypingState.timeSpentMs + (ytTypingState.lastStartTime && !ytTypingState.isPaused ? (Date.now() - ytTypingState.lastStartTime) : 0);
    const words = ytTypingState.completedWords + getCompletedWords();

    const params = new URLSearchParams();
    if (currentPartIdx === 0 && currentPageIdx === 0 && ytCurrentIndex < 50) {
        params.append('reset_others', 'true');
    }

    fetch(`/api/videos/${encodeURIComponent(currentVideoId)}/parts/${currentPartIdx}/current_stats?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            correct_words: words,
            time_ms: Math.round(elapsed),
            total_keys: ytKeystrokes.total,
            correct_keys: ytKeystrokes.correct,
            mistakes: ytKeystrokes.mistakes || 0,
            pages_completed: currentPageIdx + (ytCurrentIndex >= ytSequence.length ? 1 : 0),
            is_completed: false
        })
    }).catch(e => console.error(e));
}

function updateYTWpm() {
    let elapsed = ytTypingState.timeSpentMs;
    if (ytTypingState.lastStartTime && ytCurrentIndex < ytSequence.length && !ytTypingState.isPaused) {
        elapsed += (Date.now() - ytTypingState.lastStartTime);
    }
    const mins = elapsed / 60000;
    const currentMistakes = getCompletedMistakes(ytTypedCorrectness, getClusterBoundaries(ytSequence), ytNText);
    const totalMistakes = ytTypingState.completedMistakes + currentMistakes;
    ytKeystrokes.mistakes = totalMistakes;

    /**
     * YouTube Mode Net WPM:
     * Net WPM = ((Total Keystrokes / 5) - Word-Level Mistakes) / Minutes
     * 
     * Uses cumulative mistakes across parts/pages for accurate session-wide metrics.
     */
    let wpm = mins > 0 ? Math.max(0, Math.floor((ytKeystrokes.total / 5 - totalMistakes) / mins)) : 0;
    const acc = ytKeystrokes.total > 0 ? Math.floor(ytKeystrokes.correct / ytKeystrokes.total * 100) : 100;

    document.getElementById('stat-wpm').textContent = toBn(wpm);
    document.getElementById('stat-acc').textContent = toBn(acc) + '%';

    // Show page-level character stats in right panel
    if (document.getElementById('yt-stat-chars')) {
        const pageTotalChars = ytPageChars.correct + ytPageChars.wrong;
        document.getElementById('yt-stat-chars').textContent = toBn(pageTotalChars);
        document.getElementById('yt-stat-correct').textContent = toBn(ytPageChars.correct);
        document.getElementById('yt-stat-wrong').textContent = toBn(ytPageChars.wrong);

        // Show page-level keystroke stats
        document.getElementById('yt-stat-keys-total').textContent = toBn(ytPageKeystrokes.total);
        document.getElementById('yt-stat-keys-correct').textContent = toBn(ytPageKeystrokes.correct);
        document.getElementById('yt-stat-keys-wrong').textContent = toBn(ytPageKeystrokes.wrong);
    }
}

function prevPage() {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;

    const area = document.querySelector('.yt-typing-area');
    area.classList.add('page-transition');

    setTimeout(() => {
        const part = v.parts[currentPartIdx];
        const totalPagesInPart = part.pages ? part.pages.length : 1;
        
        let targetPartIdx = currentPartIdx;
        let targetPageIdx = currentPageIdx - 1;
        
        // Handle part transition: go to previous part's last page
        if (targetPageIdx < 0) {
            if (currentPartIdx > 0) {
                targetPartIdx = currentPartIdx - 1;
                const prevPart = v.parts[targetPartIdx];
                targetPageIdx = (prevPart.pages ? prevPart.pages.length : 1) - 1;
            } else {
                // Already at first page of first part
                area.classList.remove('page-transition');
                return;
            }
        }

        // Save current page state before navigating
        saveCurrentPageStateImmediate();
        
        // Update indices - loadPage will restore the correct state for target page
        currentPartIdx = targetPartIdx;
        currentPageIdx = targetPageIdx;

        // Load the target page - this will restore its saved state from API
        loadPage();

        area.classList.remove('page-transition');
        area.classList.add('page-enter');
        setTimeout(() => {
            area.classList.remove('page-enter');
        }, 200);
    }, 150);
}

async function resetPart(vid, partIdx) {
    document.getElementById('modal-reset-vid').value = vid;
    document.getElementById('modal-reset-partidx').value = partIdx;
    document.getElementById('modal-reset-part').classList.add('open');
}

async function confirmResetPart() {
    const vid = document.getElementById('modal-reset-vid').value;
    const partIdx = parseInt(document.getElementById('modal-reset-partidx').value);
    document.getElementById('modal-reset-part').classList.remove('open');

    try {
        // Clear localStorage state ONLY if resetting the currently active part
        const saved = localStorage.getItem(`yt_active_state_${vid}`);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.part === partIdx) {
                    localStorage.removeItem(`yt_active_state_${vid}`);
                }
            } catch (e) {
                localStorage.removeItem(`yt_active_state_${vid}`);
            }
        }

        // Clear only this part's current stats in local data
        const v = ALL_VIDEOS.find(x => x.id === vid);
        if (v && v.parts[partIdx]) {
            v.parts[partIdx].cur_wpm = null;
            v.parts[partIdx].cur_acc = null;
            v.parts[partIdx].cur_words = 0;
            v.parts[partIdx].cur_time_ms = 0;
            v.parts[partIdx].cur_keys = 0;
            v.parts[partIdx].cur_ckeys = 0;
            v.parts[partIdx].cur_mistakes = 0;
            v.parts[partIdx].cur_pages_completed = 0;
        }

        // Recalculate video-level current stats from remaining parts with current data
        if (v) {
            const remainingParts = v.parts.filter(p => p.cur_pages_completed > 0 || p.cur_wpm !== null);
            if (remainingParts.length > 0) {
                const totKeys = remainingParts.reduce((s, p) => s + (p.cur_keys || 0), 0);
                const totCkeys = remainingParts.reduce((s, p) => s + (p.cur_ckeys || 0), 0);
                const totMistakes = remainingParts.reduce((s, p) => s + (p.cur_mistakes || 0), 0);
                const totTime = remainingParts.reduce((s, p) => s + (p.cur_time_ms || 0), 0);
                const totMins = totTime / 60000.0;
                if (totMins > 0 && totKeys > 0) {
                    v.cur_wpm = Math.max(0, Math.floor((totKeys / 5.0 - totMistakes) / totMins));
                    v.cur_acc = Math.floor((totCkeys / totKeys) * 100);
                } else {
                    v.cur_wpm = null;
                    v.cur_acc = null;
                }
            } else {
                v.cur_wpm = null;
                v.cur_acc = null;
            }
        }

        await fetch(`/api/videos/${encodeURIComponent(vid)}/parts/${partIdx}/reset`, {
            method: 'POST'
        });

        await fetchLibrary();
        openDetail(vid);
    } catch (e) { console.error(e); }
}

async function resetBook(vid) {
    if (!confirm('আপনি কি এই বইয়ের বর্তমান প্রগ্রেস এবং সেশন স্কোর রিসেট করতে চান? (পূর্বের বেস্ট স্কোর ডিলিট হবে না)')) return;
    try {
        localStorage.removeItem(`yt_active_state_${vid}`);
        await fetch(`/api/videos/${encodeURIComponent(vid)}/reset`, { method: 'POST' });
        await fetchLibrary();
        openDetail(vid);
    } catch (e) { console.error(e); }
}

function nextPage() {
    const area = document.querySelector('.yt-typing-area');
    area.classList.add('page-transition');

    setTimeout(() => {
        const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
        if (!v) return;

        const part = v.parts[currentPartIdx];
        const totalPagesInPart = part.pages ? part.pages.length : 1;

        // Handle part transition: go to next part's first page
        if (currentPageIdx >= totalPagesInPart - 1) {
            if (currentPartIdx < v.parts.length - 1) {
                // Save current page state before part transition
                saveCurrentPageStateImmediate();
                
                // Move to next part, first page
                currentPartIdx++;
                currentPageIdx = 0;
            } else {
                // Already at last page of last part - don't navigate
                area.classList.remove('page-transition');
                return;
            }
        } else {
            // Normal page navigation within same part
            // Save current page state before navigating
            saveCurrentPageStateImmediate();
            
            currentPageIdx++;
        }

        // Accumulate current page progress into Part total (this is correct)
        ytTypingState.completedWords += getCompletedWords();
        ytTypingState.completedMistakes += getCompletedMistakes(ytTypedCorrectness, getClusterBoundaries(ytSequence), ytNText);

        if (ytTypingState.lastStartTime && !ytTypingState.isPaused) {
            ytTypingState.timeSpentMs += (Date.now() - ytTypingState.lastStartTime);
        }

        // Reset page-level variables for the new page (loadPage will restore if there's saved state)
        ytCurrentIndex = 0;
        ytTypedCorrectness = [];
        ytTypingState.startTime = null;
        ytTypingState.lastStartTime = null;
        ytTypingState.isPaused = false;
        ytPageKeystrokes = { total: 0, correct: 0, wrong: 0 };
        ytPageChars = { correct: 0, wrong: 0 };

        // Don't save to localStorage - loadPage will handle loading from API
        loadPage();

        area.classList.remove('page-transition');
        area.classList.add('page-enter');
        setTimeout(() => {
            area.classList.remove('page-enter');
        }, 200);
        setTimeout(focusYTTyping, 10);
    }, 250);
}

async function nextPart() {
    await fetchLibrary(); // Re-sync local data with DB
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;
    showScreen('detail');
    openDetail(currentVideoId);
}

function nextPartFromConsole() {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;
    
    if (currentPartIdx < v.parts.length - 1) {
        saveCurrentPageStateImmediate();
        currentPartIdx++;
        currentPageIdx = 0;
        
        ytCurrentIndex = 0;
        ytTypedCorrectness = [];
        ytTypingState.completedWords = 0;
        ytTypingState.completedMistakes = 0;
        ytTypingState.timeSpentMs = 0;
        ytTypingState.startTime = null;
        ytTypingState.lastStartTime = null;
        ytTypingState.isPaused = false;
        ytKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
        
        saveYTState();
        loadPage();
    }
}

function prevPart() {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;
    
    if (currentPartIdx > 0) {
        saveCurrentPageStateImmediate();
        currentPartIdx--;
        const prevPart = v.parts[currentPartIdx];
        currentPageIdx = (prevPart.pages ? prevPart.pages.length : 1) - 1;
        
        ytCurrentIndex = 0;
        ytTypedCorrectness = [];
        ytTypingState.completedWords = 0;
        ytTypingState.completedMistakes = 0;
        ytTypingState.timeSpentMs = 0;
        ytTypingState.startTime = null;
        ytTypingState.lastStartTime = null;
        ytTypingState.isPaused = false;
        ytKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
        
        saveYTState();
        loadPage();
    }
}

function goToPage(partIdx, pageIdx) {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;
    if (partIdx < 0 || partIdx >= v.parts.length) return;
    
    const targetPart = v.parts[partIdx];
    const totalPages = targetPart.pages ? targetPart.pages.length : 1;
    if (pageIdx < 0 || pageIdx >= totalPages) return;
    
    const area = document.querySelector('.yt-typing-area');
    area.classList.add('page-transition');
    
    setTimeout(() => {
        // Save current page state before navigating
        saveCurrentPageStateImmediate();
        
        // Update indices - loadPage will restore the correct state for target page
        currentPartIdx = partIdx;
        currentPageIdx = pageIdx;
        
        // Load the target page - this will restore its saved state from API
        loadPage();

        area.classList.remove('page-transition');
        area.classList.add('page-enter');
        setTimeout(() => {
            area.classList.remove('page-enter');
        }, 200);
    }, 150);
}

function updateNavigationUI() {
    const v = ALL_VIDEOS.find(x => x.id === currentVideoId);
    if (!v) return;
    
    const part = v.parts[currentPartIdx];
    const totalPagesInPart = part.pages ? part.pages.length : 1;
    const totalParts = v.parts.length;
    
    document.getElementById('nav-current-page').textContent = toBn(currentPageIdx + 1);
    document.getElementById('nav-total-pages').textContent = toBn(totalPagesInPart);
    document.getElementById('nav-current-part').textContent = toBn(currentPartIdx + 1);
    document.getElementById('nav-total-parts').textContent = toBn(totalParts);
    
    document.getElementById('btn-prev-part').disabled = currentPartIdx === 0;
    document.getElementById('btn-prev-page').disabled = currentPartIdx === 0 && currentPageIdx === 0;
    document.getElementById('btn-next-page').disabled = currentPartIdx === totalParts - 1 && currentPageIdx === totalPagesInPart - 1;
    document.getElementById('btn-next-part').disabled = currentPartIdx === totalParts - 1;
    
    const dotsContainer = document.getElementById('nav-page-dots');
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < totalPagesInPart; i++) {
        const dot = document.createElement('div');
        dot.className = 'nav-page-dot';
        
        if (i === currentPageIdx) {
            dot.classList.add('active');
        }
        
        dot.onclick = () => goToPage(currentPartIdx, i);
        dotsContainer.appendChild(dot);
    }
}

function showYTSummary(v) {
    if (!v) return;
    document.getElementById('yt-summary-title').textContent = v.title;
    document.getElementById('yt-summary-channel').textContent = v.channel || '';

    const thumbCont = document.getElementById('yt-summary-thumb-container');
    const thumbBg = document.getElementById('yt-summary-thumb-bg');

    if (v.thumb_path) {
        let encodedPath = v.thumb_path.split('/').map(encodeURIComponent).join('/');
        let url = `/thumbs/${encodedPath}`;
        thumbCont.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
        thumbBg.style.backgroundImage = `url('${url}')`;
    } else {
        thumbCont.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--surface); color:var(--subtext); font-size:2rem;">▶</div>`;
        thumbBg.style.backgroundImage = 'none';
    }

    // Calculate session overall WPM (cumulative, not average of averages)
    let totalKeys = ytSessionResults.reduce((sum, p) => sum + (p.keys || 0), 0);
    let totalMistakes = ytSessionResults.reduce((sum, p) => sum + (p.mistakes || 0), 0);
    let totalMins = ytSessionResults.reduce((sum, p) => sum + (p.timeMs || 0), 0) / 60000;
    let sessionWpm = totalMins > 0 ? Math.max(0, Math.floor((totalKeys / 5 - totalMistakes) / totalMins)) : 0;

    let totalCKeys = ytSessionResults.reduce((sum, p) => sum + (p.ckeys || 0), 0);
    let sessionAcc = totalKeys > 0 ? Math.floor((totalCKeys / totalKeys) * 100) : 100;

    // Get previous best overall WPM from video data (best session's total_wpm)
    let prevBestWpm = v.best_wpm || 0;

    document.getElementById('yt-summary-wpm').textContent = toBn(sessionWpm);
    document.getElementById('yt-summary-acc').textContent = toBn(sessionAcc) + '%';

    const bestMsg = document.getElementById('yt-summary-best-msg');
    // Only show NEW BEST if this session's OVERALL WPM is better than previous best
    if (prevBestWpm > 0 && sessionWpm > prevBestWpm) {
        bestMsg.innerHTML = `<span style="color:var(--correct)">✨ অসাধারণ! নতুন বেস্ট গড় গতি: ${toBn(sessionWpm)} WPM (পূর্বের বেস্ট: ${toBn(prevBestWpm)} WPM)</span>`;
    } else if (prevBestWpm > 0 && sessionWpm < prevBestWpm) {
        bestMsg.innerHTML = `<span style="color:var(--subtext)">পূর্বের বেস্ট গড় গতি ${toBn(prevBestWpm)} WPM এর চেয়ে একটু কম।</span>`;
    } else if (prevBestWpm > 0 && sessionWpm === prevBestWpm) {
        bestMsg.innerHTML = `<span style="color:var(--accent)">পূর্বের বেস্ট গড় গতির সমান!</span>`;
    } else {
        bestMsg.innerHTML = `<span style="color:var(--correct)">✨ প্রথম সম্পন্ন! গড় গতি: ${toBn(sessionWpm)} WPM</span>`;
    }

    // Populate Part List - no individual NEW BEST badges
    const list = document.getElementById('yt-summary-parts-list');
    list.innerHTML = '';
    ytSessionResults.forEach(res => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        let partObj = v.parts[res.partIdx];
        let labelBn = toBn(partObj.label.replace('Part', 'অধ্যায়'));

        tr.innerHTML = `
                    <td style="padding: 10px 12px; color: var(--text);">
                        <div>${labelBn}</div>
                    </td>
                    <td style="padding: 10px 12px; color: var(--accent); text-align: center; font-weight: 700;">${toBn(res.wpm)}</td>
                    <td style="padding: 10px 12px; color: var(--correct); text-align: center; font-weight: 700;">${toBn(res.acc)}%</td>
                `;
        list.appendChild(tr);
    });

    document.getElementById('modal-yt-summary').classList.add('open');
}

async function closeYTSummary() {
    document.getElementById('modal-yt-summary').classList.remove('open');
    await nextPart();
}

async function openSettingsModal() {
    document.getElementById('modal-settings').classList.add('open');
    try {
        const res = await fetch('/api/data_dir');
        const data = await res.json();
        document.getElementById('settings-data-dir-path').textContent = data.path;
    } catch (e) {
        document.getElementById('settings-data-dir-path').textContent = 'Error loading path';
        console.error(e);
    }
}

function closeSettingsModal() {
    document.getElementById('modal-settings').classList.remove('open');
}

async function changeDataDirectory() {
    if (!window.nativeBridge || !window.nativeBridge.select_folder) {
        alert('This feature is only available in the standalone application.');
        return;
    }

    const newPath = await window.nativeBridge.select_folder();
    if (newPath) {
        try {
            const res = await fetch('/api/data_dir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: newPath })
            });

            if (res.ok) {
                document.getElementById('settings-data-dir-path').textContent = newPath;
                // Refresh data dynamically
                await fetchLibrary(true);
                alert('Data directory updated successfully!');
            } else {
                alert('Failed to update data directory.');
            }
        } catch (e) {
            console.error(e);
            alert('Error updating data directory.');
        }
    }
}

function openUrlModal() {
    document.getElementById('url-input').value = '';
    document.getElementById('url-status').textContent = '';
    document.getElementById('url-status').className = 'modal-status';
    document.getElementById('progress-log').style.display = 'none';
    document.getElementById('progress-log').innerHTML = '';
    document.getElementById('url-cancel-btn').style.display = '';
    document.getElementById('url-process-btn').style.display = '';
    document.getElementById('url-process-btn').textContent = 'শুরু করুন →';
    document.getElementById('url-process-btn').disabled = false;
    document.getElementById('url-process-btn').onclick = processUrl;
    setStep(0);
    document.getElementById('modal-url').classList.add('open');
}

function closeUrlModal() {
    document.getElementById('modal-url').classList.remove('open');
}

function clearUrlError() {
    document.getElementById('url-status').textContent = '';
}

function setStep(active) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('step' + i);
        el.classList.remove('active', 'done');
        if (i < active) el.classList.add('done');
        else if (i === active) el.classList.add('active');
    }
}

function log(msg, type = '') {
    // Deprecated by toast system
}

async function processUrl() {
    const url = document.getElementById('url-input').value.trim();
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
        document.getElementById('url-status').textContent = '✗ সঠিক YouTube লিংক দিন';
        document.getElementById('url-status').className = 'modal-status err';
        return;
    }

    // Client-side duplication check
    const alreadyInLibrary = ALL_VIDEOS.some(v => v.url === url);
    if (alreadyInLibrary) {
        document.getElementById('url-status').textContent = '✗ এই ভিডিওটি আপনার সংগ্রহে ইতিমধ্যে আছে।';
        document.getElementById('url-status').className = 'modal-status err';
        return;
    }

    if (activeTasksCount >= YT_MAX_TASKS) {
        document.getElementById('url-status').textContent = '✗ বর্তমানে অনেক ভিডিও প্রসেস হচ্ছে। দয়া করে অপেক্ষা করুন।';
        document.getElementById('url-status').className = 'modal-status err';
        return;
    }

    // Close modal immediately
    closeUrlModal();
    createProcessingToast(url);
}

function updateAddBtnState() {
    const btn = document.getElementById('add-btn');
    if (activeTasksCount >= YT_MAX_TASKS) {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    } else {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
}

function createProcessingToast(url) {
    activeTasksCount++;
    updateAddBtnState();

    const container = document.getElementById('yt-toast-container');
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = toastId;

    // Extract a better title if possible or just use part of URL
    let displayTitle = url.length > 25 ? url.substring(0, 25) + "..." : url;

    toast.innerHTML = `
                <div class="toast-header">
                    <div class="toast-title" title="${url}">ভিডিও প্রসেস হচ্ছে...</div>
                    <div class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</div>
                </div>
                <div class="toast-log">🔗 তথ্য দেখা হচ্ছে...</div>
                <div class="toast-progress-bar">
                    <div class="toast-progress-fill"></div>
                </div>
            `;
    container.appendChild(toast);

    const logEl = toast.querySelector('.toast-log');
    const fillEl = toast.querySelector('.toast-progress-fill');
    const titleEl = toast.querySelector('.toast-title');

    let processUrl = '/api/process?url=' + encodeURIComponent(url);
    const es = new EventSource(processUrl);

    es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.log) logEl.textContent = data.log;
        if (data.step) {
            fillEl.style.width = (data.step * 25) + '%';
        }

        if (data.done) {
            es.close();
            activeTasksCount--;
            updateAddBtnState();
            titleEl.textContent = "✓ সম্পন্ন হয়েছে!";
            titleEl.style.color = "var(--correct)";
            logEl.textContent = "আপনার সংগ্রহ রিফ্রেশ হচ্ছে...";
            fillEl.style.width = '100%';
            fillEl.style.background = 'var(--correct)';
            fetchLibrary();
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
        }

        if (data.error) {
            es.close();
            activeTasksCount--;
            updateAddBtnState();
            titleEl.textContent = "✗ এরর!";
            titleEl.style.color = "var(--wrong)";
            logEl.textContent = data.error;
            logEl.style.color = "var(--wrong)";
            fillEl.style.background = 'var(--wrong)';
        }
    };

    es.onerror = (err) => {
        es.close();
        if (toast.parentElement) {
            activeTasksCount--;
            updateAddBtnState();
            titleEl.textContent = "✗ এরর (Server)!";
            titleEl.style.color = "var(--wrong)";
            logEl.textContent = "সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে।";
            fillEl.style.background = 'var(--wrong)';
        }
    };
}

function drawKeyboard(containerId, prefix) {
    const totalWidth = 15 * keySize + 14 * gap;
    const totalHeight = 5 * keySize + 4 * gap + 110;
    const xmlns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(xmlns, "svg");
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    let currentY = 0;
    rows.forEach(row => {
        let currentX = 0;
        row.forEach(key => {
            const w = key.width * keySize + (key.width - 1) * gap;
            const g = document.createElementNS(xmlns, "g");
            const rect = document.createElementNS(xmlns, "rect");
            rect.setAttribute("id", `${prefix}rect-${key.id}`);
            rect.setAttribute("x", currentX); rect.setAttribute("y", currentY);
            rect.setAttribute("width", w); rect.setAttribute("height", keySize);
            rect.setAttribute("rx", radius); rect.setAttribute("fill", key.color);
            rect.classList.add(`${prefix}key-rect`); g.appendChild(rect);
            g.setAttribute("data-key-id", key.id);

            function addText(x, y, anchor, text, cls, idPrefix) {
                if (!text) return;
                const el = document.createElementNS(xmlns, "text");
                el.setAttribute("x", x); el.setAttribute("y", y);
                el.setAttribute("text-anchor", anchor);
                el.textContent = text;
                el.classList.add("key-text", cls);
                el.setAttribute("id", `${prefix}${idPrefix}-${key.id}`);
                g.appendChild(el);
            }

            const pad = 6;
            if (key.tl !== undefined) {
                addText(currentX + w / 2, currentY + keySize / 2 + 7, "middle", key.label, "key-eng", "eng");
                addText(currentX + pad + 2, currentY + 19, "start", key.tl, "key-bn-corner", "tl");
                addText(currentX + w - pad - 2, currentY + 19, "end", key.tr, "key-bn-corner", "tr");
                addText(currentX + pad + 2, currentY + keySize - 4, "start", key.bl, "key-bn-corner", "bl");
                addText(currentX + w - pad - 2, currentY + keySize - 4, "end", key.br, "key-bn-corner", "br");
            } else {
                addText(currentX + w / 2, currentY + keySize / 2 + 5, "middle", key.label, "key-mod", "main");
            }
            svg.appendChild(g); currentX += w + gap;
        });
        currentY += keySize + gap;
    });
    drawHands(svg, totalWidth, currentY + 20, prefix);
    document.getElementById(containerId).appendChild(svg);
}

function drawHands(svg, width, y, prefix) {
    const xmlns = "http://www.w3.org/2000/svg";
    function drawOneHand(startX, isLeft) {
        const g = document.createElementNS(xmlns, "g");
        const flip = isLeft ? 1 : -1;
        const fingers = [
            { id: isLeft ? "lPinky" : "rPinky", w: 16, h: 45, x: -38, y: 12 },
            { id: isLeft ? "lRing" : "rRing", w: 18, h: 60, x: -16, y: 4 },
            { id: isLeft ? "lMid" : "rMid", w: 18, h: 70, x: 8, y: 0 },
            { id: isLeft ? "lIndex" : "rIndex", w: 18, h: 60, x: 35, y: 4 }
        ];
        fingers.forEach(f => {
            const r = document.createElementNS(xmlns, "rect");
            r.setAttribute("x", startX + (f.x * flip) - f.w / 2); r.setAttribute("y", y + f.y - f.h);
            r.setAttribute("width", f.w); r.setAttribute("height", f.h + 20);
            r.setAttribute("rx", f.w / 2); r.setAttribute("fill", colors[f.id]);
            r.setAttribute("data-finger", f.id); r.classList.add(`${prefix}finger-shape`); g.appendChild(r);
        });
        const palm = document.createElementNS(xmlns, "path");
        const d = isLeft
            ? `M ${startX - 45} ${y + 12} L ${startX - 45} ${y + 60} Q ${startX - 45} ${y + 80} ${startX} ${y + 80} Q ${startX + 45} ${y + 80} ${startX + 45} ${y + 60} L ${startX + 45} ${y + 12} Z`
            : `M ${startX + 45} ${y + 12} L ${startX + 45} ${y + 60} Q ${startX + 45} ${y + 80} ${startX} ${y + 80} Q ${startX - 45} ${y + 80} ${startX - 45} ${y + 60} L ${startX - 45} ${y + 12} Z`;
        palm.setAttribute("d", d); palm.classList.add(`${prefix}palm-shape`); g.appendChild(palm);
        const thumb = document.createElementNS(xmlns, "path");
        const td = isLeft
            ? `M ${startX + 40} ${y + 40} Q ${startX + 65} ${y + 50} ${startX + 75} ${y + 25} L ${startX + 70} ${y + 5} A 8 8 0 0 0 ${startX + 60} ${y + 12} Z`
            : `M ${startX - 40} ${y + 40} Q ${startX - 65} ${y + 50} ${startX - 75} ${y + 25} L ${startX - 70} ${y + 5} A 8 8 0 0 1 ${startX - 60} ${y + 12} Z`;
        thumb.setAttribute("d", td); thumb.setAttribute("fill", colors.thumb);
        thumb.setAttribute("data-finger", "thumb"); thumb.classList.add(`${prefix}finger-shape`); g.appendChild(thumb);
        svg.appendChild(g);
    }
    drawOneHand(width * 0.25, true); drawOneHand(width * 0.75, false);
}


function toggleYTHintsPanel() {
    const panel = document.getElementById('yt-hints-panel');
    const btn = document.getElementById('yt-btn-hints');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
}

function applyYTHints() {
    const glow = document.getElementById('yt-tog-glow').checked;
    const hands = document.getElementById('yt-tog-hands').checked;
    const keyboard = document.getElementById('yt-tog-keyboard').checked;
    const guide = document.getElementById('yt-tog-guide').checked;

    const ytGlowStyle = document.getElementById('yt-glow-style');
    if (ytGlowStyle) ytGlowStyle.remove();

    document.querySelectorAll('.yt-finger-shape, .yt-palm-shape').forEach(el => {
        el.style.visibility = hands ? '' : 'hidden';
    });

    const ytSvg = document.querySelector('#yt-svg-container svg');
    if (ytSvg) {
        const totalWidth = 15 * keySize + 14 * gap;
        const baseHeight = 5 * keySize + 4 * gap;
        const heightWithHands = baseHeight + 110;
        const newHeight = hands ? heightWithHands : baseHeight + 10;
        ytSvg.setAttribute("viewBox", `0 0 ${totalWidth} ${newHeight}`);
    }

    const keyboardWrap = document.getElementById('yt-svg-container');
    if (!keyboard) {
        keyboardWrap.style.display = 'none';
    } else {
        keyboardWrap.style.display = 'block';
        document.querySelectorAll('.yt-finger-shape, .yt-palm-shape').forEach(el => {
            el.style.visibility = hands ? '' : 'hidden';
        });
    }

    const guideWrap = document.getElementById('yt-step-guide');
    if (guideWrap) {
        guideWrap.style.display = guide ? 'flex' : 'none';
    }

    if (ytSequence && ytSequence[ytCurrentIndex]) {
        highlightKeysForStep(ytSequence[ytCurrentIndex].key, 'yt-');
    } else {
        highlightKeysForStep(null, 'yt-');
    }
}

// ═══════════════════════════════════════════════════════
//  INSTANT MODE LOGIC (TRAINER)
// ═══════════════════════════════════════════════════════
const KEY_TO_BANGLA = {
    'j': '\u0995', 'J': '\u0996', 'o': '\u0997', 'O': '\u0998', 'q': '\u0999',
    'y': '\u099A', 'Y': '\u099B', 'u': '\u099C', 'U': '\u099D', 'I': '\u099E',
    't': '\u099F', 'T': '\u09A0', 'e': '\u09A1', 'E': '\u09A2', 'B': '\u09A3',
    'k': '\u09A4', 'K': '\u09A5', 'l': '\u09A6', 'L': '\u09A7', 'b': '\u09A8',
    'r': '\u09AA', 'R': '\u09AB', 'h': '\u09AC', 'H': '\u09AD', 'm': '\u09AE',
    'w': '\u09AF', 'W': '\u09DF', 'v': '\u09B0', 'V': '\u09B2', 'M': '\u09B6', 'N': '\u09B7',
    'n': '\u09B8', 'i': '\u09B9',
    'p': '\u09DC', 'P': '\u09DD',
    'f': '\u09BE', 'd': '\u09BF', 'D': '\u09C0', 's': '\u09C1', 'S': '\u09C2', 'a': '\u09C3',
    'c': '\u09C7', 'C': '\u09C8',
    'x': '\u0993', 'X': '\u09CC',
    'g': '\u09CD',
    'F': '\u0985', 'Q': '\u0982',
    '1': '\u09E7', '2': '\u09E8', '3': '\u09E9', '4': '\u09EA', '5': '\u09EB',
    '6': '\u09EC', '7': '\u09ED', '8': '\u09EE', '9': '\u09EF', '0': '\u09E6',
    '$': '\u09F3', '!': '!', '?': '?',
    'Q': '\u0982', ' ': ' ', '|': '\u0964', '\\': '\u09CE',
    'A': '\u09B0\u09CD',
    'Z': '\u09CD\u09AF', 'z': '\u09CD\u09B0'
};

const BIJOY_STEPS_BASE = {
    '\n': ['Enter'],
    '\u0985': ['Shift+F'], '\u0986': ['g', 'f'], '\u0987': ['g', 'd'], '\u0988': ['g', 'Shift+D'],
    '\u0989': ['g', 's'], '\u098A': ['g', 'Shift+S'], '\u098B': ['g', 'a'],
    '\u098F': ['g', 'c'], '\u0990': ['g', 'Shift+C'], '\u0993': ['x'], '\u0994': ['g', 'Shift+X'],
    '\u0995': ['j'], '\u0996': ['Shift+J'], '\u0997': ['o'], '\u0998': ['Shift+O'], '\u0999': ['q'],
    '\u099A': ['y'], '\u099B': ['Shift+Y'], '\u099C': ['u'], '\u099D': ['Shift+U'], '\u099E': ['Shift+I'],
    '\u099F': ['t'], '\u09A0': ['Shift+T'], '\u09A1': ['e'], '\u09A2': ['Shift+E'], '\u09A3': ['Shift+B'],
    '\u09A4': ['k'], '\u09A5': ['Shift+K'], '\u09A6': ['l'], '\u09A7': ['Shift+L'], '\u09A8': ['b'],
    '\u09AA': ['r'], '\u09AB': ['Shift+R'], '\u09AC': ['h'], '\u09AD': ['Shift+H'], '\u09AE': ['m'],
    '\u09AF': ['w'], '\u09B0': ['v'], '\u09B2': ['Shift+V'], '\u09B6': ['Shift+M'], '\u09B7': ['Shift+N'],
    '\u09B8': ['n'], '\u09B9': ['i'],
    '\u09DC': ['p'], '\u09DD': ['Shift+P'], '\u09DF': ['Shift+W'],
    '\u09CE': ['\\'], '\u0983': ['Shift+\\'], '\u09F3': ['Shift+4'],
    '!': ['Shift+1'], '?': ['Shift+/'], '\u0981': ['Shift+7'],
    '\u0982': ['Shift+Q'], ' ': ['Space'], '\u0964': ['Shift+G'],
    '\u09E7': ['1'], '\u09E8': ['2'], '\u09E9': ['3'], '\u09EA': ['4'],
    '\u09EB': ['5'], '\u09EC': ['6'], '\u09ED': ['7'], '\u09EE': ['8'], '\u09EF': ['9'], '\u09E6': ['0'],
    '!': ['Shift+1'], '@': ['Shift+2'], '#': ['Shift+3'], '\u09F3': ['Shift+4'], '%': ['Shift+5'], '^': ['Shift+6'], '&': ['Shift+7'], '*': ['Shift+8'], '(': ['Shift+9'], ')': ['Shift+0'],
    '-': ['-'], '_': ['Shift+-'], '=': ['='], '+': ['Shift+='],
    '[': ['['], '{': ['Shift+['], ']': [']'], '}': ['Shift+]'],
    ';': [';'], ':': ['Shift+;'], "'": ["'"], '"': ['Shift+\''],
    ',': [','], '<': ['Shift+,'], '.': ['.'], '>': ['Shift+.'],
    '/': ['/'], '?': ['Shift+/'],
    '`': ['`'], '\u2018': ['`'], '\u201C': ['Shift+`'],
    '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'], '4': ['4'],
    '5': ['5'], '6': ['6'], '7': ['7'], '8': ['8'], '9': ['9']
};

const BANGLA_TEXTS = [
    "আমাদের দেশ বাংলাদেশ। এখানে সবুজ মাঠ আর নীল আকাশ আছে। মানুষ এখানে সুখে বাস করে।",
    "বাংলা ভাষা আমাদের মায়ের ভাষা। এই ভাষায় আমরা কথা বলি, গান গাই, কবিতা লিখি।",
    "পদ্মা নদীর তীরে বসে মাঝি গান গায়। তার সুর বাতাসে ভেসে যায় দূর দেশে।",
    "রবীন্দ্রনাথ ঠাকুর বাংলা সাহিত্যের শ্রেষ্ঠ কবি। তিনি গীতাঞ্জলির জন্য নোবেল পুরস্কার পান।",
    "শীতের সকালে কুয়াশার চাদরে ঢাকা গ্রামের পথ। খেজুর রসের মিষ্টি গন্ধ বাতাসে মেশে।",
    "ঢাকা শহরে লক্ষ লক্ষ মানুষ বাস করে। এই শহর কখনো ঘুমায় না, সব সময় জেগে থাকে।",
    "বর্ষায় নদীর পানি বাড়ে। কৃষক মাঠে ধান লাগায়। সবুজ ফসলে ভরে ওঠে মাঠ।",
    "একুশে ফেব্রুয়ারি আন্তর্জাতিক মাতৃভাষা দিবস। ভাষার জন্য রক্ত দিয়েছে বাংলার দামাল ছেলেরা।",
    "সূর্য উঠলে পাখিরা গান গায়। ফুল ফোটে বাগানে। প্রকৃতি নতুন রূপে সাজে প্রতিটি ভোরে।",
    "বাংলাদেশের মানুষ অতিথিপরায়ণ। তারা মেহমানকে ভালোবাসে এবং আপ্যায়ন করতে পছন্দ করে।"
];

function getRandomYouTubePassage(minWords = 20, maxWords = 60) {
    if (!ALL_VIDEOS || ALL_VIDEOS.length === 0) return null;

    let validPassages = [];

    // Traverse videos -> parts -> pages -> text to find chunks
    ALL_VIDEOS.forEach(v => {
        if (!v.parts) return;
        v.parts.forEach(part => {
            if (!part.pages) return;
            part.pages.forEach(page => {
                if (!page.content) return;

                // Split large content blocks by newline to create distinct manageable chunks
                const paragraphs = page.content.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

                paragraphs.forEach(p => {
                    // Split by whitespace to approximate word count 
                    const wordCount = p.split(/\s+/).length;
                    // Check if the word count fits within the boundaries
                    if (wordCount >= minWords && wordCount <= maxWords) {
                        validPassages.push(p);
                    }
                });
            });
        });
    });

    if (validPassages.length === 0) return null;

    // Pick a completely random valid passage from any video/part/page loaded
    const randomIdx = Math.floor(Math.random() * validPassages.length);
    return validPassages[randomIdx];
}

const keySize = 58, gap = 5, radius = 8;
const colors = {
    lPinky: "var(--c-l-pinky)", lRing: "var(--c-l-ring)", lMid: "var(--c-l-mid)", lIndex: "var(--c-l-index)",
    thumb: "var(--c-thumb)",
    rIndex: "var(--c-r-index)", rMid: "var(--c-r-mid)", rRing: "var(--c-r-ring)", rPinky: "var(--c-r-pinky)"
};

const rows = [
    [
        { id: "Backquote", label: "`", tl: "~", tr: "\u201C", bl: "`", br: "\u2018", width: 1, color: colors.lPinky },
        { id: "Digit1", label: "1", tl: "!", tr: "", bl: "", br: "১", width: 1, color: colors.lPinky },
        { id: "Digit2", label: "2", tl: "@", tr: "", bl: "", br: "২", width: 1, color: colors.lRing },
        { id: "Digit3", label: "3", tl: "#", tr: "", bl: "", br: "৩", width: 1, color: colors.lMid },
        { id: "Digit4", label: "4", tl: "$", tr: "৳", bl: "", br: "৪", width: 1, color: colors.lIndex },
        { id: "Digit5", label: "5", tl: "%", tr: "", bl: "", br: "৫", width: 1, color: colors.lIndex },
        { id: "Digit6", label: "6", tl: "^", tr: "", bl: "", br: "৬", width: 1, color: colors.rIndex },
        { id: "Digit7", label: "7", tl: "&", tr: "ঁ", bl: "", br: "৭", width: 1, color: colors.rIndex },
        { id: "Digit8", label: "8", tl: "*", tr: "", bl: "", br: "৮", width: 1, color: colors.rMid },
        { id: "Digit9", label: "9", tl: "(", tr: "", bl: "", br: "৯", width: 1, color: colors.rRing },
        { id: "Digit0", label: "0", tl: ")", tr: "", bl: "", br: "০", width: 1, color: colors.rPinky },
        { id: "Minus", label: "-", tl: "_", tr: "\u00F7", bl: "-", br: "\u00D7", width: 1, color: colors.rPinky },
        { id: "Equal", label: "=", tl: "+", tr: "+", bl: "=", br: "", width: 1, color: colors.rPinky },
        { id: "Backspace", label: "⌫", width: 2, color: colors.rPinky }
    ],
    [
        { id: "Tab", label: "Tab", width: 1.5, color: colors.lPinky },
        { id: "KeyQ", label: "Q", tl: "", tr: "ং", bl: "", br: "ঙ", width: 1, color: colors.lPinky },
        { id: "KeyW", label: "W", tl: "", tr: "য়", bl: "", br: "য", width: 1, color: colors.lRing },
        { id: "KeyE", label: "E", tl: "", tr: "ঢ", bl: "", br: "ড", width: 1, color: colors.lMid },
        { id: "KeyR", label: "R", tl: "", tr: "ফ", bl: "", br: "প", width: 1, color: colors.lIndex },
        { id: "KeyT", label: "T", tl: "", tr: "ঠ", bl: "", br: "ট", width: 1, color: colors.lIndex },
        { id: "KeyY", label: "Y", tl: "", tr: "ছ", bl: "", br: "চ", width: 1, color: colors.rIndex },
        { id: "KeyU", label: "U", tl: "", tr: "ঝ", bl: "", br: "জ", width: 1, color: colors.rIndex },
        { id: "KeyI", label: "I", tl: "", tr: "ঞ", bl: "", br: "হ", width: 1, color: colors.rMid },
        { id: "KeyO", label: "O", tl: "", tr: "ঘ", bl: "", br: "গ", width: 1, color: colors.rRing },
        { id: "KeyP", label: "P", tl: "", tr: "ঢ়", bl: "", br: "ড়", width: 1, color: colors.rPinky },
        { id: "BracketLeft", label: "[", tl: "", tr: "", bl: "", br: "", width: 1, color: colors.rPinky },
        { id: "BracketRight", label: "]", tl: "", tr: "", bl: "", br: "", width: 1, color: colors.rPinky },
        { id: "Backslash", label: "\\", tl: "ঃ", tr: "", bl: "ৎ", br: "", width: 1.5, color: colors.rPinky }
    ],
    [
        { id: "CapsLock", label: "Caps", width: 1.75, color: colors.lPinky },
        { id: "KeyA", label: "A", tl: "", tr: "র্", bl: "ঋ", br: "ৃ", width: 1, color: colors.lPinky },
        { id: "KeyS", label: "S", tl: "ঊ", tr: "ূ", bl: "উ", br: "ু", width: 1, color: colors.lRing },
        { id: "KeyD", label: "D", tl: "ঈ", tr: "ী", bl: "ই", br: "ি", width: 1, color: colors.lMid },
        { id: "KeyF", label: "F", tl: "", tr: "অ", bl: "আ", br: "া", width: 1, color: colors.lIndex, bump: true },
        { id: "KeyG", label: "G", tl: "", tr: "।", bl: "", br: "্", width: 1, color: colors.lIndex },
        { id: "KeyH", label: "H", tl: "", tr: "ভ", bl: "", br: "ব", width: 1, color: colors.rIndex },
        { id: "KeyJ", label: "J", tl: "", tr: "খ", bl: "", br: "ক", width: 1, color: colors.rIndex, bump: true },
        { id: "KeyK", label: "K", tl: "", tr: "থ", bl: "", br: "ত", width: 1, color: colors.rMid },
        { id: "KeyL", label: "L", tl: "", tr: "ধ", bl: "", br: "দ", width: 1, color: colors.rRing },
        { id: "Semicolon", label: ";", tl: ":", tr: "", bl: "", br: "", width: 1, color: colors.rPinky },
        { id: "Quote", label: "'", tl: "\"", tr: "", bl: "", br: "", width: 1, color: colors.rPinky },
        { id: "Enter", label: "↵", width: 2.25, color: colors.rPinky }
    ],
    [
        { id: "ShiftLeft", label: "⇧ Shift", width: 2.25, color: colors.lPinky },
        { id: "KeyZ", label: "Z", tl: "", tr: "্য", bl: "", br: "্র", width: 1, color: colors.lPinky },
        { id: "KeyX", label: "X", tl: "ঔ", tr: "ৗ", bl: "", br: "ও", width: 1, color: colors.lRing },
        { id: "KeyC", label: "C", tl: "ঐ", tr: "ৈ", bl: "এ", br: "ে", width: 1, color: colors.lMid },
        { id: "KeyV", label: "V", tl: "", tr: "ল", bl: "", br: "র", width: 1, color: colors.lIndex },
        { id: "KeyB", label: "B", tl: "", tr: "ণ", bl: "", br: "ন", width: 1, color: colors.lIndex },
        { id: "KeyN", label: "N", tl: "", tr: "ষ", bl: "", br: "স", width: 1, color: colors.rIndex },
        { id: "KeyM", label: "M", tl: "", tr: "শ", bl: "ম", br: "ম", width: 1, color: colors.rIndex },
        { id: "Comma", label: ",", tl: "<", tr: "", bl: "", br: "", width: 1, color: colors.rMid },
        { id: "Period", label: ".", tl: ">", tr: "", bl: "", br: "", width: 1, color: colors.rRing },
        { id: "Slash", label: "/", tl: "?", tr: "", bl: "", br: "", width: 1, color: colors.rPinky },
        { id: "ShiftRight", label: "⇧ Shift", width: 2.75, color: colors.rPinky }
    ],
    [
        { id: "ControlLeft", label: "Ctrl", width: 1.5, color: colors.lPinky },
        { id: "MetaLeft", label: "Win", width: 1.25, color: colors.thumb },
        { id: "AltLeft", label: "Alt", width: 1.25, color: colors.thumb },
        { id: "Space", label: "Space", width: 6.25, color: colors.thumb },
        { id: "AltRight", label: "Alt", width: 1.25, color: colors.thumb },
        { id: "MetaRight", label: "Win", width: 1.25, color: colors.thumb },
        { id: "ControlRight", label: "Ctrl", width: 2.25, color: colors.rPinky }
    ]
];

// ============================================================================
// INSTANT MODE: Gaming Prevention Configuration
// ============================================================================

/**
 * Configuration for gaming prevention and validation thresholds.
 * These values can be tuned based on observed false positive/negative rates.
 * 
 * See: INSTANT_MODE_SPRINT_PLAN.md - Task 1.1 for threshold rationale
 */
const INSTANT_MODE_CONFIG = {
    MAX_WRONG_ATTEMPTS_PER_CLUSTER: 5,  // Maximum wrong keys allowed per cluster
    MAX_WRONG_RATIO: 0.4,                // 40% wrong keystrokes threshold
    MIN_SESSION_TIME_MS: 2000,           // Minimum 2 seconds to prevent instant completion
    MAX_REASONABLE_WPM: 250,             // Flag sessions above this (Bangla world record ~180)
    MIN_ACCURACY_THRESHOLD: 30           // Flag sessions below 30% accuracy
};

// ============================================================================
// INSTANT MODE: State Variables
// ============================================================================

let currentText = '';
let currentNText = '';
let currentSequence = [];
let currentIndex = 0;
let typedCorrectness = [];
let instKeystrokes = { total: 0, correct: 0, wrong: 0, mistakes: 0 };
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
    clusterAttempts: {},          // NEW: Track wrong attempts per cluster
    maxWrongAttemptsPerCluster: 0 // NEW: Track maximum attempts on any cluster
};
let instTimer = null;
let instChartInstance = null;

function generateSequence(text) {
    let nText = text.normalize('NFC');
    nText = nText.replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD').replace(/\u09AF\u09BC/g, '\u09DF').replace(/\r/g, '');
    const seq = [];
    let i = 0;
    while (i < nText.length) {
        let char = nText[i];
        let hasReph = false;
        if (char === '\u09B0' && nText[i + 1] === '\u09CD') {
            hasReph = true; i += 2; char = nText[i] || ' ';
        }
        const cluster = { base: char, prefixKars: [], suffixKars: [], pholas: [], hasReph };
        let nextIdx = i + 1;
        while (nextIdx < nText.length) {
            const next = nText[nextIdx];
            if (next === '\u09BF' || next === '\u09C7' || next === '\u09C8' || next === '\u09CB' || next === '\u09CC') {
                if (next === '\u09CB') { cluster.prefixKars.push('\u09C7'); cluster.suffixKars.push('\u09BE'); }
                else if (next === '\u09CC') { cluster.prefixKars.push('\u09C7'); cluster.suffixKars.push('\u09D7'); }
                else cluster.prefixKars.push(next);
                nextIdx++;
            } else if ('\u09BE\u09C0\u09C1\u09C2\u09C3\u0981'.includes(next)) {
                cluster.suffixKars.push(next); nextIdx++;
            } else if (next === '\u09CD') {
                cluster.pholas.push('\u09CD'); nextIdx++;
                if (nText[nextIdx]) { cluster.pholas.push(nText[nextIdx]); nextIdx++; }
            } else break;
        }
        const clusterEnd = nextIdx;
        const clusterSteps = [];

        cluster.prefixKars.forEach(k => {
            const key = (k === '\u09BF') ? 'd' : (k === '\u09C8') ? 'Shift+C' : 'c';
            clusterSteps.push({ char: k, key, targetEnd: -1, clusterEnd });
        });
        const base = cluster.base;
        if (BIJOY_STEPS_BASE[base]) {
            BIJOY_STEPS_BASE[base].forEach(k => clusterSteps.push({ char: base, key: k, targetEnd: -1, clusterEnd }));
        } else {
            clusterSteps.push({ char: base, key: '?', targetEnd: -1, clusterEnd });
        }
        cluster.pholas.forEach(p => {
            if (p === '\u09CD') clusterSteps.push({ char: '\u09CD', key: 'g', targetEnd: -1, clusterEnd });
            else if (BIJOY_STEPS_BASE[p]) BIJOY_STEPS_BASE[p].forEach(k => clusterSteps.push({ char: p, key: k, targetEnd: -1, clusterEnd }));
        });
        if (cluster.hasReph) clusterSteps.push({ char: '\u09B0\u09CD', key: 'Shift+A', targetEnd: -1, clusterEnd });
        cluster.suffixKars.forEach(k => {
            const keys = { '\u09BE': ['f'], '\u09C0': ['Shift+D'], '\u09C1': ['s'], '\u09C2': ['Shift+S'], '\u09C3': ['a'], '\u09D7': ['Shift+X'], '\u0981': ['Shift+7'] }[k] || [];
            keys.forEach(key => clusterSteps.push({ char: k, key, targetEnd: -1, clusterEnd }));
        });
        if (clusterSteps.length > 0) clusterSteps[clusterSteps.length - 1].targetEnd = clusterEnd;
        seq.push(...clusterSteps);
        i = nextIdx;
    }
    return { seq, nText };
}

function getClusterBoundaries(seq) {
    const bounds = [];
    let prev = 0;
    seq.forEach(s => {
        if (s.targetEnd >= 0) {
            bounds.push({ start: prev, end: s.targetEnd, seqEnd: s.targetEnd });
            prev = s.targetEnd;
        }
    });
    return bounds;
}

// ============================================================================
// INSTANT MODE: Gaming Prevention & Validation
// ============================================================================

/**
 * Validates typing session to detect gaming/cheating patterns.
 * 
 * This function checks multiple indicators of suspicious typing behavior:
 * - Excessive wrong keystroke ratio (spam detection)
 * - Unrealistic WPM values (impossible speeds)
 * - Session duration too short (instant completion exploits)
 * - Low accuracy with high WPM (contradiction indicator)
 * - Excessive attempts on single character (brute force)
 * 
 * @param {Object} sessionData - Complete session statistics
 * @param {number} sessionData.wpm - Net WPM
 * @param {number} sessionData.rawWpm - Raw WPM (optional, for future checks)
 * @param {number} sessionData.acc - Accuracy percentage (0-100)
 * @param {number} sessionData.consistency - Consistency percentage (optional)
 * @param {number} sessionData.timeMs - Session duration in milliseconds
 * @param {number} sessionData.totalKeystrokes - All keystrokes including wrong
 * @param {number} sessionData.wrongKeystrokes - Number of wrong keystrokes
 * @param {number} sessionData.correctKeystrokes - Number of correct keystrokes
 * @param {number} sessionData.maxWrongAttemptsPerCluster - Max attempts on single character
 * 
 * @returns {Object} Validation result
 * @returns {boolean} returns.isValid - True if session passes all checks
 * @returns {string} returns.reason - Human-readable failure reason (empty if valid)
 * @returns {string[]} returns.flags - Array of validation flags triggered
 * 
 * @example
 * const result = validateTypingSession({
 *   wpm: 45, acc: 90, timeMs: 60000,
 *   totalKeystrokes: 300, wrongKeystrokes: 30,
 *   correctKeystrokes: 270, maxWrongAttemptsPerCluster: 2
 * });
 * // => { isValid: true, reason: '', flags: [] }
 */
function validateTypingSession(sessionData) {
    const flags = [];
    let isValid = true;
    let reason = '';
    
    // Check 1: Wrong keystroke ratio
    const wrongRatio = sessionData.totalKeystrokes > 0 
        ? sessionData.wrongKeystrokes / sessionData.totalKeystrokes 
        : 0;
    
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
        reason = `Session too short (${Math.round(sessionData.timeMs / 1000)}s)`;
    }
    
    // Check 4: Suspiciously low accuracy with high WPM
    // (Indicator of spam-then-correct pattern)
    if (sessionData.acc < INSTANT_MODE_CONFIG.MIN_ACCURACY_THRESHOLD && sessionData.wpm > 100) {
        flags.push('LOW_ACCURACY_HIGH_WPM');
        isValid = false;
        reason = `Low accuracy (${sessionData.acc}%) with high WPM`;
    }
    
    // Check 5: Per-cluster wrong attempt tracking
    if (sessionData.maxWrongAttemptsPerCluster > INSTANT_MODE_CONFIG.MAX_WRONG_ATTEMPTS_PER_CLUSTER) {
        flags.push('EXCESSIVE_CLUSTER_ATTEMPTS');
        isValid = false;
        reason = `Too many attempts on single character (${sessionData.maxWrongAttemptsPerCluster} attempts)`;
    }
    
    return { isValid, reason, flags };
}

/**
 * Calculate word-level mistakes for Net WPM.
 * 
 * In Bangla typing (Bangladesh Computer Council standard):
 * - One error = one incorrectly typed word (regardless of how many characters are wrong)
 * - This prevents penalizing users multiple times for complex Juktakkhor errors
 * 
 * @param {Array} correctness - Array of boolean/undefined for each cluster
 * @param {Array} bounds - Cluster boundaries from getClusterBoundaries()
 * @param {string} nText - Normalized text
 * @returns {number} Count of words with at least one error
 */
function getCompletedMistakes(correctness, bounds, nText) {
    let mistakes = 0;
    let inWord = false;
    let wordHasError = false;

    for (let i = 0; i < bounds.length; i++) {
        const clusterText = nText.slice(bounds[i].start, bounds[i].end);
        // Treat anything that isn't a non-whitespace character as a boundary
        const isSpace = /\s/.test(clusterText) || clusterText === '\n';

        if (!isSpace) {
            if (!inWord) {
                inWord = true;
                wordHasError = false;
            }
            if (correctness[i] === false) {
                wordHasError = true;
            }
        } else {
            if (inWord) {
                if (wordHasError) mistakes++;
                inWord = false;
            }
        }
    }
    if (inWord && wordHasError) mistakes++;
    return mistakes;
}

function getDisplayClusters(bounds, nText) {
    const display = [];
    const attachingChars = new Set(['\u0982', '\u0981', '\u0983']);

    let i = 0;
    while (i < bounds.length) {
        const cl = bounds[i];
        const clText = nText.slice(cl.start, cl.end);
        let mergedEnd = i;
        let displayText = clText;
        let j = i + 1;
        while (j < bounds.length) {
            const nextText = nText.slice(bounds[j].start, bounds[j].end);
            if (nextText.length === 1 && attachingChars.has(nextText)) {
                displayText += nextText;
                mergedEnd = j;
                j++;
            } else break;
        }
        display.push({
            text: displayText,
            clusterIndices: Array.from({ length: mergedEnd - i + 1 }, (_, k) => i + k)
        });
        i = mergedEnd + 1;
    }
    return display;
}

function renderTypingArea() {
    const display = document.getElementById('typed-display');
    display.innerHTML = '';
    const bounds = getClusterBoundaries(currentSequence);
    const displayClusters = getDisplayClusters(bounds, currentNText);

    let currentClusterIdx = -1;
    for (let ci = 0; ci < bounds.length; ci++) {
        const stepsInCluster = currentSequence.filter(s => s.clusterEnd === bounds[ci].end);
        const stepsBeforeThis = currentSequence.indexOf(stepsInCluster[0]);
        if (currentIndex >= stepsBeforeThis && currentIndex < stepsBeforeThis + stepsInCluster.length) {
            currentClusterIdx = ci;
            break;
        }
        if (currentIndex >= stepsBeforeThis + stepsInCluster.length) currentClusterIdx = ci + 1;
    }

    displayClusters.forEach(dc => {
        const span = document.createElement('span');
        span.textContent = dc.text;
        span.className = 'char';

        const indices = dc.clusterIndices;
        const minIdx = indices[0];
        const maxIdx = indices[indices.length - 1];

        if (maxIdx < currentClusterIdx) {
            const allCorrect = indices.every(ci => typedCorrectness[ci] !== false);
            span.classList.add(allCorrect ? 'correct' : 'wrong');
        } else if (minIdx <= currentClusterIdx && currentClusterIdx <= maxIdx) {
            span.classList.add('current');
        }
        display.appendChild(span);
    });

    // Auto-scroll logic so cursor is always centered
    const currentSpan = display.querySelector('.char.current');
    if (currentSpan) {
        const container = document.querySelector('.inst-typing-area');
        if (currentSpan.offsetTop + currentSpan.offsetHeight > container.scrollTop + container.clientHeight - 40 ||
            currentSpan.offsetTop < container.scrollTop + 40) {
            container.scrollTo({
                top: currentSpan.offsetTop - container.clientHeight / 2,
                behavior: 'smooth'
            });
        }
    }
}

function updateStepGuide() {
    if (currentIndex >= currentSequence.length) {
        document.getElementById('step-bn').textContent = '✓';
        document.getElementById('step-keys').innerHTML = '';
        document.getElementById('step-context').textContent = 'সম্পন্ন!';

        // Finalize stats exactly as we hit completion
        if (!instTypingState.endTime) {
            instTypingState.endTime = Date.now();
            showInstResults();
        }

        highlightKeysForStep(null);
        return;
    }

    document.getElementById('success-bar').classList.remove('show');
    const step = currentSequence[currentIndex];

    const clusterEnd = step.clusterEnd;
    const clusterBounds = getClusterBoundaries(currentSequence);
    const clusterBound = clusterBounds.find(b => b.end === clusterEnd);
    const clusterText = clusterBound ? currentNText.slice(clusterBound.start, clusterBound.end) : step.char;

    const stepsInCluster = currentSequence.filter(s => s.clusterEnd === clusterEnd);
    const stepIdxInCluster = stepsInCluster.indexOf(step);
    const totalStepsInCluster = stepsInCluster.length;

    if (clusterText === '\n') {
        document.getElementById('step-bn').innerHTML = '&crarr;';
    } else {
        document.getElementById('step-bn').textContent = clusterText || step.char;
    }

    const keysDiv = document.getElementById('step-keys');
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
        document.getElementById('step-context').textContent = `ধাপ ${toBn(stepIdxInCluster + 1)} / ${toBn(totalStepsInCluster)} — এই অক্ষরের জন্য`;
    } else {
        document.getElementById('step-context').textContent = '';
    }

    highlightKeysForStep(step.key, '');
}

function highlightKeysForStep(step, prefix = '') {
    document.querySelectorAll(`.${prefix}key-rect`).forEach(k => {
        const id = k.id.replace(`${prefix}rect-`, '');
        k.classList.remove('active');
        ['eng', 'tl', 'tr', 'bl', 'br', 'main'].forEach(p => {
            const el = document.getElementById(`${prefix}${p}-${id}`);
            if (el) el.style.fill = '';
        });
    });
    document.querySelectorAll(`.${prefix}finger-shape`).forEach(f => f.classList.remove('active-finger'));
    if (!step) return;

    if (step.startsWith('Shift+')) {
        const kp = step.split('+')[1];
        let id = getKeyIdFromStep(kp);
        activateKey(id, prefix); activateKey('ShiftLeft', prefix);
    } else if (step === 'Space') {
        activateKey('Space', prefix);
    } else if (step === 'Enter') {
        activateKey('Enter', prefix);
    } else {
        let id = getKeyIdFromStep(step);
        activateKey(id, prefix);
    }
}

function activateKey(id, prefix = '') {
    const glowId = prefix ? 'yt-tog-glow' : 'tog-glow';
    const glow = document.getElementById(glowId)?.checked;
    if (!glow) return;

    const rect = document.getElementById(`${prefix}rect-${id}`);
    if (rect) {
        rect.classList.add('active');
        ['eng', 'tl', 'tr', 'bl', 'br', 'main'].forEach(p => {
            const el = document.getElementById(`${prefix}${p}-${id}`);
            if (el) el.style.fill = getThemeColor('--bg');
        });
    }
    rows.forEach(row => {
        const key = row.find(k => k.id === id);
        if (key) {
            const fId = Object.keys(colors).find(c => colors[c] === key.color);
            if (fId) document.querySelectorAll(`.${prefix}finger-shape[data-finger="${fId}"]`).forEach(el => el.classList.add('active-finger'));
        }
    });
}

document.querySelector('.inst-typing-area').addEventListener('click', () => {
    focusInput();
});

document.getElementById('hidden-input').addEventListener('keydown', e => {
    if (["Enter", "Tab", "Shift", "Control", "Alt", "CapsLock"].includes(e.key) && e.key !== 'Enter') return;
    e.preventDefault();

    if (e.key === 'Backspace') {
        if (currentIndex === 0) return;
        currentIndex--;
        const prevStep = currentSequence[currentIndex];
        const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === prevStep.clusterEnd || b.end === prevStep.targetEnd);
        if (ci >= 0 && typedCorrectness[ci] !== undefined) {
            if (typedCorrectness[ci] === true) instKeystrokes.correct--;
            else if (typedCorrectness[ci] === false) instKeystrokes.wrong--;
            typedCorrectness[ci] = undefined;
        }
        updateStats();
        renderTypingArea();
        updateStepGuide();
        return;
    }

    if (currentIndex >= currentSequence.length) return;

    const step = currentSequence[currentIndex].key;
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

    const curStep = currentSequence[currentIndex];
    const isLastInCluster = curStep.targetEnd >= 0;

    if (instKeystrokes.total === 0) {
        instTypingState.startTime = Date.now();
        fetch('/api/increment_counter/tests_started', { method: 'POST' });

        if (instTimer) clearInterval(instTimer);
        instTimer = setInterval(() => {
            const corr = instKeystrokes.correct - instTypingState.lastCorr;
            const tot = instKeystrokes.total - instTypingState.lastTotal;
            const err = instKeystrokes.wrong - instTypingState.lastErr;

            const mists = getCompletedMistakes(typedCorrectness, getClusterBoundaries(currentSequence), currentNText);
            const mistakesInInterval = mists - instTypingState.lastMistakes;

            /**
             * Interval Net WPM Calculation (per-second snapshot):
             * 
             * Gross WPM = (keystrokes / 5) * 60
             * Net WPM = Gross WPM - (mistakes * 60)
             * 
             * Note: Industry standard treats 5 keystrokes as 1 "word"
             * This accounts for Bangla's complex Juktakkhor which may take
             * 2-3 keystrokes for a single character (e.g., "ক্ষ" = k+g+N in Bijoy)
             */
            const wpm = Math.max(0, Math.floor((tot / 5 - mistakesInInterval) * 60));
            const rawWpm = Math.max(0, Math.floor((tot / 5) * 60));

            instTypingState.wpmHistory.push(wpm);
            instTypingState.rawHistory.push(rawWpm);
            instTypingState.errHistory.push(err);
            instTypingState.mistakesHistory.push(mistakesInInterval);

            instTypingState.lastCorr = instKeystrokes.correct;
            instTypingState.lastTotal = instKeystrokes.total;
            instTypingState.lastErr = instKeystrokes.wrong;
            instTypingState.lastMistakes = mists;
        }, 1000);
    }

    if (matched) {
        instKeystrokes.total++;
        instKeystrokes.correct++;
        if (isLastInCluster) {
            const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === curStep.targetEnd);
            if (typedCorrectness[ci] === undefined) typedCorrectness[ci] = true;
        }
        currentIndex++;
    } else {
        instKeystrokes.total++;
        instKeystrokes.wrong++;
        if (isLastInCluster) {
            const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === curStep.targetEnd);
            
            // Track per-cluster wrong attempts for gaming detection
            if (!instTypingState.clusterAttempts[ci]) {
                instTypingState.clusterAttempts[ci] = 0;
            }
            instTypingState.clusterAttempts[ci]++;
            
            // Update maximum attempts tracker
            if (instTypingState.clusterAttempts[ci] > instTypingState.maxWrongAttemptsPerCluster) {
                instTypingState.maxWrongAttemptsPerCluster = instTypingState.clusterAttempts[ci];
            }
            
            typedCorrectness[ci] = false;
            currentIndex++;
        } else {
            const ci = getClusterBoundaries(currentSequence).findIndex(b => b.end === curStep.clusterEnd);
            
            // Track attempts even for partial cluster wrong keystroke
            if (!instTypingState.clusterAttempts[ci]) {
                instTypingState.clusterAttempts[ci] = 0;
            }
            instTypingState.clusterAttempts[ci]++;
            
            // Update maximum attempts tracker
            if (instTypingState.clusterAttempts[ci] > instTypingState.maxWrongAttemptsPerCluster) {
                instTypingState.maxWrongAttemptsPerCluster = instTypingState.clusterAttempts[ci];
            }
            
            typedCorrectness[ci] = false;
            currentIndex++;
        }
    }

    updateStats();
    renderTypingArea();
    updateStepGuide();
});

function updateStats() {
    const done = typedCorrectness.filter(v => v !== undefined).length;
    const correct = typedCorrectness.filter(v => v === true).length;
    const wrong = typedCorrectness.filter(v => v === false).length;
    document.getElementById('stat-chars').textContent = toBn(done);
    document.getElementById('stat-correct').textContent = toBn(correct);
    document.getElementById('stat-wrong').textContent = toBn(wrong);

    document.getElementById('stat-keys-total').textContent = toBn(instKeystrokes.total);
    document.getElementById('stat-keys-correct').textContent = toBn(instKeystrokes.correct);
    document.getElementById('stat-keys-wrong').textContent = toBn(instKeystrokes.wrong);

    let currentWpm = 0;
    let currentAcc = 100;

    if (instTypingState && instTypingState.startTime) {
        const elapsedMin = (Date.now() - instTypingState.startTime) / 60000;
        if (elapsedMin > 0) {
            const mistakes = getCompletedMistakes(typedCorrectness, getClusterBoundaries(currentSequence), currentNText);
            instKeystrokes.mistakes = mistakes;
            /**
             * Real-time Net WPM:
             * Net WPM = ((Total Keystrokes / 5) - Word-Level Mistakes) / Minutes
             * 
             * Where:
             * - Total Keystrokes: All physical key presses (including Shift/Link keys)
             * - /5: Converts keystrokes to "word equivalents" (industry standard)
             * - Mistakes: Count of words with any error (not character-level)
             */
            currentWpm = Math.max(0, Math.floor((instKeystrokes.total / 5 - mistakes) / elapsedMin));
        }
    }
    if (instKeystrokes.total > 0) {
        currentAcc = Math.floor((instKeystrokes.correct / instKeystrokes.total) * 100);
    }

    const elWpm = document.getElementById('stat-wpm-rt');
    const elAcc = document.getElementById('stat-acc-rt');
    if (elWpm) elWpm.textContent = toBn(currentWpm);
    if (elAcc) elAcc.textContent = toBn(currentAcc) + '%';
}

function focusInput() { document.getElementById('hidden-input').focus(); }

function loadNewText() {
    if (instTimer) {
        clearInterval(instTimer);
        instTimer = null;
    }
    // Dynamically fetch a valid 20-60 word passage from YouTube Data
    let ytPassage = getRandomYouTubePassage(20, 60);

    // Fallback to hardcoded array if library is empty or no valid constraints found
    if (ytPassage) {
        currentText = ytPassage;
    } else {
        const idx = Math.floor(Math.random() * BANGLA_TEXTS.length);
        currentText = BANGLA_TEXTS[idx];
    }

    const result = generateSequence(currentText);
    currentSequence = result.seq;
    currentNText = result.nText;
    currentIndex = 0;
    typedCorrectness = [];
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
        clusterAttempts: {},          // Reset cluster attempt tracking
        maxWrongAttemptsPerCluster: 0 // Reset max attempts tracker
    };
    updateStats();
    renderTypingArea();
    updateStepGuide();
    focusInput();
}

function resetTyping() {
    if (instTimer) {
        clearInterval(instTimer);
        instTimer = null;
    }
    currentIndex = 0;
    typedCorrectness = [];
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
        clusterAttempts: {},          // Reset cluster attempt tracking
        maxWrongAttemptsPerCluster: 0 // Reset max attempts tracker
    };
    updateStats();
    renderTypingArea();
    updateStepGuide();
    document.getElementById('success-bar').classList.remove('show');
    focusInput();
}

function resNewText() {
    document.getElementById('modal-inst-results').classList.remove('open');
    loadNewText();
}

function resResetText() {
    document.getElementById('modal-inst-results').classList.remove('open');
    resetTyping();
}

function showInstResults() {
    if (!instTypingState.startTime) {
        instTypingState.startTime = instTypingState.endTime - 1000; // fallback to 1 sec
    }
    const timeMs = Math.max(0, instTypingState.endTime - instTypingState.startTime);
    const timeSec = timeMs / 1000;
    const timeMin = timeSec / 60;

    const correctChars = typedCorrectness.filter(v => v === true).length;
    const wrongChars = typedCorrectness.filter(v => v === false).length;
    const extraChars = Math.max(0, instKeystrokes.wrong - wrongChars);
    const missedChars = 0; // Forced correction mechanics

    /**
     * Final Results Net WPM Calculation:
     * 
     * Gross WPM = (Total Keystrokes / 5) / Time in Minutes
     * Net WPM = Gross WPM - (Mistakes / Time in Minutes)
     * 
     * Simplified: Net WPM = ((Total Keystrokes / 5) - Mistakes) / Time in Minutes
     * 
     * For Bangla typing:
     * - 5 keystrokes = 1 "word" (industry standard)
     * - Mistakes counted at word-level (not character-level)
     * - Complex Juktakkhor may take 2-3 keystrokes per character
     */
    const mistakes = getCompletedMistakes(typedCorrectness, getClusterBoundaries(currentSequence), currentNText);
    const wpm = timeMin > 0 ? Math.max(0, Math.floor((instKeystrokes.total / 5 - mistakes) / timeMin)) : 0;
    const rawWpm = timeMin > 0 ? Math.floor(instKeystrokes.total / 5 / timeMin) : 0;
    const acc = instKeystrokes.total > 0 ? Math.floor(instKeystrokes.correct / instKeystrokes.total * 100) : 0;

    // Calculate Consistency (Coefficient of Variation) mapped to 0-100%
    let consistency = 0;
    if (instTypingState.wpmHistory.length > 2) {
        const history = instTypingState.wpmHistory;
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        // Common mapping: 100% - CV%, clamped.
        let unmapped = 100 - (cv * 100);
        consistency = Math.max(0, Math.min(100, Math.round(unmapped)));
    } else {
        consistency = acc; // Fallback if too short
    }

    document.getElementById('res-wpm').textContent = toBn(wpm);
    document.getElementById('res-acc').textContent = toBn(acc) + '%';
    document.getElementById('res-raw').textContent = toBn(rawWpm);

    document.getElementById('res-char-c').textContent = toBn(correctChars);
    document.getElementById('res-char-i').textContent = toBn(wrongChars);
    document.getElementById('res-char-e').textContent = toBn(extraChars);
    document.getElementById('res-char-m').textContent = toBn(missedChars);

    document.getElementById('res-cons').textContent = toBn(consistency) + '%';
    document.getElementById('res-time').textContent = toBn(Math.round(timeSec)) + 's';

    // Validate session for gaming/cheating patterns
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
    
    const validation = validateTypingSession(sessionData);
    
    // Display validation warning if session is invalid
    const validationWarning = document.getElementById('validation-warning');
    const validationReason = document.getElementById('validation-reason');
    
    if (!validation.isValid) {
        if (validationWarning) {
            validationWarning.style.display = 'block';
        }
        if (validationReason) {
            validationReason.textContent = validation.reason;
        }
        console.warn('Invalid session detected:', validation.flags);
    } else {
        if (validationWarning) {
            validationWarning.style.display = 'none';
        }
    }

    document.getElementById('modal-inst-results').classList.add('open');
    renderInstChart();

    // Save History directly to SQLite database with validation flags
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
        isValid: validation.isValid,              // NEW: Validation flag
        validationFlags: validation.flags.join(',') // NEW: Comma-separated flags
    };

    fetch('/api/inst_stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.error("Error saving stats to DB:", e));
}

function renderInstChart() {
    const ctx = document.getElementById('instWpmChart').getContext('2d');
    if (instChartInstance) {
        instChartInstance.destroy();
    }

    const labels = Array.from({ length: instTypingState.wpmHistory.length }, (_, i) => i + 1);

    instChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'wpm',
                    data: instTypingState.wpmHistory,
                    borderColor: getThemeColor('--accent'),
                    backgroundColor: getThemeColor('--accent') + '22',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'raw',
                    data: instTypingState.rawHistory,
                    borderColor: getThemeColor('--surface3'),
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y'
                },
                {
                    label: 'errors',
                    data: instTypingState.errHistory.map(e => e > 0 ? e : null),
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
                    labels: {
                        color: getThemeColor('--subtext'),
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { family: "'JetBrains Mono', monospace", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: getThemeColor('--surface2'), drawBorder: false },
                    ticks: { color: getThemeColor('--subtext'), font: { family: "'JetBrains Mono', monospace" } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: getThemeColor('--surface2'), drawBorder: false },
                    ticks: { color: getThemeColor('--subtext'), stepSize: 20, font: { family: "'JetBrains Mono', monospace" } },
                    title: { display: true, text: 'Words Per Minute', color: getThemeColor('--subtext'), font: { family: "'JetBrains Mono', monospace" } },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: getThemeColor('--wrong'), stepSize: 1, precision: 0, font: { family: "'JetBrains Mono', monospace" } },
                    title: { display: true, text: 'Errors', color: getThemeColor('--wrong'), font: { family: "'JetBrains Mono', monospace" } },
                    beginAtZero: true
                }
            }
        }
    });
}


function getKeyIdFromStep(step) {
    if (/^\d$/.test(step)) return `Digit${step}`;
    switch (step) {
        case '\\': return 'Backslash';
        case ',': return 'Comma';
        case '.': return 'Period';
        case '/': return 'Slash';
        case '-': return 'Minus';
        case '=': return 'Equal';
        case '[': return 'BracketLeft';
        case ']': return 'BracketRight';
        case ';': return 'Semicolon';
        case "'": return 'Quote';
        case '`': return 'Backquote';
        default: return `Key${step.toUpperCase()}`;
    }
}

function toggleHintsPanel() {
    const panel = document.getElementById('hints-panel');
    const btn = document.getElementById('btn-hints');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
}

document.addEventListener('click', e => {
    const wrapInst = document.querySelector('#app-instant .hints-wrap');
    if (wrapInst && !wrapInst.contains(e.target)) {
        document.getElementById('hints-panel')?.classList.remove('open');
        document.getElementById('btn-hints')?.classList.remove('active');
    }
    const wrapYT = document.querySelector('#app-youtube .hints-wrap');
    if (wrapYT && !wrapYT.contains(e.target)) {
        document.getElementById('yt-hints-panel')?.classList.remove('open');
        document.getElementById('yt-btn-hints')?.classList.remove('active');
    }
});

function applyHints() {
    const glow = document.getElementById('tog-glow').checked;
    const hands = document.getElementById('tog-hands').checked;
    const keyboard = document.getElementById('tog-keyboard').checked;
    const guide = document.getElementById('tog-guide').checked;

    const glowStyle = document.getElementById('glow-style');
    if (glowStyle) glowStyle.remove();

    document.querySelectorAll('.finger-shape, .palm-shape').forEach(el => {
        el.style.visibility = hands ? '' : 'hidden';
    });

    const instSvg = document.querySelector('#svg-container svg');
    if (instSvg) {
        const totalWidth = 15 * keySize + 14 * gap;
        const baseHeight = 5 * keySize + 4 * gap;
        const heightWithHands = baseHeight + 110;
        const newHeight = hands ? heightWithHands : baseHeight + 10;
        instSvg.setAttribute("viewBox", `0 0 ${totalWidth} ${newHeight}`);
    }

    const keyboardWrap = document.getElementById('svg-container');
    if (!keyboard) {
        keyboardWrap.style.display = 'none';
    } else {
        keyboardWrap.style.display = 'block';
        document.querySelectorAll('.finger-shape, .palm-shape').forEach(el => {
            el.style.visibility = hands ? '' : 'hidden';
        });
    }

    const guideWrap = document.getElementById('step-guide');
    if (guideWrap) {
        guideWrap.style.display = guide ? 'flex' : 'none';
    }

    if (currentSequence && currentSequence[currentIndex]) {
        highlightKeysForStep(currentSequence[currentIndex].key);
    } else {
        highlightKeysForStep(null);
    }
}

// ═══════════════════════════════════════════════════════
//  INSTANT MODE STATS DASHBOARD LOGIC
// ═══════════════════════════════════════════════════════

function switchInstTab(tab) {
    const typeTab = document.getElementById('inst-tab-type');
    const statsTab = document.getElementById('inst-tab-stats');
    const typeView = document.getElementById('inst-view-type');
    const statsView = document.getElementById('inst-view-stats');

    if (tab === 'type') {
        typeTab.classList.add('active');
        statsTab.classList.remove('active');
        typeView.style.display = 'flex';
        statsView.style.display = 'none';
        focusInput();
    } else if (tab === 'stats') {
        statsTab.classList.add('active');
        typeTab.classList.remove('active');
        typeView.style.display = 'none';
        statsView.style.display = 'block';
        renderInstStatsView();
    }
}

function renderActivityHeatmap(history) {
    const grid = document.getElementById('mt-activity-grid');
    const monthRow = document.getElementById('mt-month-labels');
    const totalTestsEl = document.getElementById('mt-total-tests');
    const leftLabels = document.querySelector('.activity-labels-left');
    if (!grid || !monthRow) return;

    grid.innerHTML = '';
    monthRow.innerHTML = '';
    if (totalTestsEl) totalTestsEl.textContent = `${history.length} tests`;

    // Sync left labels height to grid height
    setTimeout(() => {
        if (leftLabels && grid) {
            leftLabels.style.height = grid.offsetHeight + 'px';
        }
    }, 50);

    // Get current date and go back to the Monday of 52 weeks ago
    const now = new Date();
    let start = new Date(now);
    start.setDate(now.getDate() - 364);
    while (start.getDay() !== 1) { // 1 = Monday
        start.setDate(start.getDate() - 1);
    }

    // Group history by date string
    const activityMap = {};
    history.forEach(h => {
        const dateKey = new Date(h.timestamp).toDateString();
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    });

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let lastMonth = -1;

    // Populate 53 weeks (371 days)
    for (let i = 0; i < 371; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const count = activityMap[d.toDateString()] || 0;

        const dayEl = document.createElement('div');
        dayEl.className = 'activity-day';

        // Set level 0-4
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 5) level = 3;
        if (count > 10) level = 4;

        dayEl.setAttribute('data-level', level);
        dayEl.title = `${count} tests on ${d.toDateString()}`;

        grid.appendChild(dayEl);

        // Handle Month Labels
        if (i % 7 === 0) {
            const monthCol = document.createElement('div');
            const curMonth = d.getMonth();
            if (curMonth !== lastMonth) {
                monthCol.textContent = months[curMonth];
                lastMonth = curMonth;
            }
            monthRow.appendChild(monthCol);
        }
    }
}

function getTrendLineData(data) {
    if (data.length < 2) return null;
    let n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    let intercept = (sumY - slope * sumX) / n;

    let trendData = [];
    for (let i = 0; i < n; i++) {
        trendData.push(slope * i + intercept);
    }
    return { points: trendData, slope: slope };
}

// Custom Double Click Handler for Legend
let lastLegendClick = { time: 0, index: -1, chart: null };
function handleLegendClick(e, legendItem, legend) {
    const index = legendItem.datasetIndex;
    const ci = legend.chart;
    const now = Date.now();

    if (lastLegendClick.index === index && lastLegendClick.chart === ci && (now - lastLegendClick.time < 350)) {
        // Double Click Detected
        if (ci.isDatasetVisible(index)) {
            ci.hide(index);
            legendItem.hidden = true;
        } else {
            ci.show(index);
            legendItem.hidden = false;
        }
        lastLegendClick = { time: 0, index: -1, chart: null };
    } else {
        lastLegendClick = { time: now, index: index, chart: ci };
        // Optionally do nothing on single click if only double click is wanted
        // But Chart.js default is single click toggle. 
        // The user said "disabled by doubling clicking", implying single click shouldn't (or maybe they just want an extra way).
        // I'll keep the single click as is for standard UX, or override if they insisted ONLY double click.
        // Usually "disabled by doubling clicking" might mean they want to disable the WHOLE curve? 
        // No, standard toggle is fine. I'll stick to a slightly modified standard or just the double-click detector.
    }
}

async function renderInstStatsView() {
    let history = [];
    let allSettings = {};
    try {
        const resHist = await fetch('/api/inst_stats');
        history = await resHist.json();
        const resSet = await fetch('/api/settings');
        allSettings = await resSet.json();
    } catch (e) {
        console.error("Failed to fetch data from database.", e);
    }

    const totalCompleted = history.length;
    const testsStarted = Math.max(totalCompleted, parseInt(allSettings.tests_started || totalCompleted));
    const completionRate = testsStarted > 0 ? Math.round((totalCompleted / testsStarted) * 100) : 0;
    const restartsPerTest = totalCompleted > 0 ? ((testsStarted - totalCompleted) / totalCompleted).toFixed(1) : 0;

    let totalTimeTyping = 0;
    let totalWords = 0;
    let maxWpm = 0;
    let maxRawWpm = 0;
    let maxAcc = 0;
    let maxCons = 0;
    let sumWpm = 0;
    let sumRawWpm = 0;
    let sumAcc = 0;
    let sumConsistency = 0;

    const wpmData = [];
    const accData = [];
    const labels = [];

    const last10 = history.slice(-10);
    const avgWpm10 = last10.length > 0 ? (last10.reduce((s, h) => s + h.wpm, 0) / last10.length) : 0;
    const avgRawWpm10 = last10.length > 0 ? (last10.reduce((s, h) => s + (h.rawWpm || 0), 0) / last10.length) : 0;
    const avgAcc10 = last10.length > 0 ? (last10.reduce((s, h) => s + h.acc, 0) / last10.length) : 0;
    const avgCons10 = last10.length > 0 ? (last10.reduce((s, h) => {
        let c = h.consistency;
        if (!c) {
            if ((h.totalChars || 0) > 0) c = Math.max(0, 100 - ((h.wrongChars || 0) / (h.totalChars || 1)) * 100);
            else if (h.wpm > 0) c = h.acc;
        }
        return s + (c || 0);
    }, 0) / last10.length) : 0;

    const tbody = document.querySelector('#mt-recent-table tbody');
    tbody.innerHTML = '';
    const recentHistory = [...history].reverse();

    history.forEach((h, index) => {
        totalTimeTyping += (h.timeMs || 0) / 1000;
        const words = Math.round((h.correctChars || 0) / 5);
        totalWords += words;

        if (h.wpm > maxWpm) maxWpm = h.wpm;
        if ((h.rawWpm || 0) > maxRawWpm) maxRawWpm = h.rawWpm;
        if (h.acc > maxAcc) maxAcc = h.acc;

        sumWpm += h.wpm;
        sumRawWpm += (h.rawWpm || 0);
        sumAcc += h.acc;

        let consistency = h.consistency || 0;
        if (!consistency) {
            if ((h.totalChars || 0) > 0) {
                consistency = Math.max(0, 100 - ((h.wrongChars || 0) / (h.totalChars || 1)) * 100);
            } else if (h.wpm > 0) consistency = h.acc;
        }
        if (consistency > maxCons) maxCons = consistency;
        sumConsistency += consistency;

        labels.push(index + 1);
        wpmData.push(h.wpm);
        accData.push(h.acc);
    });

    // Distribution Calculation
    const bins = {};
    history.forEach(h => {
        const bin = Math.floor(h.wpm / 10) * 10;
        const label = `${bin} - ${bin + 9}`;
        bins[label] = (bins[label] || 0) + 1;
    });

    const distLabels = [];
    const distData = [];
    if (history.length > 0) {
        const maxBin = Math.floor(maxWpm / 10) * 10;
        for (let b = 0; b <= Math.max(70, maxBin); b += 10) {
            const label = `${b} - ${b + 9}`;
            distLabels.push(label);
            distData.push(bins[label] || 0);
        }
    }

    // Populate table (up to 15 latest)
    for (let i = 0; i < Math.min(recentHistory.length, 15); i++) {
        const h = recentHistory[i];
        const tr = document.createElement('tr');
        const d = new Date(h.timestamp);

        let cons = h.consistency || 0;
        if (!cons) {
            if ((h.totalChars || 0) > 0) {
                cons = Math.max(0, 100 - ((h.wrongChars || 0) / (h.totalChars || 1)) * 100);
            } else if (h.wpm > 0) cons = h.acc;
        }

        const timeStr = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

        tr.innerHTML = `
                    <td class="wpm-cell">${Math.round(h.wpm)}</td>
                    <td>${Math.round(h.rawWpm || 0)}</td>
                    <td class="acc-cell">${Math.round(h.acc)}%</td>
                    <td>${cons.toFixed(1)}%</td>
                    <td title="correct / incorrect / extra / missed">${h.correctChars || 0}/${h.wrongChars || 0}/${h.extraChars || 0}/${h.missedChars || 0}</td>
                    <td class="date-cell">${timeStr}</td>
                `;
        tbody.appendChild(tr);
    }

    const avgWpm = history.length > 0 ? (sumWpm / history.length) : 0;
    const avgRawWpm = history.length > 0 ? (sumRawWpm / history.length) : 0;
    const avgAcc = history.length > 0 ? (sumAcc / history.length) : 0;
    const avgCons = history.length > 0 ? (sumConsistency / history.length) : 0;

    const seconds = Math.floor(totalTimeTyping % 60);
    const minutes = Math.floor((totalTimeTyping / 60) % 60);
    const hours = Math.floor(totalTimeTyping / 3600);
    const durationStr = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');

    // Apply global data text elements
    document.getElementById('gstat-words-typed').textContent = totalWords;
    document.getElementById('gstat-started').textContent = testsStarted;
    document.getElementById('gstat-completed').textContent = `${totalCompleted} (${completionRate}%)`;
    const restartsSub = document.querySelector('#gstat-completed').parentElement.querySelector('.sub') || document.createElement('div');
    restartsSub.className = 'sub';
    restartsSub.textContent = `${restartsPerTest} restarts per completed test`;
    document.getElementById('gstat-completed').parentElement.appendChild(restartsSub);

    document.getElementById('gstat-timetyping').textContent = durationStr;

    document.getElementById('mgrid-hwpm').textContent = Math.round(maxWpm);
    document.getElementById('mgrid-hraw').textContent = Math.round(maxRawWpm);
    document.getElementById('mgrid-hacc').textContent = Math.round(maxAcc) + '%';
    document.getElementById('mgrid-hcons').textContent = Math.round(maxCons) + '%';

    document.getElementById('mgrid-awpm').textContent = Math.round(avgWpm);
    document.getElementById('mgrid-araw').textContent = Math.round(avgRawWpm);
    document.getElementById('mgrid-aacc').textContent = Math.round(avgAcc) + '%';
    document.getElementById('mgrid-acons').textContent = Math.round(avgCons) + '%';

    document.getElementById('mgrid-awpm-10').textContent = Math.round(avgWpm10);
    document.getElementById('mgrid-araw-10').textContent = Math.round(avgRawWpm10);
    document.getElementById('mgrid-aacc-10').textContent = Math.round(avgAcc10) + '%';
    document.getElementById('mgrid-acons-10').textContent = Math.round(avgCons10) + '%';

    // Activity Heatmap
    renderActivityHeatmap(history);

    // Chart execution
    const ctx = document.getElementById('inst-history-chart').getContext('2d');
    if (globalStatsChartInstance) {
        globalStatsChartInstance.destroy();
    }

    if (history.length > 0) {
        const trendWpm = getTrendLineData(wpmData);
        const datasets = [
            {
                label: 'wpm',
                data: wpmData,
                borderColor: getThemeColor('--accent'),
                backgroundColor: 'rgba(187, 154, 247, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: getThemeColor('--accent'),
                pointRadius: wpmData.length < 50 ? 3 : 0,
                pointHoverRadius: 5
            }
        ];
        if (trendWpm) {
            const sign = trendWpm.slope >= 0 ? '+' : '';
            datasets.push({
                label: `trend (${sign}${trendWpm.slope.toFixed(2)} wpm/session)`,
                data: trendWpm.points,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0
            });
        }

        globalStatsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        title: { display: true, text: 'words per minute', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 102, 105, 0.1)' },
                        ticks: { color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono' } }
                    },
                    x: {
                        title: { display: true, text: 'tests', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        grid: { display: false },
                        ticks: {
                            color: getThemeColor('--surface3'),
                            font: { family: 'JetBrains Mono' },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: getThemeColor('--surface3'),
                            font: { family: 'JetBrains Mono', size: 10 },
                            boxWidth: 12,
                            padding: 10,
                            usePointStyle: true
                        },
                        onClick: handleLegendClick
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('--bg'),
                        titleColor: getThemeColor('--subtext'),
                        bodyColor: getThemeColor('--accent'),
                        borderColor: getThemeColor('--border'),
                        borderWidth: 1,
                        cornerRadius: 4,
                        padding: 10,
                        displayColors: false
                    }
                }
            }
        });
    }

    // Accuracy History Chart
    const accCtx = document.getElementById('inst-acc-history-chart').getContext('2d');
    if (globalAccStatsChartInstance) {
        globalAccStatsChartInstance.destroy();
    }

    if (history.length > 0) {
        const trendAcc = getTrendLineData(accData);
        const accDatasets = [
            {
                label: 'accuracy',
                data: accData,
                borderColor: getThemeColor('--accent'),
                backgroundColor: 'rgba(122, 162, 247, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: getThemeColor('--accent'),
                pointRadius: accData.length < 50 ? 3 : 0,
                pointHoverRadius: 5
            }
        ];
        if (trendAcc) {
            const sign = trendAcc.slope >= 0 ? '+' : '';
            accDatasets.push({
                label: `trend (${sign}${trendAcc.slope.toFixed(2)} %/session)`,
                data: trendAcc.points,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderDash: [5, 5],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0
            });
        }

        globalAccStatsChartInstance = new Chart(accCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: accDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        title: { display: true, text: 'accuracy (%)', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(100, 102, 105, 0.1)' },
                        ticks: { color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono' } }
                    },
                    x: {
                        title: { display: true, text: 'tests', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        grid: { display: false },
                        ticks: {
                            color: getThemeColor('--surface3'),
                            font: { family: 'JetBrains Mono' },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: getThemeColor('--surface3'),
                            font: { family: 'JetBrains Mono', size: 10 },
                            boxWidth: 12,
                            padding: 10,
                            usePointStyle: true
                        },
                        onClick: handleLegendClick
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('--bg'),
                        titleColor: getThemeColor('--subtext'),
                        bodyColor: getThemeColor('--accent'),
                        borderColor: getThemeColor('--border'),
                        borderWidth: 1,
                        cornerRadius: 4,
                        padding: 10,
                        displayColors: false
                    }
                }
            }
        });
    }

    // Speed Distribution Chart
    const distCtx = document.getElementById('inst-dist-chart').getContext('2d');
    if (globalInstDistChartInstance) {
        globalInstDistChartInstance.destroy();
    }

    if (history.length > 0) {
        globalInstDistChartInstance = new Chart(distCtx, {
            type: 'bar',
            data: {
                labels: distLabels,
                datasets: [{
                    label: 'tests',
                    data: distData,
                    backgroundColor: 'rgba(187, 154, 247, 0.6)',
                    borderColor: getThemeColor('--accent'),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: getThemeColor('--bg'),
                        titleColor: getThemeColor('--subtext'),
                        bodyColor: getThemeColor('--accent'),
                        borderColor: getThemeColor('--border'),
                        borderWidth: 1,
                        cornerRadius: 4,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'tests', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 102, 105, 0.1)' },
                        ticks: {
                            color: getThemeColor('--surface3'),
                            font: { family: 'JetBrains Mono' },
                            precision: 0
                        }
                    },
                    x: {
                        title: { display: true, text: 'wpm range', color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono', size: 10 } },
                        grid: { display: false },
                        ticks: { color: getThemeColor('--surface3'), font: { family: 'JetBrains Mono' } }
                    }
                }
            }
        });
    }
}

// ═══════════════════════════════════════════════════════
//  INITIALIZATION

// ═══════════════════════════════════════════════════════
// Initialize theme immediately to prevent flash of wrong colors
initTheme();

// Load Library from Backend
fetchLibrary();

// Render modular SVG keyboards
drawKeyboard('yt-svg-container', 'yt-');
drawKeyboard('svg-container', '');

// Search Input Listener
const ytSearchInput = document.getElementById('yt-library-search');
if (ytSearchInput) {
    ytSearchInput.addEventListener('input', handleYTSearch);
}

// Instant Init (Fallback will run immediately, fetchLibrary will re-trigger with real data)
loadNewText();
// Start in Instant mode
switchMode('instant');