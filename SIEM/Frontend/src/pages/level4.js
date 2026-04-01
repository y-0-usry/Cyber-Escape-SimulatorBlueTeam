// === LEVEL 4: GHOST MODE RANSOMWARE INVESTIGATION ===

let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0;
let attempts = 3;
let timerSeconds = 25 * 60;
let startTime = 0;
let timerId = null;
let correctAnswers = 0;
let totalQuestions = 0;
let timeExtensions = 0;
let impactLevel = 0;
let impactInterval = null;
let cachedPhase1Questions = null;
let cachedPhase2Questions = null;
let phase1CorrectCount = 0;
let phase2CorrectCount = 0;
let ticketSubmitted = false;
const WRONG_ANSWER_PENALTY = 2;

const sections = {
  intro: document.getElementById('intro-section'),
  questions: document.getElementById('questions-section'),
  scenario: document.getElementById('scenario-section'),
  ticket: document.getElementById('ticket-section'),
  final: document.getElementById('final-section')
};

function showSection(name) {
  Object.values(sections).forEach(s => s && s.classList.add('hidden'));
  sections[name] && sections[name].classList.remove('hidden');
}

function getAlertsPath(level) {
  const basePaths = [
    `data/${level}/alerts.json`,
    `./data/${level}/alerts.json`,
    `../pages/data/${level}/alerts.json`,
    `/SIEM/Frontend/src/pages/data/${level}/alerts.json`,
    `${window.location.pathname.split('/').slice(0, -1).join('/')}/data/${level}/alerts.json`
  ];
  return basePaths;
}

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
      window.alert('Time expired. Incident impact increased.');
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
  if (!impactEl) return;

  impactEl.textContent = `${impactLevel}%`;
  impactEl.className = impactLevel >= 80
    ? 'text-red-400 font-bold'
    : impactLevel >= 50
      ? 'text-orange-400'
      : 'text-green-400';
}

