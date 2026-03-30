// === LEVEL 3: LINUX SSH ATTACK INVESTIGATION ===
// 19 Total Alerts: 8 Attack chain + 6 False Positives + 5 Failed External Attacks

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
let cachedGeneralQuestions = null;
let phase1CorrectCount = 0;
let phase2CorrectCount = 0;
let ticketSubmitted = false;
const WRONG_ANSWER_PENALTY = 2;

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
      window.alert('⏰ Time expired! The attacker exfiltrated the data.');
      handleReset();
    }
  }, 1000);
  
  impactInterval = setInterval(() => {
    impactLevel = Math.min(100, impactLevel + 10);
    updateImpactDisplay();
    
    if (impactLevel >= 80) {
      showImpactWarning();
    }
  }, 120000);
}

function updateImpactDisplay() {
  const impactEl = document.getElementById('impact-level');
  if (impactEl) {
    impactEl.textContent = `${impactLevel}%`;
    impactEl.className = impactLevel >= 80 ? 'text-red-400 font-bold' : 
                         impactLevel >= 50 ? 'text-orange-400' : 'text-green-400';
  }
}

function showImpactWarning() {
  const warningEl = document.getElementById('impact-warning');
  if (warningEl && impactLevel >= 80) {
    warningEl.classList.remove('hidden');
    warningEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ⚠️ CRITICAL: Server compromise at ${impactLevel}% - Act fast!`;
  }
}

function addTimeExtension() {
  if (timeExtensions >= 3) {
    window.alert('❌ Maximum time extensions reached (3/3)');
    return;
  }
  
  const penalties = [5, 10, 20];
  const penalty = penalties[timeExtensions];
  
  if (window.confirm(`⏰ Add 5 minutes?\n\nPenalty: -${penalty} points\nExtensions used: ${timeExtensions + 1}/3`)) {
    timeExtensions++;
    timerSeconds += 300;
    score = Math.max(0, score - penalty);
    updateScore();
    
    const btn = document.getElementById('add-time-btn');
    if (btn) {
      btn.textContent = `⏰ Add 5 Mins (${timeExtensions}/3)`;
      if (timeExtensions >= 3) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    
    window.alert(`✅ +5 minutes added\n-${penalty} points penalty\n\n${3 - timeExtensions} extensions remaining`);
  }
}

// === RESET ===
function handleReset() {
  attempts--;
  document.getElementById('attempts').textContent = attempts;
  if (attempts <= 0) {
    window.alert('No attempts remaining. Refresh to restart.');
    return;
  }
  score = 0;
  hintsUsed = 0;
  timerSeconds = 20 * 60;
  correctAnswers = 0;
  totalQuestions = 0;
  timeExtensions = 0;
  impactLevel = 0;
  cachedGeneralQuestions = null;
  phase1CorrectCount = 0;
  phase2CorrectCount = 0;
  ticketSubmitted = false;
  
  updateScore();
  updateImpactDisplay();
  const warningEl = document.getElementById('impact-warning');
  if (warningEl) warningEl.classList.add('hidden');
  
  const addTimeBtn = document.getElementById('add-time-btn');
  if (addTimeBtn) {
    addTimeBtn.textContent = '⏰ Add 5 Mins (0/3)';
    addTimeBtn.disabled = false;
    addTimeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
  
  showSection('intro');
  clearInterval(timerId);
  clearInterval(impactInterval);
}

// === SCORE UI ===
function updateScore() {
  document.getElementById('score').textContent = score;
  const hintsDisplay = freeHints > 0 ? `${hintsUsed} (🎁 ${freeHints} free)` : hintsUsed;
  document.getElementById('hints-used').textContent = hintsDisplay;
}

// === FALSE POSITIVE DETECTION (Level 3 - Linux Attack) ===
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user_name || '';
  
  // Legitimate SSH login attempts (failed)
  if (/Failed password|authentication failure/i.test(raw) && !/developer|185\.122\.21\.55/i.test(raw)) return true;
  
  // Legitimate admin activity
  if (/admin.*sudo|apt update|scheduled|cron/i.test(raw)) return true;
  
  // Internal IP (192.168.1.x)
  if (/192\.168\.1\./i.test(raw)) return true;
  
  // Failed external attacks (blocked)
  if (/blocked|denied|DENY/i.test(raw) && (/SQL|XSS|phishing|port.*scan/i.test(raw))) return true;
  
  // Legitimate web access
  if (/normal.*HTTP|GET\/index\.html/i.test(raw)) return true;
  
  return false;
}

function isLinuxAttackIndicator(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user_name || '';
  
  // SSH brute-force + successful login from attacker IP
  if (/185\.122\.21\.55/i.test(raw) && (/brute|password|developer/i.test(raw))) return true;
  
  // Privilege escalation
  if (/privilege.*escalation|sudo.*root|session opened.*root/i.test(raw)) return true;
  
  // Malware indicators
  if (/wget|payload|chmod.*\+x|curl|exfiltration|tar.*gz/i.test(raw)) return true;
  
  // Data collection
  if (/tar.*logs|compression|upload/i.test(raw)) return true;
  
  // Network anomaly (outbound to attacker)
  if (/185\.122\.21\.55/i.test(raw) && (/outbound|POST|upload/i.test(raw))) return true;
  
  return false;
}

function getTruePositives() {
  return alerts.filter(a => !isFalsePositive(a) && isLinuxAttackIndicator(a));
}

// === PHASE 1: ALERT TRIAGE (18 Questions) ===
function buildGeneralQuestions() {
  const fp = alerts.filter(isFalsePositive);
  const tp = alerts.filter(a => !isFalsePositive(a) && isLinuxAttackIndicator(a));
  const questions = [];

  const selectedAlerts = [];
  for (let i = 0; i < 6; i++) {
    if (tp[i]) selectedAlerts.push(tp[i]);
    if (fp[i]) selectedAlerts.push(fp[i]);
  }
  
  selectedAlerts.forEach((alert, idx) => {
    const isTP = !isFalsePositive(alert);
    
    questions.push({
      id: `q${idx + 1}`,
      type: 'select',
      title: `Alert ${alert.alert_id}`,
      hint: isTP ? 'Linux attack pattern detected' : 'Look for legitimate activity or failed attempts',
      options: [
        { value: 'true_positive', label: 'True Positive (Malicious)' },
        { value: 'false_positive', label: 'False Positive (Benign)' },
        { value: 'needs_context', label: 'Needs More Context' }
      ],
      answer: isTP ? 'true_positive' : 'false_positive',
      alertId: alert.alert_id
    });
  });

  // Q13: Multi-Select False Positives
  const fpOptions = [...fp.slice(0, 8), ...tp.slice(0, 5)];
  const shuffledFP = fpOptions.sort(() => Math.random() - 0.5);
  
  questions.push({
    id: 'q13',
    type: 'multiselect',
    title: 'Q13: Which of these are FALSE POSITIVES? (Select all that apply)',
    hint: 'Look for: Failed SSH attempts, legitimate admin activity, scheduled tasks',
    options: shuffledFP.map(a => ({
      value: a.alert_id,
      label: `Alert ${a.alert_id}`,
      isCorrect: isFalsePositive(a)
    })),
    minCorrect: 5
  });

  // Q14: Top 5 Priority
  const priorityOptions = [...tp.slice(0, 7), ...fp.slice(0, 4)];
  const shuffledPriority = priorityOptions.sort(() => Math.random() - 0.5);
  
  questions.push({
    id: 'q14',
    type: 'multiselect',
    title: 'Q14: Select TOP 5 alerts for immediate investigation',
    hint: 'Focus on: SSH success, privilege escalation, malware, exfiltration',
    options: shuffledPriority.map(a => ({
      value: a.alert_id,
      label: `Alert ${a.alert_id}`,
      isCorrect: isLinuxAttackIndicator(a)
    })),
    minCorrect: 3
  });

  // Q15: Correlation
  questions.push({
    id: 'q15',
    type: 'select',
    title: 'Q15: Are these alerts part of the SAME or SEPARATE incidents?',
    hint: 'Same attacker IP + Sequential timeline + Attack chain',
    options: [
      { value: 'same', label: 'Same incident (coordinated attack chain)' },
      { value: 'separate', label: 'Separate unrelated incidents' },
      { value: 'unclear', label: 'Unclear - needs investigation' }
    ],
    answer: 'same'
  });

  // Q16: Behavior Analysis
  questions.push({
    id: 'q16',
    type: 'select',
    title: 'Q16: Which behavior is MOST suspicious?',
    hint: 'Failed brute-force can be normal; successful escalation is critical',
    options: [
      { value: 'ssh_brute', label: 'SSH brute-force attempts' },
      { value: 'privilege_escalation', label: 'Privilege escalation to root' },
      { value: 'malware_execution', label: 'Malware download and execution' },
      { value: 'data_exfiltration', label: 'Data exfiltration to external IP' }
    ],
    answer: 'data_exfiltration'
  });

  // Q17: MITRE ATT&CK
  questions.push({
    id: 'q17',
    type: 'select',
    title: 'Q17: Which MITRE technique best matches the successful attack?',
    hint: 'T1110 (Brute Force), T1548 (Privilege Escalation), T1105 (Malware)',
    options: [
      { value: 'T1110', label: 'T1110 – Brute Force' },
      { value: 'T1548', label: 'T1548 – Abuse Elevation Control Mechanism' },
      { value: 'T1105', label: 'T1105 – Ingress Tool Transfer' },
      { value: 'T1041', label: 'T1041 – Exfiltration Over C2 Channel' }
    ],
    answer: 'T1110'
  });

  // Q18: Hypothesis
  questions.push({
    id: 'q18',
    type: 'select',
    title: 'Q18: What best describes the successful attack scenario?',
    hint: 'Weak SSH credentials + Root access + Data theft',
    options: [
      { value: 'ssh_attack', label: 'SSH brute-force, privilege escalation, malware download, data exfiltration' },
      { value: 'insider', label: 'Insider threat from admin account' },
      { value: 'misconfig', label: 'System misconfiguration causing false alerts' },
      { value: 'failed_attacks', label: 'Only failed external attacks - no breach' }
    ],
    answer: 'ssh_attack'
  });

  return questions;
}

function renderGeneralQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  
  if (!cachedGeneralQuestions) {
    cachedGeneralQuestions = buildGeneralQuestions();
  }
  const questions = cachedGeneralQuestions;
  totalQuestions = questions.length;

  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
    card.dataset.qid = q.id;
    card.dataset.answer = q.answer || '';
    if (q.options) {
      card.dataset.questionMeta = JSON.stringify({ 
        options: q.options, 
        type: q.type,
        minCorrect: q.minCorrect
      });
    }
    if (q.minCorrect !== undefined) {
      card.dataset.minCorrect = q.minCorrect;
    }

    let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
    html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">💡 Show Hint (-5 points)</button>`;
    html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint}</div>`;

    if (q.type === 'select') {
      html += `<select class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700">`;
      html += `<option value="">-- Select Answer --</option>`;
      q.options.forEach(opt => {
        html += `<option value="${opt.value}">${opt.label}</option>`;
      });
      html += `</select>`;
    }

    if (q.type === 'multiselect') {
      html += `<div class="answer-multiselect mt-2 space-y-1">`;
      q.options.forEach(opt => {
        const label = typeof opt.label === 'string' ? opt.label : opt.value;
        html += `<label class="flex items-center gap-2 p-2 bg-gray-900 rounded hover:bg-gray-700 cursor-pointer">`;
        html += `<input type="checkbox" value="${opt.value}" class="form-checkbox">`;
        html += `<span class="text-xs text-gray-300">${label}</span>`;
        html += `</label>`;
      });
      html += `</div>`;
    }

    card.innerHTML = html;

    card.querySelector('.hint-btn').addEventListener('click', function(e) {
      e.preventDefault();
      const hintText = card.querySelector('.hint-text');
      if (!hintText.classList.contains('hidden')) return;
      
      hintText.classList.remove('hidden');
      hintsUsed++;
      
      if (freeHints > 0) {
        freeHints--;
        this.innerHTML = '🎁 Free Hint Used!';
      } else {
        score = Math.max(0, score - 5);
        this.innerHTML = '💡 Hint Used (-5 points)';
      }
      updateScore();
    });

    container.appendChild(card);
  });
}

