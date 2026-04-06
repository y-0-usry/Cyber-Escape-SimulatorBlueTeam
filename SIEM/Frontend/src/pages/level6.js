// === LEVEL 6: SUPPLY CHAIN ATTACK INVESTIGATION ===

let alerts = [];
let score = 0;
let hintsUsed = 0;
let freeHints = 0;
let attempts = 3;
let timerSeconds = 30 * 60;
let startTime = 0;
let timerId = null;
let timeExtensions = 0;
let impactLevel = 0;
let impactInterval = null;

let cachedPhase1Questions = null;
let cachedPhase2Questions = null;
let cachedPhase3Questions = null;
let cachedPhase4Questions = null;

let phase1CorrectCount = 0;
let phase2CorrectCount = 0;
let phase3CorrectCount = 0;
let phase4CorrectCount = 0;

const WRONG_ANSWER_PENALTY = 2;

const sections = {
  intro: document.getElementById('intro-section'),
  questions: document.getElementById('questions-section'),
  scenario: document.getElementById('scenario-section'),
  response: document.getElementById('response-section'),
  timeline: document.getElementById('timeline-section'),
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
    if (impactLevel >= 80) showImpactWarning();
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
  timerSeconds = 30 * 60;
  timeExtensions = 0;
  impactLevel = 0;

  cachedPhase1Questions = null;
  cachedPhase2Questions = null;
  cachedPhase3Questions = null;
  cachedPhase4Questions = null;

  phase1CorrectCount = 0;
  phase2CorrectCount = 0;
  phase3CorrectCount = 0;
  phase4CorrectCount = 0;

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
    { marker: '[UPDATE] Software update installed successfully', answer: 'needs_context' },
    { marker: 'Unknown background service detected under SYSTEM account', answer: 'true_positive' },
    { marker: 'Daily vulnerability scan approved by SecOps', answer: 'false_positive' },
    { marker: 'Outbound connection to 77.91.33.10 over HTTPS', answer: 'true_positive' },
    { marker: 'Contractor VPN connected successfully using MFA', answer: 'false_positive' },
    { marker: 'Suspicious update channel fallback reached deprecated endpoint', answer: 'needs_context' },
    { marker: 'RDP brute-force blocked by firewall', answer: 'needs_context' },
    { marker: 'Service registered for auto-start: windows_update_monitor', answer: 'true_positive' },
    { marker: 'High API volume from internal monitoring bot', answer: 'false_positive' },
    { marker: 'Potential data exfiltration detected via encrypted outbound stream', answer: 'true_positive' }
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
          { value: 'true_positive', label: 'True Positive (TP)' },
          { value: 'false_positive', label: 'False Positive (FP)' },
          { value: 'needs_context', label: 'Need More Context' }
        ],
        answer: item.answer
      };
    })
    .filter(Boolean)
    .slice(0, 10);

  const idRefs = {
    rdpBlocked: findAlertIdByContains('RDP brute-force blocked by firewall'),
    vpnStuffingBlocked: findAlertIdByContains('Credential stuffing blocked on VPN gateway'),
    failedLocked: findAlertIdByContains('Repeated failed login attempts ended with account lockout'),
    dailyScan: findAlertIdByContains('Daily vulnerability scan approved by SecOps'),
    backupUpload: findAlertIdByContains('Backup service uploaded archive to approved storage'),
    contractorVpn: findAlertIdByContains('Contractor VPN connected successfully using MFA'),
    sqliBlocked: findAlertIdByContains('SQL injection blocked at WAF'),
    xssBlocked: findAlertIdByContains('XSS blocked on support portal'),
    malwareBlocked: findAlertIdByContains('Malware download blocked by proxy policy'),
    updateInstalled: findAlertIdByContains('[UPDATE] Software update installed successfully'),
    unknownService: findAlertIdByContains('Unknown background service detected under SYSTEM account'),
    outboundC2: findAlertIdByContains('Outbound connection to 77.91.33.10 over HTTPS')
  };

  return [
    ...classificationQuestions,
    {
      id: 'q11',
      type: 'select',
      title: `Seen alerts:\n- ${idRefs.rdpBlocked}\n- ${idRefs.vpnStuffingBlocked}\n- ${idRefs.failedLocked}\nWhat attack is this?`,
      options: [
        { value: 'bruteforce_failed', label: 'Brute Force (Failed)' },
        { value: 'supply_chain', label: 'Supply Chain Attack' },
        { value: 'authorized_scan', label: 'Authorized Security Scan' },
        { value: 'data_exfil', label: 'Data Exfiltration Campaign' }
      ],
      answer: 'bruteforce_failed'
    },
    {
      id: 'q12',
      type: 'select',
      title: `Seen alerts:\n- ${idRefs.dailyScan}\n- ${idRefs.backupUpload}\n- ${idRefs.contractorVpn}\nWhat attack is this?`,
      options: [
        { value: 'authorized_scan', label: 'Authorized Security Scan / Normal Ops' },
        { value: 'supply_chain', label: 'Supply Chain Attack' },
        { value: 'bruteforce_failed', label: 'Brute Force (Failed)' },
        { value: 'webshell', label: 'Webshell Compromise' }
      ],
      answer: 'authorized_scan'
    },
    {
      id: 'q13',
      type: 'select',
      title: `Seen alerts:\n- ${idRefs.sqliBlocked}\n- ${idRefs.xssBlocked}\n- ${idRefs.malwareBlocked}\nWhat attack is this?`,
      options: [
        { value: 'blocked_web_attack', label: 'Blocked Web Attack (Failed)' },
        { value: 'supply_chain', label: 'Supply Chain Attack' },
        { value: 'authorized_scan', label: 'Authorized Security Scan' },
        { value: 'insider', label: 'Insider Threat' }
      ],
      answer: 'blocked_web_attack'
    },
    {
      id: 'q14',
      type: 'select',
      title: `Seen alerts:\n- ${idRefs.updateInstalled}\n- ${idRefs.unknownService}\n- ${idRefs.outboundC2}\nWhat attack is this?`,
      options: [
        { value: 'phishing', label: 'Phishing Attack' },
        { value: 'supply_chain', label: 'Supply Chain Attack' },
        { value: 'password_attack', label: 'Password Attack' },
        { value: 'sqli', label: 'SQL Injection' }
      ],
      answer: 'supply_chain'
    },
    {
      id: 'q15',
      type: 'select',
      title: 'Based on all attacks observed, which attack should be prioritized for investigation?',
      options: [
        { value: 'failed_bruteforce', label: 'Brute Force (Failed)' },
        { value: 'authorized_scan', label: 'Authorized Security Scan' },
        { value: 'supply_chain_active', label: 'Supply Chain Attack (Active)' },
        { value: 'blocked_web', label: 'Blocked Web Attack' }
      ],
      answer: 'supply_chain_active'
    },
    {
      id: 'q16',
      type: 'select',
      title: 'In Supply Chain Attack, what is the first indicator of attack?',
      options: [
        { value: 'update_ok', label: 'Software update installed successfully' },
        { value: 'unknown_service', label: 'Unknown service started after update' },
        { value: 'user_login', label: 'User logged in normally' },
        { value: 'backup_done', label: 'Backup completed' }
      ],
      answer: 'unknown_service'
    },
    {
      id: 'q17',
      type: 'select',
      title: 'Select the correct Supply Chain Attack scenario:',
      options: [
        { value: 'phishing_chain', label: 'User clicked phishing link -> Malware downloaded -> Data stolen' },
        { value: 'supply_chain_chain', label: 'Trusted update installed -> Hidden malware executed -> C2 connection established' },
        { value: 'password_chain', label: 'Attacker guessed password -> Logged in -> Changed settings' },
        { value: 'sqli_chain', label: 'SQL injection -> Database accessed -> Data dumped' }
      ],
      answer: 'supply_chain_chain'
    }
  ];
}

