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
let phase1CorrectCount = 0;
let phase2CorrectCount = 0;
let ticketSubmitted = false;
const WRONG_ANSWER_PENALTY = 2;

// === UTILITY: Get Alerts Data Path ===
function getAlertsPath(level) {
  const basePaths = [
    `data/${level}/alerts.json`,
    `./data/${level}/alerts.json`,
    `../pages/data/${level}/alerts.json`,
    `/SIEM/Frontend/src/pages/data/${level}/alerts.json`,
    // Dynamic path based on current location
    `${window.location.pathname.split('/').slice(0, -1).join('/')}/data/${level}/alerts.json`
  ];
  return basePaths;
}

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
    localStorage.setItem('level2_reward_hints', rewardHints);
    localStorage.setItem('level2_final_score', finalScore);
    showSection('final');
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

// === PHASE 1: ALERT TRIAGE (18 Questions with Alert IDs) ===
function buildGeneralQuestions() {
  const fp = alerts.filter(isFalsePositive);
  const tp = alerts.filter(a => !isFalsePositive(a) && isInsiderThreatIndicator(a));
  const questions = [];

  // Q1-Q12: Individual Alert Classifications - Mixed TP & FP order
  // Mix TP and FP alternately for better flow
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
      hint: isTP ? 'Insider threat pattern detected' : 'Look for service accounts, tickets, or scheduled jobs',
      options: [
        { value: 'true_positive', label: 'True Positive (Malicious)' },
        { value: 'false_positive', label: 'False Positive (Benign)' },
        { value: 'needs_context', label: 'Needs More Context' }
      ],
      answer: isTP ? 'true_positive' : 'false_positive',
      alertId: alert.alert_id
    });
  });

  // Q13: Multi-Select False Positives (mixed options)
  const fpOptions = [...fp.slice(0, 8), ...tp.slice(0, 5)];
  const shuffledFP = fpOptions.sort(() => Math.random() - 0.5);
  
  questions.push({
    id: 'q13',
    type: 'multiselect',
    title: 'Q13: Which of these are FALSE POSITIVES? (Select all that apply)',
    hint: 'Look for: Service accounts (SVC_*), Tickets (INC-*, CHG-*), Scheduled jobs',
    options: shuffledFP.map(a => ({
      value: a.alert_id,
      label: `Alert ${a.alert_id}`,
      isCorrect: isFalsePositive(a)
    })),
    minCorrect: 5
  });

  // Q14: Top 5 Priority (mixed options)
  const priorityOptions = [...tp.slice(0, 7), ...fp.slice(0, 4)];
  const shuffledPriority = priorityOptions.sort(() => Math.random() - 0.5);
  
  questions.push({
    id: 'q14',
    type: 'multiselect',
    title: 'Q14: Select TOP 5 alerts for immediate investigation',
    hint: 'Focus on: Data exfiltration, role violations, DLP blocks',
    options: shuffledPriority.map(a => ({
      value: a.alert_id,
      label: `Alert ${a.alert_id}`,
      isCorrect: isInsiderThreatIndicator(a)
    })),
    minCorrect: 3
  });

  // Q15: Correlation
  questions.push({
    id: 'q15',
    type: 'select',
    title: 'Q15: Are these alerts part of the SAME or SEPARATE incidents?',
    hint: 'Same user (sarah.mitchell) + Timeline sequence + Attack pattern',
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
    hint: 'Single indicators can be legitimate; combinations are stronger',
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
    id: 'q17',
    type: 'select',
    title: 'Q17: Which MITRE ATT&CK technique best matches?',
    hint: 'Valid credentials (sarah.mitchell) - no exploitation',
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
    id: 'q18',
    type: 'select',
    title: 'Q18: What best describes this situation?',
    hint: 'Valid credentials + Purposeful actions + Data exfiltration',
    options: [
      { value: 'isolated', label: 'Isolated alerts (individual investigation)' },
      { value: 'misconfiguration', label: 'System misconfiguration (false alerts)' },
      { value: 'insider_threat', label: 'Insider threat (internal user stealing data)' },
      { value: 'external_attack', label: 'External attack campaign' }
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
    // Store question metadata for proper evaluation
    if (q.options) {
      card.dataset.questionMeta = JSON.stringify({ 
        options: q.options, 
        type: q.type,
        acceptAnswers: q.acceptAnswers,
        minCorrect: q.minCorrect
      });
    }
    if (q.minCorrect !== undefined) {
      card.dataset.minCorrect = q.minCorrect;
    }
    if (q.acceptAnswers) {
      card.dataset.acceptAnswers = JSON.stringify(q.acceptAnswers);
    }

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
    const points = 10; // Each question worth 10 points
    
    // If already correct, count it but don't re-award points
    if (card.classList.contains('border-green-500')) {
      phase1Correct++;
      return;
    }
    
    // Remove red border to allow re-evaluation
    card.classList.remove('border-2', 'border-red-500');
    
    // Check if select question
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
    // Check if multiselect question
    else {
      const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');
      const userIds = Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
      
      // Get question metadata
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
        // Fallback for old format
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
  
  // Update idempotent correct count
  phase1CorrectCount = Array.from(cards).filter(c => c.classList.contains('border-green-500')).length;
  const wrongAnswers = Math.max(0, cards.length - phase1CorrectCount);
  const wrongPenalty = wrongAnswers * WRONG_ANSWER_PENALTY;
  score = Math.max(0, score + phase1Score - wrongPenalty);
  correctAnswers = phase1CorrectCount + phase2CorrectCount;
  updateScore();
  
  const percentage = Math.round((phase1CorrectCount / cards.length) * 100);
  
  // Must get 100% to proceed
  if (percentage === 100) {
    window.alert(`✅ Phase 1 Complete!\n\nCorrect: ${phase1CorrectCount}/${cards.length}\nScore: +${phase1Score} points\n\nProceeding to Phase 2...`);
    showSection('scenario');
    renderScenarioQuestions();
  } else {
    window.alert(`❌ Phase 1 Incomplete\n\nCorrect: ${phase1CorrectCount}/${cards.length} (${percentage}%)\nScore: +${phase1Score} points\n\n⚠️ You must answer ALL questions correctly to proceed to Phase 2.\nReview the red-bordered questions.`);
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
      // Accept English and Arabic synonyms
      patternSource: 'insider.*threat|insider.*attack|data.*exfiltration|insider.*data.*theft|internal.*breach|insider|exfiltration|data.*theft|internal.*threat|تهديد.*داخلي|تسريب.*بيانات|سرقة.*بيانات|اختراق.*داخلي'
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
    card.dataset.pattern = q.patternSource || '';
    if (q.minCorrect) {
      card.dataset.minCorrect = q.minCorrect;
    }
    // Store question metadata for proper evaluation
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

function evaluateScenarioQuestions() {
  const cards = document.querySelectorAll('#scenario-container [data-qid]');
  let phase2Score = 0;
  let phase2Correct = 0;

  cards.forEach(card => {
    const qid = card.dataset.qid;
    const correctAnswer = card.dataset.answer;
    const points = qid === 'sc-attack-type' || qid === 'sc-evidence' || qid === 'sc-mitre-techniques' ? 15 : 10;
    
    // If already correct, count it but don't re-award points
    if (card.classList.contains('border-green-500')) {
      phase2Correct++;
      return;
    }
    
    // Remove red border to allow re-evaluation
    card.classList.remove('border-2', 'border-red-500');

    // Check if select question
    const select = card.querySelector('select.answer-input');
    const input = card.querySelector('input.answer-input');
    const checkboxes = card.querySelectorAll('input[type="checkbox"]:checked');
    
    if (select) {
      const userAnswer = select.value;
      if (userAnswer === correctAnswer) {
        phase2Score += points;
        phase2Correct++;
        card.classList.add('border-2', 'border-green-500');
      } else {
        card.classList.add('border-2', 'border-red-500');
      }
    } else if (input) {
      const userAnswer = input.value.trim().toLowerCase();
      const pattern = card.dataset.pattern;
      let isCorrect = false;
      
      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        isCorrect = regex.test(userAnswer);
      } else {
        isCorrect = userAnswer === correctAnswer.toLowerCase();
      }
      
      if (isCorrect) {
        phase2Score += points;
        phase2Correct++;
        card.classList.add('border-2', 'border-green-500');
      } else {
        card.classList.add('border-2', 'border-red-500');
      }
    } else if (checkboxes.length > 0) {
      const userIds = Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
      
      // Get question metadata
      let questionMeta = null;
      try {
        if (card.dataset.questionMeta) {
          questionMeta = JSON.parse(card.dataset.questionMeta);
        }
      } catch (e) {}
      
      if (questionMeta && questionMeta.options) {
        const correctOptions = questionMeta.options.filter(opt => opt.isCorrect).map(opt => opt.value);
        const wrongOptions = questionMeta.options.filter(opt => opt.isCorrect === false).map(opt => opt.value);
        
        const selectedCorrect = userIds.filter(id => correctOptions.includes(id)).length;
        const selectedWrong = userIds.filter(id => wrongOptions.includes(id)).length;
        const minRequired = Number(card.dataset.minCorrect || Math.ceil(correctOptions.length * 0.7));
        
        if (selectedCorrect >= minRequired && selectedWrong === 0) {
          phase2Score += points;
          phase2Correct++;
          card.classList.add('border-2', 'border-green-500');
        } else {
          card.classList.add('border-2', 'border-red-500');
        }
      } else {
        const correctIds = correctAnswer.split(',').filter(Boolean);
        const overlap = userIds.filter(id => correctIds.includes(id)).length;
        const minRequired = Math.max(Math.ceil(correctIds.length * 0.7), Number(card.dataset.minCorrect || 0));
        
        if (overlap >= minRequired) {
          phase2Score += points;
          phase2Correct++;
          card.classList.add('border-2', 'border-green-500');
        } else {
          card.classList.add('border-2', 'border-red-500');
        }
      }
    }
  });

  phase2CorrectCount = Array.from(cards).filter(c => c.classList.contains('border-green-500')).length;
  const wrongAnswers = Math.max(0, cards.length - phase2CorrectCount);
  const wrongPenalty = wrongAnswers * WRONG_ANSWER_PENALTY;
  score = Math.max(0, score + phase2Score - wrongPenalty);
  correctAnswers = phase1CorrectCount + phase2CorrectCount;
  updateScore();

  const percentage = Math.round((phase2CorrectCount / cards.length) * 100);

  // Must get 100% to proceed
  if (percentage === 100) {
    window.alert(`✅ Phase 2 Complete!\n\nCorrect: ${phase2CorrectCount}/${cards.length}\nScore: +${phase2Score} points\n\nProceeding to Incident Ticket...`);
    showSection('ticket');
  } else {
    window.alert(`❌ Phase 2 Incomplete\n\nCorrect: ${phase2CorrectCount}/${cards.length} (${percentage}%)\nScore: +${phase2Score} points\n\n⚠️ You must answer ALL questions correctly to proceed.\nReview the red-bordered questions.`);
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
  if (!ticketSubmitted) {
    score += ticketScore;
    correctAnswers += ticketScore >= 40 ? 1 : 0;
    ticketSubmitted = true;
  }
  updateScore();

  showFinalResults();
}

// === FINAL RESULTS ===
function getPlayerLevelByScore(points) {
  if (points >= 320) return 'Elite Analyst';
  if (points >= 260) return 'Senior Analyst';
  if (points >= 200) return 'SOC Analyst';
  if (points >= 140) return 'Junior Analyst';
  return 'Trainee Analyst';
}

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
  const playerLevel = getPlayerLevelByScore(finalScore);

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
    <p class="text-cyan-300">Player Level: ${playerLevel}</p>
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
    <li>🏅 Player Level: ${playerLevel}</li>
`;

  localStorage.setItem('level2_reward_hints', rewardHints);
  localStorage.setItem('level2_final_score', finalScore);
  showSection('final');
}

// === EVENT LISTENERS ===
// Compatibility wrapper: Level2.html may use inline `onclick="startLevel()"`.
function startLevel() {
  try {
    loadAlerts();
  } catch (err) {
    console.error('startLevel error:', err);
    window.alert('Error starting level: ' + (err.message || err));
  }
}
// Expose for inline `onclick` in HTML
window.startLevel = startLevel;

// Register UI event listeners after DOM is ready to avoid missing elements
window.addEventListener('DOMContentLoaded', () => {
  try {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => { console.log('Level2: Start clicked'); loadAlerts(); });

    const resetBtn = document.getElementById('reset-level');
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    const submitAnswers = document.getElementById('submit-answers');
    if (submitAnswers) submitAnswers.addEventListener('click', evaluateGeneralQuestions);

    const submitScenario = document.getElementById('submit-scenario');
    if (submitScenario) submitScenario.addEventListener('click', evaluateScenarioQuestions);

    const createTicketBtn = document.getElementById('create-ticket');
    if (createTicketBtn) createTicketBtn.addEventListener('click', evaluateTicket);

    const returnDashboard = document.getElementById('return-dashboard');
    if (returnDashboard) returnDashboard.addEventListener('click', () => { window.location.href = '/'; });

    const viewAnswerKey = document.getElementById('view-answerkey');
    if (viewAnswerKey) viewAnswerKey.addEventListener('click', () => { window.location.href = '/AnswerKey_Level2'; });

    console.log('Level2: UI event listeners registered');
  } catch (err) {
    console.error('Error registering Level2 event listeners:', err);
  }
});

// === LOAD ALERTS ===
function loadAlerts() {
  const timestamp = Date.now();
  // Clear cached questions so new data regenerates deterministic question set
  cachedGeneralQuestions = null;
  
  // Get all possible paths
  const possiblePaths = getAlertsPath('level2').map(p => `${p}?t=${timestamp}`);

  const tryLoadFromPaths = (pathIndex) => {
    if (pathIndex >= possiblePaths.length) {
      // All paths failed
      const pathsStr = getAlertsPath('level2').join('\n- ');
      window.alert(`❌ Error loading alerts. Check the console.\n\nTried paths:\n- ${pathsStr}`);
      console.error('Failed to load alerts from all paths');
      return;
    }

    const path = possiblePaths[pathIndex];
    console.log(`Trying to load alerts from: ${path}`);

    fetch(path)
      .then(res => {
        if (!res.ok) {
          console.warn(`HTTP ${res.status} from ${path}`);
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        alerts = data;
        if (!alerts || alerts.length < 20) {
          window.alert('⚠️ Not enough alerts generated. Please run:\n\nnode processAllLogs.js level2');
          return;
        }
        console.log(`✅ Successfully loaded ${alerts.length} alerts from: ${path}`);
        startTimer();
        showSection('questions');
        renderGeneralQuestions();
      })
      .catch(err => {
        console.warn(`Failed to load from ${path}: ${err.message}`);
        // Try next path
        tryLoadFromPaths(pathIndex + 1);
      });
  };

  tryLoadFromPaths(0);
}
