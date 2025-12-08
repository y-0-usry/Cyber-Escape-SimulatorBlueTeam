// === GLOBAL STATE ===
let alerts = [];
let score = 0;
let hintsUsed = 0;
let attempts = 3;
let timerSeconds = 15 * 60;
let startTime = 0;
let timerId = null;
let correctAnswers = 0;
let totalQuestions = 0;

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
  startTime = Date.now();
  timerId = setInterval(() => {
    timerSeconds--;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
    if (timerSeconds <= 0) {
      clearInterval(timerId);
      window.alert('Time expired! Try again.');
      handleReset();
    }
  }, 1000);
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
  timerSeconds = 15 * 60;
  correctAnswers = 0;
  totalQuestions = 0;
  updateScore();
  showSection('intro');
  clearInterval(timerId);
}

// === SCORE UI ===
function updateScore() {
  document.getElementById('score').textContent = score;
  document.getElementById('hints-used').textContent = hintsUsed;
}

// === FALSE POSITIVE DETECTION ===
function isFalsePositive(alert) {
  const raw = alert.linked_log?.['log.original'] || '';
  // Low severity routine traffic
  if (alert.severity === 'low' && alert.alert_type === 'network_traffic') return true;
  // Backup/intranet systems
  if (alert.source_ip === '192.168.1.50' || alert.source_ip === '192.168.1.60') return true;
  if (/backup|intranet|office365/i.test(raw)) return true;
  // Priority 4 IDS alerts
  if (/Priority 4|ET INFO/i.test(raw)) return true;
  return false;
}

function getTruePositives() {
  // Only keep high/medium alerts for investigation to avoid low-severity noise in questions
  return alerts.filter(a => !isFalsePositive(a) && a.severity !== 'low');
}

// === PHASE 1: GENERAL TRIAGE QUESTIONS ===
function buildGeneralQuestions() {
  const fp = alerts.filter(isFalsePositive);
  const tp = getTruePositives();
  const questions = [];

  // Q1: Identify all false positives
  questions.push({
    id: 'q-fp-ids',
    type: 'text',
    title: 'Enter ALL False Positive alert IDs (comma-separated)',
    hint: 'Look for low-severity traffic, backup systems, intranet access, and Priority 4 IDS alerts.',
    answer: fp.map(a => a.alert_id).sort().join(','),
    placeholder: '────────────, ────────────, ────────────'
  });

  // Q2-Q10: Classify each high/medium alert
  tp.slice(0, 9).forEach((alert, idx) => {
    const raw = alert.linked_log?.['log.original'] || '';
    let correctType = 'unknown';
    
    if (/PowerShell|Invoke|Encoded|script/i.test(raw)) correctType = 'malicious_script';
    if (/SMB|445|Lateral/i.test(raw)) correctType = 'lateral_movement';
    if (/Ransomware|Beacon|C2|malware-cloud/i.test(raw)) correctType = 'c2_communication';
    if (/Registry|Persistence|RunOnce/i.test(raw)) correctType = 'persistence';
    if (/Shadow|Deletion|Delete/i.test(raw)) correctType = 'defense_evasion';
    if (/Encryption|Rename|File.*Extension|bulk.*file/i.test(raw)) correctType = 'impact';
    if (/Failed.*login|brute.*force|authentication.*failed/i.test(raw)) correctType = 'credential_access';

    questions.push({
      id: `q-classify-${idx}`,
      type: 'select',
      title: `Alert ${alert.alert_id.substring(0, 8)}... - What MITRE ATT&CK tactic does this represent?`,
      hint: `Review log snippet: "${raw.substring(0, 100).replace(/\n/g, ' ')}..."`,
      options: [
        { value: 'reconnaissance', label: 'Reconnaissance' },
        { value: 'initial_access', label: 'Initial Access' },
        { value: 'execution', label: 'Execution' },
        { value: 'persistence', label: 'Persistence' },
        { value: 'privilege_escalation', label: 'Privilege Escalation' },
        { value: 'defense_evasion', label: 'Defense Evasion' },
        { value: 'credential_access', label: 'Credential Access' },
        { value: 'lateral_movement', label: 'Lateral Movement' },
        { value: 'c2_communication', label: 'Command & Control' },
        { value: 'impact', label: 'Impact' },
        { value: 'malicious_script', label: 'Malicious Script Execution' }
      ],
      answer: correctType
    });
  });

  // Q11: Compromised host IP
  const primaryHost = tp.reduce((acc, a) => {
    const ip = a.source_ip || '';
    if (ip.startsWith('192.168.1.')) {
      acc[ip] = (acc[ip] || 0) + 1;
    }
    return acc;
  }, {});
  const mostFrequent = Object.entries(primaryHost).sort((a, b) => b[1] - a[1])[0]?.[0] || '192.168.1.10';

  questions.push({
    id: 'q-compromised-ip',
    type: 'text',
    title: 'What is the primary compromised host IP address?',
    hint: 'Check which internal IP appears most frequently in high-severity alerts.',
    answer: mostFrequent,
    placeholder: '───.───.─.──'
  });

  // Q12-Q14: Recommended actions
  questions.push({
    id: 'q-action-powershell',
    type: 'select',
    title: 'Recommended action for suspicious PowerShell execution alert?',
    hint: 'PowerShell with encoded commands is often malicious.',
    options: [
      { value: 'ignore', label: 'Ignore - False Positive' },
      { value: 'monitor', label: 'Monitor Only' },
      { value: 'investigate', label: 'Investigate Further' },
      { value: 'isolate', label: 'Isolate Host Immediately' }
    ],
    answer: 'isolate'
  });

  questions.push({
    id: 'q-action-smb',
    type: 'select',
    title: 'Recommended action for SMB lateral movement alert?',
    hint: 'Lateral movement indicates active intrusion.',
    options: [
      { value: 'allow', label: 'Allow - Legitimate Traffic' },
      { value: 'monitor', label: 'Monitor Only' },
      { value: 'block_port', label: 'Block SMB Port' },
      { value: 'isolate_all', label: 'Isolate All Affected Hosts' }
    ],
    answer: 'isolate_all'
  });

  questions.push({
    id: 'q-action-encryption',
    type: 'select',
    title: 'Recommended action for mass file encryption activity?',
    hint: 'File encryption is the final impact stage of ransomware.',
    options: [
      { value: 'backup', label: 'Restore from Backup Only' },
      { value: 'reboot', label: 'Reboot System' },
      { value: 'isolate', label: 'Isolate Network Immediately' },
      { value: 'monitor', label: 'Continue Monitoring' }
    ],
    answer: 'isolate'
  });

  return questions;
}

function renderGeneralQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  const questions = buildGeneralQuestions();
  totalQuestions = questions.length;

  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded text-sm space-y-2 relative';
    card.dataset.qid = q.id;
    card.dataset.answer = q.answer || '';

    let html = `<p class="text-blue-200 font-semibold mb-2">${q.title}</p>`;
    
    // Hint button (hidden by default)
    html += `<button class="hint-btn text-xs text-yellow-400 underline hover:text-yellow-300">💡 Show Hint (-5 points)</button>`;
    html += `<div class="hint-text hidden text-xs text-yellow-200 mt-2 p-2 bg-gray-900 rounded border border-yellow-600">${q.hint}</div>`;

    if (q.type === 'text') {
      const placeholder = q.placeholder || '────────────';
      html += `<input type="text" class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-blue-500" placeholder="${placeholder}">`;
    }

    if (q.type === 'select') {
      html += `<select class="answer-input w-full mt-2 bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-blue-500">`;
      html += `<option value="">-- Select Answer --</option>`;
      q.options.forEach(opt => {
        html += `<option value="${opt.value}">${opt.label}</option>`;
      });
      html += `</select>`;
    }

    card.innerHTML = html;

    // Hint button handler
    card.querySelector('.hint-btn').addEventListener('click', function(e) {
      e.preventDefault();
      const hintText = card.querySelector('.hint-text');
      if (!hintText.classList.contains('hidden')) return;
      
      hintText.classList.remove('hidden');
      hintsUsed++;
      score = Math.max(0, score - 5);
      updateScore();
    });

    container.appendChild(card);
  });
}