function showImpactWarning() {
  const warningEl = document.getElementById('impact-warning');
  if (!warningEl || impactLevel < 80) return;

  warningEl.classList.remove('hidden');
  warningEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> CRITICAL: Business impact reached ${impactLevel}%`;
}

function addTimeExtension() {
  if (timeExtensions >= 3) {
    window.alert('Maximum extensions reached (3/3).');
    return;
  }

  const penalties = [5, 10, 20];
  const penalty = penalties[timeExtensions];

  if (window.confirm(`Add 5 minutes?\n\nPenalty: -${penalty} points\nExtensions used: ${timeExtensions + 1}/3`)) {
    timeExtensions++;
    timerSeconds += 300;
    score = Math.max(0, score - penalty);
    updateScore();

    const btn = document.getElementById('add-time-btn');
    if (btn) {
      btn.textContent = `Add 5 Mins (${timeExtensions}/3)`;
      if (timeExtensions >= 3) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  }
}

function handleReset() {
  attempts--;
  document.getElementById('attempts').textContent = attempts;

  if (attempts <= 0) {
    window.alert('No attempts remaining. Refresh to restart.');
    return;
  }

  score = 0;
  hintsUsed = 0;
  timerSeconds = 25 * 60;
  correctAnswers = 0;
  totalQuestions = 0;
  timeExtensions = 0;
  impactLevel = 0;
  cachedPhase1Questions = null;
  cachedPhase2Questions = null;
  phase1CorrectCount = 0;
  phase2CorrectCount = 0;
  ticketSubmitted = false;

  updateScore();
  updateImpactDisplay();

  const warningEl = document.getElementById('impact-warning');
  if (warningEl) warningEl.classList.add('hidden');

  const addTimeBtn = document.getElementById('add-time-btn');
  if (addTimeBtn) {
    addTimeBtn.textContent = 'Add 5 Mins (0/3)';
    addTimeBtn.disabled = false;
    addTimeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  clearInterval(timerId);
  clearInterval(impactInterval);
  showSection('intro');
}

function updateScore() {
  document.getElementById('score').textContent = score;
  const hintsDisplay = freeHints > 0 ? `${hintsUsed} (gift ${freeHints} free)` : `${hintsUsed}`;
  document.getElementById('hints-used').textContent = hintsDisplay;
}

function containsAny(raw, keywords) {
  const low = (raw || '').toLowerCase();
  return keywords.some(k => low.includes(k));
}

function findAlertByLogContains(pattern) {
  return alerts.find(a => (a.linked_log?.['log.original'] || '').toLowerCase().includes(pattern.toLowerCase()));
}

function buildPhase1Questions() {
  const q = [];

  const qAlerts = [
    {
      alert: findAlertByLogContains('[SCAN] Connection attempt from 185.44.12.77 to 10.0.0.5:445'),
      answer: 'needs_context'
    },
    {
      alert: findAlertByLogContains('[ALERT] SMB service exposed'),
      answer: 'needs_context'
    },
    {
      alert: findAlertByLogContains('[EXPLOIT] Suspicious SMB packet detected'),
      answer: 'true_positive'
    },
    {
      alert: findAlertByLogContains('[PROCESS] New process started: wannacry.exe'),
      answer: 'true_positive'
    },
    {
      alert: findAlertByLogContains('[ALERT] Rapid lateral movement detected'),
      answer: 'true_positive'
    },
    {
      alert: findAlertByLogContains('[FILE] File encrypted: report.docx'),
      answer: 'true_positive'
    },
    {
      alert: findAlertByLogContains('Blocked RDP brute-force'),
      answer: 'false_positive'
    },
    {
      alert: findAlertByLogContains('Approved vulnerability scan'),
      answer: 'false_positive'
    },
    {
      alert: findAlertByLogContains('typo password'),
      answer: 'needs_context'
    },
    {
      alert: findAlertByLogContains('connected successfully using MFA'),
      answer: 'false_positive'
    }
  ].filter(x => x.alert);

  qAlerts.forEach((entry, idx) => {
    q.push({
      id: `c${idx + 1}`,
      type: 'select',
      title: `Classify Alert ${entry.alert.alert_id}`,
      hint: `Read the event details before deciding.`,
      options: [
        { value: 'false_positive', label: 'False Positive' },
        { value: 'true_positive', label: 'True Positive' },
        { value: 'needs_context', label: 'Need More Context' }
      ],
      answer: entry.answer
    });
  });

  q.push({
    id: 'q11',
    type: 'select',
    title: 'Q11: One source IP performed multiple malicious activities in this case.',
    hint: 'Track repeated activity from the same attacker address.',
    options: [
      { value: 'true', label: 'True' },
      { value: 'false', label: 'False' }
    ],
    answer: 'true'
  });

  q.push({
    id: 'q12',
    type: 'select',
    title: 'Q12: Which alert is a failed external attack outside the main incident chain?',
    hint: 'Look for blocked attack behavior that did not compromise hosts.',
    options: [
      { value: 'rdp_blocked', label: 'Blocked RDP brute-force from 91.210.47.11' },
      { value: 'wannacry', label: 'New process started: wannacry.exe' },
      { value: 'ransom_note', label: 'Ransomware note created' },
      { value: 'lateral', label: 'Rapid lateral movement detected' }
    ],
    answer: 'rdp_blocked'
  });

  q.push({
    id: 'q13',
    type: 'select',
    title: 'Q13: Which host should be the primary infected host for investigation pivot?',
    hint: 'Find the first host showing exploit then execution.',
    options: [
      { value: '10.0.0.5', label: '10.0.0.5' },
      { value: '10.0.0.8', label: '10.0.0.8' },
      { value: '10.0.0.12', label: '10.0.0.12' },
      { value: '10.0.0.90', label: '10.0.0.90' }
    ],
    answer: '10.0.0.5'
  });

  q.push({
    id: 'q14',
    type: 'select',
    title: 'Q14: Which broad attack pattern is most likely based on the observed chain?',
    hint: 'Exploit over SMB followed by encryption and ransom note.',
    options: [
      { value: 'insider', label: 'Insider data theft only' },
      { value: 'ransomware_smb', label: 'SMB worm-style ransomware attack' },
      { value: 'credential_stuffing', label: 'Credential stuffing web attack' },
      { value: 'false_alarm', label: 'Only operational false alarms' }
    ],
    answer: 'ransomware_smb'
  });

  q.push({
    id: 'q15',
    type: 'select',
    title: 'Q15: Final triage decision - what scenario should be opened as the main incident?',
    hint: 'Choose the scenario that explains exploit, spread, and impact alerts together.',
    options: [
      { value: 'vpn_abuse', label: 'VPN abuse incident' },
      { value: 'patch_failure', label: 'Patch management warning only' },
      { value: 'smb_ransomware', label: 'SMB exploitation leading to ransomware outbreak' },
      { value: 'db_leak', label: 'Database-only exfiltration event' }
    ],
    answer: 'smb_ransomware'
  });

  return q;
}

function buildPhase2Questions() {
  return [
    {
      id: 's1',
      type: 'select',
      title: 'Q1: MITRE tactic mapping - SMB scan and exposure alerts best fit which tactic?',
      options: [
        { value: 'recon', label: 'Reconnaissance' },
        { value: 'impact', label: 'Impact' },
        { value: 'defense', label: 'Defense Evasion' },
        { value: 'collection', label: 'Collection' }
      ],
      answer: 'recon'
    },
    {
      id: 's2',
      type: 'select',
      title: 'Q2: MITRE tactic mapping - EternalBlue exploit attempt best maps to:',
      options: [
        { value: 'initial_access', label: 'Initial Access' },
        { value: 'impact', label: 'Impact' },
        { value: 'exfiltration', label: 'Exfiltration' },
        { value: 'resource_dev', label: 'Resource Development' }
      ],
      answer: 'initial_access'
    },
    {
      id: 's3',
      type: 'select',
      title: 'Q3: MITRE tactic mapping - malicious process wannacry.exe execution maps to:',
      options: [
        { value: 'execution', label: 'Execution' },
        { value: 'credential_access', label: 'Credential Access' },
        { value: 'discovery', label: 'Discovery' },
        { value: 'command_control', label: 'Command and Control' }
      ],
      answer: 'execution'
    },
    {
      id: 's4',
      type: 'select',
      title: 'Q4: Which technique is most related to the executable activity?',
      options: [
        { value: 'malicious_process', label: 'Malicious process started on endpoint' },
        { value: 'port_change', label: 'Service port changed by admin' },
        { value: 'successful_login', label: 'Normal user login event' },
        { value: 'dns_tunneling', label: 'DNS tunneling session' }
      ],
      answer: 'malicious_process'
    },
    {
      id: 's5',
      type: 'select',
      title: 'Q5: Which MITRE phase started showing direct business impact?',
      options: [
        { value: 'lateral', label: 'Lateral Movement' },
        { value: 'execution', label: 'Execution' },
        { value: 'impact', label: 'Impact (File Encryption)' },
        { value: 'collection', label: 'Collection' }
      ],
      answer: 'impact'
    },
    {
      id: 's6',
      type: 'select',
      title: 'Q6: Was there lateral movement in this incident?',
      options: [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' }
      ],
      answer: 'true'
    },
    {
      id: 's7',
      type: 'timeline',
      title: 'Q7: Drag and drop events into the correct attack timeline order:',
      timelineItems: [
        { value: 'execution', label: 'Malware Execution (wannacry.exe starts)' },
        { value: 'scan', label: 'SMB Scan / Exposure Discovery' },
        { value: 'ransom', label: 'Ransom Note Created' },
        { value: 'exploit', label: 'EternalBlue Exploit Attempt' },
        { value: 'encrypt', label: 'Mass File Encryption' },
        { value: 'lateral', label: 'Lateral Movement over SMB' }
      ],
      answer: 'scan,exploit,execution,lateral,encrypt,ransom'
    },
    {
      id: 's8',
      type: 'select',
      title: 'Q8: Attack nature based on the timeline was:',
      options: [
        { value: 'fast', label: 'Fast and chained' },
        { value: 'slow', label: 'Slow over many days' },
        { value: 'random', label: 'Random unrelated events' },
        { value: 'manual_only', label: 'Manual admin activity only' }
      ],
      answer: 'fast'
    },
    {
      id: 's9',
      type: 'select',
      title: 'Q9: Root cause was primarily:',
      options: [
        { value: 'smb', label: 'Unpatched SMB exposure (port 445 vulnerability)' },
        { value: 'user_error', label: 'Single user operational mistake' },
        { value: 'network_issue', label: 'Network routing issue' },
        { value: 'weak_password', label: 'Only weak password policy' }
      ],
      answer: 'smb'
    },
    {
      id: 's10',
      type: 'select',
      title: 'Q10: What key problem enabled attack success?',
      options: [
        { value: 'missing_updates', label: 'Security updates were not applied' },
        { value: 'dns_fail', label: 'DNS resolver outage' },
        { value: 'vpn_mfa', label: 'VPN MFA disabled for one user' },
        { value: 'email_delay', label: 'Delayed email gateway processing' }
      ],
      answer: 'missing_updates'
    },
    {
      id: 's11',
      type: 'select',
      title: 'Q11: Best preventive fix for this exact weakness is:',
      options: [
        { value: 'regular_updates', label: 'Regular patch and update management' },
        { value: 'change_wallpaper', label: 'Change endpoint desktop policy' },
        { value: 'disable_usb_only', label: 'Disable USB storage only' },
        { value: 'increase_storage', label: 'Increase disk storage capacity' }
      ],
      answer: 'regular_updates'
    },
    {
      id: 's12',
      type: 'select',
      title: 'Q12: What should be the FIRST action now?',
      options: [
        { value: 'isolate_host', label: 'Isolate infected host(s) from network immediately' },
        { value: 'send_email', label: 'Send awareness email first' },
        { value: 'wait_report', label: 'Wait for daily summary report' },
        { value: 'restart_all', label: 'Restart all hosts without triage' }
      ],
      answer: 'isolate_host'
    },
    {
      id: 's13',
      type: 'select',
      title: 'Q13: Should this be handled as an official incident ticket?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'not_important', label: 'Not Important' }
      ],
      answer: 'yes'
    }
  ];
}

function renderQuestionCard(container, q) {
  const card = document.createElement('div');
  card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
  card.dataset.qid = q.id;
  card.dataset.answer = q.answer || '';

  let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
  html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">Show Hint (-5 points)</button>`;
  html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint || 'Use alert context, timeline, and correlation.'}</div>`;

  if (q.type === 'text') {
    html += `<input type="text" class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700" placeholder="Type answer">`;
  }

  if (q.type === 'select') {
    html += `<select class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700">`;
    html += `<option value="">-- Select Answer --</option>`;
    q.options.forEach(opt => {
      html += `<option value="${opt.value}">${opt.label}</option>`;
    });
    html += `</select>`;
  }

  if (q.type === 'timeline') {
    html += `<p class="text-xs text-gray-300 mt-2">Drag items to reorder the timeline.</p>`;
    html += `<ul class="timeline-list mt-2 space-y-2">`;
    q.timelineItems.forEach(item => {
      html += `<li class="timeline-item bg-gray-900 border border-gray-700 rounded p-2 cursor-move" draggable="true" data-value="${item.value}">${item.label}</li>`;
    });
    html += `</ul>`;
  }

  card.innerHTML = html;

  if (q.type === 'timeline') {
    const list = card.querySelector('.timeline-list');
    let dragged = null;

    list.querySelectorAll('.timeline-item').forEach(item => {
      item.addEventListener('dragstart', () => {
        dragged = item;
        item.classList.add('opacity-50');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('opacity-50');
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragged || dragged === item) return;

        const items = Array.from(list.querySelectorAll('.timeline-item'));
        const draggedIndex = items.indexOf(dragged);
        const targetIndex = items.indexOf(item);

        if (draggedIndex < targetIndex) {
          item.after(dragged);
        } else {
          item.before(dragged);
        }
      });
    });
  }

  card.querySelector('.hint-btn').addEventListener('click', function(e) {
    e.preventDefault();
    const hintText = card.querySelector('.hint-text');
    if (!hintText.classList.contains('hidden')) return;

    hintText.classList.remove('hidden');
    hintsUsed++;

    if (freeHints > 0) {
      freeHints--;
      this.innerHTML = 'Free Hint Used';
    } else {
      score = Math.max(0, score - 5);
      this.innerHTML = 'Hint Used (-5 points)';
    }
    updateScore();
  });

  container.appendChild(card);
}

