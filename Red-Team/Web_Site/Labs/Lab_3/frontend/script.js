const API_BASE = '';
const TOKEN_KEY = 'lab3_token';
const LAB_DURATION_SECONDS = 20 * 60;
const LAB_STATE_KEY = 'lab3_attempt_state';

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

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearStoredSession() {
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
  const adminLink = document.getElementById('adminNavLink');
  const userLabel = document.querySelectorAll('[data-user-label]');

  if (!token()) {
    if (authState) authState.textContent = 'Guest';
    if (adminLink) adminLink.classList.add('hidden');
    userLabel.forEach((node) => { node.textContent = 'Guest'; });
    return;
  }

  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    if (authState) authState.textContent = `${me.username} • ${me.orgName}`;
    if (adminLink) {
      if (me.isAdmin) adminLink.classList.remove('hidden');
      else adminLink.classList.add('hidden');
    }
    userLabel.forEach((node) => { node.textContent = me.username; });
  } catch (e) {
    clearStoredSession();
    if (authState) authState.textContent = 'Guest';
    if (adminLink) adminLink.classList.add('hidden');
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
  clearStoredSession();
  location.href = 'login.html';
}

async function loadDashboard() {
  const wrap = document.getElementById('dashboardWrap');
  if (!wrap) return;

  try {
    const [me, org] = await Promise.all([
      apiCall('/api/me', 'GET', null, true),
      apiCall('/api/orgs/current', 'GET', null, true)
    ]);

    wrap.innerHTML = `
      <div class="card notice">
        <h3>Subscription Notice</h3>
        <p>${org.plan_notice}</p>
      </div>
      <div class="grid">
        <div class="card"><p class="muted">Organization</p><p class="stat">${org.display_name}</p></div>
        <div class="card"><p class="muted">Projects</p><p class="stat">${org.projects.length}</p></div>
        <div class="card"><p class="muted">Plan</p><p class="stat">${org.plan}</p></div>
        <div class="card"><p class="muted">Trial Days Left</p><p class="stat">${org.trial_days_left === null ? 'N/A' : org.trial_days_left}</p></div>
      </div>
      <div class="card">
        <h3>Workspace Summary</h3>
        <p><strong>User:</strong> ${me.name}</p>
        <p><strong>Email:</strong> ${me.email}</p>
        <p><strong>Admin Panel:</strong> ${me.isAdmin ? 'Available' : 'Restricted'}</p>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function loadProfile() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  try {
    const profile = await apiCall('/api/profile', 'GET', null, true);
    document.getElementById('profileName').value = profile.name;
    document.getElementById('profileEmail').value = profile.email;
  } catch (e) {
    form.innerHTML = `<p>${e.message}</p>`;
  }
}

async function updateProfile() {
  const name = document.getElementById('profileName').value.trim();
  try {
    const result = await apiCall('/api/profile', 'POST', { name }, true);
    alert(result.isAdmin ? 'Profile updated. New access available.' : 'Profile updated.');
    await refreshNav();
    loadProfile();
  } catch (e) {
    alert(e.message);
  }
}

async function loadOrg() {
  const wrap = document.getElementById('orgWrap');
  if (!wrap) return;
  try {
    const org = await apiCall('/api/orgs/current', 'GET', null, true);
    wrap.innerHTML = `
      <div class="card">
        <h3>${org.display_name}</h3>
        <p class="muted">Owner-controlled workspace with members and project settings.</p>
        <p><strong>Current plan:</strong> ${org.plan}</p>
        <p><strong>Visible org name:</strong> ${org.display_name}</p>
      </div>
      <div class="card">
        <h3>Members</h3>
        <ul class="list-clean">${org.members.map((member) => `<li>${member.username} • ${member.role}</li>`).join('')}</ul>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function renameOrg() {
  const name = document.getElementById('orgNameInput').value;
  try {
    const result = await apiCall('/api/orgs/current/rename', 'POST', { name }, true);
    alert(`Organization updated: ${result.displayName}`);
    loadOrg();
    refreshNav();
  } catch (e) {
    alert(e.message);
  }
}

async function loadProjects() {
  const wrap = document.getElementById('projectsWrap');
  const helperInfo = document.getElementById('projectHelperInfo');
  if (!wrap) return;

  try {
    const org = await apiCall('/api/orgs/current', 'GET', null, true);
    wrap.innerHTML = org.projects.map((project) => `
      <div class="card">
        <h3>${project.name}</h3>
        <p class="muted">${project.summary}</p>
      </div>
    `).join('') || '<div class="card">No projects found.</div>';

    if (helperInfo) {
      helperInfo.textContent = `Create requests from this page include sourceTrialOrgId=${org.id}.`;
    }
  } catch (e) {
    wrap.innerHTML = `<div class="card">${e.message}</div>`;
  }
}

async function createProject() {
  try {
    const org = await apiCall('/api/orgs/current', 'GET', null, true);
    const name = document.getElementById('projectName').value.trim();
    const summary = document.getElementById('projectSummary').value.trim();
    await apiCall(`/api/orgs/${org.id}/projects`, 'POST', {
      name,
      summary,
      sourceTrialOrgId: org.id
    }, true);
    alert('Project created.');
    document.getElementById('projectName').value = '';
    document.getElementById('projectSummary').value = '';
    loadProjects();
    loadDashboard();
  } catch (e) {
    alert(e.message);
  }
}

async function loadPricing() {
  const wrap = document.getElementById('pricingWrap');
  if (!wrap) return;
  const data = await apiCall('/api/pricing');
  wrap.innerHTML = data.plans.map((plan) => `
    <div class="card ${plan.name === 'Enterprise' ? 'success-box' : ''}">
      <h3>${plan.name}</h3>
      <p class="stat">${plan.price}</p>
      <p class="muted">Project allowance: ${plan.projects}</p>
    </div>
  `).join('');
}

async function loadAdminPanel() {
  const filesWrap = document.getElementById('adminFilesWrap');
  const fileContent = document.getElementById('adminFileContent');
  if (!filesWrap) return;

  try {
    const files = await apiCall('/api/admin/files', 'GET', null, true);
    filesWrap.innerHTML = files.map((file) => `
      <div class="file-item">
        <div>
          <strong>${file.label}</strong>
          <div class="muted">${file.name}</div>
        </div>
        <button class="inline secondary" onclick="openAdminFile('${file.name}')">Open</button>
      </div>
    `).join('');

    const params = new URLSearchParams(location.search);
    const targetFile = params.get('file');
    if (targetFile && fileContent) {
      const data = await apiCall(`/api/admin/file?file=${encodeURIComponent(targetFile)}`, 'GET', null, true);
      fileContent.textContent = data.content;
    }
  } catch (e) {
    filesWrap.innerHTML = `<div class="card">${e.message}</div>`;
    if (fileContent) fileContent.textContent = 'Forbidden';
  }
}

function openAdminFile(file) {
  location.href = `admin.html?file=${encodeURIComponent(file)}`;
}

function updateLabUI() {
  const timerEl = document.getElementById('labTimer');
  const scoreEl = document.getElementById('labScore');
  const hintsEl = document.getElementById('labHints');
  const progressEl = document.getElementById('labProgress');
  const taskStateEl = document.getElementById('taskState');
  const finishBtn = document.getElementById('finishBtn');

  const minutes = String(Math.floor(labState.timerSeconds / 60)).padStart(2, '0');
  const seconds = String(labState.timerSeconds % 60).padStart(2, '0');
  if (timerEl) timerEl.innerHTML = `<strong>${minutes}:${seconds}</strong>`;
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
  if (out) out.textContent = 'Attempt started. Complete the requested tasks and check progress.';
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
    1: 'Observe how displayed organization names are stored after update requests.',
    2: 'Compare who owns the target organization with what the request still carries from another account.',
    3: 'Restricted areas sometimes become visible only after profile state changes.'
  };

  if (labState.hintsLeft <= 0) {
    alert('No hints left.');
    return;
  }

  labState.hintsLeft -= 1;
  labState.score = Math.max(0, labState.score - 5);
  saveLabState();
  updateLabUI();
  alert(hints[taskNum] || 'Inspect the full request carefully.');
}

async function checkProgress() {
  const out = document.getElementById('challengeStatus');
  if (!out) return;
  if (!token()) {
    out.textContent = 'Login required. Use the provided credentials first.';
    return;
  }
  if (!labState.started) {
    out.textContent = 'Start Attempt first to unlock and track challenge progress.';
    return;
  }

  try {
    const status = await apiCall('/api/challenge/status', 'GET', null, true);
    const prev = { ...labState.tasks };
    labState.tasks.t1 = !!status.task1;
    labState.tasks.t2 = !!status.task2;
    labState.tasks.t3 = !!status.task3;

    if (labState.tasks.t1 && !prev.t1) labState.score += 120;
    if (labState.tasks.t2 && !prev.t2) labState.score += 120;
    if (labState.tasks.t3 && !prev.t3) labState.score += 160;
    saveLabState();

    out.textContent = [
      `Task 1 (rename org target): ${labState.tasks.t1 ? 'DONE' : 'PENDING'}`,
      `Task 2 (subscription bypass project creation): ${labState.tasks.t2 ? 'DONE' : 'PENDING'}`,
      `Task 3 (flag submission): ${labState.tasks.t3 ? 'DONE' : 'PENDING'}`,
      `Visible organization name: ${status.orgName}`,
      `Project count: ${status.projectCount}`
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

async function performResetState(message, clearTokenToo = true) {
  try {
    await apiCall('/api/reset', 'POST');
  } catch (e) {
    // Continue with local reset so attempt can restart cleanly.
  }

  clearInterval(labState.timerId);
  localStorage.removeItem(LAB_STATE_KEY);
  labState = defaultLabState();

  if (clearTokenToo) clearStoredSession();

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
    alert('You must complete all 3 tasks before finishing.');
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
      'Automatic reset will run in 4 seconds.'
    ].join('\n');
  }

  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'All tasks complete. Resetting lab for a fresh run.';

  setTimeout(async () => {
    await performResetState('Lab reset complete. Login again to start a fresh attempt.', true);
    alert('Lab 3 reset automatically after completion.');
    location.href = 'login.html';
  }, 4000);
}

async function fullResetLab() {
  await performResetState('Everything reset. Login again to start a new attempt.', true);
  alert('Lab 3 reset complete.');
  location.href = 'login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
  loadLabState();
  syncTimerFromClock();
  startLiveTimerIfNeeded();
  await refreshNav();
  loadDashboard();
  loadProfile();
  loadOrg();
  loadProjects();
  loadPricing();
  loadAdminPanel();
  updateLabUI();
});
