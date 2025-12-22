const levelSelector = document.getElementById('level-selector');
const alertsContainer = document.getElementById('alerts-container');
const linkedAlertsContainer = document.getElementById('linked-alerts-container');
const evidenceList = document.getElementById('evidence-list');
const modal = document.getElementById('modal');
const logDetails = document.getElementById('log-details');
const closeModal = document.getElementById('close-modal');
const timelineContainer = document.getElementById('evidence-timeline');
const actionsLog = document.getElementById('actions-log');
const investigationStatus = {
  triaged: document.getElementById('triaged-count'),
  evidence: document.getElementById('evidence-count'),
  notes: document.getElementById('notes-count'),
  linked: document.getElementById('linked-count')
};
const dashboardSummary = {
  total: document.getElementById('summary-total'),
  ips: document.getElementById('summary-ips'),
  severity: document.getElementById('summary-severity')
};

let allAlerts = [];
let evidence = [];
let linkedAlerts = [];
let actionHistory = [];

let alertTimeFilter = 'all';
let alertSeverityFilter = 'all';
let sortOrder = 'desc';
let alertIdFilter = '';
let ipFilter = '';
let destFilter = '';
let logFilter = '';
let daysFilter = '';
let dateFilter = '';

levelSelector.addEventListener('change', () => {
  logAction(`Switched to ${levelSelector.value}`);
  loadAlerts(levelSelector.value);
});

closeModal.addEventListener('click', () => {
  modal.classList.add('hidden');
});

