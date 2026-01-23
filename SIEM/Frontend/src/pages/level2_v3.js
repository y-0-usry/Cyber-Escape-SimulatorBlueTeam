// === LEVEL 2: INSIDER THREAT INVESTIGATION ===
// Dynamic questions using alert IDs

// === GLOBAL STATE ===
let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0;
let attempts = 3;
let timerSeconds = 20 * 60;
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

// === FALSE POSITIVE DETECTION ===
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user || '';
  
  if (/SVC_|SYSTEM/i.test(user)) return true;
  if (/INC-|CHG-|REQ-|TASK-/i.test(raw)) return true;
  if (/Scheduled.*True|02:00|03:00|01:15|04:30/i.test(raw)) return true;
  if (/DevOps|CI\/CD|backup|replication|OneDrive.*sync|Creative.*Cloud|Windows.*Update/i.test(raw)) return true;
  if (/payroll|Board.*meeting|approved.*true/i.test(raw)) return true;
  if (/brute.*force.*blocked|phishing.*quarantined|WAF.*blocked|sanitized|port.*scan.*blocked/i.test(raw)) return true;
  if (/IDS.*false.*positive|outdated.*detection/i.test(raw)) return true;
  
  return false;
}

function isInsiderThreatIndicator(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user || '';
  
  if (user !== 'sarah.mitchell' && !/sarah\.mitchell/i.test(raw)) return false;
  
  if (/Git.*clone.*GB|repository.*outside.*role|HR.*repo/i.test(raw)) return true;
  if (/massive.*file.*read|ZIP.*creation|archive/i.test(raw)) return true;
  if (/Google.*Drive.*upload|DLP.*block|sensitive.*data/i.test(raw)) return true;
  if (/off.*hours|weekend|Saturday|22:17|USB/i.test(raw)) return true;
  if (/file.*access.*anomaly|deviation.*%/i.test(raw)) return true;
  
  return false;
}

// === BUILD PHASE 1 QUESTIONS (Dynamic with Alert IDs) ===
function buildPhase1Questions() {
  const fp = alerts.filter(isFalsePositive);
  const tp = alerts.filter(a => !isFalsePositive(a) && isInsiderThreatIndicator(a));
  const questions = [];
  
  // Q1-Q12: Individual Classifications (6 TP + 6 FP)
  const selectedAlerts = [...tp.slice(0, 6), ...fp.slice(0, 6)];
  
  selectedAlerts.forEach((alert, idx) => {
    const isTP = !isFalsePositive(alert);
    questions.push({
      id: `q${idx + 1}`,
      alertId: alert.alert_id,
      type: 'select',
      title: `Alert ${alert.alert_id}`,
      hint: isTP ? 'Insider threat pattern detected' : 'Look for service accounts, tickets, or scheduled jobs',
      options: [
        { value: 'TP', label: 'True Positive (Malicious)' },
        { value: 'FP', label: 'False Positive (Benign)' },
        { value: 'NC', label: 'Needs Context' }
      ],
      answer: isTP ? 'TP' : 'FP',
      points: 2
    });
  });
  
  // Q13: Multi-Select False Positives
  const fpOptions = [...fp.slice(0, 10), ...tp.slice(0, 3)];
  questions.push({
    id: 'q13',
    type: 'multiselect',
    title: 'Which alerts are FALSE POSITIVES? (Select all)',
    hint: 'Service accounts (SVC_*), Tickets, Scheduled jobs',
    options: fpOptions.map(a => ({
      value: a.alert_id,
      label: a.alert_id,
      isCorrect: isFalsePositive(a)
    })),
    minCorrect: 6,
    points: 5
  });
  
  // Q14: Top 5 Priority
  const priorityOptions = [...tp.slice(0, 6), ...fp.slice(0, 3)];
  questions.push({
    id: 'q14',
    type: 'multiselect',
    title: 'Select TOP 5 alerts for immediate investigation',
    hint: 'Data exfiltration, role violations, DLP blocks',
    options: priorityOptions.map(a => ({
      value: a.alert_id,
      label: a.alert_id,
      isCorrect: isInsiderThreatIndicator(a)
    })),
    minCorrect: 3,
    points: 5
  });
  
  // Q15: Correlation
  questions.push({
    id: 'q15',
    type: 'select',
    title: 'Are the malicious alerts part of SAME or SEPARATE incidents?',
    hint: 'Same user (sarah.mitchell) + Timeline + Pattern',
    options: [
      { value: 'same', label: 'Same incident (coordinated attack)' },
      { value: 'separate', label: 'Separate unrelated incidents' },
      { value: 'unclear', label: 'Unclear - needs investigation' }
    ],
    answer: 'same',
    points: 3
  });
  
  // Q16: Behavior
  questions.push({
    id: 'q16',
    type: 'select',
    title: 'Which behavior is MOST suspicious?',
    hint: 'Single indicators can be legitimate',
    options: [
      { value: 'large_data', label: 'Large data access' },
      { value: 'off_hours', label: 'Off-hours activity' },
      { value: 'non_role', label: 'Non-role resource access' },
      { value: 'combination', label: 'Combination of all' }
    ],
    answer: 'combination',
    points: 3
  });
  
  // Q17: MITRE
  questions.push({
    id: 'q17',
    type: 'select',
    title: 'Which MITRE ATT&CK technique?',
    hint: 'Valid credentials used',
    options: [
      { value: 'T1078', label: 'T1078 – Valid Accounts' },
      { value: 'T1486', label: 'T1486 – Data Encrypted' },
      { value: 'T1190', label: 'T1190 – Exploit Application' },
      { value: 'T1046', label: 'T1046 – Network Discovery' }
    ],
    answer: 'T1078',
    points: 3
  });
  
  // Q18: Hypothesis
  questions.push({
    id: 'q18',
    type: 'select',
    title: 'What best describes this?',
    hint: 'Valid credentials + Data theft',
    options: [
      { value: 'isolated', label: 'Isolated alerts' },
      { value: 'misconfiguration', label: 'System misconfiguration' },
      { value: 'insider_threat', label: 'Insider threat (data theft)' },
      { value: 'external_attack', label: 'External attack' }
    ],
    answer: 'insider_threat',
    points: 3
  });
  
  return questions;
}