function buildPhase2Questions() {
  return [
    {
      id: 'q18',
      type: 'select',
      title: 'What did the attacker do to get initial access?',
      options: [
        { value: 'exploit_direct', label: 'Exploited a vulnerability directly' },
        { value: 'phishing', label: 'Sent phishing email' },
        { value: 'trusted_update', label: 'Compromised trusted software update' },
        { value: 'bruteforce', label: 'Brute forced the password' }
      ],
      answer: 'trusted_update'
    },
    {
      id: 'q19',
      type: 'text',
      title: 'What is the attack type when attacker compromises vendor and injects malware in updates?',
      acceptAnswers: ['supply chain attack', 'supply chain'],
      hint: 'Think of trust abuse through software vendors.'
    },
    {
      id: 'q20',
      type: 'select',
      title: 'What is Supply Chain Attack?',
      options: [
        { value: 'correct', label: 'Attacker compromises a trusted vendor and uses it to distribute malware' },
        { value: 'network_only', label: 'Direct internal network attack only' },
        { value: 'usb', label: 'Attack through USB only' },
        { value: 'db', label: 'Attack on database only' }
      ],
      answer: 'correct'
    },
    {
      id: 'q21',
      type: 'select',
      title: 'What proves malware execution succeeded after update?',
      options: [
        { value: 'update_success', label: 'Update completed successfully' },
        { value: 'unknown_service', label: 'New unknown service started (update_service.exe)' },
        { value: 'restart', label: 'User restarted computer' },
        { value: 'av_update', label: 'Antivirus updated' }
      ],
      answer: 'unknown_service'
    },
    {
      id: 'q22',
      type: 'select',
      title: 'What proves C2 communication happened?',
      options: [
        { value: 'internal_traffic', label: 'Internal network traffic' },
        { value: 'outbound_unknown', label: 'Outbound connection to unknown external IP' },
        { value: 'email_sent', label: 'Email sent successfully' },
        { value: 'file_download', label: 'File downloaded from internet' }
      ],
      answer: 'outbound_unknown'
    },
    {
      id: 'q23',
      type: 'multiselect',
      title: 'Why is Supply Chain Attack hard to detect? (Select all correct)',
      options: [
        { value: 'trusted_source', label: 'Update comes from trusted source', isCorrect: true },
        { value: 'no_errors', label: 'No obvious errors/warnings', isCorrect: true },
        { value: 'similar_names', label: 'Malware uses system-like process names', isCorrect: true },
        { value: 'normal_user', label: 'User is not doing suspicious action', isCorrect: true }
      ],
      minCorrect: 4
    },
    {
      id: 'q24',
      type: 'select',
      title: 'MITRE Initial Access in this scenario represents:',
      options: [
        { value: 'compromised_update', label: 'Installing compromised update' },
        { value: 'execution', label: 'Running malware' },
        { value: 'c2', label: 'Connecting to C2' },
        { value: 'exfil', label: 'Stealing data' }
      ],
      answer: 'compromised_update'
    },
    {
      id: 'q25',
      type: 'select',
      title: 'Which MITRE technique is used?',
      options: [
        { value: 't1195', label: 'T1195 - Supply Chain Compromise' },
        { value: 't1566', label: 'T1566 - Phishing' },
        { value: 't1110', label: 'T1110 - Brute Force' },
        { value: 't1190', label: 'T1190 - Exploit Public-Facing Application' }
      ],
      answer: 't1195'
    },
    {
      id: 'q26',
      type: 'select',
      title: 'Which MITRE sub-technique fits this case?',
      options: [
        { value: 't1195_001', label: 'T1195.001 - Compromise Software Dependencies' },
        { value: 't1195_002', label: 'T1195.002 - Compromise Software Supply Chain' },
        { value: 't1195_003', label: 'T1195.003 - Compromise Hardware Supply Chain' }
      ],
      answer: 't1195_002'
    },
    {
      id: 'q27',
      type: 'select',
      title: 'What is the attack pattern in this scenario?',
      options: [
        { value: 'single_event', label: 'Single event attack' },
        { value: 'sequence', label: 'Sequence of steps' },
        { value: 'random', label: 'Random events' },
        { value: 'parallel', label: 'Parallel attacks' }
      ],
      answer: 'sequence'
    },
    {
      id: 'q28',
      type: 'select',
      title: 'What is the final impact?',
      options: [
        { value: 'encryption', label: 'Data Encryption (Ransomware)' },
        { value: 'outage', label: 'Network Outage' },
        { value: 'exfil_espionage', label: 'Data Exfiltration & Espionage' },
        { value: 'deface', label: 'Website Defacement' },
        { value: 'crash', label: 'System Crash' }
      ],
      answer: 'exfil_espionage'
    },
    {
      id: 'q29',
      type: 'select',
      title: 'Did lateral movement happen?',
      options: [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' }
      ],
      answer: 'true'
    },
    {
      id: 'q30',
      type: 'select',
      title: 'What is evidence of lateral movement?',
      options: [
        { value: 'update', label: 'Software update installed' },
        { value: 'multi_system', label: 'Unusual access to multiple internal systems' },
        { value: 'logout', label: 'User logged out' },
        { value: 'backup', label: 'Backup completed' }
      ],
      answer: 'multi_system'
    },
    {
      id: 'q31',
      type: 'multiselect',
      title: 'Why did the attack succeed? (Select all correct)',
      options: [
        { value: 'vendor_trust', label: 'Trusted vendor without extra verification', isCorrect: true },
        { value: 'outbound_monitoring', label: 'Insufficient outbound connection monitoring', isCorrect: true },
        { value: 'behavioral', label: 'No behavioral analysis for new services', isCorrect: true },
        { value: 'segmentation', label: 'No network segmentation', isCorrect: true }
      ],
      minCorrect: 4
    },
    {
      id: 'q32',
      type: 'select',
      title: 'What is evidence of persistence?',
      options: [
        { value: 'user_login', label: 'User logged in' },
        { value: 'auto_start', label: 'Service registered for auto-start' },
        { value: 'download', label: 'File downloaded' },
        { value: 'email', label: 'Email received' }
      ],
      answer: 'auto_start'
    }
  ];
}

