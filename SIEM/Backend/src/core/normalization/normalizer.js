const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const mappings = require('./mappings');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'normalization.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Detects log source type based on log content.
 * @param {Object} logEntry
 * @returns {string} sourceType (firewall, windows, dns, ids, ssh, web_server, database, vpn, proxy)
 */
function detectSourceType(logEntry) {
  const raw = logEntry['log.original'] || logEntry.raw || '';
  const eventType = logEntry.event && logEntry.event.type ? logEntry.event.type.toLowerCase() : '';

  // Windows logs
  if (/SECURITY_(SUCCESS|FAILURE|WARNING)|User\s+"/i.test(raw) || eventType === 'security') {
    return 'windows';
  }

  // DNS logs
  if (eventType === 'dns' || /\s(A|AAAA|MX|CNAME|TXT|NS)\s/i.test(raw)) {
    return 'dns';
  }

  // IDS/IPS alerts
  if (eventType === 'ids_alert' || /Alert:|SID:|Priority:/i.test(raw)) {
    return 'ids';
  }

  // SSH/System authentication
  if (eventType === 'authentication' && /sshd\[|ssh:/i.test(raw)) {
    return 'ssh';
  }

  // Web server logs
  if (eventType === 'web_traffic' || /HTTP\/\d\.\d|Apache|Nginx/i.test(raw)) {
    return 'web_server';
  }

  // Database logs
  if (eventType === 'database' || /\[AUDIT\]|\[QUERY\]|SELECT|INSERT|UPDATE|DELETE/i.test(raw)) {
    return 'database';
  }

  // VPN logs
  if (eventType === 'vpn' || /VPN_(CONNECT|DISCONNECT)|OpenVPN|IPSec/i.test(raw)) {
    return 'vpn';
  }

  // Proxy logs
  if (eventType === 'proxy' || /CONNECT|GET|POST\s+.*proxy/i.test(raw)) {
    return 'proxy';
  }

  // Default to firewall
  return 'firewall';
}

/**
 * Normalizes a single log entry.
 * @param {Object} logEntry
 * @returns {Object} normalized log
 */
function normalizeLogEntry(logEntry) {
  const sourceType = detectSourceType(logEntry);
  const mapping = mappings[sourceType];
  const normalized = {};

  const rawLog = logEntry['log.original'] || logEntry.raw || 'N/A';
  logger.info(`Processing log entry [${sourceType}]: ${rawLog}`);

  try {
    const transformed = mapping.transform(logEntry) || {};
    Object.assign(normalized, transformed);
  } catch (err) {
    logger.error(`Transform failed for log: ${rawLog}, Error: ${err.message}`);
  }

  const ignoredFields = [
    'event',
    'source',
    'destination',
    'user',
    'raw',
    'level',
    '@timestamp',
    'log.original'
  ];

  for (const key in logEntry) {
    if (!Object.keys(mapping).includes(key) && !ignoredFields.includes(key)) {
      logger.warn(`Unmapped field '${key}' in log entry: ${rawLog}`);
    }
  }

  logger.info(`Normalized fields: ${JSON.stringify(normalized)}`);
  return normalized;
}

/**
 * Reads all parsed JSON files for a given level.
 */
async function readParsedLogs(level) {
  // هنا بقى level2 أو level3 زي ما هو
  const parsedDir = path.join(__dirname, `../parser/storage/parsed/${level}`);
  const files = await fs.readdir(parsedDir).catch(err => {
    logger.error(`Failed to read parsed directory ${parsedDir}: ${err.message}`);
    return [];
  });

  const logEntries = [];
  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(parsedDir, file);
    const content = await fs.readFile(filePath, 'utf8').catch(err => {
      logger.error(`Failed to read file ${filePath}: ${err.message}`);
      return null;
    });
    if (content) {
      try {
        const data = JSON.parse(content);
        logEntries.push(...(Array.isArray(data) ? data : [data]));
      } catch (err) {
        logger.error(`Failed to parse JSON in ${filePath}: ${err.message}`);
      }
    }
  }
  return logEntries;
}

/**
 * Stores normalized log data to a file.
 */
async function storeNormalizedLogs(filePath, normalizedData) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true }).catch(err => {
    logger.error(`Failed to create directory ${dir}: ${err.message}`);
  });
  await fs.writeFile(filePath, JSON.stringify(normalizedData, null, 2), 'utf8').catch(err => {
    logger.error(`Failed to write file ${filePath}: ${err.message}`);
  });
}

/**
 * Normalizes all logs for a given level and stores them in level-specific folders.
 */
async function normalizeLogs(level) {
  const parsedLogs = await readParsedLogs(level);
  const normalizedData = [];
  let successCount = 0;

  for (const logEntry of parsedLogs) {
    try {
      const normalized = normalizeLogEntry(logEntry);
      if (normalized) {
        normalizedData.push(normalized);
        successCount++;
      }
    } catch (err) {
      const rawLog = logEntry['log.original'] || logEntry.raw || 'N/A';
      logger.error(`Normalization failed for entry ${rawLog}: ${err.message}`);
    }
  }

  const outputDir = path.join(__dirname, 'storage', 'normalized', level);
  const allNormalizedFile = path.join(outputDir, 'all_normalized.json');

  // Read existing combined data
  let allData = [];
  try {
    const existing = await fs.readFile(allNormalizedFile, 'utf8').catch(() => null);
    if (existing) allData = JSON.parse(existing);
  } catch (err) {
    logger.warn(`Failed to read existing all_normalized.json: ${err.message}`);
  }

  // Merge new logs avoiding duplicates
  normalizedData.forEach(log => {
    if (!allData.some(l => l['log.original'] === log['log.original'])) {
      allData.push(log);
    }
  });

  // Store combined file
  await storeNormalizedLogs(allNormalizedFile, allData);

  // Store separate files per type
  const types = [...new Set(normalizedData.map(l => detectSourceType(l)))];
  for (const type of types) {
    const typeFile = path.join(outputDir, `normalized_${type}.json`);
    const typeLogs = normalizedData.filter(l => detectSourceType(l) === type);
    await storeNormalizedLogs(typeFile, typeLogs);
  }

  logger.info(`Normalization complete for ${level}. Total logs: ${parsedLogs.length}, Successfully normalized: ${successCount}`);
  return normalizedData;
}

module.exports = { normalizeLogs };
