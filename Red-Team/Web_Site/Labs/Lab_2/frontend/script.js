const API_BASE = '';
const LAB_DURATION_SECONDS = 20 * 60;
const LAB_STATE_KEY = 'lab2_attempt_state';

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
  return localStorage.getItem('lab2_token');
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

function setAuthUI() {
  const authState = document.getElementById('authState');
  if (!authState) return;
  authState.textContent = token() ? 'Logged In' : 'Guest';
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const data = await apiCall('/api/login', 'POST', { username, password });
    localStorage.setItem('lab2_token', data.token);
    alert('Login success');
    location.href = 'lab.html';
  } catch (e) {
    alert(e.message);
  }
}

function logout() {
  localStorage.removeItem('lab2_token');
  location.href = 'index.html';
}

async function loadProducts() {
  const wrap = document.getElementById('productsWrap');
  if (!wrap) return;
  const products = await apiCall('/api/products');
  wrap.innerHTML = products.map(p => `
    <div class="card">
      <div class="badge">${p.category}</div>
      <h3>${p.name}</h3>
      <p class="small">${p.description}</p>
      <p><strong>$${p.price}</strong></p>
      <button onclick="addToCart(${p.id})">Add to Cart</button>
      <button class="secondary" onclick="openCheckout(${p.id})">Buy Now</button>
    </div>
  `).join('');
}

async function addToCart(productId) {
  try {
    await apiCall('/api/cart/add', 'POST', { productId, qty: 1 }, true);
    alert('Added to cart');
  } catch (e) {
    alert(e.message);
  }
}

function openCheckout(productId) {
  location.href = `checkout.html?productId=${productId}`;
}

async function runCategorySearch() {
  const category = document.getElementById('categoryInput').value;
  const out = document.getElementById('categoryOutput');
  try {
    const data = await apiCall('/api/category/search', 'POST', { category });
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (!rows.length) {
      out.innerHTML = '<p class="small">No products found for this category.</p>';
      return;
    }

    out.innerHTML = rows.map((r) => {
      if (r.name && r.price !== undefined) {
        return `<div class="card"><p><strong>${r.name}</strong></p><p class="small">$${r.price}</p></div>`;
      }
      return '<div class="card"><p class="small">Result item loaded.</p></div>';
    }).join('');
  } catch (e) {
    out.innerHTML = `<p class="small">${e.message}</p>`;
  }
}

async function loadProfile() {
  const profile = document.getElementById('profileData');
  if (!profile) return;
  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    profile.innerHTML = `
      <p><strong>User:</strong> ${me.username}</p>
      <p><strong>Account ID:</strong> ${me.accountId}</p>
      <p><strong>Balance:</strong> $${me.balance}</p>
    `;
  } catch (e) {
    profile.innerHTML = `<p>${e.message}</p>`;
  }
}

async function loadOrders() {
  const ordersWrap = document.getElementById('ordersWrap');
  if (!ordersWrap) return;
  try {
    const orders = await apiCall('/api/orders', 'GET', null, true);
    if (!orders.length) {
      ordersWrap.innerHTML = '<p>No orders yet.</p>';
      return;
    }
    ordersWrap.innerHTML = orders.map(o => `
      <div class="card">
        <p><strong>Order #${o.id}</strong></p>
        <p>Product ID: ${o.productId}</p>
        <p>Price: $${o.price}</p>
        <p>Charged Account: ${o.charged_account_id === null ? 'N/A (bypass)' : o.charged_account_id}</p>
        <p>Bypass: ${o.payment_bypass ? 'YES' : 'NO'}</p>
      </div>
    `).join('');
  } catch (e) {
    ordersWrap.innerHTML = `<p>${e.message}</p>`;
  }
}

async function loadCheckout() {
  const box = document.getElementById('checkoutBox');
  if (!box) return;

  const params = new URLSearchParams(location.search);
  const productId = Number(params.get('productId') || 777);

  try {
    const preview = await apiCall('/api/checkout/preview', 'POST', { productId }, true);
    box.innerHTML = `
      <p><strong>Product ID:</strong> ${preview.productId}</p>
      <p><strong>Total:</strong> $${preview.price}</p>
      <p class="small">Review your order and complete payment.</p>
      <input id="checkoutPurchased" type="hidden" value="false" />
      <input id="checkoutAccountId" type="hidden" value="${preview.accountId}" />
      <button onclick="completeCheckout(${preview.productId})">Complete Checkout</button>
    `;
  } catch (e) {
    box.innerHTML = `<p>${e.message}</p>`;
  }
}

async function completeCheckout(productId) {
  const purchased = document.getElementById('checkoutPurchased').value === 'true';
  const accountId = Number(document.getElementById('checkoutAccountId').value);

  try {
    const data = await apiCall('/api/checkout/complete', 'POST', { productId, purchased, accountId }, true);
    alert(`Order success. ID: ${data.orderId}`);
  } catch (e) {
    alert(e.message);
  }
}