function evaluateGeneralQuestions() {
  const questions = cachedGeneralQuestions;
  if (!questions || questions.length === 0) {
    console.error('[Evaluation Error] No cached questions found');
    return;
  }
  
  const cards = document.querySelectorAll('#questions-container [data-qid]');
  let phase1Score = 0;
  let phase1Correct = 0;
  
  cards.forEach(card => {
    const qid = card.dataset.qid;
    const correctAnswer = card.dataset.answer;
    const points = 10;
    
    // If already correct, count it but don't re-award points
    if (card.classList.contains('border-green-500')) {
      phase1Correct++;
      return;
    }
    
    // Remove red border to allow re-evaluation
    card.classList.remove('border-2', 'border-red-500');
    
    const select = card.querySelector('select.answer-input');
    if (select) {
      const userAnswer = select.value;
      if (userAnswer === correctAnswer) {
        phase1Score += points;
        phase1Correct++;
        card.classList.add('border-2', 'border-green-500');
      } else {
        card.classList.add('border-2', 'border-red-500');
      }
    }
    else {
      const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');
      const userIds = Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
      
      let questionMeta = null;
      try {
        if (card.dataset.questionMeta) {
          questionMeta = JSON.parse(card.dataset.questionMeta);
        }
      } catch (e) {}
      
      let isCorrect = false;
      
      if (questionMeta && questionMeta.options) {
        const correctOptions = questionMeta.options.filter(opt => opt.isCorrect === true).map(opt => opt.value);
        const wrongOptions = questionMeta.options.filter(opt => opt.isCorrect === false).map(opt => opt.value);
        
        const selectedCorrect = userIds.filter(id => correctOptions.includes(id)).length;
        const selectedWrong = userIds.filter(id => wrongOptions.includes(id)).length;
        const minRequired = Number(card.dataset.minCorrect || Math.ceil(correctOptions.length * 0.7));
        
        isCorrect = selectedCorrect >= minRequired && selectedWrong === 0;
      } else {
        const correctIds = correctAnswer.split(',').map(s => s.trim()).filter(s => s);
        const overlap = userIds.filter(id => correctIds.includes(id)).length;
        const minRequired = Number(card.dataset.minCorrect || Math.ceil(correctIds.length * 0.7));
        isCorrect = overlap >= minRequired;
      }
      
      if (isCorrect) {
        phase1Score += points;
        phase1Correct++;
        card.classList.add('border-2', 'border-green-500');
      } else {
        card.classList.add('border-2', 'border-red-500');
      }
    }
  });
  
  // Track current correct count idempotently
  phase1CorrectCount = Array.from(cards).filter(c => c.classList.contains('border-green-500')).length;
  const wrongAnswers = Math.max(0, cards.length - phase1CorrectCount);
  const wrongPenalty = wrongAnswers * WRONG_ANSWER_PENALTY;
  score = Math.max(0, score + phase1Score - wrongPenalty);
  // Accuracy tracks Phase 1 only (matches existing totalQuestions)
  correctAnswers = phase1CorrectCount;
  updateScore();
  
  const percentage = Math.round((phase1CorrectCount / cards.length) * 100);
  
  if (percentage === 100) {
    window.alert(`✅ Phase 1 Complete!\n\nCorrect: ${phase1CorrectCount}/${cards.length}\nScore: +${phase1Score} points\n\nProceeding to Phase 2...`);
    showSection('scenario');
    renderScenarioQuestions();
  } else {
    window.alert(`❌ Phase 1 Incomplete\n\nCorrect: ${phase1CorrectCount}/${cards.length} (${percentage}%)\nScore: +${phase1Score} points\n\n⚠️ You must answer ALL questions correctly to proceed.`);
  }
}

