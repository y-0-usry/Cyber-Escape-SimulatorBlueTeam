const API_BASE = '';
const TOKEN_KEY = 'lab5_token';
const LAB_STATE_KEY = 'lab5_attempt_state';
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
    flagSubmitted: false,
    finalized: false
  };
}

let labState = defaultLabState();

function token() {
  return localStorage.getItem(TOKEN_KEY);
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

function updateLabUI() {
  const timerEl = document.getElementById('labTimer');
  const scoreEl = document.getElementById('labScore');
  const hintsEl = document.getElementById('labHints');
  const progressEl = document.getElementById('labProgress');

  const m = String(Math.floor(labState.timerSeconds / 60)).padStart(2, '0');
  const s = String(labState.timerSeconds % 60).padStart(2, '0');
  if (timerEl) timerEl.textContent = `${m}:${s}`;
  if (scoreEl) scoreEl.textContent = String(labState.score);
  if (hintsEl) hintsEl.textContent = String(labState.hintsLeft);
  if (progressEl) progressEl.textContent = labState.flagSubmitted ? '✓ Found' : 'Searching...';

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
  if (out) out.textContent = 'Attempt started. Find the flag!';

  saveLabState();
  startLiveTimerIfNeeded();
  updateLabUI();
}

function useLabHint(taskNum) {
  const hints = {
    1: 'Explore all pages and check what items are available in the shop.',
    2: 'Some items are more valuable than others. Look for special items.',
    3: 'The FLAG might be hiding where you least expect it. Keep exploring.'
  };

  if (labState.hintsLeft <= 0) {
    alert('No hints left.');
    return;
  }

  labState.hintsLeft -= 1;
  labState.score = Math.max(0, labState.score - 5);
  saveLabState();
  updateLabUI();
  alert(hints[taskNum] || 'Keep exploring the platform.');
}

async function submitFlag() {
  if (!labState.started) {
    alert('Start Attempt first.');
    return;
  }
  if (!token()) {
    alert('Login required.');
    return;
  }

  const flag = document.getElementById('flagInput')?.value?.trim();
  if (!flag) {
    alert('Enter the flag.');
    return;
  }

  try {
    const resp = await apiCall('/api/challenge/submit-flag', 'POST', { flag }, true);
    if (resp.success) {
      labState.flagSubmitted = true;
      labState.score += 500;
      saveLabState();
      updateLabUI();
      alert('🎉 Correct FLAG!');
      
      setTimeout(() => {
        finishLabAttempt();
      }, 500);
    } else {
      alert('Wrong flag. Keep searching!');
    }
  } catch (e) {
    alert(e.message);
  }
}

function finishLabAttempt() {
  if (!labState.flagSubmitted) {
    alert('You must submit the correct FLAG first.');
    return;
  }
  if (labState.finalized) return;

  clearInterval(labState.timerId);
  labState.started = false;
  labState.endsAt = null;

  const hintPenalty = (3 - labState.hintsLeft) * 5;
  const timeBonus = Math.max(0, Math.floor(labState.timerSeconds / 60) * 10);
  const finalScore = Math.max(0, 500 - hintPenalty + timeBonus);

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
      '✓ LAB COMPLETE',
      `Base Score: 500`,
      `Hint Penalty: -${hintPenalty}`,
      `Time Bonus: +${timeBonus}`,
      `Final Score: ${finalScore}`,
      '',
      'Automatic reset in 3 seconds.'
    ].join('\n');
  }

  setTimeout(async () => {
    await fullResetLab(true);
    alert('Lab 5 reset. Login again to start a fresh attempt.');
    location.href = 'login.html';
  }, 3000);
}