function buildPhase3Questions() {
  return [
    {
      id: 'q33',
      type: 'select',
      title: 'What is the first action to take?',
      options: [
        { value: 'delete_file', label: 'Delete the malware file' },
        { value: 'restart_server', label: 'Restart the server' },
        { value: 'isolate_systems', label: 'Isolate affected systems from network' },
        { value: 'email_mgmt', label: 'Send email to management' },
        { value: 'update_av', label: 'Update antivirus' }
      ],
      answer: 'isolate_systems'
    },
    {
      id: 'q34',
      type: 'select',
      title: 'What is second action after isolation?',
      options: [
        { value: 'block_c2', label: 'Block C2 IP addresses on firewall' },
        { value: 'go_home', label: 'Go home' },
        { value: 'ignore', label: 'Ignore the alert' },
        { value: 'install_new', label: 'Install new software' }
      ],
      answer: 'block_c2'
    },
    {
      id: 'q35',
      type: 'select',
      title: 'What should be done with the vendor?',
      options: [
        { value: 'ignore_vendor', label: 'Ignore vendor' },
        { value: 'notify_vendor', label: 'Notify breach and pause product usage temporarily' },
        { value: 'sue_now', label: 'Sue immediately' },
        { value: 'continue_updates', label: 'Continue updates as normal' }
      ],
      answer: 'notify_vendor'
    },
    {
      id: 'q36',
      type: 'select',
      title: 'Best prevention recommendation for supply chain attacks?',
      options: [
        { value: 'stop_updates', label: 'Stop all software updates' },
        { value: 'integrity_vendor', label: 'Implement software integrity verification & vendor security assessment' },
        { value: 'disconnect_internet', label: 'Disconnect from internet' },
        { value: 'weekly_password', label: 'Change passwords weekly' }
      ],
      answer: 'integrity_vendor'
    },
    {
      id: 'q37',
      type: 'multiselect',
      title: 'Which security controls reduce supply chain risk? (Select all correct)',
      options: [
        { value: 'whitelisting', label: 'Application Whitelisting', isCorrect: true },
        { value: 'segmentation', label: 'Network Segmentation', isCorrect: true },
        { value: 'edr_behavior', label: 'EDR with Behavioral Analysis', isCorrect: true },
        { value: 'zero_trust', label: 'Zero Trust Architecture', isCorrect: true }
      ],
      minCorrect: 4
    }
  ];
}

