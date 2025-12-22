// === LEVEL 2: INSIDER THREAT INVESTIGATION ===
// 34 Total Alerts: 13 Primary Attack + 15 False Positives + 6 Failed External Attacks

// === GLOBAL STATE ===
let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0; // Reward hints from Level 1
let attempts = 3;
let timerSeconds = 20 * 60; // 20 minutes for Level 2
let startTime = 0;
let timerId = null;
let correctAnswers = 0;
let totalQuestions = 0;
let timeExtensions = 0;
let impactLevel = 0;
let impactInterval = null;
let cachedGeneralQuestions = null; // Cache questions to avoid re-randomization

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
      window.alert('⏰ Time expired! The data exfiltration succeeded.');
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
    warningEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ⚠️ CRITICAL: Data loss risk at ${impactLevel}% - Act fast!`;
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
  cachedGeneralQuestions = null; // Clear cached questions for new attempt
  
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

// === FALSE POSITIVE DETECTION (Level 2 - Insider Threat) ===
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user || '';
  
  // Service accounts (legitimate automation)
  if (/SVC_|SYSTEM/i.test(user)) return true;
  
  // Approved tickets
  if (/INC-|CHG-|REQ-|TASK-/i.test(raw)) return true;
  
  // Scheduled jobs (02:00, 03:00, etc.)
  if (/Scheduled.*True|02:00|03:00|01:15|04:30/i.test(raw)) return true;
  
  // Legitimate business operations
  if (/DevOps|CI\/CD|backup|replication|OneDrive.*sync|Creative.*Cloud|Windows.*Update/i.test(raw)) return true;
  if (/payroll|Board.*meeting|approved.*true/i.test(raw)) return true;
  
  // Failed external attacks (not relevant to insider threat)
  if (/brute.*force.*blocked|phishing.*quarantined|WAF.*blocked|sanitized|port.*scan.*blocked/i.test(raw)) return true;
  if (/IDS.*false.*positive|outdated.*detection/i.test(raw)) return true;
  
  return false;
}

function isFailedExternalAttack(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  return /brute.*force|phishing|port.*scan|SQL.*injection|XSS.*attempt|WAF.*blocked/i.test(raw) && 
         /blocked|quarantined|sanitized|denied/i.test(raw);
}

function isInsiderThreatIndicator(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  const user = alert.user || '';
  
  // Primary insider: sarah.mitchell
  if (user !== 'sarah.mitchell' && !/sarah\.mitchell/i.test(raw)) return false;
  
  // Insider threat patterns
  if (/Git.*clone.*GB|repository.*outside.*role|HR.*repo/i.test(raw)) return true;
  if (/massive.*file.*read|ZIP.*creation|archive/i.test(raw)) return true;
  if (/Google.*Drive.*upload|DLP.*block|sensitive.*data/i.test(raw)) return true;
  if (/off.*hours|weekend|Saturday|22:17|USB/i.test(raw)) return true;
  if (/file.*access.*anomaly|deviation.*%/i.test(raw)) return true;
  
  return false;
}

function getTruePositives() {
  return alerts.filter(a => !isFalsePositive(a) && isInsiderThreatIndicator(a));
}

// === PHASE 1: ALERT TRIAGE (18 Questions) ===
function buildGeneralQuestions() {
  const fp = alerts.filter(isFalsePositive);
  const tp = getTruePositives();
  const questions = [];

  // Q1-Q12: Individual Alert Classification
  const mixedAlerts = [...tp.slice(0, 8), ...fp.slice(0, 4)].sort(() => Math.random() - 0.5);
  
  mixedAlerts.forEach((alert, idx) => {
    const isTP = !isFalsePositive(alert);
    questions.push({
      id: `q-classify-${idx}`,
      type: 'select',
      title: `Alert ${alert.alert_id.substring(0, 12)}... - Classification?`,
      hint: `Review: "${alert.linked_log?.['log.original']?.substring(0, 150) || 'No log data'}..."`,
      options: [
        { value: 'true_positive', label: 'True Positive (Malicious)' },
        { value: 'false_positive', label: 'False Positive (Benign)' },
        { value: 'needs_context', label: 'Needs More Context' }
      ],
      answer: isTP ? 'true_positive' : 'false_positive'
    });
  });

  // Q13: Multi-Select False Positives ✨ NEW
  const fpOptions = [
    ...fp.slice(0, 10),
    ...tp.slice(0, 3)
  ].sort(() => Math.random() - 0.5);
  
  questions.push({
    id: 'q-fp-multiselect',
    type: 'multiselect',
    title: 'Which of these alerts are FALSE POSITIVES? (Select all that apply)',
    hint: 'Look for service accounts, approved tickets, scheduled jobs, and legitimate business operations.',
    options: fpOptions.map(a => ({
      value: a.alert_id,
      label: a.linked_log?.['log.original']?.substring(0, 80) || a.alert_id,
      isCorrect: isFalsePositive(a)
    })),
    answer: fpOptions.filter(a => isFalsePositive(a)).map(a => a.alert_id).join(',')
  });

  // Q14: Top 5 Priority Alerts
  questions.push({
    id: 'q-top5',
    type: 'multiselect',
    title: 'Select the TOP 5 alerts requiring immediate investigation',
    hint: 'Focus on data exfiltration, role violations, and DLP blocks.',
    options: [...tp, ...fp.slice(0, 5)].map(a => ({
      value: a.alert_id,
      label: a.linked_log?.['log.original']?.substring(0, 80) || a.alert_id,
      priority: isInsiderThreatIndicator(a) ? 1 : 0
    })).sort((a, b) => b.priority - a.priority),
    answer: tp.slice(0, 5).map(a => a.alert_id).join(','),
    partialCredit: true
  });

  // Q15: Correlation
  questions.push({
    id: 'q-correlation',
    type: 'textarea',
    title: 'Which alerts are part of the same incident? List the alert IDs (comma-separated)',
    hint: 'All insider threat alerts (sarah.mitchell) belong to one incident.',
    answer: tp.map(a => a.alert_id).sort().join(','),
    placeholder: 'Enter alert IDs separated by commas'
  });

  // Q16: Behavior Analysis
  questions.push({
    id: 'q-behavior',
    type: 'select',
    title: 'Which behavior is MOST suspicious?',
    hint: 'Single indicators can be legitimate; combinations are stronger.',
    options: [
      { value: 'large_data', label: 'Large data access' },
      { value: 'off_hours', label: 'Off-hours activity' },
      { value: 'non_role', label: 'Non-role resource access' },
      { value: 'combination', label: 'Combination of all' }
    ],
    answer: 'combination'
  });

  // Q17: MITRE Mapping
  questions.push({
    id: 'q-mitre',
    type: 'select',
    title: 'Which MITRE ATT&CK technique best matches the observed behavior?',
    hint: 'Attacker using legitimate credentials (no exploitation).',
    options: [
      { value: 'T1078', label: 'T1078 – Valid Accounts' },
      { value: 'T1486', label: 'T1486 – Data Encrypted for Impact' },
      { value: 'T1190', label: 'T1190 – Exploit Public-Facing Application' },
      { value: 'T1046', label: 'T1046 – Network Service Discovery' }
    ],
    answer: 'T1078'
  });

  // Q18: Hypothesis
  questions.push({
    id: 'q-hypothesis',
    type: 'select',
    title: 'Which statement best describes the situation?',
    hint: 'Consider the pattern: valid credentials, role violations, data collection, exfiltration.',
    options: [
      { value: 'isolated', label: 'Isolated alerts requiring individual investigation' },
      { value: 'misconfiguration', label: 'System misconfiguration causing false alerts' },
      { value: 'insider_threat', label: 'Suspicious internal user behavior indicating data theft' },
      { value: 'external_attack', label: 'Active external attack campaign' }
    ],
    answer: 'insider_threat'
  });

  return questions;
}

function renderGeneralQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  
  // Build questions once and cache them
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

    let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
    html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">💡 Show Hint (-5 points)</button>`;
    html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint}</div>`;

    if (q.type === 'text' || q.type === 'textarea') {
      const tag = q.type === 'textarea' ? 'textarea' : 'input';
      const rows = q.type === 'textarea' ? ' rows="3"' : '';
      const type = q.type === 'text' ? ' type="text"' : '';
      const placeholder = q.placeholder || '────────────';
      html += `<${tag}${type}${rows} class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700" placeholder="${placeholder}"></${tag}>`;
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
  // Use cached questions instead of rebuilding
  const questions = cachedGeneralQuestions;
  const cards = document.querySelectorAll('#questions-container [data-qid]');
  let correct = 0;

  cards.forEach((card, idx) => {
    // Skip if already evaluated (has border)
    if (card.classList.contains('border-green-500') || card.classList.contains('border-red-500')) {
      if (card.classList.contains('border-green-500')) correct++;
      return;
    }

    const q = questions[idx];
    const correctAnswer = card.dataset.answer.toLowerCase();
    let userAnswer = '';
    let isCorrect = false;

    if (q.type === 'select') {
      const select = card.querySelector('select.answer-input');
      userAnswer = select ? select.value.toLowerCase() : '';
      isCorrect = userAnswer === correctAnswer;
    } 
    else if (q.type === 'text' || q.type === 'textarea') {
      const input = card.querySelector('.answer-input');
      userAnswer = input ? input.value.trim().toLowerCase() : '';
      
      // Normalize comma-separated IDs
      const userIds = userAnswer.split(',').map(s => s.trim()).filter(s => s).sort();
      const correctIds = correctAnswer.split(',').map(s => s.trim()).filter(s => s).sort();
      
      // Allow 70% accuracy for alert IDs
      const overlap = userIds.filter(id => correctIds.includes(id)).length;
      const minRequired = Math.ceil(correctIds.length * 0.7);
      isCorrect = overlap >= minRequired;
    }
    else if (q.type === 'multiselect') {
      const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');
      userAnswer = Array.from(checkboxes).map(cb => cb.value).sort().join(',');
      const correctIds = correctAnswer.split(',').map(s => s.trim()).filter(s => s).sort();
      const userIds = userAnswer.split(',').map(s => s.trim()).filter(s => s).sort();
      
      // Exact match or high overlap
      const overlap = userIds.filter(id => correctIds.includes(id)).length;
      const minRequired = Math.ceil(correctIds.length * 0.8);
      isCorrect = overlap >= minRequired;
    }

    if (isCorrect) {
      correct++;
      score += 10;
      card.classList.add('border-2', 'border-green-500');
    } else {
      card.classList.add('border-2', 'border-red-500');
    }
  });

  correctAnswers += correct;
  updateScore();

  // Check hypothesis (Q18) is correct
  const hypothesisCard = Array.from(cards).find(c => c.dataset.qid === 'q-hypothesis');
  const hypothesisCorrect = hypothesisCard?.classList.contains('border-green-500');

  const percentage = Math.round((correct / cards.length) * 100);
  
  if (percentage >= 65 && hypothesisCorrect) {
    window.alert(`✅ Phase 1 Complete!\n\nScore: ${score} points\nAccuracy: ${percentage}%\n\nProceeding to Scenario Validation...`);
    showSection('scenario');
    renderScenarioQuestions();
  } else {
    const msg = !hypothesisCorrect 
      ? 'The hypothesis (Q18) must be correct to proceed.'
      : `Need ≥65% accuracy (current: ${percentage}%). Review red-bordered questions.`;
    window.alert(`❌ Phase 1 Incomplete\n\n${msg}`);
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
      title: 'Q1: Based on all evidence, what type of attack occurred? (1-2 words)',
      hint: 'Think: Internal user, valid credentials, data theft.',
      placeholder: 'Attack Type',
      pattern: /(insider.*threat|data.*exfiltration|insider.*data.*theft|internal.*breach)/i
    },
    {
      id: 'sc-evidence',
      type: 'multiselect',
      title: 'Q2: Select TWO pieces of evidence that best support your conclusion',
      hint: 'What distinguishes insider threats from external attacks?',
      options: [
        { value: 'valid_creds', label: 'Valid credentials used (no account compromise)', isCorrect: true },
        { value: 'no_malware', label: 'No malware traces (legitimate tools only)', isCorrect: true },
        { value: 'unusual_behavior', label: 'Unusual user behavior (role violations, off-hours)', isCorrect: true },
        { value: 'external_ip', label: 'External IP reputation', isCorrect: false }
      ],
      answer: 'valid_creds,no_malware',
      minCorrect: 2
    },
    {
      id: 'sc-mitre-techniques',
      type: 'multiselect',
      title: 'Q3: Which MITRE ATT&CK techniques apply? (Select ALL that apply)',
      hint: 'Think: Valid accounts, archiving data, cloud exfiltration.',
      options: [
        { value: 'T1078', label: 'T1078 – Valid Accounts', isCorrect: true },
        { value: 'T1560', label: 'T1560 – Archive Collected Data', isCorrect: true },
        { value: 'T1567', label: 'T1567 – Exfiltration Over Web Service', isCorrect: true },
        { value: 'T1486', label: 'T1486 – Data Encrypted for Impact', isCorrect: false }
      ],
      answer: 'T1078,T1560,T1567',
      minCorrect: 3
    },
    {
      id: 'sc-timeline',
      type: 'select',
      title: 'Q4: What happened FIRST in the attack chain?',
      hint: 'Review the timeline from the earliest event.',
      options: [
        { value: 'repo_access', label: 'Repository access attempt' },
        { value: 'zip_creation', label: 'ZIP file creation' },
        { value: 'cloud_upload', label: 'Cloud upload' },
        { value: 'dlp_alert', label: 'DLP alert' }
      ],
      answer: 'repo_access'
    },
    {
      id: 'sc-not-ransomware',
      type: 'multiselect',
      title: 'Q5: Why is this NOT a ransomware attack? (Select all that apply)',
      hint: 'What characteristics are missing?',
      options: [
        { value: 'no_encryption', label: 'No file encryption', isCorrect: true },
        { value: 'no_ransom', label: 'No ransom note', isCorrect: true },
        { value: 'legit_access', label: 'Legitimate user access', isCorrect: true },
        { value: 'data_theft', label: 'Data theft, not destruction', isCorrect: true }
      ],
      answer: 'no_encryption,no_ransom,legit_access,data_theft',
      minCorrect: 2
    },
    {
      id: 'sc-impact',
      type: 'select',
      title: 'Q6: What is the primary business impact?',
      hint: 'Focus on the CIA triad.',
      options: [
        { value: 'confidentiality', label: 'Data confidentiality breach' },
        { value: 'availability', label: 'Service availability impact' },
        { value: 'financial', label: 'Financial fraud' },
        { value: 'defacement', label: 'Website defacement' }
      ],
      answer: 'confidentiality'
    },
    {
      id: 'sc-failed-attack',
      type: 'select',
      title: 'Q7: Which alert represents a FAILED external attack NOT related to the main incident?',
      hint: 'External threats vs internal threats.',
      options: [
        { value: 'ssh_bruteforce', label: 'External SSH brute-force (blocked)' },
        { value: 'git_clone_failed', label: 'Git clone attempt (failed)' },
        { value: 'dlp_block', label: 'DLP block - cloud upload' },
        { value: 'port_scan', label: 'Port scan (blocked)' }
      ],
      answer: 'ssh_bruteforce'
    },
    {
      id: 'sc-soc-decision',
      type: 'select',
      title: 'Q8: What should the SOC do FIRST?',
      hint: 'Immediate containment is critical for insider threats.',
      options: [
        { value: 'disable_access', label: 'Disable user access immediately' },
        { value: 'scan_endpoints', label: 'Scan all endpoints for malware' },
        { value: 'block_ips', label: 'Block external IP addresses' },
        { value: 'av_scan', label: 'Run full antivirus scan' }
      ],
      answer: 'disable_access'
    }
  ];

  scenarioQuestions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
    card.dataset.qid = q.id;
    card.dataset.answer = q.answer || '';
    card.dataset.pattern = q.pattern || '';

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

