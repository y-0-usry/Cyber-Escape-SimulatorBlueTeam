// === LEVEL 2: INSIDER THREAT INVESTIGATION ===
// Complete rebuild - Static questions based on Answer Key

// === GLOBAL STATE ===
let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0;
let attempts = 3;
let timerSeconds = 20 * 60; // 20 minutes
let startTime = 0;
let timerId = null;
let correctAnswers = 0;
let totalQuestions = 0;
let timeExtensions = 0;
let impactLevel = 0;
let impactInterval = null;

// === DOM SECTIONS ===
const sections = {
  intro: document.getElementById('intro-section'),
  questions: document.getElementById('questions-section'),
  scenario: document.getElementById('scenario-section'),
  ticket: document.getElementById('ticket-section'),
  final: document.getElementById('final-section')
};

// === NAVIGATION ===
function showSection(name) {
  Object.values(sections).forEach(s => s && s.classList.add('hidden'));
  sections[name] && sections[name].classList.remove('hidden');
}

// === TIMER ===
function startTimer() {
  clearInterval(timerId);
  clearInterval(impactInterval);
  startTime = Date.now();
  
  timerId = setInterval(() => {
    timerSeconds--;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
    
    if (timerSeconds <= 0) {
      clearInterval(timerId);
      clearInterval(impactInterval);
      alert('⏰ Time expired! The data exfiltration succeeded.');
      handleReset();
    }
  }, 1000);
  
  impactInterval = setInterval(() => {
    impactLevel = Math.min(100, impactLevel + 10);
    updateImpactDisplay();
    if (impactLevel >= 80) showImpactWarning();
  }, 120000);
}

function updateImpactDisplay() {
  const el = document.getElementById('impact-level');
  if (el) {
    el.textContent = `${impactLevel}%`;
    el.className = impactLevel >= 80 ? 'text-red-400 font-bold' : 
                    impactLevel >= 50 ? 'text-orange-400' : 'text-green-400';
  }
}