async function fullResetLab(silent = false) {
  try {
    await apiCall('/api/reset', 'POST');
  } catch (e) {
    // Keep going to reset local state
  }

  localStorage.removeItem(TOKEN_KEY);
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

function setAuthUI() {
  const authState = document.getElementById('authState');
  if (!authState) return;
  authState.textContent = token() ? 'Logged In' : 'Guest';
}

async function login() {
  const username = document.getElementById('username')?.value?.trim();
  const password = document.getElementById('password')?.value;
  try {
    const data = await apiCall('/api/login', 'POST', { username, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    alert('Login success');
    location.href = 'lab.html';
  } catch (e) {
    alert(e.message);
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  location.href = 'index.html';
}

async function loadProducts() {
  const wrap = document.getElementById('productsWrap');
  if (!wrap) return;

  try {
    const products = await apiCall('/api/products', 'GET');
    wrap.innerHTML = products.map((p) => `
      <div class="card">
        <div class="badge">${p.category}</div>
        <h3>${p.name}</h3>
        <p class="small">${p.description}</p>
        <p><strong>$${p.price}</strong></p>
        <button onclick="openCheckout(${p.id})">Buy</button>
      </div>
    `).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="card"><p>${e.message}</p></div>`;
  }
}

function openCheckout(productId) {
  location.href = `checkout.html?productId=${productId}`;
}

async function loadProfile() {
  const profile = document.getElementById('profileData');
  if (!profile) return;

  if (!token()) {
    profile.innerHTML = '<p>Please login first.</p>';
    return;
  }

  try {
    const me = await apiCall('/api/me', 'GET', null, true);
    profile.innerHTML = `
      <p><strong>User:</strong> ${me.username}</p>
      <p><strong>Wallet Balance:</strong> $${me.balance}</p>
    `;
  } catch (e) {
    profile.innerHTML = `<p>${e.message}</p>`;
  }
}

async function loadCheckout() {
  const box = document.getElementById('checkoutBox');
  if (!box) return;

  if (!token()) {
    box.innerHTML = '<p>Please login first to continue checkout.</p>';
    return;
  }

  const params = new URLSearchParams(location.search);
  const productId = Number(params.get('productId') || 101);

  try {
    const product = await apiCall(`/api/products/${productId}`, 'GET');
    const me = await apiCall('/api/me', 'GET', null, true);

    box.innerHTML = `
      <div class="card">
        <p><strong>Product:</strong> ${product.name}</p>
        <p><strong>List Price:</strong> $${product.price}</p>
        <p><strong>Current Balance:</strong> <span id="checkoutBalance">$${me.balance}</span></p>
      </div>

      <label>Coupon Code (optional)</label>
      <input id="couponCode" placeholder="Enter promo code" />
      <button class="secondary" onclick="previewOrder(${product.id})">Preview Total</button>
      <div id="previewBox" class="code">No preview yet.</div>

      <button class="success" onclick="purchaseOrder(${product.id})">Place Order</button>
    `;
  } catch (e) {
    box.innerHTML = `<p>${e.message}</p>`;
  }
}

async function previewOrder(productId) {
  const previewBox = document.getElementById('previewBox');
  const couponCode = (document.getElementById('couponCode')?.value || '').trim();

  try {
    const data = await apiCall('/api/checkout/preview', 'POST', { productId, couponCode }, true);
    previewBox.textContent = [
      `Product: ${data.productName}`,
      `Original Price: $${data.originalPrice}`,
      `Payable Amount: $${data.paidAmount}`,
      `Coupon: ${data.couponCode || 'none'}`,
      `Coupon Uses Left: ${data.couponUsesLeft === null ? '-' : data.couponUsesLeft}`,
      `Your Balance: $${data.balance}`
    ].join('\n');
  } catch (e) {
    previewBox.textContent = e.message;
  }
}

async function purchaseOrder(productId) {
  const couponCode = (document.getElementById('couponCode')?.value || '').trim();
  try {
    const resp = await apiCall('/api/orders/purchase', 'POST', { productId, couponCode }, true);
    alert(`Order placed successfully. Order ID: ${resp.orderId}`);
    location.href = 'orders.html';
  } catch (e) {
    alert(e.message);
  }
}

async function requestRefund(orderId) {
  try {
    const resp = await apiCall(`/api/orders/${orderId}/return`, 'POST', {}, true);
    alert(`Refund completed. Refunded: $${resp.refundAmount}`);
    await loadOrders();
  } catch (e) {
    alert(e.message);
  }
}

async function viewOrderDetails(orderId) {
  const detailsWrap = document.getElementById('orderDetailsWrap');
  if (!detailsWrap) return;

  try {
    const data = await apiCall(`/api/orders/${orderId}`, 'GET', null, true);
    const lines = [
      `Order #${data.id}`,
      `Product: ${data.productName} (#${data.productId})`,
      `Original Price: $${data.originalPrice}`,
      `Paid Amount: $${data.paidAmount}`,
      `Coupon: ${data.couponCode || 'none'}`,
      `Status: ${data.status}`,
      `Refunded: ${data.refunded ? 'YES' : 'NO'}`,
      `Refund Amount: $${data.refundAmount || 0}`,
      `Created At: ${data.created_at}`
    ];

    if (data.refunded_at) lines.push(`Refunded At: ${data.refunded_at}`);
    if (data.flag) lines.push(`FLAG: ${data.flag}`);

    detailsWrap.textContent = lines.join('\n');
  } catch (e) {
    detailsWrap.textContent = e.message;
  }
}

async function loadOrders() {
  const ordersWrap = document.getElementById('ordersWrap');
  if (!ordersWrap) return;

  if (!token()) {
    ordersWrap.innerHTML = '<p>Please login first.</p>';
    return;
  }

  try {
    const orders = await apiCall('/api/orders', 'GET', null, true);
    if (!orders.length) {
      ordersWrap.innerHTML = '<div class="card"><p>No orders yet.</p></div>';
      return;
    }

    ordersWrap.innerHTML = orders.map((o) => `
      <div class="card">
        <p><strong>Order #${o.id}</strong> - ${o.productName}</p>
        <p>Paid: $${o.paidAmount} | List: $${o.originalPrice}</p>
        <p>Status: ${o.status}</p>
        <button class="secondary" onclick="viewOrderDetails(${o.id})">View Details</button>
        ${o.refunded ? '' : `<button class="warn" onclick="requestRefund(${o.id})">Return / Refund</button>`}
      </div>
    `).join('');
  } catch (e) {
    ordersWrap.innerHTML = `<div class="card"><p>${e.message}</p></div>`;
  }
}

async function resetLab() {
  try {
    await apiCall('/api/reset', 'POST');
    localStorage.removeItem(TOKEN_KEY);
    alert('Lab 5 reset complete.');
    location.href = 'login.html';
  } catch (e) {
    alert(e.message);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadLabState();
  setAuthUI();
  loadProducts();
  loadCheckout();
  loadOrders();
  loadProfile();
  updateLabUI();
  if (labState.started) {
    startLiveTimerIfNeeded();
  }
});
