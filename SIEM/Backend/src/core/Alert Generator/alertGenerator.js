// Backend/src/core/Alert Generator/alertGenerator.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Determines alert type based on event category
 */
function determineAlertType(log) {
  const eventCategory = log['event.category'] || '';
  
  if (eventCategory === 'authentication') {
    return log['event.outcome'] === 'failure' ? 'failed_authentication' : 'successful_authentication';
  } else if (eventCategory === 'network') {
    if (log['event.type'] === 'dns') return 'suspicious_dns_query';
    if (log['event.type'] === 'vpn') return 'vpn_connection';
    if (log['event.action'] === 'deny' || log['event.action'] === 'drop') return 'blocked_connection';
    return 'network_traffic';
  } else if (eventCategory === 'intrusion_detection') {
    return 'intrusion_alert';
  } else if (eventCategory === 'database') {
    return 'database_access';
  } else if (eventCategory === 'web') {
    return log['http.response.status_code'] >= 400 ? 'http_error' : 'http_request';
  }
  
  return 'malicious_activity';
}

/**
 * Generates unique alert ID
 */
function generateAlertId(log) {
  const data = JSON.stringify(log) + Date.now();
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 12);
}

/**
 * Determines severity based on alert type and log content
 */
function determineSeverity(log, alertType) {
  const raw = log['log.original'] || '';

  // High severity - Check for attack keywords
  if (/PowerShell|Invoke|Encoded|Ransomware|Beacon|C2|malware-cloud|ransom|Shadow|Deletion|Encryption|bulk.*file|lateral.*movement|smb|port 445/i.test(raw)) {
    return 'high';
  }
  
  if (alertType === 'intrusion_alert') {
    const severity = log['severity'] || 0;
    if (severity <= 1) return 'high';
    if (severity <= 2) return 'medium';
    return 'low';
  }

  if (alertType === 'failed_authentication' && /brute.*force|multiple.*failed|repeated/i.test(raw)) return 'high';
  if (alertType === 'failed_authentication') return 'medium';
  if (alertType === 'database_access' && /suspicious|unauthorized/i.test(raw)) return 'high';
  if (alertType === 'database_access') return 'medium';
  if (alertType === 'http_error' && log['http.response.status_code'] === 401) return 'medium';
  
  return 'low';
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

  const alerts = logs.map(log => {
    const alertType = determineAlertType(log);
    const severity = determineSeverity(log, alertType);
    
    return {
      alert_id: generateAlertId(log),
      alert_type: alertType,
      severity: severity,
      timestamp: log['@timestamp'],
      source_ip: log['source.ip'] || 'unknown',
      destination_ip: log['destination.ip'] || 'unknown',
      event_action: log['event.action'] || 'unknown',
      event_type: log['event.type'] || 'unknown',
      user_name: log['user.name'] || 'unknown',
      linked_log: log // full normalized log
    };
  });

  // Ensure directory exists
  const dir = path.dirname(alertsPath);
  await fs.mkdir(dir, { recursive: true });

  // Write alerts to file
  await fs.writeFile(alertsPath, JSON.stringify(alerts, null, 2), 'utf8');
  console.log(`Generated ${alerts.length} alerts for ${level}`);
}

module.exports = { generateAlerts };