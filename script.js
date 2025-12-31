// Constants
const TARGET_PASS = 40;
const TARGET_A_PLUS = 80;

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

function calculateTotal() {
    // 1. Calculate Quiz Average
    const q1 = parseFloat(inputs.quiz1.value) || 0;
    const q2 = parseFloat(inputs.quiz2.value) || 0;
    const q3 = parseFloat(inputs.quiz3.value) || 0;
    
    // Average of 3 quizzes
    const quizAvg = (q1 + q2 + q3) / 3;
    displays.quizAvg.innerText = `Avg: ${quizAvg.toFixed(2)}`;

    // 2. Attendance Calculation
    // 7 Marks total. Input is percentage.
    const attPercent = parseFloat(inputs.attendance.value) || 0;
    const attScore = (attPercent / 100) * 7;
    displays.attendance.innerText = `Points: ${attScore.toFixed(2)}`;

    // 3. Get Other Scores
    const presScore = parseFloat(inputs.presentation.value) || 0;
    const assignScore = parseFloat(inputs.assignment.value) || 0;
    const midScore = parseFloat(inputs.mid.value) || 0;
    const finalScore = parseFloat(inputs.final.value) || 0;

    // 4. Total Sum
    // Note: Quiz Avg is "Average Quiz Number" which implies the avg is the score out of 15.
    const totalCurrent = quizAvg + presScore + assignScore + midScore + attScore + finalScore;
    
    // Update Total Display
    displays.total.innerText = totalCurrent.toFixed(2);

    // 5. Calculate Needed / Status
    // If Final is NOT entered (or 0), show what is needed.
    // If Pre-final total > 40, they passed already.
    
    // Calculate total excluding final for "Needed" calculation
    const currentPreFinal = totalCurrent - finalScore;
    const remainingForPass = TARGET_PASS - currentPreFinal;
    const remainingForAPlus = TARGET_A_PLUS - currentPreFinal;

    // Determine Specific Letter Grade (UGC Uniform Grading System)
    let grade = "F";
    let gradeColor = "#ef4444"; // Red

    if (totalCurrent >= 80) {
        grade = "A+ (Outstanding)";
        gradeColor = "#10b981"; // Emerald
    } else if (totalCurrent >= 75) {
        grade = "A (Excellent)";
        gradeColor = "#34d399";
    } else if (totalCurrent >= 70) {
        grade = "A- (Very Good)";
        gradeColor = "#6ee7b7";
    } else if (totalCurrent >= 65) {
        grade = "B+ (Good)";
        gradeColor = "#f59e0b"; // Amber
    } else if (totalCurrent >= 60) {
        grade = "B (Satisfactory)";
        gradeColor = "#fbbf24";
    } else if (totalCurrent >= 55) {
        grade = "B- (Above Average)";
        gradeColor = "#fcd34d";
    } else if (totalCurrent >= 50) {
        grade = "C+ (Average)";
        gradeColor = "#d97706";
    } else if (totalCurrent >= 45) {
        grade = "C (Below Average)";
        gradeColor = "#b45309";
    } else if (totalCurrent >= 40) {
        grade = "D (Pass)";
        gradeColor = "#78350f";
    } else {
        grade = "F (Fail)";
        gradeColor = "#ef4444";
    }

    displays.status.innerText = grade;
    displays.status.style.color = gradeColor;

    // 5. Calculate Grade Targets & Populate Table
    // (currentPreFinal is already calculated above)
    const tableBody = document.getElementById('grade-targets-body');
    tableBody.innerHTML = ''; // Clear existing

    // Check if Final Exam is entered
    const isFinalEntered = inputs.final.value !== '';

    // UGC Grade Thresholds
    const grades = [
        { name: 'A+', min: 80, color: '#10b981' },
        { name: 'A',  min: 75, color: '#34d399' },
        { name: 'A-', min: 70, color: '#6ee7b7' },
        { name: 'B+', min: 65, color: '#f59e0b' },
        { name: 'B',  min: 60, color: '#fbbf24' },
        { name: 'B-', min: 55, color: '#fcd34d' },
        { name: 'C+', min: 50, color: '#d97706' },
        { name: 'C',  min: 45, color: '#b45309' },
        { name: 'D',  min: 40, color: '#78350f' }
    ];

    let nextTarget = null;

    grades.forEach(grade => {
        const row = document.createElement('tr');
        let needText = '';
        let statusClass = '';

        if (isFinalEntered) {
            // RESULT MODE: Show if achieved or missed based on Total (including final)
            if (totalCurrent >= grade.min) {
                needText = '<i class="fa-solid fa-check"></i> Achieved';
                statusClass = 'status-achieved';
            } else {
                needText = '<i class="fa-solid fa-xmark"></i> Missed';
                statusClass = 'status-impossible';
            }
        } else {
            // PREDICTION MODE: Show what is needed in Final
            const needed = grade.min - currentPreFinal;
            const neededRounded = Math.ceil(needed);

            if (needed <= 0) {
                needText = '<i class="fa-solid fa-check"></i> Achieved';
                statusClass = 'status-achieved';
            } else if (needed > 40) {
                needText = 'Impossible (>40)';
                statusClass = 'status-impossible';
            } else {
                needText = `${neededRounded} Marks`;
                statusClass = 'status-possible';
                
                // Identify the next closest target
                if (!nextTarget || (neededRounded < nextTarget.amount && neededRounded > 0)) {
                    nextTarget = { name: grade.name, amount: neededRounded };
                }
            }
        }

        row.innerHTML = `
            <td style="color: ${grade.color}; font-weight: 700;">${grade.name}</td>
            <td>${grade.min}%</td>
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
            // If no next target, check if we failed everything or passed everything
            if (currentPreFinal >= 80) importantText = "Max Grade Achieved!";
            else importantText = "Retake Required"; // If D is impossible
        }
        
        // Safety check for already passed but can't reach higher
        if (!nextTarget && currentPreFinal >= 40 && currentPreFinal < 80) {
            importantText = "Grade Locked"; // Can't reach next grade, but passed
        }
    }

    displays.needed.innerText = importantText;
}

// Initial Run
calculateTotal();
