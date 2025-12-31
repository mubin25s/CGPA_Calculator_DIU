// Constants removed - now loaded from config.json (appConfig)

// Element Selection
const inputs = {
    quiz1: document.getElementById('quiz1'),
    quiz2: document.getElementById('quiz2'),
    quiz3: document.getElementById('quiz3'),
    mid: document.getElementById('mid-term'),
    attendance: document.getElementById('attendance-percent'),
    final: document.getElementById('final-exam'),
    presentation: document.getElementById('presentation-mark'),
    assignment: document.getElementById('assignment-mark')
};

const displays = {
    quizAvg: document.getElementById('quiz-avg-display'),
    presentation: document.getElementById('presentation-display'),
    assignment: document.getElementById('assignment-display'),
    attendance: document.getElementById('attendance-display'),
    total: document.getElementById('total-marks'),
    status: document.getElementById('grade-status'),
    needed: document.getElementById('needed-pass')
};

// Create Warning Toast Element
const toast = document.createElement('div');
toast.className = 'warning-toast';
toast.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Warning</span>';
document.body.appendChild(toast);

let toastTimeout;

function showWarning(message) {
    const toastText = toast.querySelector('span');
    toastText.innerText = message;
    toast.classList.add('show');
    
    // Reset timer if already showing
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

function validateInput(input) {
    const max = parseFloat(input.getAttribute('max'));
    const min = parseFloat(input.getAttribute('min')) || 0;
    let value = parseFloat(input.value);

    // Initial check for empty string to avoid clearing standard typing
    if (input.value === '') return true;

    if (value > max) {
        // Warning Logic
        showWarning(`Maximum mark for this section is ${max}!`);
        input.value = max; // Clamp to max
        input.classList.add('error');
        
        // Remove error class after animation/delay
        setTimeout(() => input.classList.remove('error'), 400);
        return false;
    }
    
    if (value < min) {
        input.value = min;
        return false;
    }

    return true;
}

// Event Listeners for Numeric Inputs
['quiz1', 'quiz2', 'quiz3', 'mid', 'attendance', 'final'].forEach(id => {
    inputs[id].addEventListener('input', (e) => {
        validateInput(e.target);
        calculateTotal();
    });
});

// Quality Selection Logic
function selectQuality(type, quality) {
    // UI Update - Active State
    const buttons = document.querySelectorAll(`.${type}-section .select-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.${type}-section .select-btn.${quality}`).classList.add('active');

    let score = 0;

    if (type === 'presentation') {
        // Presentation Logic: Poor=5, Good=6, Excellent=7 or 8 (Random)
        if (quality === 'poor') score = 5;
        else if (quality === 'good') score = 6;
        else if (quality === 'excellent') score = Math.random() < 0.5 ? 7 : 8;
        
        // Update display text
        displays.presentation.innerText = `Score: ${score}`;
    } else if (type === 'assignment') {
        // Assignment Logic: Poor=3, Good=4, Excellent=5 (Assumed proportional)
        if (quality === 'poor') score = 3;
        else if (quality === 'good') score = 4;
        else if (quality === 'excellent') score = 5;

        displays.assignment.innerText = `Score: ${score}`;
    }

    // Set Hidden Input & Recalculate
    inputs[type].value = score;
    calculateTotal();
}

// Global Config Variable
let appConfig = null;

// Function to fetch configuration
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        appConfig = await response.json();
        calculateTotal(); // Run initial calculation once config is loaded
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback or alert user
        showWarning("Failed to load configuration!");
    }
}