document.getElementById('reset-session').addEventListener('click', () => {
  evidence = [];
  linkedAlerts = [];
  actionHistory = [];
  alertIdFilter = '';
  ipFilter = '';
  destFilter = '';
  logFilter = '';
  daysFilter = '';
  dateFilter = '';
  document.getElementById('alert-id-filter').value = '';
  document.getElementById('ip-filter').value = '';
  document.getElementById('dest-filter').value = '';
  document.getElementById('log-filter').value = '';
  document.getElementById('days-filter').value = '';
  document.getElementById('date-filter').value = '';
  renderAlerts();
  renderLinkedAlerts();
  renderEvidence();
  renderTimeline();
  renderActionsLog();
  updateInvestigationStatus();
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
  logAction(`Viewed log for ${alert.alert_id}`);
  updateLinkedCount();
}
function saveNote(id, text) {
  localStorage.setItem(`note-${id}`, text);
  updateNotesCount();
}

function getNote(id) {
  return localStorage.getItem(`note-${id}`) || '';
}

function createCard(alert, isEvidence = false, isLinked = false) {
  const card = document.createElement('div');
  card.className = 'bg-gray-900 rounded-lg p-4 card';

  const icon = isEvidence ? '<i class="fas fa-file-shield"></i>' : (isLinked ? '<i class="fas fa-link"></i>' : '<i class="fas fa-bolt"></i>');
  const borderColor = isLinked ? 'border-l-4 border-cyan-500' : '';

  card.innerHTML = `
    <h3 class="text-lg font-bold text-blue-400 mb-2 ${borderColor}">
      ${icon}
      ${alert.alert_id}
    </h3>
    <p class="text-sm text-blue-200"><i class="fas fa-clock"></i> ${formatTime(alert.timestamp)}</p>
    <p class="text-sm text-blue-200"><i class="fas fa-network-wired"></i> ${alert.source_ip} → ${alert.destination_ip}</p>
    <p class="text-sm ${getSeverityColor(alert.severity)} font-semibold mt-2">Severity: ${alert.severity}</p>
    <p class="text-sm text-gray-400 mt-1">Type: ${alert.alert_type}</p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded view-log"><i class="fas fa-eye"></i> View Log</button>
      <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded view-linked"><i class="fas fa-link"></i> Linked Alerts</button>
      ${!isEvidence && !isLinked
        ? `<button class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded add-evidence"><i class="fas fa-plus-circle"></i> Add to Evidence</button>`
        : isLinked 
        ? `<button class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded add-evidence"><i class="fas fa-plus-circle"></i> Add to Evidence</button>`
        : `<button class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded remove-evidence"><i class="fas fa-trash-alt"></i> Remove</button>`}
    </div>
    ${isEvidence ? `
      <textarea placeholder="Your notes..." class="w-full mt-3 p-2 bg-gray-800 text-white text-sm rounded resize-none" rows="2"
        oninput="saveNote('${alert.alert_id}', this.value)">${getNote(alert.alert_id)}</textarea>
    ` : ''}
  `;

  card.querySelector('.view-log').onclick = () => showLog(alert);
  card.querySelector('.view-linked').onclick = () => showLinkedAlerts(alert);

  if (!isEvidence) {
    card.querySelector('.add-evidence').onclick = (e) => {
      e.stopPropagation();
      if (!evidence.find(e => e.alert_id === alert.alert_id)) {
        evidence.push(alert);
        logAction(`Added ${alert.alert_id} to evidence`);
        renderEvidence();
        renderTimeline();
        updateEvidenceCount();
      }
    };
  } else {
    card.querySelector('.remove-evidence').onclick = (e) => {
      e.stopPropagation();
      evidence = evidence.filter(e => e.alert_id !== alert.alert_id);
      logAction(`Removed ${alert.alert_id} from evidence`);
      renderEvidence();
      renderTimeline();
      updateEvidenceCount();
    };
  }

  return card;
}

function renderTimeline() {
  timelineContainer.innerHTML = '';
  const sorted = [...evidence].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  sorted.forEach(item => {
    const note = getNote(item.alert_id);
    const div = document.createElement('div');
    div.className = 'bg-gray-900 p-4 rounded border-l-4 border-blue-500';
    div.innerHTML = `
      <p class="text-sm text-blue-300"><i class="fas fa-clock"></i> ${formatTime(item.timestamp)}</p>
      <p class="text-sm text-blue-200"><i class="fas fa-bolt"></i> ${item.alert_id}</p>
      <p class="text-sm text-green-300 italic">${note ? `"${note}"` : 'No note added.'}</p>
    `;
    timelineContainer.appendChild(div);
  });
}

function renderLinkedAlerts() {
  linkedAlertsContainer.innerHTML = '';
  if (linkedAlerts.length === 0) {
    linkedAlertsContainer.innerHTML = '<p class="text-gray-400 col-span-3">No linked alerts. Click "Linked Alerts" button on any alert to see related alerts.</p>';
    return;
  }
  linkedAlerts.forEach(alert => {
    linkedAlertsContainer.appendChild(createCard(alert, false, true));
  });
}

document.getElementById('view-notes').addEventListener('click', () => {
  const notes = evidence.map(e => ({
    id: e.alert_id,
    note: getNote(e.alert_id)
  })).filter(n => n.note);
  if (notes.length === 0) {
    alert('No notes added yet.');
    return;
  }
  const summary = notes.map(n => `• ${n.id}: ${n.note}`).join('\n');
  alert(`🧠 Analyst Notes:\n\n${summary}`);
});
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

function filterByAlertId(list, alertId) {
  if (!alertId) return list;
  return list.filter(alert => alert.alert_id.toLowerCase().includes(alertId.toLowerCase()));
}

function filterByIP(list, ip) {
  if (!ip) return list;
  return list.filter(alert => alert.source_ip.includes(ip));
}

function filterByDestIP(list, ip) {
  if (!ip) return list;
  return list.filter(alert => alert.destination_ip.includes(ip));
}

function filterByLogContent(list, keyword) {
  if (!keyword) return list;
  return list.filter(alert => JSON.stringify(alert.linked_log).toLowerCase().includes(keyword));
}

function filterByDays(list, days) {
  if (!days) return list;
  const now = new Date();
  return list.filter(a => (now - new Date(a.timestamp)) / (1000 * 60 * 60 * 24) <= days);
}

function filterByExactDate(list, dateStr) {
  if (!dateStr) return list;
  return list.filter(a => new Date(a.timestamp).toDateString() === new Date(dateStr).toDateString());
}

function sortByTimestamp(list, order) {
  return list.sort((a, b) => {
    const t1 = new Date(a.timestamp);
    const t2 = new Date(b.timestamp);
    return order === 'asc' ? t1 - t2 : t2 - t1;
  });
}

function showLinkedAlerts(selectedAlert) {
  const related = allAlerts.filter(a =>
    (a.source_ip === selectedAlert.source_ip ||
    a.destination_ip === selectedAlert.destination_ip) &&
    a.alert_id !== selectedAlert.alert_id
  );
  
  linkedAlerts = related;
  renderLinkedAlerts();
  
  logAction(`Viewed ${related.length} linked alerts for ${selectedAlert.alert_id}`);
  updateLinkedCount();
  
  // Scroll to linked alerts section
  document.getElementById('linked-alerts-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function updateThreatSummary(list) {
  const high = list.filter(a => a.severity.toLowerCase() === 'high').length;
  const medium = list.filter(a => a.severity.toLowerCase() === 'medium').length;
  const low = list.filter(a => a.severity.toLowerCase() === 'low').length;
  document.getElementById('count-high').textContent = high;
  document.getElementById('count-medium').textContent = medium;
  document.getElementById('count-low').textContent = low;
  document.getElementById('count-total').textContent = list.length;
}

function renderSeverityChart(list) {
  const ctx = document.getElementById('severityChart').getContext('2d');
  const high = list.filter(a => a.severity.toLowerCase() === 'high').length;
  const medium = list.filter(a => a.severity.toLowerCase() === 'medium').length;
  const low = list.filter(a => a.severity.toLowerCase() === 'low').length;

  if (window.severityChartInstance) {
    window.severityChartInstance.destroy();
  }

  window.severityChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [high, medium, low],
        backgroundColor: ['#f87171', '#facc15', '#4ade80']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderAlerts() {
  alertsContainer.innerHTML = '';
  let filtered = [...allAlerts];
  filtered = filterByTime(filtered, alertTimeFilter);
  filtered = filterBySeverity(filtered, alertSeverityFilter);
  filtered = filterByAlertId(filtered, alertIdFilter);
  filtered = filterByIP(filtered, ipFilter);
  filtered = filterByDestIP(filtered, destFilter);
  filtered = filterByLogContent(filtered, logFilter);
  filtered = filterByDays(filtered, daysFilter);
  filtered = filterByExactDate(filtered, dateFilter);
  filtered = sortByTimestamp(filtered, sortOrder);
  updateThreatSummary(filtered);
  renderSeverityChart(filtered);
  updateDashboardSummary(filtered);
  updateTriagedCount(filtered.length);
  filtered.forEach(alert => {
    const card = createCard(alert);
    alertsContainer.appendChild(card);
  });
}

function renderEvidence() {
  evidenceList.innerHTML = '';
  let filtered = [...evidence];
  filtered = filterByTime(filtered, alertTimeFilter);
  filtered = filterBySeverity(filtered, alertSeverityFilter);
  filtered = filterByAlertId(filtered, alertIdFilter);
  filtered = filterByIP(filtered, ipFilter);
  filtered = filterByDestIP(filtered, destFilter);
  filtered = filterByLogContent(filtered, logFilter);
  filtered = filterByDays(filtered, daysFilter);
  filtered = filterByExactDate(filtered, dateFilter);
  filtered = sortByTimestamp(filtered, sortOrder);
  filtered.forEach(alert => {
    const card = createCard(alert, true);
    evidenceList.appendChild(card);
  });
}

document.getElementById('alert-time-filter').addEventListener('change', e => {
  alertTimeFilter = e.target.value;
  renderAlerts();
});

document.getElementById('alert-severity-filter').addEventListener('change', e => {
  alertSeverityFilter = e.target.value;
  renderAlerts();
});

document.getElementById('sort-order').addEventListener('change', e => {
  sortOrder = e.target.value;
  renderAlerts();
});

document.getElementById('alert-id-filter').addEventListener('input', e => {
  alertIdFilter = e.target.value.trim();
  renderAlerts();
});

document.getElementById('ip-filter').addEventListener('input', e => {
  ipFilter = e.target.value.trim();
  renderAlerts();
});

document.getElementById('dest-filter').addEventListener('input', e => {
  destFilter = e.target.value.trim();
  renderAlerts();
});

document.getElementById('log-filter').addEventListener('input', e => {
  logFilter = e.target.value.trim().toLowerCase();
  renderAlerts();
});

document.getElementById('days-filter').addEventListener('input', e => {
  daysFilter = e.target.value;
  renderAlerts();
});

document.getElementById('date-filter').addEventListener('change', e => {
  dateFilter = e.target.value;
  renderAlerts();
});

document.getElementById('export-evidence').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evidence.json';
  a.click();
  URL.revokeObjectURL(url);
  logAction('Exported evidence as JSON');
});

document.getElementById('export-linked').addEventListener('click', () => {
  if (linkedAlerts.length === 0) {
    window.alert('No linked alerts to export. Click "Linked Alerts" on any alert first.');
    return;
  }
  const blob = new Blob([JSON.stringify(linkedAlerts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'linked_alerts.json';
  a.click();
  URL.revokeObjectURL(url);
  logAction(`Exported ${linkedAlerts.length} linked alerts as JSON`);
});

function logAction(text) {
  const time = formatTime(new Date());
  actionHistory.push({ time, text });
  renderActionsLog();
}

function renderActionsLog() {
  actionsLog.innerHTML = '';
  actionHistory.slice(-10).reverse().forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `[${entry.time}] ${entry.text}`;
    actionsLog.appendChild(li);
  });
}

function updateTriagedCount(count) {
  investigationStatus.triaged.textContent = count;
}

function updateEvidenceCount() {
  investigationStatus.evidence.textContent = evidence.length;
}

function updateNotesCount() {
  const count = evidence.filter(e => getNote(e.alert_id).trim()).length;
  investigationStatus.notes.textContent = count;
}

function updateLinkedCount() {
  const current = parseInt(investigationStatus.linked.textContent);
  investigationStatus.linked.textContent = current + 1;
}

function updateDashboardSummary(list) {
  dashboardSummary.total.textContent = list.length;
  const uniqueIPs = new Set(list.map(a => a.source_ip));
  dashboardSummary.ips.textContent = uniqueIPs.size;
  const severityCount = { high: 0, medium: 0, low: 0 };
  list.forEach(a => severityCount[a.severity.toLowerCase()]++);
  const mostFrequent = Object.entries(severityCount).sort((a, b) => b[1] - a[1])[0];
  dashboardSummary.severity.textContent = mostFrequent ? mostFrequent[0] : 'N/A';
}

async function loadAlerts(level) {
  alertsContainer.innerHTML = '<p class="text-gray-400">Loading alerts...</p>';
  linkedAlertsContainer.innerHTML = '';
  evidence = [];
  linkedAlerts = [];
  evidenceList.innerHTML = '';
  timelineContainer.innerHTML = '';
  actionHistory = [];
  renderActionsLog();
  updateInvestigationStatus();

  const timestamp = new Date().getTime();
  const path = `data/${level}/alerts.json?t=${timestamp}`;

  try {
    const res = await fetch(path);
    const alerts = await res.json();
    allAlerts = alerts;
    renderAlerts();
    updateThreatSummary(alerts);
    updateDashboardSummary(alerts);
    renderSeverityChart(alerts);
    logAction(`Loaded ${alerts.length} alerts from ${level}`);
  } catch (err) {
    alertsContainer.innerHTML = `<p class="text-red-500">Failed to load alerts for ${level}. Error: ${err.message}</p>`;
    console.error(err);
  }
}

function updateInvestigationStatus() {
  updateTriagedCount(allAlerts.length);
  updateEvidenceCount();
  updateNotesCount();
  investigationStatus.linked.textContent = '0';
}

// Load default level
loadAlerts(levelSelector.value);