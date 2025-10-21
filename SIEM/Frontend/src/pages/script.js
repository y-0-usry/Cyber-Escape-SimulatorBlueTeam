const levelSelector = document.getElementById('level-selector');
const alertsContainer = document.getElementById('alerts-container');
const evidenceList = document.getElementById('evidence-list');
const modal = document.getElementById('modal');
const logDetails = document.getElementById('log-details');
const closeModal = document.getElementById('close-modal');

let allAlerts = [];
let evidence = [];

let alertTimeFilter = 'all';
let alertSeverityFilter = 'all';
let evidenceTimeFilter = 'all';
let evidenceSeverityFilter = 'all';

levelSelector.addEventListener('change', () => {
  loadAlerts(levelSelector.value);
});

closeModal.addEventListener('click', () => {
  modal.classList.add('hidden');
});

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getSeverityColor(sev) {
  switch (sev.toLowerCase()) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-green-400';
    default: return 'text-white';
  }
}

function showLog(alert) {
  logDetails.textContent = JSON.stringify(alert.linked_log, null, 2);
  modal.classList.remove('hidden');
}

function createCard(alert, isEvidence = false) {
  const card = document.createElement('div');
  card.className = 'bg-gray-900 rounded-lg p-4 card';

  card.innerHTML = `
    <h3 class="text-lg font-bold text-blue-400 mb-2">
      ${isEvidence ? '<i class="fas fa-file-shield"></i>' : '<i class="fas fa-bolt"></i>'}
      ${alert.alert_id}
    </h3>
    <p class="text-sm text-blue-200"><i class="fas fa-clock"></i> ${formatTime(alert.timestamp)}</p>
    <p class="text-sm text-blue-200"><i class="fas fa-network-wired"></i> ${alert.source_ip} → ${alert.destination_ip}</p>
    <p class="text-sm ${getSeverityColor(alert.severity)} font-semibold mt-2">Severity: ${alert.severity}</p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded view-log"><i class="fas fa-eye"></i> View Log</button>
      ${!isEvidence
        ? `<button class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded add-evidence"><i class="fas fa-plus-circle"></i> Add</button>`
        : `<button class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded remove-evidence"><i class="fas fa-trash-alt"></i> Remove</button>`}
    </div>
  `;

  card.querySelector('.view-log').onclick = () => showLog(alert);

  if (!isEvidence) {
    card.querySelector('.add-evidence').onclick = (e) => {
      e.stopPropagation();
      if (!evidence.find(e => e.alert_id === alert.alert_id)) {
        evidence.push(alert);
        renderEvidence();
      }
    };
  } else {
    card.querySelector('.remove-evidence').onclick = (e) => {
      e.stopPropagation();
      evidence = evidence.filter(e => e.alert_id !== alert.alert_id);
      renderEvidence();
    };
  }

  return card;
}

function filterByTime(list, range) {
  if (range === 'all') return list;
  const now = new Date();
  const minutes = parseInt(range);
  return list.filter(alert => {
    const alertTime = new Date(alert.timestamp);
    return (now - alertTime) / 60000 <= minutes;
  });
}

function filterBySeverity(list, severity) {
  if (severity === 'all') return list;
  return list.filter(alert => alert.severity.toLowerCase() === severity);
}

function renderAlerts() {
  alertsContainer.innerHTML = '';
  let filtered = [...allAlerts];
  filtered = filterByTime(filtered, alertTimeFilter);
  filtered = filterBySeverity(filtered, alertSeverityFilter);
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  filtered.forEach(alert => {
    const card = createCard(alert);
    alertsContainer.appendChild(card);
  });
}

function renderEvidence() {
  evidenceList.innerHTML = '';
  let filtered = [...evidence];
  filtered = filterByTime(filtered, evidenceTimeFilter);
  filtered = filterBySeverity(filtered, evidenceSeverityFilter);
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  filtered.forEach(alert => {
    const card = createCard(alert, true);
    evidenceList.appendChild(card);
  });
}

async function loadAlerts(level) {
  alertsContainer.innerHTML = '';
  evidence = [];
  evidenceList.innerHTML = '';

  const path = `data/${level}/alerts.json`;

  try {
    const res = await fetch(path);
    const alerts = await res.json();
    allAlerts = alerts;
    renderAlerts();
  } catch (err) {
    alertsContainer.innerHTML = `<p class="text-red-500">Failed to load alerts for ${level}</p>`;
    console.error(err);
  }
}

// Select filters
document.getElementById('alert-time-filter').addEventListener('change', (e) => {
  alertTimeFilter = e.target.value;
  renderAlerts();
});

document.getElementById('alert-severity-filter').addEventListener('change', (e) => {
  alertSeverityFilter = e.target.value;
  renderAlerts();
});

document.getElementById('evidence-time-filter').addEventListener('change', (e) => {
  evidenceTimeFilter = e.target.value;
  renderEvidence();
});

document.getElementById('evidence-severity-filter').addEventListener('change', (e) => {
  evidenceSeverityFilter = e.target.value;
  renderEvidence();
});

// Load default level
loadAlerts(levelSelector.value);