// Ensure calculateTotal uses the config
function calculateTotal() {
    if (!appConfig) return; // Wait for config

    const TARGET_PASS = appConfig.thresholds.pass;
    const TARGET_A_PLUS = appConfig.thresholds.a_plus;

    // 1. Calculate Quiz Average
    const q1 = parseFloat(inputs.quiz1.value) || 0;
    const q2 = parseFloat(inputs.quiz2.value) || 0;
    const q3 = parseFloat(inputs.quiz3.value) || 0;
    
    // Average of 3 quizzes
    const quizAvg = (q1 + q2 + q3) / 3;
    displays.quizAvg.innerText = `Avg: ${quizAvg.toFixed(2)}`;

    // 2. Attendance Calculation
    const attPercent = parseFloat(inputs.attendance.value) || 0;
    const attMax = appConfig.sections.attendance.max;
    const attScore = (attPercent / 100) * attMax;
    displays.attendance.innerText = `Points: ${attScore.toFixed(2)}`;

    // 3. Get Other Scores
    const presScore = parseFloat(inputs.presentation.value) || 0;
    const assignScore = parseFloat(inputs.assignment.value) || 0;
    const midScore = parseFloat(inputs.mid.value) || 0;
    const finalScore = parseFloat(inputs.final.value) || 0;

    // 4. Total Sum
    const totalCurrent = quizAvg + presScore + assignScore + midScore + attScore + finalScore;
    displays.total.innerText = totalCurrent.toFixed(2);

    // 5. Letter Grade Determination (Using Config)
    let grade = "F";
    let gradeColor = appConfig.gradingScale.find(g => g.name === "F").color;

    // Iterate through grading scale (Assume sorted descending in JSON or sort here)
    // JSON is sorted A+ to F. Find the first one that matches totalCurrent >= min
    const achievedGrade = appConfig.gradingScale.find(g => totalCurrent >= g.min);
    if (achievedGrade) {
        grade = `${achievedGrade.name} (${achievedGrade.remarks})`;
        gradeColor = achievedGrade.color;
    }

    displays.status.innerText = grade;
    displays.status.style.color = gradeColor;

    // 6. Calculate Grade Targets & Populate Table
    const tableBody = document.getElementById('grade-targets-body');
    tableBody.innerHTML = ''; 
    const currentPreFinal = totalCurrent - finalScore;
    const isFinalEntered = inputs.final.value !== '';

    // Filter out 'F' from targets usually, or keep all. Let's keep all except F to match previous behavior
    const targetGrades = appConfig.gradingScale.filter(g => g.min >= TARGET_PASS); 

    let nextTarget = null;

    targetGrades.forEach(gradeItem => {
        const row = document.createElement('tr');
        let needText = '';
        let statusClass = '';

        if (isFinalEntered) {
            // RESULT MODE
            if (totalCurrent >= gradeItem.min) {
                needText = '<i class="fa-solid fa-check"></i> Achieved';
                statusClass = 'status-achieved';
            } else {
                needText = '<i class="fa-solid fa-xmark"></i> Missed';
                statusClass = 'status-impossible';
            }
        } else {
            // PREDICTION MODE
            const needed = gradeItem.min - currentPreFinal;
            const neededRounded = Math.ceil(needed);
            const finalMax = appConfig.sections.final.max;

            if (needed <= 0) {
                needText = '<i class="fa-solid fa-check"></i> Achieved';
                statusClass = 'status-achieved';
            } else if (needed > finalMax) {
                needText = `Impossible (>${finalMax})`;
                statusClass = 'status-impossible';
            } else {
                needText = `${neededRounded} Marks`;
                statusClass = 'status-possible';
                
                // Identify next target (smallest positive needed)
                if (!nextTarget || (neededRounded < nextTarget.amount && neededRounded > 0)) {
                    nextTarget = { name: gradeItem.name, amount: neededRounded };
                }
            }
        }

        row.innerHTML = `
            <td style="color: ${gradeItem.color}; font-weight: 700;">${gradeItem.name}</td>
            <td>${gradeItem.min}%</td>
            <td class="${statusClass}">${needText}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update Footer "Next Target"
    let importantText = "";
    if (isFinalEntered) {
        importantText = "Final Results Locked";
    } else {
        if (nextTarget) {
            importantText = `Need ${nextTarget.amount} for ${nextTarget.name}`;
        } else {
            if (currentPreFinal >= TARGET_A_PLUS) importantText = "Max Grade Achieved!";
            else importantText = "Retake Required";
        }
        
        if (!nextTarget && currentPreFinal >= TARGET_PASS && currentPreFinal < TARGET_A_PLUS) {
            importantText = "Grade Locked"; // Passed but can't go higher
        }
    }
    displays.needed.innerText = importantText;
}

// Initial Run
loadConfig();