function evaluateGeneralQuestions() {
  const questions = buildGeneralQuestions();
  const cards = document.querySelectorAll('#questions-container [data-qid]');
  let correct = 0;

  cards.forEach(card => {
    const input = card.querySelector('.answer-input');
    if (!input) return;
    
    const value = input.value.trim().toLowerCase();
    const correctAnswer = card.dataset.answer.toLowerCase();
    let isCorrect = false;

    if (input.tagName === 'INPUT') {
      // For text inputs, normalize comma-separated IDs
      const userIds = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s).sort();
      const correctIds = correctAnswer.split(',').map(s => s.trim().toLowerCase()).filter(s => s).sort();
      
      // Q1: False Positives - allow 70% accuracy
      if (card.dataset.qid === 'q-fp-ids') {
        const overlap = userIds.filter(id => correctIds.includes(id)).length;
        const minRequired = Math.ceil(correctIds.length * 0.7);
        isCorrect = overlap >= minRequired;
      }
      // Q11: IP address - exact match
      else if (card.dataset.qid === 'q-compromised-ip') {
        isCorrect = value === correctAnswer;
      }
      // Other questions
      else {
        isCorrect = userIds.length === correctIds.length && userIds.every((id, i) => id === correctIds[i]);
      }
    } else {
      // For select inputs
      isCorrect = value === correctAnswer;
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

  if (correct === cards.length) {
    window.alert(`Phase 1 Complete! Score: ${score}. Proceeding to scenario investigation.`);
    showSection('scenario');
    renderScenarioQuestions();
  } else {
    const wrong = cards.length - correct;
    window.alert(`${wrong} incorrect answer(s). Review the red-bordered questions and try again.`);
  }
}

// === PHASE 2: SCENARIO INVESTIGATION ===
function renderScenarioQuestions() {
  const container = document.getElementById('scenario-container');
  container.innerHTML = '';
  const tp = getTruePositives();

  const scenarioQuestions = [
    {
      id: 'sc-attack-type',
      type: 'text',
      title: 'Based on all collected evidence, what type of attack occurred? (One or two words)',
      hint: 'Consider the final stage: file encryption, ransom demands.',
      placeholder: '────────────',
      pattern: /(ransomware|crypto|encrypt)/i
    },
    {
      id: 'sc-initial-vector',
      type: 'text',
      title: 'What was the most likely initial attack vector? (One or two words)',
      hint: 'How do ransomware attacks typically begin?',
      placeholder: '────────────',
      pattern: /(phishing|email|malicious.*attachment|spear.*phishing)/i
    },
    {
      id: 'sc-attack-chain-ids',
      type: 'text',
      title: 'Enter ALL alert IDs that are part of the main attack chain (comma-separated)',
      hint: 'Exclude false positives and unrelated alerts. Focus on the attack progression.',
      answer: tp.map(a => a.alert_id).sort().join(','),
      placeholder: '────────────, ────────────, ...'
    },
    {
      id: 'sc-attack-stage',
      type: 'select',
      title: 'At what stage of the attack was the incident detected?',
      hint: 'When did the notification arrive? What was already happening?',
      options: [
        { value: 'initial_access', label: 'Initial Access (Early Detection)' },
        { value: 'execution', label: 'Execution Phase' },
        { value: 'lateral_movement', label: 'Lateral Movement' },
        { value: 'impact', label: 'Impact Phase (Files Being Encrypted)' }
      ],
      answer: 'impact'
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

    card.innerHTML = html;

    card.querySelector('.hint-btn').addEventListener('click', function(e) {
      e.preventDefault();
      const hintText = card.querySelector('.hint-text');
      if (!hintText.classList.contains('hidden')) return;
      
      hintText.classList.remove('hidden');
      hintsUsed++;
      score = Math.max(0, score - 5);
      updateScore();
    });

    container.appendChild(card);
  });
}

function evaluateScenarioQuestions() {
  const cards = document.querySelectorAll('#scenario-container [data-qid]');
  let correct = 0;

  cards.forEach(card => {
    const input = card.querySelector('.answer-input');
    if (!input) return;
    
    const value = input.value.trim().toLowerCase();
    const correctAnswer = card.dataset.answer.toLowerCase();
    const pattern = card.dataset.pattern;
    let isCorrect = false;

    if (pattern) {
      // Questions with regex patterns (attack type, vector)
      const regex = new RegExp(pattern, 'i');
      isCorrect = regex.test(value);
    } else if (input.tagName === 'INPUT') {
      // Q3: Attack chain IDs - allow 80% accuracy
      const userIds = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s).sort();
      const correctIds = correctAnswer.split(',').map(s => s.trim().toLowerCase()).filter(s => s).sort();
      
      if (card.dataset.qid === 'sc-attack-chain-ids') {
        const overlap = userIds.filter(id => correctIds.includes(id)).length;
        const minRequired = Math.ceil(correctIds.length * 0.8);
        isCorrect = overlap >= minRequired;
      } else {
        isCorrect = userIds.length === correctIds.length && userIds.every((id, i) => id === correctIds[i]);
      }
    } else {
      // Select inputs - exact match
      isCorrect = value === correctAnswer;
    }

    if (isCorrect) {
      correct++;
      score += 20;
      card.classList.add('border-2', 'border-green-500');
    } else {
      card.classList.add('border-2', 'border-red-500');
    }
  });

  correctAnswers += correct;
  totalQuestions += cards.length;
  updateScore();

  if (correct === cards.length) {
    window.alert('Scenario analysis complete! Create the incident ticket.');
    showSection('ticket');
  } else {
    const wrong = cards.length - correct;
    window.alert(`${wrong} incorrect in scenario phase. Review and correct.`);
  }
}

// === TICKET CREATION ===
function createIncidentTicket() {
  const title = document.getElementById('ticket-title').value.trim();
  const priority = document.getElementById('ticket-priority').value;
  const attack = document.getElementById('ticket-attack').value.trim();
  const summary = document.getElementById('ticket-summary').value.trim();

  if (!title || !priority || !attack || !summary) {
    window.alert('Please complete all ticket fields.');
    return;
  }

  score += 50; // Bonus for ticket creation
  const elapsedSeconds = (15 * 60) - timerSeconds;
  const speedBonus = Math.floor((timerSeconds / 60) * 5);
  score += speedBonus;

  clearInterval(timerId);
  showFinalResults(elapsedSeconds, speedBonus);
}

// === FINAL RESULTS ===
function showFinalResults(elapsedSeconds, speedBonus) {
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;

  const breakdown = document.getElementById('breakdown-list');
  const baseScore = score - speedBonus;
  const hintPenalty = hintsUsed * 5;

  breakdown.innerHTML = `
    <li class="flex justify-between"><span>✅ Correct Answers:</span><span class="text-green-400">${correctAnswers}/${totalQuestions}</span></li>
    <li class="flex justify-between"><span>❌ Incorrect Answers:</span><span class="text-red-400">${totalQuestions - correctAnswers}</span></li>
    <li class="flex justify-between"><span>💡 Hints Used:</span><span class="text-yellow-400">${hintsUsed} (-${hintPenalty} points)</span></li>
    <li class="flex justify-between"><span>⚡ Speed Bonus:</span><span class="text-blue-400">+${speedBonus} points</span></li>
    <li class="flex justify-between"><span>🎯 Base Score:</span><span>${baseScore}</span></li>
    <li class="flex justify-between border-t border-gray-700 pt-2 mt-2 font-bold"><span>📊 Final Score:</span><span class="text-lg text-green-400">${score}</span></li>
  `;

  showSection('final');
  
  // Add button to view answer key
  const finalSection = document.getElementById('final-section');
  if (finalSection && !document.getElementById('answer-key-btn')) {
    const answerKeyBtn = document.createElement('button');
    answerKeyBtn.id = 'answer-key-btn';
    answerKeyBtn.className = 'bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded font-semibold mt-4 flex items-center gap-2';
    answerKeyBtn.innerHTML = '<i class="fas fa-book"></i> View Answer Key & Explanation';
    answerKeyBtn.addEventListener('click', () => {
      window.location.href = '/AnswerKey.html';
    });
    
    // Insert after final score display
    const scoreCard = finalSection.querySelector('.bg-gray-800');
    if (scoreCard) {
      scoreCard.appendChild(answerKeyBtn);
    }
  }
}

// === DATA LOADING ===
async function loadAlerts() {
  try {
    const timestamp = new Date().getTime();
    const res = await fetch(`data/level1/alerts.json?t=${timestamp}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No alerts data received');
    }
    
    alerts = data.map(a => ({
      alert_id: a.alert_id,
      alert_type: a.alert_type,
      severity: a.severity,
      source_ip: a.source_ip || a.linked_log?.source?.ip || '',
      destination_ip: a.destination_ip || a.linked_log?.destination?.ip || '',
      event_action: a.event_action || a.linked_log?.event?.action || '',
      linked_log: a.linked_log || {}
    }));
    
    console.log(`✅ Loaded ${alerts.length} alerts successfully`);
    
    if (alerts.length === 0) {
      window.alert('⚠️ No alerts loaded. Please run: node processAllLogs.js level1');
      return;
    }
  } catch (err) {
    console.error('❌ Error loading alerts:', err);
    window.alert(`Failed to load alerts: ${err.message}\n\nPlease run: node processAllLogs.js level1 from SIEM/Backend/src/`);
  }
}

// === EVENT LISTENERS ===
document.getElementById('start-btn').addEventListener('click', () => {
  showSection('questions');
  renderGeneralQuestions();
  startTimer();
});

document.getElementById('submit-answers').addEventListener('click', evaluateGeneralQuestions);
document.getElementById('submit-scenario').addEventListener('click', evaluateScenarioQuestions);
document.getElementById('create-ticket').addEventListener('click', createIncidentTicket);
document.getElementById('reset-level').addEventListener('click', handleReset);
document.getElementById('return-dashboard').addEventListener('click', () => {
  window.location.href = '/';
});

// === INITIALIZE ===
loadAlerts();