function showImpactWarning() {
  const el = document.getElementById('impact-warning');
  if (el && impactLevel >= 80) {
    el.classList.remove('hidden');
    el.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ⚠️ CRITICAL: Data loss at ${impactLevel}%`;
  }
}

function addTimeExtension() {
  if (timeExtensions >= 3) {
    alert('❌ Maximum extensions reached (3/3)');
    return;
  }
  const penalties = [5, 10, 20];
  const penalty = penalties[timeExtensions];
  if (confirm(`⏰ Add 5 minutes?\nPenalty: -${penalty} points\nExtensions: ${timeExtensions + 1}/3`)) {
    timeExtensions++;
    timerSeconds += 300;
    score = Math.max(0, score - penalty);
    updateScore();
    const btn = document.getElementById('add-time-btn');
    if (btn) {
      btn.textContent = `⏰ Add 5 Mins (${timeExtensions}/3)`;
      if (timeExtensions >= 3) btn.disabled = true;
    }
  }
}

// === SCORE ===
function updateScore() {
  document.getElementById('score').textContent = score;
}

// === HINTS ===
function useHint(btn, questionId) {
  const card = btn.closest('.question-card');
  const hintEl = card.querySelector('.hint-text');
  
  if (!hintEl.classList.contains('hidden')) return;
  
  if (freeHints > 0) {
    freeHints--;
    document.getElementById('free-hints').textContent = freeHints;
  } else {
    score = Math.max(0, score - 2);
    updateScore();
    hintsUsed++;
  }
  
  hintEl.classList.remove('hidden');
  btn.disabled = true;
  btn.textContent = '💡 Hint Shown';
}

// === PHASE 1 QUESTIONS (18 Static Questions) ===
const PHASE1_QUESTIONS = [
  // Q1-Q12: Individual Classifications
  {
    id: 'q1',
    type: 'select',
    title: 'Git Clone (4.8GB) by sarah.mitchell - outside normal workflow',
    hint: 'Extremely large size + Outside workflow = HIGH severity',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q2',
    type: 'select',
    title: 'HR Repository Access - Developer accessing employee database (role violation)',
    hint: 'Clear role violation = HIGH severity',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q3',
    type: 'select',
    title: 'Massive File Read - 4,823 files (2.1GB) in bulk operation',
    hint: 'Bulk data collection pattern = HIGH severity',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q4',
    type: 'select',
    title: 'ZIP Archive Creation - 1.9GB compressed data package',
    hint: 'Preparation for exfiltration = CRITICAL',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q5',
    type: 'select',
    title: 'Google Drive Upload - 1.9GB to personal account (not corporate)',
    hint: 'Personal cloud + Large data = CRITICAL exfiltration',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q6',
    type: 'select',
    title: 'DLP Block - Cloud Upload with sensitive data patterns detected',
    hint: 'Attempted exfiltration = HIGH severity',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'TP',
    points: 2
  },
  {
    id: 'q7',
    type: 'select',
    title: 'DevOps CI/CD Backup - 3.2GB Git mirror (SVC_DevOps, scheduled)',
    hint: 'Service account + Scheduled backup = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  {
    id: 'q8',
    type: 'select',
    title: 'HR Payroll Export - 482MB by jennifer.adams (HR team member)',
    hint: 'Legitimate job function = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  {
    id: 'q9',
    type: 'select',
    title: 'OneDrive Corporate Sync - 1.8GB (business hours, corporate account)',
    hint: 'Corporate account + Standard sync = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  {
    id: 'q10',
    type: 'select',
    title: 'IT Support USB - Ticket INC-2024-0145 (documented)',
    hint: 'IT role + Ticket number = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  {
    id: 'q11',
    type: 'select',
    title: 'Database Backup - 2.4GB (SVC_SQLBackup, 02:00 scheduled)',
    hint: 'Service account + Overnight backup = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  {
    id: 'q12',
    type: 'select',
    title: 'Developer Overtime VPN - 20:45 (Ticket CHG-2024-0089, deployment)',
    hint: 'Approved ticket + Production deployment = Benign',
    options: [
      { value: 'TP', label: 'True Positive (Malicious)' },
      { value: 'FP', label: 'False Positive (Benign)' },
      { value: 'NC', label: 'Needs Context' }
    ],
    answer: 'FP',
    points: 2
  },
  
  // Q13: Multi-Select False Positives
  {
    id: 'q13',
    type: 'multiselect',
    title: 'Which alerts are FALSE POSITIVES? (Select all that apply)',
    hint: 'Look for: Service accounts (SVC_*), Tickets (INC-*, CHG-*), Scheduled jobs, Business roles',
    options: [
      { value: 'devops', label: 'DevOps backup (SVC_DevOps, scheduled)', isCorrect: true },
      { value: 'hr_payroll', label: 'HR payroll (HR team member)', isCorrect: true },
      { value: 'onedrive', label: 'Corporate OneDrive sync', isCorrect: true },
      { value: 'it_usb', label: 'IT USB (ticket INC-2024-0145)', isCorrect: true },
      { value: 'db_backup', label: 'DB backup (SVC_SQLBackup)', isCorrect: true },
      { value: 'dev_overtime', label: 'Developer overtime (ticket CHG-2024-0089)', isCorrect: true },
      { value: 'git_clone', label: 'Git clone 4.8GB (sarah.mitchell)', isCorrect: false },
      { value: 'hr_access', label: 'HR repo access (role violation)', isCorrect: false },
      { value: 'google_drive', label: 'Google Drive upload 1.9GB', isCorrect: false }
    ],
    minCorrect: 4,
    points: 5
  },
  
  // Q14: Top 5 Priority
  {
    id: 'q14',
    type: 'multiselect',
    title: 'Select TOP 5 alerts for immediate investigation',
    hint: 'Focus on: Data exfiltration, role violations, DLP blocks',
    options: [
      { value: 'google_drive', label: 'Google Drive upload (1.9GB personal)', isCorrect: true },
      { value: 'dlp_block', label: 'DLP block (sensitive data)', isCorrect: true },
      { value: 'hr_access', label: 'HR repo access (outside role)', isCorrect: true },
      { value: 'git_clone', label: 'Git clone (4.8GB)', isCorrect: true },
      { value: 'zip_creation', label: 'ZIP creation (1.9GB)', isCorrect: true },
      { value: 'file_read', label: 'Massive file read (4,823 files)', isCorrect: true },
      { value: 'devops', label: 'DevOps backup (scheduled)', isCorrect: false },
      { value: 'hr_payroll', label: 'HR payroll (approved)', isCorrect: false }
    ],
    minCorrect: 3,
    points: 5
  },
  
  // Q15: Correlation
  {
    id: 'q15',
    type: 'select',
    title: 'Are the malicious alerts part of the SAME or SEPARATE incidents?',
    hint: 'Same user (sarah.mitchell) + Timeline sequence + Attack pattern',
    options: [
      { value: 'same', label: 'Same incident (coordinated attack chain)' },
      { value: 'separate', label: 'Separate unrelated incidents' },
      { value: 'unclear', label: 'Unclear - needs investigation' }
    ],
    answer: 'same',
    points: 3
  },
  
  // Q16: Behavior Analysis
  {
    id: 'q16',
    type: 'select',
    title: 'Which behavior is MOST suspicious?',
    hint: 'Single indicators can be legitimate; combinations are stronger',
    options: [
      { value: 'large_data', label: 'Large data access' },
      { value: 'off_hours', label: 'Off-hours activity' },
      { value: 'non_role', label: 'Non-role resource access' },
      { value: 'combination', label: 'Combination of all' }
    ],
    answer: 'combination',
    points: 3
  },
  
  // Q17: MITRE Mapping
  {
    id: 'q17',
    type: 'select',
    title: 'Which MITRE ATT&CK technique best matches?',
    hint: 'Valid credentials (sarah.mitchell) - no exploitation',
    options: [
      { value: 'T1078', label: 'T1078 – Valid Accounts' },
      { value: 'T1486', label: 'T1486 – Data Encrypted for Impact' },
      { value: 'T1190', label: 'T1190 – Exploit Public-Facing Application' },
      { value: 'T1046', label: 'T1046 – Network Service Discovery' }
    ],
    answer: 'T1078',
    points: 3
  },
  
  // Q18: Hypothesis
  {
    id: 'q18',
    type: 'select',
    title: 'What best describes this situation?',
    hint: 'Valid credentials + Purposeful actions + Data exfiltration',
    options: [
      { value: 'isolated', label: 'Isolated alerts (individual investigation)' },
      { value: 'misconfiguration', label: 'System misconfiguration (false alerts)' },
      { value: 'insider_threat', label: 'Insider threat (internal user stealing data)' },
      { value: 'external_attack', label: 'External attack campaign' }
    ],
    answer: 'insider_threat',
    points: 3
  }
];

// === PHASE 2 QUESTIONS (8 Scenario Questions) ===
const PHASE2_QUESTIONS = [
  {
    id: 's1',
    type: 'select',
    title: 'What is the PRIMARY attack vector?',
    hint: 'Legitimate credentials used throughout',
    options: [
      { value: 'phishing', label: 'Phishing' },
      { value: 'malware', label: 'Malware' },
      { value: 'valid_creds', label: 'Valid Account Credentials' },
      { value: 'vuln', label: 'Software Vulnerability' }
    ],
    answer: 'valid_creds',
    points: 5
  },
  {
    id: 's2',
    type: 'select',
    title: 'What is the MAIN objective?',
    hint: 'Large data collection → ZIP → Upload',
    options: [
      { value: 'ransomware', label: 'Ransomware' },
      { value: 'exfiltration', label: 'Data Exfiltration' },
      { value: 'sabotage', label: 'System Sabotage' },
      { value: 'espionage', label: 'Corporate Espionage' }
    ],
    answer: 'exfiltration',
    points: 5
  },
  {
    id: 's3',
    type: 'multiselect',
    title: 'Which phases of the attack were SUCCESSFUL? (Select all)',
    hint: 'Check which actions completed vs blocked',
    options: [
      { value: 'access', label: 'Initial Access (VPN login)', isCorrect: true },
      { value: 'collection', label: 'Data Collection (file reads)', isCorrect: true },
      { value: 'staging', label: 'Staging (ZIP creation)', isCorrect: true },
      { value: 'exfil', label: 'Exfiltration (Google Drive upload)', isCorrect: true },
      { value: 'cover', label: 'Cover Tracks (log deletion)', isCorrect: false }
    ],
    minCorrect: 3,
    points: 5
  },
  {
    id: 's4',
    type: 'select',
    title: 'What is the MOST likely motive?',
    hint: 'Job search activity + Data theft',
    options: [
      { value: 'financial', label: 'Financial gain (selling data)' },
      { value: 'resignation', label: 'Resignation (taking work to new job)' },
      { value: 'revenge', label: 'Revenge (sabotage)' },
      { value: 'extortion', label: 'Extortion (ransom demand)' }
    ],
    answer: 'resignation',
    points: 5
  },
  {
    id: 's5',
    type: 'select',
    title: 'Which control was MOST effective?',
    hint: 'What actually blocked the attack?',
    options: [
      { value: 'firewall', label: 'Firewall' },
      { value: 'dlp', label: 'DLP (Data Loss Prevention)' },
      { value: 'ids', label: 'IDS/IPS' },
      { value: 'antivirus', label: 'Antivirus' }
    ],
    answer: 'dlp',
    points: 5
  },
  {
    id: 's6',
    type: 'select',
    title: 'What immediate action is required?',
    hint: 'Active threat - immediate containment',
    options: [
      { value: 'monitor', label: 'Continue monitoring' },
      { value: 'disable', label: 'Disable user account immediately' },
      { value: 'scan', label: 'Run antivirus scan' },
      { value: 'patch', label: 'Apply security patches' }
    ],
    answer: 'disable',
    points: 5
  },
  {
    id: 's7',
    type: 'multiselect',
    title: 'What data may have been compromised? (Select all)',
    hint: 'Check what was accessed before DLP blocked',
    options: [
      { value: 'hr', label: 'HR employee data', isCorrect: true },
      { value: 'source', label: 'Source code (Git repos)', isCorrect: true },
      { value: 'internal', label: 'Internal documents', isCorrect: true },
      { value: 'customer', label: 'Customer PII', isCorrect: false },
      { value: 'financial', label: 'Financial records', isCorrect: false }
    ],
    minCorrect: 2,
    points: 5
  },
  {
    id: 's8',
    type: 'select',
    title: 'Incident severity rating?',
    hint: 'Data exfiltration succeeded (Google Drive) = HIGH impact',
    options: [
      { value: 'low', label: 'Low (monitoring only)' },
      { value: 'medium', label: 'Medium (investigate)' },
      { value: 'high', label: 'High (urgent response)' },
      { value: 'critical', label: 'Critical (executive alert)' }
    ],
    answer: 'critical',
    points: 5
  }
];

// === RENDER PHASE 1 QUESTIONS ===
function renderPhase1Questions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  
  PHASE1_QUESTIONS.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card bg-gray-800 p-6 rounded-lg border border-gray-700 mb-4';
    card.dataset.qid = q.id;
    card.dataset.type = q.type;
    card.dataset.answer = q.answer || '';
    card.dataset.points = q.points;
    
    let optionsHTML = '';
    if (q.type === 'select') {
      optionsHTML = q.options.map(opt => `
        <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
          <input type="radio" name="${q.id}" value="${opt.value}" class="form-radio text-blue-500">
          <span>${opt.label}</span>
        </label>
      `).join('');
    } else if (q.type === 'multiselect') {
      card.dataset.minCorrect = q.minCorrect || q.options.filter(o => o.isCorrect).length;
      optionsHTML = q.options.map(opt => {
        card.dataset[`correct_${opt.value}`] = opt.isCorrect ? 'true' : 'false';
        return `
          <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
            <input type="checkbox" name="${q.id}" value="${opt.value}" class="form-checkbox text-blue-500">
            <span>${opt.label}</span>
          </label>
        `;
      }).join('');
    }
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-white">Q${idx + 1}: ${q.title}</h3>
        <button onclick="useHint(this, '${q.id}')" class="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700">
          💡 Hint (-2pts)
        </button>
      </div>
      <div class="hint-text hidden bg-blue-900 p-3 rounded mb-4 text-blue-200">
        💡 ${q.hint}
      </div>
      <div class="space-y-2">
        ${optionsHTML}
      </div>
    `;
    
    container.appendChild(card);
  });
  
  totalQuestions = PHASE1_QUESTIONS.length;
}