function evaluateScenarioQuestions() {
  const cards = document.querySelectorAll('#scenario-container [data-qid]');
  let correct = 0;

  cards.forEach(card => {
    // Skip if already evaluated
    if (card.classList.contains('border-green-500') || card.classList.contains('border-red-500')) {
      if (card.classList.contains('border-green-500')) correct++;
      return;
    }

    const qid = card.dataset.qid;
    const correctAnswer = card.dataset.answer.toLowerCase();
    const pattern = card.dataset.pattern;
    let userAnswer = '';
    let isCorrect = false;

    const select = card.querySelector('select.answer-input');
    const input = card.querySelector('input.answer-input');
    const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');

    if (select) {
      userAnswer = select.value.toLowerCase();
      isCorrect = userAnswer === correctAnswer;
    } else if (input) {
      userAnswer = input.value.trim().toLowerCase();
      if (pattern) {
        const regex = new RegExp(pattern.slice(1, -2), 'i');
        isCorrect = regex.test(userAnswer);
      } else {
        isCorrect = userAnswer === correctAnswer;
      }
    } else if (checkboxes.length > 0) {
      userAnswer = Array.from(checkboxes).map(cb => cb.value).sort().join(',');
      const userIds = userAnswer.split(',');
      const correctIds = correctAnswer.split(',');
      const overlap = userIds.filter(id => correctIds.includes(id)).length;
      isCorrect = overlap >= Math.ceil(correctIds.length * 0.7);
    }

    if (isCorrect) {
      correct++;
      const points = qid === 'sc-attack-type' ? 15 : 
                     qid === 'sc-evidence' || qid === 'sc-mitre-techniques' ? 15 : 10;
      score += points;
      card.classList.add('border-2', 'border-green-500');
    } else {
      card.classList.add('border-2', 'border-red-500');
    }
  });

  correctAnswers += correct;
  updateScore();

  const percentage = Math.round((correct / cards.length) * 100);

  if (percentage >= 70) {
    window.alert(`✅ Phase 2 Complete!\n\nScore: ${score} points\nAccuracy: ${percentage}%\n\nProceeding to Incident Ticket Creation...`);
    showSection('ticket');
  } else {
    window.alert(`❌ Phase 2 Incomplete\n\nNeed ≥70% accuracy (current: ${percentage}%). Critical questions must be correct.`);
  }
}

