const API_BASE = '';
const TOKEN_KEY = 'lab4_token';
const LAB_STATE_KEY = 'lab4_attempt_state';
const LAB_DURATION_SECONDS = 20 * 60;

function defaultLabState() {
  return {
    started: false,
    timerSeconds: LAB_DURATION_SECONDS,
    timerId: null,
    endsAt: null,
    expiredNotified: false,
    hintsLeft: 3,
    score: 0,
    tasks: { t1: false, t2: false, t3: false },
    finalized: false
  };
}

let labState = defaultLabState();

function roleFromId(value) {
  if (value === 1) return 'owner';
  if (value === 2) return 'admin';
  if (value === 3) return 'viewer';
  return '-';
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function saveLabState() {
  const serializable = { ...labState, timerId: null };
  localStorage.setItem(LAB_STATE_KEY, JSON.stringify(serializable));
}

function loadLabState() {
  const raw = localStorage.getItem(LAB_STATE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    labState = { ...defaultLabState(), ...parsed, timerId: null };
    if (!labState.started && !labState.finalized && labState.timerSeconds <= 0) {
      labState.timerSeconds = LAB_DURATION_SECONDS;
    }
  } catch (e) {
    labState = defaultLabState();
  }
}

function resetLocalLabState() {
  clearInterval(labState.timerId);
  labState = defaultLabState();
  localStorage.removeItem(LAB_STATE_KEY);
}

function syncTimerFromClock() {
  if (!labState.started || !labState.endsAt) return;
  const remaining = Math.max(0, Math.floor((labState.endsAt - Date.now()) / 1000));
  labState.timerSeconds = remaining;

  if (remaining <= 0) {
    clearInterval(labState.timerId);
    labState.timerId = null;
    labState.started = false;
    labState.endsAt = null;
    if (!labState.expiredNotified && document.getElementById('challengeStatus')) {
      alert('Time expired. Reset and try again.');
      labState.expiredNotified = true;
    }
    saveLabState();
  }
}

function startLiveTimerIfNeeded() {
  clearInterval(labState.timerId);
  if (!labState.started || !labState.endsAt) return;

  syncTimerFromClock();
  updateLabUI();
  saveLabState();

  labState.timerId = setInterval(() => {
    syncTimerFromClock();
    updateLabUI();
    saveLabState();
  }, 1000);
}

function setChallengeVisibility() {
  const lockedCard = document.getElementById('lockedTasksCard');
  const tasksCard = document.getElementById('tasksCard');
  const flagCard = document.getElementById('flagCard');
  if (!lockedCard || !tasksCard || !flagCard) return;

  if (labState.started || labState.finalized) {
    lockedCard.classList.add('hidden');
    tasksCard.classList.remove('hidden');
    flagCard.classList.remove('hidden');
  } else {
    lockedCard.classList.remove('hidden');
    tasksCard.classList.add('hidden');
    flagCard.classList.add('hidden');
  }
}

async function apiCall(url, method = 'GET', body = null, useAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token()) headers.Authorization = `Bearer ${token()}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function refreshNav() {
  const authState = document.getElementById('authState');
  const roleState = document.getElementById('roleState');
  if (!token()) {
    if (authState) authState.textContent = 'Guest';
    if (roleState) roleState.textContent = 'Role: none';
    return;
  }

  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    if (authState) authState.textContent = `${me.username} • ${me.orgName}`;
    if (roleState) roleState.textContent = `Role: ${me.role}`;
  } catch (e) {
    clearToken();
    if (authState) authState.textContent = 'Guest';
    if (roleState) roleState.textContent = 'Role: none';
  }
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  try {
    const data = await apiCall('/api/login', 'POST', { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    location.href = 'dashboard.html';
  } catch (e) {
    alert(e.message);
  }
}

function logout() {
  clearToken();
  location.href = 'login.html';
}

async function loadHomeSummary() {
  const wrap = document.getElementById('homeSummary');
  if (!wrap) return;
  try {
    const summary = await apiCall('/api/dashboard/summary', 'GET', null, true);
    wrap.innerHTML = `
      <div class="grid">
        <div class="card"><p class="muted">Members</p><p class="stat">${summary.membersCount}</p></div>
        <div class="card"><p class="muted">Projects</p><p class="stat">${summary.projectsCount}</p></div>
        <div class="card"><p class="muted">Reports</p><p class="stat">${summary.reportsCount}</p></div>
        <div class="card"><p class="muted">Open Findings</p><p class="stat">${summary.unresolvedFindings}</p></div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card muted">Login to see tenant metrics.</div>`;
  }
}