// === PHASE 2: SCENARIO VALIDATION (8 Questions) ===
function renderScenarioQuestions() {
  const container = document.getElementById('scenario-container');
  container.innerHTML = '';

  const scenarioQuestions = [
    {
      id: 'sc-attack-type',
      type: 'text',
      title: 'Q1: What type of attack occurred? (e.g., brute-force + privilege escalation)',
      hint: 'Think: SSH weak credentials, root access, data theft',
      placeholder: 'Attack Type',
      patternSource: 'brute.*force|privilege.*escalation|ssh.*attack|linux.*attack|ssh|brute|escalation|server.*attack|remote.*access'
    },
    {
      id: 'sc-evidence',
      type: 'multiselect',
      title: 'Q2: Select THREE pieces of evidence supporting this conclusion',
      options: [
        { value: 'ssh_success', label: 'Successful SSH login from attacker IP (185.122.21.55)', isCorrect: true },
        { value: 'privilege_escalation', label: 'Privilege escalation to root successful', isCorrect: true },
        { value: 'malware_download', label: 'Malware download from attacker infrastructure', isCorrect: true },
        { value: 'failed_ssh', label: 'Failed SSH attempts (blocked)', isCorrect: false }
      ],
      answer: 'ssh_success,privilege_escalation,malware_download',
      minCorrect: 3
    },
    {
      id: 'sc-mitre-techniques',
      type: 'multiselect',
      title: 'Q3: Which MITRE ATT&CK techniques apply? (Select ALL that apply)',
      options: [
        { value: 'T1110', label: 'T1110 – Brute Force', isCorrect: true },
        { value: 'T1548', label: 'T1548 – Privilege Escalation', isCorrect: true },
        { value: 'T1105', label: 'T1105 – Ingress Tool Transfer', isCorrect: true },
        { value: 'T1041', label: 'T1041 – Exfiltration Over C2 Channel', isCorrect: true }
      ],
      answer: 'T1110,T1548,T1105,T1041',
      minCorrect: 4
    },
    {
      id: 'sc-timeline',
      type: 'select',
      title: 'Q4: What happened FIRST in the attack chain?',
      hint: 'Review the alert timeline carefully',
      options: [
        { value: 'ssh_bruteforce', label: 'SSH brute-force attempts' },
        { value: 'ssh_success', label: 'SSH successful login (developer)' },
        { value: 'privilege_escalation', label: 'Privilege escalation to root' },
        { value: 'malware_download', label: 'Malware download' }
      ],
      answer: 'ssh_bruteforce'
    },
    {
      id: 'sc-not-external',
      type: 'multiselect',
      title: 'Q5: Which of the following attack attempts FAILED? (Select all that apply)',
      options: [
        { value: 'sql_injection', label: 'SQL injection attempt - blocked by IDS', isCorrect: true },
        { value: 'xss_attack', label: 'XSS payload - filtered by WAF', isCorrect: true },
        { value: 'ssh_bruteforce_failed', label: 'SSH brute-force (other attackers) - blocked', isCorrect: true },
        { value: 'malware_execution', label: 'Malware execution on server', isCorrect: false }
      ],
      answer: 'sql_injection,xss_attack,ssh_bruteforce_failed',
      minCorrect: 2
    },
    {
      id: 'sc-impact',
      type: 'select',
      title: 'Q6: What is the PRIMARY impact of this breach?',
      hint: 'Focus on CIA triad - what was compromised?',
      options: [
        { value: 'confidentiality', label: 'Data confidentiality breach (logs exfiltrated)' },
        { value: 'integrity', label: 'System integrity compromised' },
        { value: 'availability', label: 'Service availability disrupted' },
        { value: 'financial', label: 'Direct financial loss' }
      ],
      answer: 'confidentiality'
    },
    {
      id: 'sc-failed-attack',
      type: 'select',
      title: 'Q7: Which alert represents a FAILED attack NOT related to the main incident?',
      options: [
        { value: 'sql_injection', label: 'SQL injection attempt - blocked by IDS' },
        { value: 'xss_attack', label: 'XSS payload - filtered by WAF' },
        { value: 'ssh_developer', label: 'SSH login for developer from 185.122.21.55' },
        { value: 'port_scan', label: 'Port scan - firewall denied' }
      ],
      answer: 'sql_injection'
    },
    {
      id: 'sc-soc-decision',
      type: 'select',
      title: 'Q8: What should the SOC do FIRST?',
      options: [
        { value: 'block_ip', label: 'Block attacker IP (185.122.21.55) immediately' },
        { value: 'kill_process', label: 'Kill all root processes' },
        { value: 'isolate_server', label: 'Isolate server from network' },
        { value: 'scan_malware', label: 'Run full malware scan' }
      ],
      answer: 'block_ip'
    }
  ];

  scenarioQuestions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
    card.dataset.qid = q.id;
    card.dataset.answer = q.answer || '';
    card.dataset.pattern = q.patternSource || '';
    if (q.minCorrect) {
      card.dataset.minCorrect = q.minCorrect;
    }
    if (q.options) {
      card.dataset.questionMeta = JSON.stringify({ options: q.options, type: q.type });
    }

    let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
    html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">💡 Show Hint (-5 points)</button>`;
    html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint}</div>`;

    if (q.type === 'text') {
      const placeholder = q.placeholder || '────────────';
      html += `<input type="text" class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700" placeholder="${placeholder}">`;
    }

    if (q.type === 'select') {
      html += `<select class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700">`;
      html += `<option value="">-- Select Answer --</option>`;
      q.options.forEach(opt => {
        html += `<option value="${opt.value}">${opt.label}</option>`;
      });
      html += `</select>`;
    }

    if (q.type === 'multiselect') {
      html += `<div class="answer-multiselect mt-2 space-y-1">`;
      q.options.forEach(opt => {
        html += `<label class="flex items-center gap-2 p-2 bg-gray-900 rounded hover:bg-gray-700 cursor-pointer">`;
        html += `<input type="checkbox" value="${opt.value}" class="form-checkbox">`;
        html += `<span class="text-xs text-gray-300">${opt.label}</span>`;
        html += `</label>`;
      });
      html += `</div>`;
    }

    card.innerHTML = html;

    card.querySelector('.hint-btn').addEventListener('click', function(e) {
      e.preventDefault();
      const hintText = card.querySelector('.hint-text');
      if (!hintText.classList.contains('hidden')) return;
      
      hintText.classList.remove('hidden');
      hintsUsed++;
      
      if (freeHints > 0) {
        freeHints--;
        this.innerHTML = '🎁 Free Hint Used!';
      } else {
        score = Math.max(0, score - 5);
        this.innerHTML = '💡 Hint Used (-5 points)';
      }
      updateScore();
    });

    container.appendChild(card);
  });
}