async function challengeStatus() {
  return checkProgress();
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
  if (out) out.textContent = 'Attempt started. Solve tasks then press Check Progress.';
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
    1: 'Inspect category search behavior and compare different responses.',
    2: 'Observe the checkout request/response flow carefully.',
    3: 'Inspect account-related identifiers during checkout requests.'
  };

  if (labState.hintsLeft <= 0) {
    alert('No hints left.');
    return;
  }

  labState.hintsLeft -= 1;
  labState.score = Math.max(0, labState.score - 5);
  saveLabState();
  updateLabUI();
  alert(hints[taskNum] || 'Keep investigating request flow.');
}

async function checkProgress() {
  const out = document.getElementById('challengeStatus');
  if (!out) return;
  if (!token()) {
    out.textContent = 'Login required: please login first with challenge credentials.';
    return;
  }
  if (!labState.started) {
    out.textContent = 'Start Attempt first to unlock and track challenge progress.';
    return;
  }

  try {
    const status = await apiCall('/api/challenge/status', 'GET', null, true);

    const oldT2 = labState.tasks.t2;
    const oldT3 = labState.tasks.t3;

    labState.tasks.t2 = !!status.task2;
    labState.tasks.t3 = !!status.task3;

    if (labState.tasks.t2 && !oldT2) labState.score += 120;
    if (labState.tasks.t3 && !oldT3) labState.score += 120;
    saveLabState();

    out.textContent = [
      `Task 2 (buy without paying): ${labState.tasks.t2 ? 'DONE' : 'PENDING'}`,
      `Task 3 (buy without charging your account): ${labState.tasks.t3 ? 'DONE' : 'PENDING'}`,
      `Orders found: ${status.ordersCount}`,
      `Account #10 balance: ${status.account10Balance}`
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
      if (!labState.tasks.t1) labState.score += 160;
      labState.tasks.t1 = true;
      saveLabState();
      updateLabUI();

      const done = [labState.tasks.t1, labState.tasks.t2, labState.tasks.t3].filter(Boolean).length;
      if (done === 3) {
        alert('Correct FLAG! All tasks are complete. Press Finish to view final score.');
      } else {
        alert('Correct FLAG! Task 1 completed.');
      }
    }
  } catch (e) {
    alert(e.message);
  }
}

function finishLabAttempt() {
  const done = [labState.tasks.t1, labState.tasks.t2, labState.tasks.t3].filter(Boolean).length;
  if (done < 3) {
    alert('You must complete all 3 tasks before finishing.');
    return;
  }
  if (labState.finalized) return;

  clearInterval(labState.timerId);
  labState.started = false;
  labState.endsAt = null;

  const task1Points = labState.tasks.t1 ? 160 : 0;
  const task2Points = labState.tasks.t2 ? 120 : 0;
  const task3Points = labState.tasks.t3 ? 120 : 0;
  const hintPenalty = (3 - labState.hintsLeft) * 5;
  const baseScore = task1Points + task2Points + task3Points - hintPenalty;
  const timeBonus = Math.max(0, Math.floor(labState.timerSeconds / 60) * 10);
  const finalScore = Math.max(0, baseScore + timeBonus);

  labState.score = finalScore;
  labState.finalized = true;
  saveLabState();
  updateLabUI();

  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'Attempt finished successfully.';

  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.classList.remove('hidden');
    finalResult.textContent = [
      'LAB COMPLETE',
      `Task Bonus: ${task1Points + task2Points + task3Points}`,
      `Hint Penalty: -${hintPenalty}`,
      `Time Bonus: +${timeBonus}`,
      `Final Score: ${finalScore}`,
      'Automatic reset will run in 4 seconds.'
    ].join('\n');
  }

  setTimeout(async () => {
    await fullResetLab(true);
    alert('Lab 2 reset automatically after completion. Login again to start a fresh attempt.');
    location.href = 'login.html';
  }, 4000);
}

async function fullResetLab(silent = false) {
  try {
    await apiCall('/api/reset', 'POST');
  } catch (e) {
    // Keep going to reset local attempt state even if backend reset fails.
  }

  localStorage.removeItem('lab2_token');
  localStorage.removeItem(LAB_STATE_KEY);

  clearInterval(labState.timerId);
  labState = defaultLabState();
  const out = document.getElementById('challengeStatus');
  if (out) out.textContent = 'Everything reset. Start a new attempt.';
  const flagInput = document.getElementById('flagInput');
  if (flagInput) flagInput.value = '';
  const finalResult = document.getElementById('finalResult');
  if (finalResult) {
    finalResult.classList.add('hidden');
    finalResult.textContent = '';
  }
  updateLabUI();
  if (!silent) {
    alert('Lab state reset complete. Login again to start a fresh attempt.');
    location.href = 'login.html';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadLabState();
  syncTimerFromClock();
  startLiveTimerIfNeeded();
  setAuthUI();
  loadProducts();
  loadProfile();
  loadOrders();
  loadCheckout();
  updateLabUI();
});
