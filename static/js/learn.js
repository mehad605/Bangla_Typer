const CHAR_DISPLAY_NAMES = {
    // Kars
    'া': 'আ-কার (া)', 'ি': 'ই-কার (ি)', 'ী': 'ঈ-কার (ী)',
    'ু': 'উ-কার (ু)', 'ূ': 'ঊ-কার (ূ)', 'ৃ': 'ঋ-কার (ৃ)',
    'ে': 'এ-কার (ে)', 'ৈ': 'ঐ-কার (ৈ)', 'ো': 'ও-কার (ো)', 'ৌ': 'ঔ-কার (ৌ)',
    // Phalas
    '্য': 'য-ফলা (্য)', '্র': 'র-ফলা (্র)', '্ল': 'ল-ফলা (্ল)',
    '্ব': 'ব-ফলা (্ব)', '্ম': 'ম-ফলা (্ম)', '্ন': 'ন-ফলা (্ন)',
    // Others
    '।': 'দাঁড়ি (।)', 'ং': 'অনুস্বার (ং)', 'ঃ': 'বিসর্গ (ঃ)', 'ৎ': 'খণ্ড-ত (ৎ)'
};

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
            { id: 'l7', num: 7, chars: ['ব', 'ভ', '।'] },
            { id: 'l8', num: 8, chars: ['উ', 'ঊ', 'ঋ', 'ব', 'ভ', '।'] },
            { id: 'l9', num: 9, chars: ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'ক', 'খ', 'ত', 'থ', 'দ', 'ধ', 'ব', 'ভ', '।', 'ৎ', 'ঃ'] },
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
            { id: 'k6', num: 6, chars: ['ো', 'ৌ'] },
            { id: 'k7', num: 7, chars: ['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ'] }
        ]
    },
    fola: {
        title: "ফলা",
        lessons: [
            { id: 'f1', num: 1, chars: ['্য', '্র', '্ল'] },
            { id: 'f2', num: 2, chars: ['্ব', '্ম', '্ন'] },
            { id: 'f3', num: 3, chars: ['্য', '্র', '্ল', '্ব', '্ম', '্ন'] }
        ]
    },
    juktakkhor: {
        title: "যুক্তাক্ষর",
        lessons: [
            { id: 'j1', num: 1, chars: ['ক্ক'] },
            { id: 'j2', num: 2, chars: ['ক্ট'] },
            { id: 'j3', num: 3, chars: ['ক্ত'] },
            { id: 'j4', num: 4, chars: ['ক্ক', 'ক্ট', 'ক্ত'] },
            { id: 'j5', num: 5, chars: ['ক্র'] },
            { id: 'j6', num: 6, chars: ['ক্ল'] },
            { id: 'j7', num: 7, chars: ['ক্ষ'] },
            { id: 'j8', num: 8, chars: ['ক্র', 'ক্ল', 'ক্ষ'] },
            { id: 'j9', num: 9, chars: ['ক্স'] },
            { id: 'j10', num: 10, chars: ['ক্ষ্ণ'] },
            { id: 'j11', num: 11, chars: ['ক্ষ্ম'] },
            { id: 'j12', num: 12, chars: ['ক্স', 'ক্ষ্ণ', 'ক্ষ্ম'] },
            { id: 'j13', num: 13, chars: ['খ্র'] },
            { id: 'j14', num: 14, chars: ['গ্গ'] },
            { id: 'j15', num: 15, chars: ['গ্ধ'] },
            { id: 'j16', num: 16, chars: ['খ্র', 'গ্গ', 'গ্ধ'] },
            { id: 'j17', num: 17, chars: ['গ্ন'] },
            { id: 'j18', num: 18, chars: ['গ্য'] },
            { id: 'j19', num: 19, chars: ['গ্র'] },
            { id: 'j20', num: 20, chars: ['গ্ন', 'গ্য', 'গ্র'] },
            { id: 'j21', num: 21, chars: ['গ্ল'] },
            { id: 'j22', num: 22, chars: ['ঘ্ন'] },
            { id: 'j23', num: 23, chars: ['ঘ্র'] },
            { id: 'j24', num: 24, chars: ['গ্ল', 'ঘ্ন', 'ঘ্র'] },
            { id: 'j25', num: 25, chars: ['ঙ্ক'] },
            { id: 'j26', num: 26, chars: ['ঙ্খ'] },
            { id: 'j27', num: 27, chars: ['ঙ্গ'] },
            { id: 'j28', num: 28, chars: ['ঙ্ক', 'ঙ্খ', 'ঙ্গ'] },
            { id: 'j29', num: 29, chars: ['ঙ্ঘ'] },
            { id: 'j30', num: 30, chars: ['চ্চ'] },
            { id: 'j31', num: 31, chars: ['চ্ছ'] },
            { id: 'j32', num: 32, chars: ['ঙ্ঘ', 'চ্চ', 'চ্ছ'] },
            { id: 'j33', num: 33, chars: ['চ্য'] },
            { id: 'j34', num: 34, chars: ['জ্জ'] },
            { id: 'j35', num: 35, chars: ['জ্ঝ'] },
            { id: 'j36', num: 36, chars: ['চ্য', 'জ্জ', 'জ্ঝ'] },
            { id: 'j37', num: 37, chars: ['জ্ঞ'] },
            { id: 'j38', num: 38, chars: ['জ্য'] },
            { id: 'j39', num: 39, chars: ['জ্র'] },
            { id: 'j40', num: 40, chars: ['জ্ঞ', 'জ্য', 'জ্র'] },
            { id: 'j41', num: 41, chars: ['জ্ব'] },
            { id: 'j42', num: 42, chars: ['ঞ্চ'] },
            { id: 'j43', num: 43, chars: ['ঞ্ছ'] },
            { id: 'j44', num: 44, chars: ['জ্ব', 'ঞ্চ', 'ঞ্ছ'] },
            { id: 'j45', num: 45, chars: ['ঞ্জ'] },
            { id: 'j46', num: 46, chars: ['ঞ্ঝ'] },
            { id: 'j47', num: 47, chars: ['ট্ট'] },
            { id: 'j48', num: 48, chars: ['ঞ্জ', 'ঞ্ঝ', 'ট্ট'] },
            { id: 'j49', num: 49, chars: ['ট্য'] },
            { id: 'j50', num: 50, chars: ['ট্র'] },
            { id: 'j51', num: 51, chars: ['ড্ড'] },
            { id: 'j52', num: 52, chars: ['ট্য', 'ট্র', 'ড্ড'] },
            { id: 'j53', num: 53, chars: ['ড্র'] },
            { id: 'j54', num: 54, chars: ['ণ্ট'] },
            { id: 'j55', num: 55, chars: ['ণ্ঠ'] },
            { id: 'j56', num: 56, chars: ['ড্র', 'ণ্ট', 'ণ্ঠ'] },
            { id: 'j57', num: 57, chars: ['ণ্ড'] },
            { id: 'j58', num: 58, chars: ['ণ্য'] },
            { id: 'j59', num: 59, chars: ['ত্ত'] },
            { id: 'j60', num: 60, chars: ['ণ্ড', 'ণ্য', 'ত্ত'] },
            { id: 'j61', num: 61, chars: ['ত্থ'] },
            { id: 'j62', num: 62, chars: ['ত্ন'] },
            { id: 'j63', num: 63, chars: ['ত্য'] },
            { id: 'j64', num: 64, chars: ['ত্থ', 'ত্ন', 'ত্য'] },
            { id: 'j65', num: 65, chars: ['ত্র'] },
            { id: 'j66', num: 66, chars: ['ত্ব'] },
            { id: 'j67', num: 67, chars: ['ট্ম'] },
            { id: 'j68', num: 68, chars: ['ত্র', 'ত্ব', 'ট্ম'] },
            { id: 'j69', num: 69, chars: ['ঠ্য'] },
            { id: 'j70', num: 70, chars: ['ড্য'] },
            { id: 'j71', num: 71, chars: ['ণ্ণ'] },
            { id: 'j72', num: 72, chars: ['ঠ্য', 'ড্য', 'ণ্ণ'] },
            { id: 'j73', num: 73, chars: ['ৎস'] },
            { id: 'j74', num: 74, chars: ['থ্য'] },
            { id: 'j75', num: 75, chars: ['দ্গ'] },
            { id: 'j76', num: 76, chars: ['ৎস', 'থ্য', 'দ্গ'] },
            { id: 'j77', num: 77, chars: ['দ্দ'] },
            { id: 'j78', num: 78, chars: ['দ্ধ'] },
            { id: 'j79', num: 79, chars: ['দ্ব'] },
            { id: 'j80', num: 80, chars: ['দ্দ', 'দ্ধ', 'দ্ব'] },
            { id: 'j81', num: 81, chars: ['দ্য'] },
            { id: 'j82', num: 82, chars: ['দ্র'] },
            { id: 'j83', num: 83, chars: ['ধ্ন'] },
            { id: 'j84', num: 84, chars: ['দ্য', 'দ্র', 'ধ্ন'] },
            { id: 'j85', num: 85, chars: ['ধ্য'] },
            { id: 'j86', num: 86, chars: ['ধ্র'] },
            { id: 'j87', num: 87, chars: ['ধ্ব'] },
            { id: 'j88', num: 88, chars: ['ধ্য', 'ধ্র', 'ধ্ব'] },
            { id: 'j89', num: 89, chars: ['ন্ট'] },
            { id: 'j90', num: 90, chars: ['ন্ঠ'] },
            { id: 'j91', num: 91, chars: ['ন্ড'] },
            { id: 'j92', num: 92, chars: ['ন্ট', 'ন্ঠ', 'ন্ড'] },
            { id: 'j93', num: 93, chars: ['ন্ত'] },
            { id: 'j94', num: 94, chars: ['ন্থ'] },
            { id: 'j95', num: 95, chars: ['ন্দ'] },
            { id: 'j96', num: 96, chars: ['ন্ত', 'ন্থ', 'ন্দ'] },
            { id: 'j97', num: 97, chars: ['ন্ধ'] },
            { id: 'j98', num: 98, chars: ['ন্ন'] },
            { id: 'j99', num: 99, chars: ['ন্য'] },
            { id: 'j100', num: 100, chars: ['ন্ধ', 'ন্ন', 'ন্য'] },
            { id: 'j101', num: 101, chars: ['ন্ব'] },
            { id: 'j102', num: 102, chars: ['প্ট'] },
            { id: 'j103', num: 103, chars: ['প্ত'] },
            { id: 'j104', num: 104, chars: ['ন্ব', 'প্ট', 'প্ত'] },
            { id: 'j105', num: 105, chars: ['প্ন'] },
            { id: 'j106', num: 106, chars: ['প্য'] },
            { id: 'j107', num: 107, chars: ['প্র'] },
            { id: 'j108', num: 108, chars: ['প্ন', 'প্য', 'প্র'] },
            { id: 'j109', num: 109, chars: ['প্ল'] },
            { id: 'j110', num: 110, chars: ['প্স'] },
            { id: 'j111', num: 111, chars: ['ফ্ট'] },
            { id: 'j112', num: 112, chars: ['প্ল', 'প্স', 'ফ্ট'] },
            { id: 'j113', num: 113, chars: ['ফ্র'] },
            { id: 'j114', num: 114, chars: ['ব্জ'] },
            { id: 'j115', num: 115, chars: ['ব্দ'] },
            { id: 'j116', num: 116, chars: ['ফ্র', 'ব্জ', 'ব্দ'] },
            { id: 'j117', num: 117, chars: ['ব্ধ'] },
            { id: 'j118', num: 118, chars: ['ম্ব'] },
            { id: 'j119', num: 119, chars: ['ম্ভ'] },
            { id: 'j120', num: 120, chars: ['ব্ধ', 'ম্ব', 'ম্ভ'] },
            { id: 'j121', num: 121, chars: ['ম্ম'] },
            { id: 'j122', num: 122, chars: ['ম্ল'] },
            { id: 'j123', num: 123, chars: ['য্য'] },
            { id: 'j124', num: 124, chars: ['ম্ম', 'ম্ল', 'য্য'] },
            { id: 'j125', num: 125, chars: ['র্ক'] },
            { id: 'j126', num: 126, chars: ['র্গ'] },
            { id: 'j127', num: 127, chars: ['র্ঘ'] },
            { id: 'j128', num: 128, chars: ['র্ক', 'র্গ', 'র্ঘ'] },
            { id: 'j129', num: 129, chars: ['র্চ'] },
            { id: 'j130', num: 130, chars: ['র্জ'] },
            { id: 'j131', num: 131, chars: ['র্ত'] },
            { id: 'j132', num: 132, chars: ['র্চ', 'র্জ', 'র্ত'] },
            { id: 'j133', num: 133, chars: ['র্দ'] },
            { id: 'j134', num: 134, chars: ['র্ধ'] },
            { id: 'j135', num: 135, chars: ['র্ণ'] },
            { id: 'j136', num: 136, chars: ['র্দ', 'র্ধ', 'র্ণ'] },
            { id: 'j137', num: 137, chars: ['র্প'] },
            { id: 'j138', num: 138, chars: ['র্ব'] },
            { id: 'j139', num: 139, chars: ['র্ম'] },
            { id: 'j140', num: 140, chars: ['র্প', 'র্ব', 'র্ম'] },
            { id: 'j141', num: 141, chars: ['র্য'] },
            { id: 'j142', num: 142, chars: ['র্ল'] },
            { id: 'j143', num: 143, chars: ['র্শ'] },
            { id: 'j144', num: 144, chars: ['র্য', 'র্ল', 'র্শ'] },
            { id: 'j145', num: 145, chars: ['র্ষ'] },
            { id: 'j146', num: 146, chars: ['র্স'] },
            { id: 'j147', num: 147, chars: ['ল্ক'] },
            { id: 'j148', num: 148, chars: ['র্ষ', 'র্স', 'ল্ক'] },
            { id: 'j149', num: 149, chars: ['ল্গ'] },
            { id: 'j150', num: 150, chars: ['ল্ট'] },
            { id: 'j151', num: 151, chars: ['ল্ড'] },
            { id: 'j152', num: 152, chars: ['ল্গ', 'ল্ট', 'ল্ড'] },
            { id: 'j153', num: 153, chars: ['ল্প'] },
            { id: 'j154', num: 154, chars: ['ল্ফ'] },
            { id: 'j155', num: 155, chars: ['ল্ব'] },
            { id: 'j156', num: 156, chars: ['ল্প', 'ল্ফ', 'ল্ব'] },
            { id: 'j157', num: 157, chars: ['ল্ম'] },
            { id: 'j158', num: 158, chars: ['ল্ল'] },
            { id: 'j159', num: 159, chars: ['শ্ন'] },
            { id: 'j160', num: 160, chars: ['ল্ম', 'ল্ল', 'শ্ন'] },
            { id: 'j161', num: 161, chars: ['শ্ল'] },
            { id: 'j162', num: 162, chars: ['শ্ব'] },
            { id: 'j163', num: 163, chars: ['শ্য'] },
            { id: 'j164', num: 164, chars: ['শ্ল', 'শ্ব', 'শ্য'] },
            { id: 'j165', num: 165, chars: ['শ্র'] },
            { id: 'j166', num: 166, chars: ['ষ্ক'] },
            { id: 'j167', num: 167, chars: ['ষ্ট'] },
            { id: 'j168', num: 168, chars: ['শ্র', 'ষ্ক', 'ষ্ট'] },
            { id: 'j169', num: 169, chars: ['ষ্ঠ'] },
            { id: 'j170', num: 170, chars: ['ষ্ণ'] },
            { id: 'j171', num: 171, chars: ['ষ্প'] },
            { id: 'j172', num: 172, chars: ['ষ্ঠ', 'ষ্ণ', 'ষ্প'] },
            { id: 'j173', num: 173, chars: ['ষ্ফ'] },
            { id: 'j174', num: 174, chars: ['ষ্ম'] },
            { id: 'j175', num: 175, chars: ['ষ্য'] },
            { id: 'j176', num: 176, chars: ['ষ্ফ', 'ষ্ম', 'ষ্য'] },
            { id: 'j177', num: 177, chars: ['স্ক'] },
            { id: 'j178', num: 178, chars: ['স্ট'] },
            { id: 'j179', num: 179, chars: ['স্ত'] },
            { id: 'j180', num: 180, chars: ['স্ক', 'স্ট', 'স্ত'] },
            { id: 'j181', num: 181, chars: ['স্থ'] },
            { id: 'j182', num: 182, chars: ['স্ন'] },
            { id: 'j183', num: 183, chars: ['স্প'] },
            { id: 'j184', num: 184, chars: ['স্থ', 'স্ন', 'স্প'] }
        ]
    }
};