function evaluatePhase2() {
  const cards = document.querySelectorAll('#scenario-container [data-qid]');
  let phase2Score = 0;
  let phase2Correct = 0;

  cards.forEach(card => {
    const qid = card.dataset.qid;
    const points = 10;
    let isCorrect = false;

    // If already correct, count it but don't re-award points
    if (card.classList.contains('border-green-500')) {
      phase2Correct++;
      return;
    }
    
    // Remove red border to allow re-evaluation
    card.classList.remove('border-2', 'border-red-500');

    const textInput = card.querySelector('input[type="text"].answer-input');
    if (textInput) {
      const pattern = card.dataset.pattern;
      if (pattern && new RegExp(pattern, 'i').test(textInput.value)) {
        phase2Score += points;
        phase2Correct++;
        isCorrect = true;
      }
    } else {
      const select = card.querySelector('select.answer-input');
      if (select) {
        const correctAnswer = card.dataset.answer;
        if (select.value === correctAnswer) {
          phase2Score += points;
          phase2Correct++;
          isCorrect = true;
        }
      } else {
        const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');
        const userIds = Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
        
        let questionMeta = null;
        try {
          if (card.dataset.questionMeta) {
            questionMeta = JSON.parse(card.dataset.questionMeta);
          }
        } catch (e) {}
        
        if (questionMeta && questionMeta.options) {
          const correctOptions = questionMeta.options.filter(opt => opt.isCorrect === true).map(opt => opt.value);
          const wrongOptions = questionMeta.options.filter(opt => opt.isCorrect === false).map(opt => opt.value);
          
          const selectedCorrect = userIds.filter(id => correctOptions.includes(id)).length;
          const selectedWrong = userIds.filter(id => wrongOptions.includes(id)).length;
          const minRequired = Number(card.dataset.minCorrect || Math.ceil(correctOptions.length * 0.7));
          
          if (selectedCorrect >= minRequired && selectedWrong === 0) {
            phase2Score += points;
            phase2Correct++;
            isCorrect = true;
          }
        }
      }
    }

    if (isCorrect) {
      card.classList.add('border-2', 'border-green-500');
    } else {
      card.classList.add('border-2', 'border-red-500');
    }
  });

  phase2CorrectCount = Array.from(cards).filter(c => c.classList.contains('border-green-500')).length;
  const wrongAnswers = Math.max(0, cards.length - phase2CorrectCount);
  const wrongPenalty = wrongAnswers * WRONG_ANSWER_PENALTY;
  score = Math.max(0, score + phase2Score - wrongPenalty);
  updateScore();
  
  const percentage = Math.round((phase2CorrectCount / cards.length) * 100);
  if (percentage === 100) {
    window.alert(`✅ Phase 2 Complete!\n\nCorrect: ${phase2CorrectCount}/${cards.length} (${percentage}%)\nScore: +${phase2Score} points\n\nProceeding to Incident Ticket...`);
    showSection('ticket');
  } else {
    window.alert(`❌ Phase 2 Incomplete\n\nCorrect: ${phase2CorrectCount}/${cards.length} (${percentage}%)\nScore: +${phase2Score} points\n\n⚠️ You must answer ALL questions correctly to proceed.\nReview the red-bordered questions.`);
  }
}