function renderPhase1Questions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  if (!cachedPhase1Questions) {
    cachedPhase1Questions = buildPhase1Questions();
  }

  totalQuestions = cachedPhase1Questions.length;
  cachedPhase1Questions.forEach(q => renderQuestionCard(container, q));
}

function renderPhase2Questions() {
  const container = document.getElementById('scenario-container');
  container.innerHTML = '';

  if (!cachedPhase2Questions) {
    cachedPhase2Questions = buildPhase2Questions();
  }

  cachedPhase2Questions.forEach(q => renderQuestionCard(container, q));
}

function evaluateSection(containerSelector) {
  const cards = document.querySelectorAll(`${containerSelector} [data-qid]`);
  let gained = 0;
  let correct = 0;

  cards.forEach(card => {
    if (card.classList.contains('border-green-500')) {
      correct++;
      return;
    }

    card.classList.remove('border-2', 'border-red-500');

    const answer = card.dataset.answer;
    const input = card.querySelector('.answer-input');
    let ok = false;

    if (input) {
      const userVal = (input.value || '').trim().toLowerCase();
      ok = userVal === answer.toLowerCase();
    } else {
      const timelineList = card.querySelector('.timeline-list');
      if (timelineList) {
        const currentOrder = Array.from(timelineList.querySelectorAll('.timeline-item'))
          .map(i => i.dataset.value)
          .join(',');
        ok = currentOrder === answer;
      }
    }

    if (ok) {
      card.classList.add('border-2', 'border-green-500');
      gained += 10;
      correct++;
    } else {
      card.classList.add('border-2', 'border-red-500');
    }
  });

  const wrongAnswers = Math.max(0, cards.length - correct);
  const wrongPenalty = wrongAnswers * WRONG_ANSWER_PENALTY;
  const netGained = gained - wrongPenalty;
  score = Math.max(0, score + netGained);
  updateScore();

  return {
    gained,
    wrongPenalty,
    netGained,
    correct,
    total: cards.length,
    percentage: cards.length ? Math.round((correct / cards.length) * 100) : 0
  };
}