// === EVALUATE PHASE 1 ===
function evaluatePhase1() {
  const cards = document.querySelectorAll('#questions-container .question-card');
  let phase1Score = 0;
  let phase1Correct = 0;
  
  cards.forEach(card => {
    const qid = card.dataset.qid;
    const type = card.dataset.type;
    const points = parseInt(card.dataset.points) || 2;
    
    if (type === 'select') {
      const correctAnswer = card.dataset.answer;
      const selected = card.querySelector(`input[name="${qid}"]:checked`);
      
      if (selected && selected.value === correctAnswer) {
        phase1Score += points;
        phase1Correct++;
        card.classList.add('border-green-500');
      } else {
        card.classList.add('border-red-500');
      }
    } else if (type === 'multiselect') {
      const selected = Array.from(card.querySelectorAll(`input[name="${qid}"]:checked`)).map(cb => cb.value);
      const minCorrect = parseInt(card.dataset.minCorrect) || 1;
      
      let correctCount = 0;
      let incorrectCount = 0;
      
      selected.forEach(val => {
        if (card.dataset[`correct_${val}`] === 'true') {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
      
      // Check for unselected correct answers
      const allCorrectValues = [];
      for (let key in card.dataset) {
        if (key.startsWith('correct_') && card.dataset[key] === 'true') {
          const val = key.replace('correct_', '');
          if (!selected.includes(val)) {
            incorrectCount++; // Missed a correct answer
          } else {
            allCorrectValues.push(val);
          }
        }
      }
      
      if (correctCount >= minCorrect && incorrectCount === 0) {
        phase1Score += points;
        phase1Correct++;
        card.classList.add('border-green-500');
      } else if (correctCount >= minCorrect) {
        // Partial credit
        phase1Score += Math.floor(points / 2);
        card.classList.add('border-yellow-500');
      } else {
        card.classList.add('border-red-500');
      }
    }
  });
  
  score += phase1Score;
  correctAnswers += phase1Correct;
  updateScore();
  
  alert(`Phase 1 Complete!\n\nCorrect: ${phase1Correct}/${cards.length}\nScore: +${phase1Score} points`);
  showSection('scenario');
}

// === RENDER PHASE 2 QUESTIONS ===
function renderPhase2Questions() {
  const container = document.getElementById('scenario-container');
  container.innerHTML = '';
  
  PHASE2_QUESTIONS.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card bg-gray-800 p-6 rounded-lg border border-gray-700 mb-4';
    card.dataset.qid = q.id;
    card.dataset.type = q.type;
    card.dataset.answer = q.answer || '';
    card.dataset.points = q.points;
    
    let optionsHTML = '';
    if (q.type === 'select') {
      optionsHTML = q.options.map(opt => `
        <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
          <input type="radio" name="${q.id}" value="${opt.value}" class="form-radio text-blue-500">
          <span>${opt.label}</span>
        </label>
      `).join('');
    } else if (q.type === 'multiselect') {
      card.dataset.minCorrect = q.minCorrect || q.options.filter(o => o.isCorrect).length;
      optionsHTML = q.options.map(opt => {
        card.dataset[`correct_${opt.value}`] = opt.isCorrect ? 'true' : 'false';
        return `
          <label class="flex items-center space-x-3 p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
            <input type="checkbox" name="${q.id}" value="${opt.value}" class="form-checkbox text-blue-500">
            <span>${opt.label}</span>
          </label>
        `;
      }).join('');
    }
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-white">Q${idx + 1}: ${q.title}</h3>
        <button onclick="useHint(this, '${q.id}')" class="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700">
          💡 Hint (-2pts)
        </button>
      </div>
      <div class="hint-text hidden bg-blue-900 p-3 rounded mb-4 text-blue-200">
        💡 ${q.hint}
      </div>
      <div class="space-y-2">
        ${optionsHTML}
      </div>
    `;
    
    container.appendChild(card);
  });
}

// === EVALUATE PHASE 2 ===
function evaluatePhase2() {
  const cards = document.querySelectorAll('#scenario-container .question-card');
  let phase2Score = 0;
  let phase2Correct = 0;
  
  cards.forEach(card => {
    const qid = card.dataset.qid;
    const type = card.dataset.type;
    const points = parseInt(card.dataset.points) || 5;
    
    if (type === 'select') {
      const correctAnswer = card.dataset.answer;
      const selected = card.querySelector(`input[name="${qid}"]:checked`);
      
      if (selected && selected.value === correctAnswer) {
        phase2Score += points;
        phase2Correct++;
        card.classList.add('border-green-500');
      } else {
        card.classList.add('border-red-500');
      }
    } else if (type === 'multiselect') {
      const selected = Array.from(card.querySelectorAll(`input[name="${qid}"]:checked`)).map(cb => cb.value);
      const minCorrect = parseInt(card.dataset.minCorrect) || 1;
      
      let correctCount = 0;
      let incorrectCount = 0;
      
      selected.forEach(val => {
        if (card.dataset[`correct_${val}`] === 'true') {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
      
      // Check for unselected correct answers
      for (let key in card.dataset) {
        if (key.startsWith('correct_') && card.dataset[key] === 'true') {
          const val = key.replace('correct_', '');
          if (!selected.includes(val)) {
            incorrectCount++;
          }
        }
      }
      
      if (correctCount >= minCorrect && incorrectCount === 0) {
        phase2Score += points;
        phase2Correct++;
        card.classList.add('border-green-500');
      } else if (correctCount >= minCorrect) {
        phase2Score += Math.floor(points / 2);
        card.classList.add('border-yellow-500');
      } else {
        card.classList.add('border-red-500');
      }
    }
  });
  
  score += phase2Score;
  correctAnswers += phase2Correct;
  updateScore();
  
  alert(`Phase 2 Complete!\n\nCorrect: ${phase2Correct}/${cards.length}\nScore: +${phase2Score} points`);
  showSection('ticket');
}

// === TICKET SUBMISSION ===
function submitTicket() {
  const impact = document.querySelector('input[name="impact"]:checked')?.value;
  const containment = document.querySelector('input[name="containment"]:checked')?.value;
  const investigation = document.querySelector('input[name="investigation"]:checked')?.value;
  const recommendation = document.querySelector('textarea[name="recommendation"]')?.value;
  
  if (!impact || !containment || !investigation || !recommendation?.trim()) {
    alert('❌ Please complete all fields before submitting!');
    return;
  }
  
  let ticketScore = 0;
  if (impact === 'critical') ticketScore += 5;
  if (containment === 'disable') ticketScore += 10;
  if (investigation === 'forensics') ticketScore += 5;
  if (recommendation.length > 100) ticketScore += 5;
  
  score += ticketScore;
  updateScore();
  
  clearInterval(timerId);
  clearInterval(impactInterval);
  
  const finalTime = Math.floor((Date.now() - startTime) / 1000);
  const timeBonus = Math.max(0, Math.floor((timerSeconds / 60) * 2));
  score += timeBonus;
  
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-time').textContent = `${Math.floor(finalTime / 60)}:${String(finalTime % 60).padStart(2, '0')}`;
  document.getElementById('final-correct').textContent = `${correctAnswers}/${totalQuestions + PHASE2_QUESTIONS.length}`;
  
  let rating = 'Needs Improvement';
  if (score >= 80) rating = 'Excellent!';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  
  document.getElementById('final-rating').textContent = rating;
  
  showSection('final');
}

// === RESET ===
function handleReset() {
  if (confirm('🔄 Reset and start over?')) {
    location.reload();
  }
}

// === INITIALIZATION ===
async function loadAlerts() {
  try {
    const res = await fetch('data/level2/alerts.json');
    alerts = await res.json();
    console.log(`✅ Loaded ${alerts.length} alerts`);
  } catch (err) {
    console.error('❌ Failed to load alerts:', err);
    alerts = [];
  }
}

function startLevel() {
  const level1Score = parseInt(localStorage.getItem('level1_score') || '0');
  if (level1Score >= 20) {
    freeHints = 2;
    document.getElementById('free-hints').textContent = freeHints;
  }
  
  renderPhase1Questions();
  startTimer();
  showSection('questions');
}

// Load alerts on page load
loadAlerts();