// === PHASE 2 QUESTIONS (Static Scenario) ===
const PHASE2_QUESTIONS = [
  {
    id: 's1',
    type: 'select',
    title: 'PRIMARY attack vector?',
    hint: 'Legitimate credentials used',
    options: [
      { value: 'phishing', label: 'Phishing' },
      { value: 'malware', label: 'Malware' },
      { value: 'valid_creds', label: 'Valid Credentials' },
      { value: 'vuln', label: 'Vulnerability' }
    ],
    answer: 'valid_creds',
    points: 5
  },
  {
    id: 's2',
    type: 'select',
    title: 'MAIN objective?',
    hint: 'Large data → ZIP → Upload',
    options: [
      { value: 'ransomware', label: 'Ransomware' },
      { value: 'exfiltration', label: 'Data Exfiltration' },
      { value: 'sabotage', label: 'Sabotage' },
      { value: 'espionage', label: 'Espionage' }
    ],
    answer: 'exfiltration',
    points: 5
  },
  {
    id: 's3',
    type: 'multiselect',
    title: 'Which phases SUCCESSFUL?',
    hint: 'Check completed vs blocked',
    options: [
      { value: 'access', label: 'Initial Access', isCorrect: true },
      { value: 'collection', label: 'Data Collection', isCorrect: true },
      { value: 'staging', label: 'Staging (ZIP)', isCorrect: true },
      { value: 'exfil', label: 'Exfiltration', isCorrect: true },
      { value: 'cover', label: 'Cover Tracks', isCorrect: false }
    ],
    minCorrect: 3,
    points: 5
  },
  {
    id: 's4',
    type: 'select',
    title: 'MOST likely motive?',
    hint: 'Job search + Data theft',
    options: [
      { value: 'financial', label: 'Financial gain' },
      { value: 'resignation', label: 'Resignation (new job)' },
      { value: 'revenge', label: 'Revenge' },
      { value: 'extortion', label: 'Extortion' }
    ],
    answer: 'resignation',
    points: 5
  },
  {
    id: 's5',
    type: 'select',
    title: 'MOST effective control?',
    hint: 'What blocked the attack?',
    options: [
      { value: 'firewall', label: 'Firewall' },
      { value: 'dlp', label: 'DLP' },
      { value: 'ids', label: 'IDS/IPS' },
      { value: 'antivirus', label: 'Antivirus' }
    ],
    answer: 'dlp',
    points: 5
  },
  {
    id: 's6',
    type: 'select',
    title: 'Immediate action required?',
    hint: 'Active threat',
    options: [
      { value: 'monitor', label: 'Continue monitoring' },
      { value: 'disable', label: 'Disable user account' },
      { value: 'scan', label: 'Antivirus scan' },
      { value: 'patch', label: 'Apply patches' }
    ],
    answer: 'disable',
    points: 5
  },
  {
    id: 's7',
    type: 'multiselect',
    title: 'Data compromised?',
    hint: 'Check what was accessed',
    options: [
      { value: 'hr', label: 'HR employee data', isCorrect: true },
      { value: 'source', label: 'Source code', isCorrect: true },
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
    title: 'Severity rating?',
    hint: 'Exfiltration succeeded',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ],
    answer: 'critical',
    points: 5
  }
];

// === RENDER PHASE 1 ===
function renderPhase1Questions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  
  const questions = buildPhase1Questions();
  totalQuestions = questions.length;
  
  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card bg-gray-800 p-6 rounded-lg border border-gray-700 mb-4';
    card.dataset.qid = q.id;
    card.dataset.type = q.type;
    card.dataset.answer = q.answer || '';
    card.dataset.points = q.points;
    card.dataset.alertId = q.alertId || '';
    
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
      
      // Check for missed correct answers
      for (let key in card.dataset) {
        if (key.startsWith('correct_') && card.dataset[key] === 'true') {
          const val = key.replace('correct_', '');
          if (!selected.includes(val)) {
            incorrectCount++;
          }
        }
      }
      
      if (correctCount >= minCorrect && incorrectCount === 0) {
        phase1Score += points;
        phase1Correct++;
        card.classList.add('border-green-500');
      } else if (correctCount >= minCorrect) {
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
  renderPhase2Questions();
}

// === RENDER PHASE 2 ===
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
    alert('❌ Please complete all fields!');
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