// === PHASE 3: INCIDENT TICKET ===
function evaluateTicket() {
  const title = document.getElementById('ticket-title').value.trim();
  const priority = document.getElementById('ticket-priority').value;
  const attackType = document.getElementById('ticket-attack').value.trim().toLowerCase();
  const summary = document.getElementById('ticket-summary').value.trim();

  let ticketScore = 0;

  if (title.length >= 10) ticketScore += 10;
  if (priority === 'critical') ticketScore += 10;
  if (/(insider|exfiltration|data.*theft)/i.test(attackType)) ticketScore += 10;
  if (summary.length >= 50) ticketScore += 10;
  if (/sarah\.mitchell|DLP|Google.*Drive|repository/i.test(summary)) ticketScore += 10;

  score += ticketScore;
  correctAnswers += ticketScore >= 40 ? 1 : 0;
  updateScore();

  showFinalResults();
}

// === FINAL RESULTS ===
function showFinalResults() {
  clearInterval(timerId);
  clearInterval(impactInterval);
  
  const elapsed = Math.max(0, (20 * 60) - timerSeconds);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  // Speed bonus
  const timeRemaining = Math.max(0, timerSeconds);
  const speedBonus = Math.floor(timeRemaining / 60) * 5;
  score += speedBonus;
  
  // Impact penalty
  const impactPenalty = Math.floor(impactLevel / 2);
  score = Math.max(0, score - impactPenalty);
  
  // Final score
  const finalScore = score;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Performance rating
  let rating = '';
  let rewardHints = 0;
  if (finalScore >= 300) {
    rating = '🌟🌟🌟 EXPERT';
    rewardHints = 3;
  } else if (finalScore >= 250) {
    rating = '🌟🌟 PROFICIENT';
    rewardHints = 2;
  } else if (finalScore >= 200) {
    rating = '🌟 COMPETENT';
    rewardHints = 1;
  } else {
    rating = '❌ NEEDS IMPROVEMENT';
  }

  document.getElementById('final-score').textContent = finalScore;
  document.getElementById('final-time').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;

  const ratingDiv = document.getElementById('performance-rating');
  ratingDiv.innerHTML = `
    <h3 class="text-2xl text-green-400 mb-2">${rating}</h3>
    <p class="text-gray-300">Score: ${finalScore} / 350</p>
    <p class="text-gray-300">Accuracy: ${accuracy}%</p>
    <p class="text-gray-300">Time: ${minutes}m ${seconds}s</p>
    ${rewardHints > 0 ? `<p class="text-yellow-400 mt-2">🎁 Earned ${rewardHints} free hints for Level 3!</p>` : ''}
  `;

  const breakdownList = document.getElementById('breakdown-list');
  breakdownList.innerHTML = `
    <li>✅ Correct Answers: ${correctAnswers} / ${totalQuestions}</li>
    <li>⏱️ Speed Bonus: +${speedBonus} points</li>
    <li>🔥 Impact Penalty: -${impactPenalty} points</li>
    <li>💡 Hints Used: ${hintsUsed}</li>
    <li>⏰ Time Extensions: ${timeExtensions}</li>
  `;

  showSection('final');
}