// === PHASE 3: TICKET CREATION ===
function renderTicketForm() {
  // Ticket form is already in HTML
}

function submitTicket() {
  const title = document.getElementById('ticket-title')?.value || '';
  const priority = document.getElementById('ticket-priority')?.value || '';
  const attackType = document.getElementById('ticket-attack')?.value || '';
  const summary = document.getElementById('ticket-summary')?.value || '';

  if (!title || !priority || !attackType || !summary) {
    window.alert('❌ Please fill in all ticket fields');
    return;
  }
  if (!ticketSubmitted) {
    score += 20;
    ticketSubmitted = true;
  }
  updateScore();
  showFinalResults();
}

// === FINAL RESULTS ===
function getPlayerLevelByScore(points) {
  if (points >= 170) return 'Elite Analyst';
  if (points >= 140) return 'Senior Analyst';
  if (points >= 110) return 'SOC Analyst';
  if (points >= 80) return 'Junior Analyst';
  return 'Trainee Analyst';
}

function showFinalResults() {
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const finalScore = score;
  const playerLevel = getPlayerLevelByScore(finalScore);

  document.getElementById('final-score').textContent = finalScore;
  document.getElementById('final-time').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;

  let rating = '🟡 Good Effort';
  let ratingHTML = '';
  
  if (accuracy === 100 && score >= 150) {
    rating = '🟢 Excellent Analysis!';
    ratingHTML = `<h3 class="text-lg text-green-300 mb-2">🎖️ ${rating}</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-green-100">Perfect classification and analysis. You're ready for advanced scenarios.</p>`;
  } else if (accuracy >= 80 && score >= 120) {
    rating = '🟢 Great Work!';
    ratingHTML = `<h3 class="text-lg text-green-300 mb-2">🎖️ ${rating}</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-green-100">Strong investigation skills. Minor areas for improvement.</p>`;
  } else if (accuracy >= 60) {
    rating = '🟡 Good Effort';
    ratingHTML = `<h3 class="text-lg text-yellow-300 mb-2">📚 ${rating}</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-yellow-100">You identified the main threats. Review the answer key to improve.</p>`;
  } else {
    rating = '🔴 Keep Learning';
    ratingHTML = `<h3 class="text-lg text-red-300 mb-2">📖 ${rating}</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-red-100">Review SIEM basics and attack patterns. Practice helps!</p>`;
  }

  document.getElementById('performance-rating').innerHTML = ratingHTML;

  showSection('final');
  clearInterval(timerId);
  clearInterval(impactInterval);

  document.getElementById('return-dashboard').onclick = () => {
    window.location.href = '/';
  };

  document.getElementById('view-answerkey').onclick = () => {
    window.open('/LEVEL3_ANSWERS.html', '_blank');
  };
}

// === INITIALIZATION ===
function startLevel() {
  fetch('data/level3/alerts.json')
    .then(res => res.json())
    .then(data => {
      alerts = data;
      console.log(`✅ Loaded ${alerts.length} Level 3 alerts`);
      renderGeneralQuestions();
      startTimer();
      showSection('questions');
    })
    .catch(err => {
      console.error('Error loading alerts:', err);
      window.alert('Failed to load alerts. Check console.');
    });
}

function evaluatePhase1() {
  evaluateGeneralQuestions();
}