function evaluatePhase1() {
  const result = evaluateSection('#questions-container');
  phase1CorrectCount = result.correct;
  correctAnswers = phase1CorrectCount;

  if (result.percentage === 100) {
    window.alert(`Phase 1 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.gained}`);
    showSection('scenario');
    renderPhase2Questions();
  } else {
    window.alert(`Phase 1 incomplete.\nCorrect: ${result.correct}/${result.total} (${result.percentage}%)\nYou must answer all correctly.`);
  }
}

function evaluatePhase2() {
  const result = evaluateSection('#scenario-container');
  phase2CorrectCount = result.correct;

  if (result.percentage === 100) {
    window.alert(`Phase 2 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.gained}`);
    showSection('ticket');
  } else {
    window.alert(`Phase 2 incomplete.\nCorrect: ${result.correct}/${result.total} (${result.percentage}%)\nYou must answer all correctly.`);
  }
}

function submitTicket() {
  const title = document.getElementById('ticket-title')?.value.trim() || '';
  const priority = document.getElementById('ticket-priority')?.value || '';
  const attackType = document.getElementById('ticket-attack')?.value.trim() || '';
  const summary = document.getElementById('ticket-summary')?.value.trim() || '';

  if (!title || !priority || !attackType || !summary) {
    window.alert('Please fill all ticket fields.');
    return;
  }

  if (!ticketSubmitted) {
    score += 20;
    ticketSubmitted = true;
  }

  updateScore();
  showFinalResults();
}