const DIFFICULTIES = {
    easy:      { id: 'easy',      name: 'Easy',      wpm: 15, length: 60,  minWordLen: 2, maxWordLen: 4 },
    medium:    { id: 'medium',    name: 'Medium',    wpm: 25, length: 120, minWordLen: 3, maxWordLen: 6 },
    hard:      { id: 'hard',      name: 'Hard',      wpm: 40, length: 200, minWordLen: 4, maxWordLen: 8 },
    very_hard: { id: 'very_hard', name: 'Very Hard', wpm: 55, length: 350, minWordLen: 6, maxWordLen: 12 }
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
let lastLearnScrollPos = 0;

function saveLearnProgress() {
    try {
        localStorage.setItem('bangla_typer_learn_progress', JSON.stringify(learnProgress));
        localStorage.setItem('bangla_typer_learn_scroll', lastLearnScrollPos.toString());
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
        const savedScroll = localStorage.getItem('bangla_typer_learn_scroll');
        if (savedScroll) {
            lastLearnScrollPos = parseFloat(savedScroll);
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

window.focusLearnInput = function() {
    const consoleScreen = document.getElementById('learn-console-screen');
    if (consoleScreen) {
        consoleScreen.focus({ preventScroll: true });
        return;
    }
    const input = document.getElementById('learn-hidden-input');
    if (!input) return;
    input.focus({ preventScroll: true });
};

function isLearnTypingActive() {
    return learnCurrentView === 'console'
        && document.getElementById('learn-console-screen')
        && !document.getElementById('modal-learn-results')?.classList.contains('open');
}

function shouldIgnoreLearnTypingTarget(target) {
    if (!target) return false;
    if (target.id === 'learn-hidden-input') return false;
    if (target.closest?.('.modal-overlay.open')) return true;
    if (target.isContentEditable) return true;
    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function routeLearnInput(e) {
    if (e.__learnTypingHandled) return;
    if (!isLearnTypingActive()) return;
    if (shouldIgnoreLearnTypingTarget(e.target)) return;
    e.__learnTypingHandled = true;
    handleLearnInput(e);
}

document.addEventListener('keydown', routeLearnInput, true);

function bindLearnTypingEvents() {
    const consoleScreen = document.getElementById('learn-console-screen');
    if (!consoleScreen) return;
    consoleScreen.addEventListener('keydown', routeLearnInput);
    consoleScreen.addEventListener('click', window.focusLearnInput);
    window.focusLearnInput();
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

window.saveLearnScroll = function() {
    const screen = document.getElementById('learn-main-screen');
    if (screen) {
        lastLearnScrollPos = screen.scrollTop;
        saveLearnProgress();
    }
};

function renderLearnMain() {
    // Capture current scroll position before overwriting
    const oldScreen = document.getElementById('learn-main-screen');
    if (oldScreen) {
        lastLearnScrollPos = oldScreen.scrollTop;
    }

    learnCurrentView = 'main';
    const container = document.getElementById('app-learn');
    let html = `
    <div class="learn-screen active" id="learn-main-screen" style="flex:1; overflow-y:auto; padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h1 style="margin: 0; font-size: 2.2rem; color: var(--text);">🎓 শিখুন (Learn)</h1>
            
            <div id="sync-container" style="position: relative; display: flex; flex-direction: column; align-items: flex-end;">
                <button class="res-btn" id="btn-sync-words" onclick="window.syncUserWords()" 
                        title="আপনার সংগ্রহে থাকা সব ভিডিও থেকে নতুন বাংলা শব্দ ডাটাবেসে যুক্ত করুন"
                        style="background: var(--surface); border: 1px solid var(--border); color: var(--subtext); padding: 0.5rem 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                    <span id="sync-icon">🔄</span> <span id="sync-text">শব্দ আপডেট করুন</span>
                </button>
                <div id="sync-progress-container" style="display: none; width: 200px; height: 4px; background: var(--surface2); border-radius: 2px; margin-top: 8px; overflow: hidden;">
                    <div id="sync-progress-bar" style="width: 0%; height: 100%; background: var(--accent); transition: width 0.1s;"></div>
                </div>
                <div id="sync-status" style="font-size: 0.7rem; color: var(--subtext); margin-top: 4px; height: 12px; font-family: 'JetBrains Mono', monospace;"></div>
            </div>
        </div>
`;

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
                    <div style="text-align: center; padding: 10px 10px 14px; font-size: ${lesson.chars.length > 4 ? '0.85rem' : '1rem'}; color: var(--accent); line-height: 1.4; min-height: 44px; max-height: 140px; overflow-y: auto; word-break: break-word; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        ${lesson.chars.map(c => `<span>${CHAR_DISPLAY_NAMES[c] || c}</span>`).join('')}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Restore scroll position
    if (lastLearnScrollPos > 0) {
        requestAnimationFrame(() => {
            const screen = document.getElementById('learn-main-screen');
            if (screen) screen.scrollTop = lastLearnScrollPos;
        });
    }
}

window.openLearnLesson = function(sectionKey, lessonId) {
    // Save scroll position before leaving main view
    const screen = document.getElementById('learn-main-screen');
    if (screen) {
        lastLearnScrollPos = screen.scrollTop;
        saveLearnProgress();
    }

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
                <div style="font-size: 1.5rem; color: var(--accent); display: flex; flex-direction: column; align-items: center; gap: 0.6rem; font-weight: 500; max-height: 250px; overflow-y: auto;">
                    ${currentLearnLesson.chars.map(c => `<span>${CHAR_DISPLAY_NAMES[c] || c}</span>`).join('')}
                </div>
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
    const ALL_CONSONANTS = 'কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎ';
    let result = '';
    let charsAdded = 0;
    while (charsAdded < length) {
        const wordLen = Math.floor(Math.random() * 3) + 2; 
        let word = '';
        for (let i = 0; i < wordLen; i++) {
            const rndChar = chars[Math.floor(Math.random() * chars.length)];
            // If the character is a marking (Kar/Fola/Hasanta) and it's at the start or needs a base
            if (['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ৗ', '্', '্র', '্য', '্র', '্ল', '্ব', '্ম', '্ন'].includes(rndChar)) {
                if (i === 0) {
                    // Prepend a base consonant
                    const lessonLetters = chars.filter(c => !['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ৗ', '্', '্র', '্য', '্র', '্ল', '্ব', '্ম', '্ন'].includes(c));
                    if (lessonLetters.length > 0) {
                        word += lessonLetters[Math.floor(Math.random() * lessonLetters.length)];
                    } else {
                        // Global fallback to random consonant if no letters in current lesson (like k6)
                        word += ALL_CONSONANTS[Math.floor(Math.random() * ALL_CONSONANTS.length)];
                    }
                }
                word += rndChar;
            } else {
                word += rndChar;
            }
        }
        result += word + ' ';
        charsAdded += word.length + 1;
    }
    return result.trim();
}

window.startLearnTyping = async function(difficultyId) {
    learnCurrentView = 'console';
    currentDifficulty = DIFFICULTIES[difficultyId];
    
    const section = Object.values(LEARN_DATA).find(s => s.lessons.includes(currentLearnLesson));
    const sectionKey = Object.keys(LEARN_DATA).find(k => LEARN_DATA[k] === section);
    
    // Isolated Mastery Rules:
    // 1. Current lesson chars are always allowed.
    // 2. All chars from previous sections are allowed.
    // 3. Chars from previous lessons in the SAME section are NOT allowed (unless it's a review lesson).
    
    let allowedChars = "";
    let allowedKars = "";
    let allowedFolas = "";
    let allowedJuktakkhor = "";

    const letterLessons = LEARN_DATA.letters.lessons;
    const karLessons = LEARN_DATA.kar.lessons;
    const folaLessons = LEARN_DATA.fola.lessons;

    if (sectionKey === 'letters') {
        allowedChars = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'kar') {
        // All Letters + current lesson Kars
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'fola') {
        // All Letters + All Kars + current lesson Folas
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = karLessons.map(l => l.chars.join('')).join('');
        allowedFolas = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'juktakkhor') {
        // All Letters + All Kars + All Folas + current lesson Juktakkhor
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = karLessons.map(l => l.chars.join('')).join('');
        allowedFolas = folaLessons.map(l => l.chars.join('')).join('');
        allowedJuktakkhor = currentLearnLesson.chars.join(',');
    }

    const avgWordLen = (currentDifficulty.minWordLen + currentDifficulty.maxWordLen) / 2;
    const wordLimit = Math.ceil(currentDifficulty.length / avgWordLen);
    
    // Fetch real words from DB
    const dbWords = await api.getLearnWords(
        sectionKey, 
        allowedChars, 
        allowedKars, 
        allowedFolas,
        allowedJuktakkhor,
        wordLimit,
        currentDifficulty.minWordLen,
        currentDifficulty.maxWordLen
    );

    let rawText = "";
    if (dbWords && dbWords.length > 0) {
        if (sectionKey === 'letters') {
            // Sprinkle logic: 70% real words, 30% random generation
            const randomTarget = Math.ceil(currentDifficulty.length * 0.3);
            const randomText = generateRandomLessonText(currentLearnLesson.chars, randomTarget);
            const combined = [...dbWords];
            const randomWords = randomText.split(' ').filter(w => w.length > 0);
            
            for (let rw of randomWords) {
                const pos = Math.floor(Math.random() * combined.length);
                combined.splice(pos, 0, rw);
            }
            rawText = combined.join(' ');
        } else {
            // No sprinkle for Kar/Fola as per request
            rawText = dbWords.join(' ');
        }
    } else {
        // For 'letters', we can fallback to random generation if DB is empty.
        // For 'kar' and 'fola', we rely on the backend length-fallback to provide words.
        if (sectionKey === 'letters') {
            rawText = generateRandomLessonText(currentLearnLesson.chars, currentDifficulty.length);
        } else {
            rawText = dbWords.join(' '); // Fallback to whatever DB returned (might be empty if absolutely no words)
        }
    }
    
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
        <div class="learn-screen active" id="learn-console-screen" tabindex="0" style="flex:1; display:flex; flex-direction:column; background: var(--bg); outline: none;">
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
    bindLearnTypingEvents();
    updateLearnDisplay();
    updateLearnStepGuide();
}

async function newLearnContent() {
    if (!currentLearnLesson || !currentDifficulty) return;
    
    const section = Object.values(LEARN_DATA).find(s => s.lessons.includes(currentLearnLesson));
    const sectionKey = Object.keys(LEARN_DATA).find(k => LEARN_DATA[k] === section);
    
    // Isolated Mastery Rules (Same as startLearnTyping)
    let allowedChars = "";
    let allowedKars = "";
    let allowedFolas = "";
    let allowedJuktakkhor = "";

    const letterLessons = LEARN_DATA.letters.lessons;
    const karLessons = LEARN_DATA.kar.lessons;
    const folaLessons = LEARN_DATA.fola.lessons;

    if (sectionKey === 'letters') {
        allowedChars = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'kar') {
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'fola') {
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = karLessons.map(l => l.chars.join('')).join('');
        allowedFolas = currentLearnLesson.chars.join('');
    } else if (sectionKey === 'juktakkhor') {
        allowedChars = letterLessons.map(l => l.chars.join('')).join('');
        allowedKars = karLessons.map(l => l.chars.join('')).join('');
        allowedFolas = folaLessons.map(l => l.chars.join('')).join('');
        allowedJuktakkhor = currentLearnLesson.chars.join(',');
    }

    const avgWordLen = (currentDifficulty.minWordLen + currentDifficulty.maxWordLen) / 2;
    const wordLimit = Math.ceil(currentDifficulty.length / avgWordLen);
    
    const dbWords = await api.getLearnWords(
        sectionKey, 
        allowedChars, 
        allowedKars, 
        allowedFolas,
        allowedJuktakkhor,
        wordLimit,
        currentDifficulty.minWordLen,
        currentDifficulty.maxWordLen
    );

    let rawText = "";
    if (dbWords && dbWords.length > 0) {
        if (sectionKey === 'letters') {
            const randomTarget = Math.ceil(currentDifficulty.length * 0.3);
            const randomText = generateRandomLessonText(currentLearnLesson.chars, randomTarget);
            const combined = [...dbWords];
            const randomWords = randomText.split(' ').filter(w => w.length > 0);
            for (let rw of randomWords) {
                const pos = Math.floor(Math.random() * combined.length);
                combined.splice(pos, 0, rw);
            }
            rawText = combined.join(' ');
        } else {
            rawText = dbWords.join(' ');
        }
    } else {
        if (sectionKey === 'letters') {
            rawText = generateRandomLessonText(currentLearnLesson.chars, currentDifficulty.length);
        } else {
            rawText = dbWords.join(' ');
        }
    }
    
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

function handleLearnInput(e) {
    if (["Tab", "Shift", "Control", "Alt", "CapsLock"].includes(e.key)) return;
    e.preventDefault();

    if (e.key === 'Backspace') {
        if (learnCurrentIndex === 0) return;
        learnCurrentIndex--;
        const prevStep = learnSequence[learnCurrentIndex];
        const bounds = getClusterBoundaries(learnSequence);
        const ci = bounds.findIndex(b => b.end === prevStep.clusterEnd || b.end === prevStep.targetEnd);
        
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
}

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

window.syncUserWords = function() {
    const btn = document.getElementById('btn-sync-words');
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    const progressContainer = document.getElementById('sync-progress-container');
    const progressBar = document.getElementById('sync-progress-bar');
    const status = document.getElementById('sync-status');
    
    if (btn.disabled) return;
    
    btn.disabled = true;
    btn.style.opacity = '0.7';
    icon.style.display = 'inline-block';
    icon.style.animation = 'spin 1.5s linear infinite';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    status.textContent = 'স্ক্যান করা হচ্ছে...';
    
    const es = new EventSource('/learn/sync-words');
    
    es.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        if (data.status === 'processing') {
            const pct = (data.current / data.total) * 100;
            progressBar.style.width = `${pct}%`;
            status.textContent = `${data.current}/${data.total} - ${data.file}`;
        } else if (data.status === 'done') {
            es.close();
            progressBar.style.width = '100%';
            status.textContent = data.message;
            icon.style.animation = 'none';
            
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
                progressContainer.style.display = 'none';
                status.textContent = '';
            }, 3000);
        } else if (data.status === 'error') {
            es.close();
            status.textContent = 'ত্রুটি: ' + data.message;
            status.style.color = 'var(--wrong)';
            icon.style.animation = 'none';
            
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
                status.style.color = 'var(--subtext)';
            }, 5000);
        }
    };
    
    es.onerror = function() {
        es.close();
        btn.disabled = false;
        btn.style.opacity = '1';
        icon.style.animation = 'none';
        status.textContent = 'সার্ভার সংযোগ বিচ্ছিন্ন';
    };
};