// === EVENT LISTENERS ===
document.getElementById('start-btn').addEventListener('click', () => {
  loadAlerts();
});

document.getElementById('reset-level').addEventListener('click', handleReset);

document.getElementById('submit-answers').addEventListener('click', evaluateGeneralQuestions);

document.getElementById('submit-scenario').addEventListener('click', evaluateScenarioQuestions);

document.getElementById('create-ticket').addEventListener('click', evaluateTicket);

document.getElementById('return-dashboard').addEventListener('click', () => {
  window.location.href = '/';
});

document.getElementById('view-answerkey')?.addEventListener('click', () => {
  window.location.href = '/AnswerKey_Level2';
});

// === LOAD ALERTS ===
function loadAlerts() {
  const timestamp = Date.now();
  fetch(`data/level2/alerts.json?t=${timestamp}`)
    .then(res => res.json())
    .then(data => {
      alerts = data;
      if (!alerts || alerts.length < 20) {
        window.alert('⚠️ Not enough alerts generated. Please run:\n\nnode processAllLogs.js level2');
        return;
      }
      startTimer();
      showSection('questions');
      renderGeneralQuestions();
    })
    .catch(err => {
      console.error('Failed to load alerts:', err);
      window.alert('❌ Error loading alerts. Check the console.');
    });
}