function getPlayerLevelByScore(points) {
  if (points >= 220) return 'Elite Analyst';
  if (points >= 170) return 'Senior Analyst';
  if (points >= 130) return 'SOC Analyst';
  if (points >= 90) return 'Junior Analyst';
  return 'Trainee Analyst';
}

function showFinalResults() {
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const totalAll = (cachedPhase1Questions?.length || 0) + (cachedPhase2Questions?.length || 0);
  const correctAll = phase1CorrectCount + phase2CorrectCount;
  const accuracy = totalAll ? Math.round((correctAll / totalAll) * 100) : 0;
  const playerLevel = getPlayerLevelByScore(score);

  document.getElementById('final-score').textContent = String(score);
  document.getElementById('final-time').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;

  let html = '';
  if (accuracy === 100 && score >= 220) {
    html = `<h3 class="text-lg text-green-300 mb-2">Excellent Investigation</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-green-100">You mapped tactics, validated context, and produced a complete incident outcome.</p>`;
  } else if (accuracy >= 80) {
    html = `<h3 class="text-lg text-yellow-300 mb-2">Good Progress</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-yellow-100">Solid analysis with some gaps to improve.</p>`;
  } else {
    html = `<h3 class="text-lg text-red-300 mb-2">Needs Improvement</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-red-100">Review attack correlation and MITRE mapping flow.</p>`;
  }

  document.getElementById('performance-rating').innerHTML = html;

  clearInterval(timerId);
  clearInterval(impactInterval);
  showSection('final');

  // Store scores for recap page
  let accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  let timeUsed = Math.floor((startTime ? (Date.now() - startTime) / 1000 : 0) / 60);
  sessionStorage.setItem('level4Score', `${Math.round(finalScore || score)}|${accuracy}%|${timeUsed}m`);

  document.getElementById('return-dashboard').onclick = () => {
    window.location.href = '/';
  };

  const viewRecap = document.getElementById('view-recap');
  if (viewRecap) {
    viewRecap.onclick = () => {
      window.location.href = 'Recap-Level4.html';
    };
  }

  document.getElementById('restart-level').onclick = () => {
    window.location.reload();
  };
}

function startLevel() {
  const timestamp = Date.now();
  const possiblePaths = getAlertsPath('level4').map(p => `${p}?t=${timestamp}`);

  const tryLoadFromPaths = (idx) => {
    if (idx >= possiblePaths.length) {
      const pathsStr = getAlertsPath('level4').join('\n- ');
      window.alert(`Failed to load Level 4 alerts.\n\nTried paths:\n- ${pathsStr}`);
      return;
    }

    fetch(possiblePaths[idx])
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        alerts = data;
        if (!alerts || alerts.length < 30) {
          window.alert('Not enough alerts loaded for Level 4.');
          return;
        }

        cachedPhase1Questions = null;
        cachedPhase2Questions = null;
        renderPhase1Questions();
        startTimer();
        showSection('questions');
      })
      .catch(() => {
        tryLoadFromPaths(idx + 1);
      });
  };

  tryLoadFromPaths(0);
}

window.evaluatePhase1 = evaluatePhase1;
window.evaluatePhase2 = evaluatePhase2;
window.submitTicket = submitTicket;
window.startLevel = startLevel;
window.addTimeExtension = addTimeExtension;
window.handleReset = handleReset;