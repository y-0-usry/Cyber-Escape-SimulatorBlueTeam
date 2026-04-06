const API_BASE = '';
const TOKEN_KEY = 'lab6_token';
const LAB_STATE_KEY = 'lab6_attempt_state';
const LAB_DURATION_SECONDS = 20 * 60;

function defaultLabState() {
  return {
    started: false,
    timerSeconds: LAB_DURATION_SECONDS,
    timerId: null,
    endsAt: null,
    expiredNotified: false,
    score: 0,
    tasks: { t1: false, t2: false },
    finalized: false,
    flagSubmitted: false
  };
}

let labState = defaultLabState();

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

function syncTimerFromClock() {
  if (!labState.started || !labState.endsAt) return;
  const remaining = Math.max(0, Math.floor((labState.endsAt - Date.now()) / 1000));
  labState.timerSeconds = remaining;

  if (remaining <= 0) {
    clearInterval(labState.timerId);
    labState.timerId = null;
    labState.started = false;
    labState.endsAt = null;
    if (!labState.expiredNotified) {
      const out = document.getElementById('challengeStatus');
      if (out) out.textContent = 'Time expired. Reset and try again.';
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
  const locked = document.getElementById('lockedTasksCard');
  const tasks = document.getElementById('tasksCard');
  const flag = document.getElementById('flagCard');
  const accounts = document.getElementById('providedAccountsCard');
  if (!locked || !tasks || !flag) return;

  if (labState.started || labState.finalized) {
    locked.classList.add('hidden');
    tasks.classList.remove('hidden');
    flag.classList.remove('hidden');
    if (accounts) accounts.classList.remove('hidden');
  } else {
    locked.classList.remove('hidden');
    tasks.classList.add('hidden');
    flag.classList.add('hidden');
    if (accounts) accounts.classList.add('hidden');
  }
}

function updateLabUI() {
  const timerEl = document.getElementById('labTimer');
  const scoreEl = document.getElementById('labScore');
  const statusEl = document.getElementById('labStatus');
  const taskA = document.getElementById('task1State');
  const taskB = document.getElementById('task2State');
  const finishBtn = document.getElementById('finishBtn');

  const minutes = String(Math.floor(labState.timerSeconds / 60)).padStart(2, '0');
  const seconds = String(labState.timerSeconds % 60).padStart(2, '0');
  if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
  if (scoreEl) scoreEl.textContent = String(labState.score);
  if (statusEl) statusEl.textContent = labState.flagSubmitted ? 'Objective in progress' : 'Waiting for start';
  if (taskA) taskA.textContent = labState.tasks.t1 ? 'Done' : 'Pending';
  if (taskB) taskB.textContent = labState.tasks.t2 ? 'Done' : 'Pending';
  if (finishBtn) {
    if (labState.tasks.t1 && labState.tasks.t2 && !labState.finalized) finishBtn.classList.remove('hidden');
    else finishBtn.classList.add('hidden');
  }

  setChallengeVisibility();
}

function refreshNav() {
  const authState = document.getElementById('authState');
  const roleState = document.getElementById('roleState');
  const adminLink = document.getElementById('adminNavLink');

  if (!token()) {
    if (authState) authState.textContent = 'Guest';
    if (roleState) roleState.textContent = 'Role: none';
    if (adminLink) adminLink.classList.add('hidden');
    return;
  }

  apiCall('/api/me', 'GET', null, true).then((me) => {
    if (authState) authState.textContent = `${me.username} • ${me.orgName || 'No org'}`;
    if (roleState) roleState.textContent = `Role: ${me.role}`;
    if (adminLink) {
      if (me.isAdmin) adminLink.classList.remove('hidden');
      else adminLink.classList.add('hidden');
    }
  }).catch(() => {
    clearToken();
    if (authState) authState.textContent = 'Guest';
    if (roleState) roleState.textContent = 'Role: none';
    if (adminLink) adminLink.classList.add('hidden');
  });
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

async function loadHome() {
  const wrap = document.getElementById('homeSummary');
  if (!wrap) return;

  if (!token()) {
    wrap.innerHTML = `
      <div class="card notice">
        <h3>Workspace Access</h3>
        <p>Login to view your organization workspace, invites, logs, and project data.</p>
      </div>
    `;
    return;
  }

  try {
    const summary = await apiCall('/api/dashboard/summary', 'GET', null, true);
    wrap.innerHTML = `
      <div class="grid">
        <div class="card"><p class="muted">Members</p><p class="stat">${summary.membersCount}</p></div>
        <div class="card"><p class="muted">Projects</p><p class="stat">${summary.projectsCount}</p></div>
        <div class="card"><p class="muted">Invites</p><p class="stat">${summary.invitesCount}</p></div>
        <div class="card"><p class="muted">Logs</p><p class="stat">${summary.openLogs}</p></div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadDashboard() {
  const wrap = document.getElementById('dashboardWrap');
  if (!wrap) return;
  try {
    const [me, summary] = await Promise.all([
      apiCall('/api/me', 'GET', null, true),
      apiCall('/api/dashboard/summary', 'GET', null, true)
    ]);

    wrap.innerHTML = `
      <div class="card notice">
        <h3>Workspace Snapshot</h3>
        <p>Operational governance, invite flow, project management, and internal monitoring are handled from this tenant.</p>
      </div>
      <div class="grid">
        <div class="card"><p class="muted">Organization</p><p class="stat">${summary.org.name}</p></div>
        <div class="card"><p class="muted">Role</p><p class="stat">${me.role}</p></div>
        <div class="card"><p class="muted">Projects</p><p class="stat">${summary.projectsCount}</p></div>
        <div class="card"><p class="muted">Invites</p><p class="stat">${summary.invitesCount}</p></div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadOrg() {
  const wrap = document.getElementById('orgWrap');
  if (!wrap) return;
  try {
    const org = await apiCall('/api/org/current', 'GET', null, true);
    wrap.innerHTML = `
      <div class="grid">
        <div class="card">
          <h3>${org.name}</h3>
          <p class="muted">${org.description}</p>
          <p><strong>Plan:</strong> ${org.plan}</p>
          <p><strong>Trial days left:</strong> ${org.trial_days_left}</p>
        </div>
        <div class="card">
          <h3>Members</h3>
          <ul class="list-clean">
            ${org.members.map((member) => `<li>${member.username} <span class="muted">• ${member.role}</span></li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
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
        <td>${member.email}</td>
        <td>${member.role}</td>
        <td>
          ${me.isAdmin ? `
            <div class="row-actions">
              <select id="role_${member.user_id}">
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>admin</option>
                <option value="manager" ${member.role === 'manager' ? 'selected' : ''}>manager</option>
                <option value="employee" ${member.role === 'employee' ? 'selected' : ''}>employee</option>
              </select>
              <button class="secondary inline" onclick="changeRole(${member.user_id})">Update</button>
              <button class="warn inline" onclick="removeMember(${member.user_id})">Remove</button>
            </div>
          ` : '<span class="muted">read only</span>'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">${e.message}</td></tr>`;
  }
}

async function changeRole(userId) {
  const select = document.getElementById(`role_${userId}`);
  try {
    await apiCall(`/api/org/members/${userId}/role`, 'POST', { role: select.value }, true);
    loadMembers();
  } catch (e) {
    alert(e.message);
  }
}

async function removeMember(userId) {
  try {
    await apiCall(`/api/org/members/${userId}/remove`, 'POST', {}, true);
    loadMembers();
  } catch (e) {
    alert(e.message);
  }
}

async function loadProjects() {
  const wrap = document.getElementById('projectsWrap');
  if (!wrap) return;
  try {
    const [projects, me] = await Promise.all([
      apiCall('/api/org/projects', 'GET', null, true),
      apiCall('/api/me', 'GET', null, true)
    ]);

    wrap.innerHTML = `
      <div class="grid">
        ${projects.map((project) => `
          <div class="card">
            <h3>${project.name}</h3>
            <p class="muted">${project.summary}</p>
            <p class="status-pill">${project.status}</p>
          </div>
        `).join('')}
      </div>
      <div class="card" style="margin-top:16px;">
        <h3>Create Project</h3>
        <div class="split">
          <div><label>Project Name</label><input id="projectName" placeholder="Project name" /></div>
          <div><label>Summary</label><input id="projectSummary" placeholder="Short summary" /></div>
        </div>
        <div style="margin-top:12px;">
          <button onclick="createProject()">Create</button>
          <span class="muted" style="margin-left:8px;">${me.role === 'employee' ? 'Read only' : 'Project creation enabled'}</span>
        </div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function createProject() {
  const name = document.getElementById('projectName').value.trim();
  const summary = document.getElementById('projectSummary').value.trim();
  try {
    await apiCall('/api/org/projects', 'POST', { name, summary }, true);
    loadProjects();
    loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}

async function loadInvites() {
  const wrap = document.getElementById('invitesWrap');
  if (!wrap) return;
  try {
    const [invites, me] = await Promise.all([
      apiCall('/api/org/invites', 'GET', null, true),
      apiCall('/api/me', 'GET', null, true)
    ]);

    const roleOptions = me.role === 'manager'
      ? '<option value="employee">employee</option>'
      : '<option value="admin">admin</option><option value="manager">manager</option><option value="employee">employee</option>';
    const canCreateInvite = !!me.orgId && ['admin', 'manager'].includes(me.role);

    wrap.innerHTML = `
      ${canCreateInvite ? `
      <div class="card">
        <h3>Create Invite</h3>
        <div class="split">
          <div><label>Email</label><input id="inviteEmail" placeholder="invitee@orglab.local" /></div>
          <div><label>Role</label><select id="inviteRole">${roleOptions}</select></div>
        </div>
        <div style="margin-top:12px;"><button onclick="createInvite()">Send Invite</button></div>
      </div>
      ` : ''}
      <div class="card" style="margin-top:16px;">
        <h3>Pending Invites</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${invites.length === 0 ? `
                <tr><td colspan="5" class="muted">No invites available for this account yet.</td></tr>
              ` : invites.map((invite) => {
                const canEdit = invite.created_by_user_id === me.id && invite.status === 'pending';
                const canAccept = invite.email.toLowerCase() === (me.email || '').toLowerCase() && invite.status === 'pending';
                return `
                <tr>
                  <td>${invite.id}</td>
                  <td>
                    ${canEdit
                      ? `<input id="inviteEmail_${invite.id}" value="${invite.email}" />`
                      : invite.email}
                  </td>
                  <td>${invite.role}</td>
                  <td>${invite.status}</td>
                  <td>
                    <div class="row-actions">
                      ${canEdit
                        ? `<button class="secondary inline" onclick="updateInviteEmail(${invite.id})">Update Email</button>`
                        : ''}
                      ${canAccept
                        ? `<button class="secondary inline" onclick="acceptInvite(${invite.id})">Accept</button>`
                        : ''}
                      ${!canEdit && !canAccept ? '<span class="muted">—</span>' : ''}
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function createInvite() {
  const email = document.getElementById('inviteEmail').value.trim();
  const role = document.getElementById('inviteRole').value;
  try {
    await apiCall('/api/org/invites', 'POST', { email, role }, true);
    loadInvites();
  } catch (e) {
    alert(e.message);
  }
}

async function updateInviteEmail(inviteId) {
  const input = document.getElementById(`inviteEmail_${inviteId}`);
  const email = input ? input.value.trim() : '';
  if (!email) {
    alert('Email is required.');
    return;
  }

  try {
    await apiCall('/api/org/invites', 'POST', { invite_id: inviteId, email }, true);
    loadInvites();
  } catch (e) {
    alert(e.message);
  }
}

async function acceptInvite(inviteId) {
  try {
    await apiCall(`/api/org/invites/${inviteId}/accept`, 'POST', {}, true);
    loadInvites();
    refreshNav();
    loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}

async function loadLogs() {
  const wrap = document.getElementById('logsWrap');
  const viewer = document.getElementById('logViewer');
  if (!wrap) return;

  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    if (!me.isAdmin) {
      wrap.innerHTML = `<div class="card">Access restricted.</div>`;
      if (viewer) viewer.textContent = 'Restricted';
      return;
    }

    const logs = await apiCall('/api/logs', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card">
        <h3>Logs</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>File</th><th>Label</th><th>Action</th></tr></thead>
            <tbody>
              ${logs.map((log) => `
                <tr>
                  <td>${log.file}</td>
                  <td>${log.label}</td>
                  <td><button class="secondary inline" onclick="openLog('${log.file}')">Open</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:16px;">
        <h3>Path Viewer</h3>
        <div class="split">
          <div><label>log</label><input id="logPathInput" placeholder="auth.log" /></div>
          <div style="display:flex;align-items:end;gap:10px;flex-wrap:wrap;">
            <button onclick="viewLogPath()">Load</button>
            <button class="secondary" onclick="viewLogPath('/')">/</button>
            <button class="secondary" onclick="viewLogPath('../')">../</button>
            <button class="secondary" onclick="viewLogPath('../../')">../../</button>
          </div>
        </div>
      </div>
    `;

    const params = new URLSearchParams(location.search);
    const target = params.get('log') || 'auth.log';
    const data = await apiCall(`/api/logs/view?log=${encodeURIComponent(target)}`, 'GET', null, true);
    renderLogView(data);
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

function renderLogView(data) {
  const viewer = document.getElementById('logViewer');
  if (!viewer) return;
  if (data.mode === 'listing') {
    viewer.textContent = `${data.title}\n\n${data.entries.join('\n')}`;
  } else {
    viewer.textContent = data.content;
  }
}

async function viewLogPath(pathValue) {
  const pathInput = document.getElementById('logPathInput');
  const target = typeof pathValue === 'string' ? pathValue : pathInput.value.trim();
  try {
    const data = await apiCall(`/api/logs/view?log=${encodeURIComponent(target)}`, 'GET', null, true);
    renderLogView(data);
    const params = new URLSearchParams(location.search);
    params.set('log', target);
    history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
  } catch (e) {
    alert(e.message);
  }
}

function openLog(file) {
  viewLogPath(file);
}

async function loadAdmin() {
  const snippetWrap = document.getElementById('backendSnippet');
  const output = document.getElementById('secretOutput');
  if (!snippetWrap) return;

  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    if (!me.isAdmin) {
      snippetWrap.innerHTML = `<div class="card">Access restricted.</div>`;
      if (output) output.textContent = 'Restricted';
      return;
    }

    const snippet = await apiCall('/api/backend/snippet', 'GET', null, true);
    snippetWrap.innerHTML = `
      <div class="card">
        <h3>Backend Snapshot</h3>
        <p class="muted">Internal source snapshot used by the platform diagnostics team.</p>
        <pre>${snippet.snippet}</pre>
      </div>
      <div class="card" style="margin-top:16px;">
        <h3>Secret Endpoint</h3>
        <label>file</label>
        <input id="secretInput" placeholder="ls;" />
        <div style="margin-top:12px;"><button onclick="runSecret()">Run</button></div>
      </div>
    `;
  } catch (e) {
    snippetWrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function runSecret() {
  const input = document.getElementById('secretInput').value.trim();
  const output = document.getElementById('secretOutput');
  try {
    const result = await apiCall(`/api/secret?file=${encodeURIComponent(input)}`, 'GET', null, true);
    if (output) output.textContent = result.output;
  } catch (e) {
    if (output) output.textContent = e.message;
  }
}

async function loadProfile() {
  const wrap = document.getElementById('profileWrap');
  if (!wrap) return;
  try {
    const profile = await apiCall('/api/profile', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card">
        <h3>Profile</h3>
        <div class="split">
          <div><label>Name</label><input id="profileName" value="${profile.name}" /></div>
          <div><label>Email</label><input id="profileEmail" value="${profile.email}" readonly /></div>
        </div>
        <div style="margin-top:12px;"><button onclick="updateProfile()">Save</button></div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function updateProfile() {
  const name = document.getElementById('profileName').value.trim();
  try {
    await apiCall('/api/profile', 'POST', { name }, true);
    refreshNav();
  } catch (e) {
    alert(e.message);
  }
}

async function loadSettings() {
  const wrap = document.getElementById('settingsWrap');
  if (!wrap) return;
  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card">
        <h3>Settings</h3>
        <p class="muted">Tenant preferences and access profile.</p>
        <p><strong>Account:</strong> ${me.username}</p>
        <p><strong>Role:</strong> ${me.role}</p>
        <p><strong>Org:</strong> ${me.orgName || 'None'}</p>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
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
  if (out) out.textContent = 'Challenge started.';
  saveLabState();
  startLiveTimerIfNeeded();
  updateLabUI();
}

async function syncChallenge() {
  if (!token()) return;
  try {
    const status = await apiCall('/api/challenge/status', 'GET', null, true);
    const oldT1 = labState.tasks.t1;
    const oldT2 = labState.tasks.t2;
    labState.tasks.t1 = !!status.task1;
    labState.tasks.t2 = !!status.task2;
    if (labState.tasks.t1 && !oldT1) labState.score += 120;
    if (labState.tasks.t2 && !oldT2) labState.score += 160;
    saveLabState();
    updateLabUI();
  } catch (e) {
    // silent
  }
}

async function submitFlag() {
  if (!labState.started) {
    alert('Start first.');
    return;
  }
  const flag = document.getElementById('flagInput').value.trim();
  if (!flag) {
    alert('Enter the flag.');
    return;
  }

  try {
    const resp = await apiCall('/api/challenge/submit-flag', 'POST', { flag }, true);
    if (resp.success) {
      labState.flagSubmitted = true;
      labState.tasks.t2 = true;
      labState.score += 160;
      saveLabState();
      updateLabUI();
      finishLabAttempt();
    }
  } catch (e) {
    alert(e.message);
  }
}

function finishLabAttempt() {
  if (!(labState.tasks.t1 && labState.tasks.t2)) {
    alert('Complete all objectives first.');
    return;
  }
  if (labState.finalized) return;

  clearInterval(labState.timerId);
  labState.started = false;
  labState.endsAt = null;
  const timeBonus = Math.max(0, Math.floor(labState.timerSeconds / 60) * 10);
  const finalScore = Math.max(0, labState.score + timeBonus);
  labState.score = finalScore;
  labState.finalized = true;
  saveLabState();
  updateLabUI();

  const result = document.getElementById('finalResult');
  if (result) {
    result.classList.remove('hidden');
    result.textContent = [
      'LAB COMPLETE',
      `Task Bonus: ${labState.score - timeBonus}`,
      `Time Bonus: +${timeBonus}`,
      `Final Score: ${finalScore}`,
      '',
      'Automatic reset in 3 seconds.'
    ].join('\n');
  }

  setTimeout(async () => {
    await fullResetLab(true);
    location.href = 'login.html';
  }, 3000);
}

async function fullResetLab(silent = false) {
  try {
    await apiCall('/api/reset', 'POST');
  } catch (e) {
    // ignore
  }

  clearToken();
  localStorage.removeItem(LAB_STATE_KEY);
  clearInterval(labState.timerId);
  labState = defaultLabState();
  const input = document.getElementById('flagInput');
  if (input) input.value = '';
  const result = document.getElementById('finalResult');
  if (result) {
    result.classList.add('hidden');
    result.textContent = '';
  }
  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'Reset complete.';
  updateLabUI();
  if (!silent) location.href = 'login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
  loadLabState();

  refreshNav();
  loadHome();
  loadDashboard();
  loadOrg();
  loadMembers();
  loadProjects();
  loadInvites();
  loadLogs();
  loadAdmin();
  loadProfile();
  loadSettings();
  syncChallenge();
  updateLabUI();
  if (labState.started) startLiveTimerIfNeeded();
});
