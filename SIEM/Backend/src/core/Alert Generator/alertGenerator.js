// Backend/src/core/Alert Generator/alertGenerator.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Generates a unique alert ID.
 */
function generateAlertId(log) {
  const hash = crypto.createHash('sha256');
  hash.update(log['@timestamp'] + log['log.original']);
  return hash.digest('hex').slice(0, 12); // Shortened for readability
}

/**
 * Generates alerts from normalized logs for a given level.
 * @param {string} level - e.g., "level1", "level2"
 */
async function generateAlerts(level) {
  const normalizedPath = path.join(__dirname, '../normalization/storage/normalized', level, 'all_normalized.json');
  const alertsPath = path.join(__dirname, 'storage', level, 'alerts.json');

  let logs = [];
  try {
    const raw = await fs.readFile(normalizedPath, 'utf8');
    logs = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read normalized logs for ${level}: ${err.message}`);
    return;
  }

  const alerts = logs.map(log => ({
    alert_id: generateAlertId(log),
    alert_type: 'malicious_activity',
    severity: 'high', // You can randomize this later
    timestamp: log['@timestamp'],
    source_ip: log['source.ip'] || 'unknown',
    destination_ip: log['destination.ip'] || 'unknown',
    linked_log: log // full normalized log
  }));

  // Ensure directory exists
  const dir = path.dirname(alertsPath);
  await fs.mkdir(dir, { recursive: true });

  // Write alerts to file
  await fs.writeFile(alertsPath, JSON.stringify(alerts, null, 2), 'utf8');
  console.log(`Generated ${alerts.length} alerts for ${level}`);
}

module.exports = { generateAlerts };