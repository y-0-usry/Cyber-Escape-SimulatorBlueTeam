// === LEVEL 5: MFA FATIGUE INVESTIGATION ===

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
  return [
    `data/${level}/alerts.json`,
    `./data/${level}/alerts.json`,
    `../pages/data/${level}/alerts.json`,
    `/SIEM/Frontend/src/pages/data/${level}/alerts.json`,
    `${window.location.pathname.split('/').slice(0, -1).join('/')}/data/${level}/alerts.json`
  ];
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

function normalizeText(v) {
  return (v || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findAlertByContains(text) {
  return alerts.find(a => (a.linked_log?.['log.original'] || '').toLowerCase().includes(text.toLowerCase()));
}

function findAlertIdByContains(text) {
  const found = findAlertByContains(text);
  return found ? found.alert_id : 'N/A';
}

function buildPhase1Questions() {
  const classificationSeed = [
    { marker: 'Multiple MFA push requests sent to user: employee1', answer: 'true_positive' },
    { marker: 'Unusual MFA activity detected', answer: 'true_positive' },
    { marker: 'MFA push sent to user: employee2 (single normal request)', answer: 'false_positive' },
    { marker: 'Password change completed after scheduled reminder', answer: 'false_positive' },
    { marker: 'MFA request approved by user: employee1', answer: 'needs_context' },
    { marker: 'Login from unusual location/device', answer: 'true_positive' },
    { marker: 'SQL injection attempt blocked against portal', answer: 'needs_context' },
    { marker: 'RDP brute-force blocked by firewall', answer: 'needs_context' },
    { marker: 'Access to internal admin panel', answer: 'true_positive' },
    { marker: 'High API call volume by internal service bot', answer: 'needs_context' }
  ];

  const classificationQuestions = shuffleArray(classificationSeed)
    .map((item, idx) => {
      const found = findAlertByContains(item.marker);
      if (!found) return null;
      return {
        id: `c${idx + 1}`,
        type: 'select',
        title: `Classify Alert ${found.alert_id}`,
        hint: 'Do not rely on one line only. Use context and correlation.',
        options: [
          { value: 'false_positive', label: 'False Positive' },
          { value: 'true_positive', label: 'True Positive' },
          { value: 'needs_context', label: 'Need More Context' }
        ],
        answer: item.answer
      };
    })
    .filter(Boolean)
    .slice(0, 10);

  const idRefs = {
    mfaSpam: findAlertIdByContains('Multiple MFA push requests sent to user: employee1'),
    mfaApprove: findAlertIdByContains('MFA request approved by user: employee1'),
    unusualLogin: findAlertIdByContains('Login from unusual location/device'),
    adminPanel: findAlertIdByContains('Access to internal admin panel'),
    sqli: findAlertIdByContains('SQL injection attempt blocked against portal'),
    xss: findAlertIdByContains('XSS payload blocked on customer form'),
    rdp: findAlertIdByContains('RDP brute-force blocked by firewall'),
    malwareBlocked: findAlertIdByContains('Malware download attempt blocked on web proxy'),
    contractorVpn: findAlertIdByContains('Contractor temporary account connected successfully'),
    helpdeskReset: findAlertIdByContains('Password reset requested by helpdesk ticket')
  };

  return [
    ...classificationQuestions,
    {
      id: 'q13-scenario',
      type: 'select',
      title: 'Which scenario best explains the suspicious authentication-to-access sequence?',
      options: [
        { value: 'mfa_fatigue_chain', label: 'MFA spam -> user approval -> unusual login -> lateral movement -> privilege abuse' },
        { value: 'single_failed_web_attack', label: 'Single failed web attack with no account compromise' },
        { value: 'patching_noise_only', label: 'Operational patching and maintenance noise' },
        { value: 'backup_issue', label: 'Backup process issue only' }
      ],
      answer: 'mfa_fatigue_chain'
    },
    {
      id: 'q14-failed-attacks',
      type: 'multiselect',
      title: 'Select all failed attacks that happened but are not the main incident:',
      options: [
        { value: 'sqli_blocked', label: 'SQL injection blocked', isCorrect: true },
        { value: 'xss_blocked', label: 'XSS blocked', isCorrect: true },
        { value: 'rdp_blocked', label: 'RDP brute-force blocked', isCorrect: true },
        { value: 'malware_blocked', label: 'Malware download blocked', isCorrect: true },
        { value: 'mfa_approved', label: 'MFA request approved by user', isCorrect: false }
      ],
      minCorrect: 4,
      hint: 'Failed attacks are blocked events and not part of the successful chain.'
    },
    {
      id: 'q15-low-priority-success',
      type: 'multiselect',
      title: 'Select successful activities that happened but are not highest priority in this incident:',
      options: [
        { value: 'contractor_vpn', label: 'Contractor VPN login approved by exception', isCorrect: true },
        { value: 'helpdesk_reset', label: 'Helpdesk-based password reset', isCorrect: true },
        { value: 'unusual_login', label: 'Login from unusual location/device', isCorrect: false },
        { value: 'admin_panel', label: 'Access to internal admin panel', isCorrect: false }
      ],
      minCorrect: 2,
      hint: 'Pick successful but lower-priority events compared to the active compromise chain.'
    },
    {
      id: 'q11-priority-attack',
      type: 'select',
      title: 'Which attack should be prioritized for investigation?',
      options: [
        { value: 'mfa_fatigue', label: 'MFA Fatigue Account Takeover chain' },
        { value: 'sqli', label: 'Blocked SQL Injection attempt only' },
        { value: 'rdp', label: 'Blocked RDP brute-force only' },
        { value: 'servicebot', label: 'Service bot high API volume' }
      ],
      answer: 'mfa_fatigue'
    },
    {
      id: 'q12-indicator',
      type: 'select',
      title: 'What is the strongest indicator for the chosen priority attack?',
      options: [
        { value: 'mfa spam', label: 'MFA spam' },
        { value: 'login success', label: 'Login success' },
        { value: 'password change', label: 'Password change' },
        { value: 'vpn ok', label: 'Normal VPN success' }
      ],
      answer: 'mfa spam'
    }
  ];
}

function buildPhase2Questions() {
  const idRefs = {
    mfaSpam: findAlertIdByContains('Multiple MFA push requests sent to user: employee1'),
    mfaApprove: findAlertIdByContains('MFA request approved by user: employee1'),
    unusualLogin: findAlertIdByContains('Login from unusual location/device'),
    internalNav: findAlertIdByContains('Suspicious internal navigation detected'),
    privUsage: findAlertIdByContains('Unusual privilege usage detected'),
    unauthorized: findAlertIdByContains('Unauthorized access confirmed'),
    adminPanel: findAlertIdByContains('Access to internal admin panel'),
    dataExposure: findAlertIdByContains('Potential data exposure detected')
  };

  return [
    {
      id: 's1-entry-action',
      type: 'select',
      title: 'What did the attacker do first to gain access opportunity?',
      options: [
        { value: 'mfa spam', label: 'MFA spam' },
        { value: 'data encryption', label: 'Data encryption' },
        { value: 'password reset', label: 'Password reset' },
        { value: 'dns scan', label: 'DNS scan' }
      ],
      answer: 'mfa spam'
    },
    {
      id: 's2-attack-name',
      type: 'text',
      title: 'Identify the attack type caused by repeated MFA pushes:',
      acceptAnswers: ['mfa fatigue attack', 'mfa fatigue', 'push fatigue attack'],
      hint: 'Name of this social-engineering pattern in MFA systems.'
    },
    {
      id: 's3-definition',
      type: 'select',
      title: 'What is MFA Fatigue Attack?',
      options: [
        { value: 'correct', label: 'Repeated MFA prompts until user approves one by mistake' },
        { value: 'wrong1', label: 'Malware that disables MFA servers' },
        { value: 'wrong2', label: 'A normal MFA enrollment process' },
        { value: 'wrong3', label: 'Password vault synchronization issue' }
      ],
      answer: 'correct'
    },
    {
      id: 's4-proof-success',
      type: 'select',
      title: 'Which event proves the attack actually succeeded?',
      options: [
        { value: 'unusual_login', label: 'Login from unusual location/device' },
        { value: 'mfa_alert', label: 'Unusual MFA activity detected' },
        { value: 'password_change', label: 'Password change reminder' },
        { value: 'dns', label: 'Routine DNS query' }
      ],
      answer: 'unusual_login'
    },
    {
      id: 's5-cred-source',
      type: 'select',
      title: 'If attacker passed password and only needed MFA abuse, what is the most likely credential source?',
      options: [
        { value: 'leaks', label: 'Leaks / credential exposure' },
        { value: 'bruteforce_now', label: 'Same-session brute force only' },
        { value: 'endpoint_format', label: 'Endpoint formatting issue' },
        { value: 'dns_cache', label: 'DNS cache poisoning' }
      ],
      answer: 'leaks'
    },
    {
      id: 's6-mitre-login',
      type: 'multiselect',
      title: 'Login phase here maps to which MITRE tactics? (Select two)',
      options: [
        { value: 'initial_access', label: 'Initial Access', isCorrect: true },
        { value: 'execution', label: 'Execution', isCorrect: true },
        { value: 'recon', label: 'Reconnaissance', isCorrect: false },
        { value: 'resource_dev', label: 'Resource Development', isCorrect: false }
      ],
      minCorrect: 2,
      hint: 'Pick the two stages tied directly to gaining and using access.'
    },
    {
      id: 's7-pattern',
      type: 'select',
      title: 'What is the attack pattern in this case?',
      options: [
        { value: 'sequence of steps', label: 'Sequence of steps' },
        { value: 'single_event', label: 'Single random event' },
        { value: 'network_error', label: 'Network error chain' },
        { value: 'false_alarm', label: 'False alarm only' }
      ],
      answer: 'sequence of steps'
    },
    {
      id: 's8-impact',
      type: 'select',
      title: 'What is the real business impact?',
      options: [
        { value: 'unauthorized access', label: 'Unauthorized access' },
        { value: 'data encryption', label: 'Data encryption' },
        { value: 'network error', label: 'Network error' },
        { value: 'hardware failure', label: 'Hardware failure' },
        { value: 'dns outage', label: 'DNS outage' }
      ],
      answer: 'unauthorized access'
    },
    {
      id: 's9-lateral',
      type: 'select',
      title: 'Was there lateral movement in this incident?',
      options: [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' }
      ],
      answer: 'true'
    },
    {
      id: 's10-why-success',
      type: 'select',
      title: 'Why did this attack succeed?',
      options: [
        { value: 'low_awareness', label: 'low awareness' },
        { value: 'user_pressure', label: 'user pressure' },
        { value: 'no_mfa_request_limit', label: 'no MFA request limit' },
        { value: 'all_the_above', label: 'all the above' }
      ],
      answer: 'all_the_above'
    },
    {
      id: 's11-abnormal-priv',
      type: 'multiselect',
      title: 'Which signals show abnormal privilege escalation/abuse? (Select two)',
      options: [
        { value: 'weird_priv_usage', label: 'Unusual privilege usage', isCorrect: true },
        { value: 'unusual_data_access', label: 'Access to non-typical sensitive data', isCorrect: true },
        { value: 'normal_backup', label: 'Scheduled backup service', isCorrect: false },
        { value: 'normal_dns', label: 'Routine DNS lookups', isCorrect: false }
      ],
      minCorrect: 2,
      hint: 'Focus on behavior outside expected role and data patterns.'
    },
    {
      id: 's12-priv-event',
      type: 'select',
      title: 'Which event best represents privilege escalation/abuse in this timeline?',
      options: [
        { value: 'admin_panel', label: 'Access to internal admin panel' },
        { value: 'known_login', label: 'Login from known location' },
        { value: 'routine_dns', label: 'Routine DNS query' },
        { value: 'password_reminder', label: 'Scheduled password reminder' }
      ],
      answer: 'admin_panel'
    },
    {
      id: 's13-first-action',
      type: 'select',
      title: 'What is the first SOC action now?',
      options: [
        { value: 'isolate_account', label: 'Isolate and disable the compromised account immediately' },
        { value: 'wait_report', label: 'Wait for daily report first' },
        { value: 'email_notice', label: 'Send awareness email only' },
        { value: 'ignore', label: 'Ignore because no malware seen' }
      ],
      answer: 'isolate_account'
    },
    {
      id: 's14-prevention',
      type: 'select',
      title: 'Best control to prevent this attack from recurring?',
      options: [
        { value: 'mfa_number_matching', label: 'MFA number matching' },
        { value: 'password_rotation_only', label: 'Password rotation only' },
        { value: 'longer_sessions', label: 'Longer session timeout' },
        { value: 'disable_logs', label: 'Disable noisy logs' }
      ],
      answer: 'mfa_number_matching'
    },
    {
      id: 's15-timeline',
      type: 'timeline',
      title: 'Drag and drop events into the correct timeline order:',
      timelineItems: [
        { value: 'unusual_login', label: `Login from unusual location/device (${idRefs.unusualLogin})` },
        { value: 'mfa_approved', label: `MFA request approved by user (${idRefs.mfaApprove})` },
        { value: 'mfa_spam', label: `Multiple MFA push requests sent (${idRefs.mfaSpam})` },
        { value: 'privilege_abuse', label: `Unusual privilege usage detected (${idRefs.privUsage})` },
        { value: 'lateral', label: `Suspicious internal navigation and multi-system access (${idRefs.internalNav})` },
        { value: 'unauthorized', label: `Unauthorized access confirmed (${idRefs.unauthorized})` }
      ],
      answer: 'mfa_spam,mfa_approved,unusual_login,lateral,privilege_abuse,unauthorized'
    },
    {
      id: 's16-dangerous-event',
      type: 'select',
      title: 'What is the most dangerous event in this timeline?',
      options: [
        { value: 'unauthorized', label: 'Unauthorized access confirmed' },
        { value: 'single_mfa_push', label: 'Single MFA push sent' },
        { value: 'routine_dns', label: 'Routine DNS lookup' },
        { value: 'scheduled_reset', label: 'Scheduled password reset' }
      ],
      answer: 'unauthorized'
    }
  ];
}

function renderQuestionCard(container, q) {
  const card = document.createElement('div');
  card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
  card.dataset.qid = q.id;
  card.dataset.answer = q.answer || '';
  if (q.acceptAnswers) {
    card.dataset.acceptAnswers = JSON.stringify(q.acceptAnswers);
  }

  let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
  html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">Show Hint (-5 points)</button>`;
  html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint || 'Use alert context, attack chain, and timeline.'}</div>`;

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

  if (q.type === 'multiselect') {
    html += `<div class="answer-multiselect mt-2 space-y-1">`;
    q.options.forEach(opt => {
      html += `<label class="flex items-center gap-2 p-2 bg-gray-900 rounded hover:bg-gray-700 cursor-pointer">`;
      html += `<input type="checkbox" value="${opt.value}" class="form-checkbox">`;
      html += `<span class="text-xs text-gray-300">${opt.label}</span>`;
      html += `</label>`;
    });
    html += `</div>`;
    card.dataset.questionMeta = JSON.stringify({ options: q.options, minCorrect: q.minCorrect || 1 });
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

function isCardCorrect(card) {
  const answer = (card.dataset.answer || '').toLowerCase();
  const input = card.querySelector('.answer-input');

  if (input) {
    if (input.tagName === 'INPUT') {
      const acceptRaw = card.dataset.acceptAnswers;
      const userText = normalizeText(input.value);
      if (acceptRaw) {
        try {
          const accept = JSON.parse(acceptRaw).map(x => normalizeText(x));
          return accept.includes(userText);
        } catch (e) {
          return userText === normalizeText(answer);
        }
      }
      return userText === normalizeText(answer);
    }

    const userVal = (input.value || '').trim().toLowerCase();
    return userVal === answer;
  }

  const timelineList = card.querySelector('.timeline-list');
  if (timelineList) {
    const currentOrder = Array.from(timelineList.querySelectorAll('.timeline-item'))
      .map(i => i.dataset.value)
      .join(',');
    return currentOrder === answer;
  }

  const metaRaw = card.dataset.questionMeta;
  if (!metaRaw) return false;
  try {
    const meta = JSON.parse(metaRaw);
    const checked = Array.from(card.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value);
    const correctOptions = meta.options.filter(o => o.isCorrect === true).map(o => o.value);
    const wrongOptions = meta.options.filter(o => o.isCorrect === false).map(o => o.value);
    const selectedCorrect = checked.filter(v => correctOptions.includes(v)).length;
    const selectedWrong = checked.filter(v => wrongOptions.includes(v)).length;
    const minRequired = Number(meta.minCorrect || 1);
    return selectedCorrect >= minRequired && selectedWrong === 0;
  } catch (e) {
    return false;
  }
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

    const ok = isCardCorrect(card);
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
    window.alert(`Phase 1 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.netGained}`);
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
    window.alert(`Phase 2 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.netGained}`);
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
  if (points >= 250) return 'Elite Analyst';
  if (points >= 200) return 'Senior Analyst';
  if (points >= 150) return 'SOC Analyst';
  if (points >= 100) return 'Junior Analyst';
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
  if (accuracy === 100 && score >= 240) {
    html = `<h3 class="text-lg text-green-300 mb-2">Excellent Investigation</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-green-100">You correctly identified the MFA fatigue chain and mapped the whole incident lifecycle.</p>`;
  } else if (accuracy >= 80) {
    html = `<h3 class="text-lg text-yellow-300 mb-2">Good Progress</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-yellow-100">Strong analysis with minor gaps in triage or sequence mapping.</p>`;
  } else {
    html = `<h3 class="text-lg text-red-300 mb-2">Needs Improvement</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-red-100">Review MFA fatigue indicators, MITRE stages, and timeline logic.</p>`;
  }

  document.getElementById('performance-rating').innerHTML = html;

  clearInterval(timerId);
  clearInterval(impactInterval);
  showSection('final');

  // Store scores for recap page
  const recapTime = `${minutes}m ${seconds}s`;
  sessionStorage.setItem('level5Score', `${Math.round(score)}|${accuracy}%|${recapTime}`);

  document.getElementById('return-dashboard').onclick = () => {
    window.location.href = '/';
  };

  const viewRecap = document.getElementById('view-recap');
  if (viewRecap) {
    viewRecap.onclick = () => {
      window.location.href = 'Recap-Level5.html';
    };
  }

  document.getElementById('restart-level').onclick = () => {
    window.location.reload();
  };
}

function startLevel() {
  const timestamp = Date.now();
  const possiblePaths = getAlertsPath('level5').map(p => `${p}?t=${timestamp}`);

  const tryLoadFromPaths = (idx) => {
    if (idx >= possiblePaths.length) {
      const pathsStr = getAlertsPath('level5').join('\n- ');
      window.alert(`Failed to load Level 5 alerts.\n\nTried paths:\n- ${pathsStr}`);
      return;
    }

    fetch(possiblePaths[idx])
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        alerts = data;
        if (!alerts || alerts.length < 20) {
          window.alert('Not enough alerts loaded for Level 5.');
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