function buildPhase4Questions() {
  return [
    {
      id: 'q38',
      type: 'timeline',
      title: 'Drag and drop events into correct timeline order:',
      timelineItems: [
        { value: 'c2', label: 'C2 connection to external IP' },
        { value: 'exfil', label: 'Data exfiltration detected' },
        { value: 'update', label: 'Trusted software update installed' },
        { value: 'enum', label: 'Internal system enumeration' },
        { value: 'service', label: 'Unknown service started' },
        { value: 'persist', label: 'Persistence mechanism created' }
      ],
      answer: 'update,service,c2,persist,enum,exfil'
    },
    {
      id: 'q39',
      type: 'select',
      title: 'From timeline, what is the most dangerous event?',
      options: [
        { value: 'update', label: 'Software update (entry point)' },
        { value: 'c2', label: 'C2 Connection (gives attacker full control)' },
        { value: 'exfil', label: 'Data Exfiltration (final impact)' },
        { value: 'service', label: 'Service started (execution start)' }
      ],
      answer: 'c2'
    },
    {
      id: 'q40',
      type: 'select',
      title: 'What is the key lesson learned?',
      options: [
        { value: 'av_enough', label: 'Antivirus is enough' },
        { value: 'never_trust', label: 'Never trust, always verify - even trusted sources' },
        { value: 'updates_not_important', label: 'Updates are not important' },
        { value: 'internal_safe', label: 'Internal network is always safe' }
      ],
      answer: 'never_trust'
    }
  ];
}