async function loadDashboard() {
  const wrap = document.getElementById('dashboardWrap');
  if (!wrap) return;
  try {
    const summary = await apiCall('/api/dashboard/summary', 'GET', null, true);
    const me = await apiCall('/api/me', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card notice">
        <h3>Tenant Snapshot</h3>
        <p>Role-sensitive actions are enforced server-side through governance policy.</p>
      </div>
      <div class="grid">
        <div class="card"><p class="muted">Role</p><p class="stat">${me.role}</p></div>
        <div class="card"><p class="muted">Members</p><p class="stat">${summary.membersCount}</p></div>
        <div class="card"><p class="muted">Projects</p><p class="stat">${summary.projectsCount}</p></div>
        <div class="card"><p class="muted">Reports</p><p class="stat">${summary.reportsCount}</p></div>
      </div>
      <div class="card"><h3>Organization</h3><p>${summary.org.name}</p><p class="muted">Plan: ${summary.org.plan}</p></div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadOrgPage() {
  const wrap = document.getElementById('orgWrap');
  if (!wrap) return;
  try {
    const org = await apiCall('/api/org/current', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card">
        <h2>${org.name}</h2>
        <p class="muted">${org.description}</p>
        <p><strong>Creator User ID:</strong> ${org.creator_user_id}</p>
        <p><strong>Plan:</strong> ${org.plan}</p>
        <p><strong>Members:</strong> ${org.membersCount}</p>
        <p><strong>Projects:</strong> ${org.projectsCount}</p>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

function memberActionsHtml(member, me) {
  const options = `
    <option value="2" ${member.access_rights === 2 ? 'selected' : ''}>admin</option>
    <option value="3" ${member.access_rights === 3 ? 'selected' : ''}>viewer</option>
  `;

  const hideRoleUpdate = member.is_original_owner;
  const roleEditor = me.access_rights === 3 || hideRoleUpdate
    ? `<span class="muted">read-only</span>`
    : `
      <select id="roleSelect_${member.user_id}">${options}</select>
      <button class="inline secondary" onclick="changeRole(${member.user_id})">Update Role</button>
    `;

  // Hidden UI gap: delete action never appears for original owner row, even after downgrade.
  const deleteButton = member.is_original_owner
    ? ''
    : `<button class="inline warn" onclick="deleteMember(${member.user_id})">Delete</button>`;

  return `
    <div class="row-actions">
      ${roleEditor}
      ${deleteButton}
    </div>
  `;
}

async function loadMembers() {
  const tbody = document.getElementById('membersBody');
  if (!tbody) return;
  try {
    const [members, me] = await Promise.all([
      apiCall('/api/org/members', 'GET', null, true),
      apiCall('/api/me', 'GET', null, true)
    ]);

    tbody.innerHTML = members.map((member) => `
      <tr>
        <td>${member.user_id}</td>
        <td>${member.username}</td>
        <td>${member.role}</td>
        <td>${memberActionsHtml(member, me)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4">${e.message}</td></tr>`;
  }
}

async function changeRole(userId) {
  const select = document.getElementById(`roleSelect_${userId}`);
  if (!select) return;
  const accessRights = Number(select.value);

  try {
    await apiCall(`/api/org/members/${userId}/access`, 'POST', {
      user_id: userId,
      access_rights: accessRights
    }, true);
    alert('Role updated.');
    loadMembers();
    refreshNav();
  } catch (e) {
    alert(e.message);
  }
}

async function deleteMember(userId) {
  try {
    const data = await apiCall(`/api/org/members/${userId}/delete`, 'POST', { user_id: userId }, true);
    if (data.flag) {
      alert(`Delete succeeded. Hidden response data found: ${data.flag}`);
    } else {
      alert('Member deleted.');
    }
    loadMembers();
    refreshNav();
  } catch (e) {
    alert(e.message);
  }
}

async function loadAuditLogs() {
  const tbody = document.getElementById('auditBody');
  if (!tbody) return;
  try {
    const logs = await apiCall('/api/audit/logs', 'GET', null, true);
    tbody.innerHTML = logs.map((log) => `
      <tr>
        <td>${log.id}</td>
        <td>${log.type}</td>
        <td>${log.actor_user_id}</td>
        <td>${log.target_user_id}</td>
        <td>${roleFromId(log.from_access_rights)}</td>
        <td>${roleFromId(log.to_access_rights)}</td>
        <td>${log.hidden_role_bypass ? 'yes' : 'no'}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7">${e.message}</td></tr>`;
  }
}

async function loadProjects() {
  const wrap = document.getElementById('projectsWrap');
  if (!wrap) return;
  try {
    const projects = await apiCall('/api/projects', 'GET', null, true);
    wrap.innerHTML = projects.map((p) => `<div class="card"><h3>${p.name}</h3><p class="muted">Status: ${p.status}</p></div>`).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadReports() {
  const wrap = document.getElementById('reportsWrap');
  if (!wrap) return;
  try {
    const reports = await apiCall('/api/reports', 'GET', null, true);
    wrap.innerHTML = reports.map((r) => `<div class="card"><h3>${r.title}</h3><p class="muted">Severity: ${r.severity} | Status: ${r.status}</p></div>`).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadBilling() {
  const wrap = document.getElementById('billingWrap');
  if (!wrap) return;
  try {
    const events = await apiCall('/api/billing/events', 'GET', null, true);
    wrap.innerHTML = events.map((e) => `<div class="card"><h3>${e.event}</h3><p class="muted">${e.amount} ${e.currency}</p></div>`).join('');
  } catch (err) {
    wrap.innerHTML = `<div class="card">${err.message}</div>`;
  }
}

function updateLabUI() {
  const timerEl = document.getElementById('labTimer');
  const scoreEl = document.getElementById('labScore');
  const hintsEl = document.getElementById('labHints');
  const progressEl = document.getElementById('labProgress');
  const taskStateEl = document.getElementById('taskState');
  const finishBtn = document.getElementById('finishBtn');

  const m = String(Math.floor(labState.timerSeconds / 60)).padStart(2, '0');
  const s = String(labState.timerSeconds % 60).padStart(2, '0');
  if (timerEl) timerEl.innerHTML = `<strong>${m}:${s}</strong>`;
  if (scoreEl) scoreEl.innerHTML = `<strong>${labState.score}</strong>`;
  if (hintsEl) hintsEl.innerHTML = `<strong>${labState.hintsLeft}</strong>`;

  const done = [labState.tasks.t1, labState.tasks.t2, labState.tasks.t3].filter(Boolean).length;
  if (progressEl) progressEl.innerHTML = `<strong>${done}/3</strong>`;
  if (taskStateEl) {
    taskStateEl.textContent = `Task1: ${labState.tasks.t1 ? 'Done' : 'Pending'} | Task2: ${labState.tasks.t2 ? 'Done' : 'Pending'} | Task3: ${labState.tasks.t3 ? 'Done' : 'Pending'}`;
  }

  if (finishBtn) {
    if (done === 3 && !labState.finalized) finishBtn.classList.remove('hidden');
    else finishBtn.classList.add('hidden');
  }

  setChallengeVisibility();
}

function startLabAttempt() {
  if (labState.started) {
    startLiveTimerIfNeeded();
    return;
  }

  labState.started = true;
  labState.expiredNotified = false;
  labState.timerSeconds = LAB_DURATION_SECONDS;
  labState.endsAt = Date.now() + LAB_DURATION_SECONDS * 1000;

  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'Attempt started. Complete tasks and check progress.';

  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.classList.add('hidden');
    finalResult.textContent = '';
  }

  saveLabState();
  startLiveTimerIfNeeded();
  updateLabUI();
}

function useLabHint(taskNum) {
  const hints = {
    1: 'Inspect member role update request structure carefully and compare all target identifiers.',
    2: 'Review role history changes after ownership state shifts.',
    3: 'Look for a member action that should appear after role change but remains hidden in UI.'
  };

  if (!labState.started) {
    alert('Start Attempt first.');
    return;
  }

  if (labState.hintsLeft <= 0) {
    alert('No hints left.');
    return;
  }

  labState.hintsLeft -= 1;
  labState.score = Math.max(0, labState.score - 5);
  saveLabState();
  updateLabUI();
  alert(hints[taskNum] || 'Inspect requests carefully.');
}

async function checkProgress() {
  const out = document.getElementById('challengeStatus');
  if (!out) return;

  if (!token()) {
    out.textContent = 'Login required before challenge actions.';
    return;
  }

  if (!labState.started) {
    out.textContent = 'Start Attempt first to unlock tasks and progress checks.';
    return;
  }

  try {
    const status = await apiCall('/api/challenge/status', 'GET', null, true);
    const old = { ...labState.tasks };

    labState.tasks.t1 = !!status.task1;
    labState.tasks.t2 = !!status.task2;
    labState.tasks.t3 = !!status.task3;

    if (labState.tasks.t1 && !old.t1) labState.score += 120;
    if (labState.tasks.t2 && !old.t2) labState.score += 120;
    if (labState.tasks.t3 && !old.t3) labState.score += 160;

    saveLabState();

    out.textContent = [
      `Task 1 (privilege escalation): ${labState.tasks.t1 ? 'DONE' : 'PENDING'}`,
      `Task 2 (org takeover): ${labState.tasks.t2 ? 'DONE' : 'PENDING'}`,
      `Task 3 (retrieve and submit flag): ${labState.tasks.t3 ? 'DONE' : 'PENDING'}`,
      `Current role: ${status.role}`,
      `Audit logs: ${status.logsCount}`
    ].join('\n');

    updateLabUI();
  } catch (e) {
    out.textContent = e.message;
  }
}

async function submitFlag() {
  if (!labState.started) {
    alert('Start Attempt first.');
    return;
  }

  const flag = document.getElementById('flagInput').value.trim();
  try {
    const resp = await apiCall('/api/challenge/submit-flag', 'POST', { flag }, true);
    if (resp.success) {
      if (!labState.tasks.t3) labState.score += 160;
      labState.tasks.t3 = true;
      saveLabState();
      updateLabUI();
      alert('Correct flag submitted.');
    }
  } catch (e) {
    alert(e.message);
  }
}

async function performResetState(message, clearSessionToo = true) {
  try {
    await apiCall('/api/reset', 'POST');
  } catch (e) {
    // Continue local cleanup.
  }

  if (clearSessionToo) clearToken();
  resetLocalLabState();

  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = message;

  const flagInput = document.getElementById('flagInput');
  if (flagInput) flagInput.value = '';

  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.classList.add('hidden');
    finalResult.textContent = '';
  }

  updateLabUI();
  await refreshNav();
}

async function finishLabAttempt() {
  const done = [labState.tasks.t1, labState.tasks.t2, labState.tasks.t3].filter(Boolean).length;
  if (done < 3) {
    alert('Complete all 3 tasks before finish.');
    return;
  }
  if (labState.finalized) return;

  clearInterval(labState.timerId);
  labState.started = false;
  labState.endsAt = null;
  labState.finalized = true;

  const taskBonus = (labState.tasks.t1 ? 120 : 0) + (labState.tasks.t2 ? 120 : 0) + (labState.tasks.t3 ? 160 : 0);
  const hintPenalty = (3 - labState.hintsLeft) * 5;
  const timeBonus = Math.max(0, Math.floor(labState.timerSeconds / 60) * 10);
  const finalScore = Math.max(0, taskBonus - hintPenalty + timeBonus);

  labState.score = finalScore;
  saveLabState();
  updateLabUI();

  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.classList.remove('hidden');
    finalResult.textContent = [
      'LAB COMPLETE',
      `Task Bonus: ${taskBonus}`,
      `Hint Penalty: -${hintPenalty}`,
      `Time Bonus: +${timeBonus}`,
      `Final Score: ${finalScore}`,
      'Automatic reset in 4 seconds.'
    ].join('\n');
  }

  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'All tasks complete. Resetting environment...';

  setTimeout(async () => {
    await performResetState('Lab reset complete. Login again for a fresh attempt.', true);
    alert('Lab 4 reset automatically after completion.');
    location.href = 'login.html';
  }, 4000);
}

async function fullResetLab() {
  await performResetState('Everything reset. Login again to start new attempt.', true);
  alert('Lab 4 reset complete.');
  location.href = 'login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
  loadLabState();
  syncTimerFromClock();
  startLiveTimerIfNeeded();

  await refreshNav();

  loadHomeSummary();
  loadDashboard();
  loadOrgPage();
  loadMembers();
  loadAuditLogs();
  loadProjects();
  loadReports();
  loadBilling();

  updateLabUI();
});