function renderQuestionCard(container, q) {
  const card = document.createElement('div');
  card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative whitespace-pre-line';
  card.dataset.qid = q.id;
  card.dataset.answer = q.answer || '';
  if (q.acceptAnswers) card.dataset.acceptAnswers = JSON.stringify(q.acceptAnswers);

  let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
  html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">Show Hint (-5 points)</button>`;
  html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint || 'Use correlation and sequence, not single-line judgment.'}</div>`;

  if (q.type === 'text') {
    html += `<input type="text" class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700" placeholder="Type answer">`;
  }

  if (q.type === 'select') {
    html += `<select class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700">`;
    html += `<option value="">-- Select Answer --</option>`;
    q.options.forEach(opt => { html += `<option value="${opt.value}">${opt.label}</option>`; });
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
      item.addEventListener('dragstart', () => { dragged = item; item.classList.add('opacity-50'); });
      item.addEventListener('dragend', () => { item.classList.remove('opacity-50'); });
      item.addEventListener('dragover', e => e.preventDefault());
      item.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragged || dragged === item) return;
        const items = Array.from(list.querySelectorAll('.timeline-item'));
        const draggedIndex = items.indexOf(dragged);
        const targetIndex = items.indexOf(item);
        if (draggedIndex < targetIndex) item.after(dragged); else item.before(dragged);
      });
    });
  }

  card.querySelector('.hint-btn').addEventListener('click', function (e) {
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
  if (!cachedPhase1Questions) cachedPhase1Questions = buildPhase1Questions();
  cachedPhase1Questions.forEach(q => renderQuestionCard(container, q));
}

function renderPhase2Questions() {
  const container = document.getElementById('scenario-container');
  container.innerHTML = '';
  if (!cachedPhase2Questions) cachedPhase2Questions = buildPhase2Questions();
  cachedPhase2Questions.forEach(q => renderQuestionCard(container, q));
}

function renderPhase3Questions() {
  const container = document.getElementById('response-container');
  container.innerHTML = '';
  if (!cachedPhase3Questions) cachedPhase3Questions = buildPhase3Questions();
  cachedPhase3Questions.forEach(q => renderQuestionCard(container, q));
}

function renderPhase4Questions() {
  const container = document.getElementById('timeline-container');
  container.innerHTML = '';
  if (!cachedPhase4Questions) cachedPhase4Questions = buildPhase4Questions();
  cachedPhase4Questions.forEach(q => renderQuestionCard(container, q));
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
    return (input.value || '').trim().toLowerCase() === answer;
  }

  const timelineList = card.querySelector('.timeline-list');
  if (timelineList) {
    const currentOrder = Array.from(timelineList.querySelectorAll('.timeline-item')).map(i => i.dataset.value).join(',');
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
    showSection('response');
    renderPhase3Questions();
  } else {
    window.alert(`Phase 2 incomplete.\nCorrect: ${result.correct}/${result.total} (${result.percentage}%)\nYou must answer all correctly.`);
  }
}

function evaluatePhase3() {
  const result = evaluateSection('#response-container');
  phase3CorrectCount = result.correct;
  if (result.percentage === 100) {
    window.alert(`Phase 3 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.netGained}`);
    showSection('timeline');
    renderPhase4Questions();
  } else {
    window.alert(`Phase 3 incomplete.\nCorrect: ${result.correct}/${result.total} (${result.percentage}%)\nYou must answer all correctly.`);
  }
}

function evaluatePhase4() {
  const result = evaluateSection('#timeline-container');
  phase4CorrectCount = result.correct;
  if (result.percentage === 100) {
    window.alert(`Phase 4 complete.\nCorrect: ${result.correct}/${result.total}\nScore +${result.netGained}`);
    showFinalResults();
  } else {
    window.alert(`Phase 4 incomplete.\nCorrect: ${result.correct}/${result.total} (${result.percentage}%)\nYou must answer all correctly.`);
  }
}

function getPlayerLevelByScore(points) {
  if (points >= 320) return 'Elite Analyst';
  if (points >= 260) return 'Senior Analyst';
  if (points >= 200) return 'SOC Analyst';
  if (points >= 140) return 'Junior Analyst';
  return 'Trainee Analyst';
}

function showFinalResults() {
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  const totalAll = (cachedPhase1Questions?.length || 0)
    + (cachedPhase2Questions?.length || 0)
    + (cachedPhase3Questions?.length || 0)
    + (cachedPhase4Questions?.length || 0);

  const correctAll = phase1CorrectCount + phase2CorrectCount + phase3CorrectCount + phase4CorrectCount;
  const accuracy = totalAll ? Math.round((correctAll / totalAll) * 100) : 0;
  const playerLevel = getPlayerLevelByScore(score);

  document.getElementById('final-score').textContent = String(score);
  document.getElementById('final-time').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;

  let html = '';
  if (accuracy === 100 && score >= 360) {
    html = `<h3 class="text-lg text-green-300 mb-2">Excellent Investigation</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-green-100">You correctly mapped the full supply-chain kill chain and response priorities.</p>`;
  } else if (accuracy >= 80) {
    html = `<h3 class="text-lg text-yellow-300 mb-2">Good Progress</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-yellow-100">Strong analysis with minor gaps in attack mapping or response prioritization.</p>`;
  } else {
    html = `<h3 class="text-lg text-red-300 mb-2">Needs Improvement</h3><p class="text-cyan-300 mb-2">Player Level: ${playerLevel}</p><p class="text-red-100">Review supply chain lifecycle, C2 evidence, and containment controls.</p>`;
  }

  document.getElementById('performance-rating').innerHTML = html;

  clearInterval(timerId);
  clearInterval(impactInterval);
  showSection('final');

  const recapTime = `${minutes}m ${seconds}s`;
  sessionStorage.setItem('level6Score', `${Math.round(score)}|${accuracy}%|${recapTime}`);

  document.getElementById('return-dashboard').onclick = () => {
    window.location.href = '/?level=level6';
  };

  document.getElementById('restart-level').onclick = () => {
    window.location.reload();
  };
}

function startLevel() {
  const timestamp = Date.now();
  const possiblePaths = getAlertsPath('level6').map(p => `${p}?t=${timestamp}`);

  const tryLoadFromPaths = (idx) => {
    if (idx >= possiblePaths.length) {
      const pathsStr = getAlertsPath('level6').join('\n- ');
      window.alert(`Failed to load Level 6 alerts.\n\nTried paths:\n- ${pathsStr}`);
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
          window.alert('Not enough alerts loaded for Level 6.');
          return;
        }

        cachedPhase1Questions = null;
        cachedPhase2Questions = null;
        cachedPhase3Questions = null;
        cachedPhase4Questions = null;

        renderPhase1Questions();
        startTimer();
        showSection('questions');
      })
      .catch(() => tryLoadFromPaths(idx + 1));
  };

  tryLoadFromPaths(0);
}

window.evaluatePhase1 = evaluatePhase1;
window.evaluatePhase2 = evaluatePhase2;
window.evaluatePhase3 = evaluatePhase3;
window.evaluatePhase4 = evaluatePhase4;
window.startLevel = startLevel;
window.addTimeExtension = addTimeExtension;
window.handleReset = handleReset;
