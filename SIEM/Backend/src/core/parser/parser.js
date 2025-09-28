// Backend/src/core/parser/parser.js

const fs = require('fs').promises;
const path = require('path');
const { readLogFiles } = require('../ingestion/fileReader');

/**
 * Detects the format of a log line and returns the appropriate parser function.
 * @param {string} line - The raw log line.
 * @returns {function} The parser function to use.
 */
function detectFormat(line) {
  if (!line || typeof line !== 'string') return null;

  // Check for JSON (valid JSON object or array)
  try {
    JSON.parse(line);
    return parseJson;
  } catch (e) {
    // Not JSON, continue with other checks
  }

  // Check for CSV (simple comma-separated values)
  if (line.includes(',') && !line.match(/^\d{4}-\d{2}-\d{2}/)) {
    return parseCsv;
  }

  // Check for Windows security log (starts with timestamp and "SECURITY_")
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} SECURITY_/.test(line)) {
    return parseWindows;
  }

  // Check for firewall log pattern (timestamp at start)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (ALLOW|DENY)/.test(line)) {
    return parseFirewall;
  }

  return null; // Unknown format
}

/**
 * Parses a firewall log line into the unified schema.
 * @param {string} line - Firewall log line (e.g., "2025-09-05 12:30:01 ALLOW TCP 192.168.1.10:54321 -> 8.8.8.8:53").
 * @returns {Object} Normalized log object.
 */
function parseFirewall(line) {
  const parts = line.split(' ');
  const [date, time, action, protocol, src, arrow, dst] = parts;
  const [srcIp, srcPort] = src.split(':');
  const [dstIp, dstPort] = dst.split(':');

  return {
    "@timestamp": `${date} ${time}`,
    "event": { "action": action, "type": "network_traffic" },
    "source": { "ip": srcIp, "port": parseInt(srcPort, 10) },
    "destination": { "ip": dstIp, "port": parseInt(dstPort, 10) },
    "raw": line,
    "level": path.basename(path.dirname(path.dirname(path.dirname(__dirname)))).replace('level', '') // Extract level from path
  };
}

/**
 * Parses a JSON log line into the unified schema.
 * @param {string} line - JSON log line.
 * @returns {Object} Normalized log object.
 */
function parseJson(line) {
  const jsonData = JSON.parse(line);
  return {
    "@timestamp": jsonData.timestamp || new Date().toISOString(),
    "event": { "action": jsonData.action || "unknown", "type": jsonData.event_type || "unknown" },
    "source": { "ip": jsonData.source_ip, "port": jsonData.source_port || 0 },
    "destination": { "ip": jsonData.dest_ip, "port": jsonData.dest_port || 0 },
    "raw": line,
    "level": path.basename(path.dirname(path.dirname(path.dirname(__dirname)))).replace('level', '') // Extract level from path
  };
}

/**
 * Parses a CSV log line into the unified schema.
 * @param {string} line - CSV log line (e.g., "2025-09-05 12:30:01,ALLOW,TCP,192.168.1.10,54321,8.8.8.8,53").
 * @returns {Object} Normalized log object.
 */
function parseCsv(line) {
  const [timestamp, action, protocol, srcIp, srcPort, dstIp, dstPort] = line.split(',');
  return {
    "@timestamp": timestamp,
    "event": { "action": action, "type": "network_traffic" },
    "source": { "ip": srcIp, "port": parseInt(srcPort, 10) },
    "destination": { "ip": dstIp, "port": parseInt(dstPort, 10) },
    "raw": line,
    "level": path.basename(path.dirname(path.dirname(path.dirname(__dirname)))).replace('level', '') // Extract level from path
  };
}

/**
 * Parses a Windows security log line into the unified schema.
 * @param {string} line - Windows log line (e.g., "2025-09-05 12:32:11 SECURITY_SUCCESS User \"Administrator\" logged in from 192.168.1.10").
 * @returns {Object} Normalized log object.
 */
function parseWindows(line) {
  const parts = line.split(' ');
  const [date, time, eventType, userPart, actionPart, fromPart] = parts;
  const userMatch = userPart.match(/User\s+"([^"]+)"/);
  const user = userMatch ? userMatch[1] : 'unknown';
  const action = actionPart.replace(/"/g, '').toLowerCase();
  const srcIp = fromPart.replace('from', '').trim();

  return {
    "@timestamp": `${date} ${time}`,
    "event": { "action": action, "type": "security", "outcome": eventType.replace('SECURITY_', '').toLowerCase() },
    "user": { "name": user },
    "source": { "ip": srcIp },
    "raw": line,
    "level": path.basename(path.dirname(path.dirname(path.dirname(__dirname)))).replace('level', '') // Extract level from path
  };
}

/**
 * Main parser function that processes a raw log line using the detected format.
 * @param {string} line - The raw log line.
 * @returns {Object|null} Normalized log object or null if format is unrecognized.
 */
function parseLine(line) {
  const parser = detectFormat(line);
  if (!parser) {
    console.warn(`Unrecognized log format: ${line}`);
    return null;
  }
  return parser(line);
}

/**
 * Stores parsed log data to a file or database (currently JSON file).
 * @param {string} filePath - The target file path for storage (e.g., storage/parsed/level1/firewall.json).
 * @param {Array<Object>} parsedData - Array of parsed log objects.
 * @returns {Promise<void>}
 */
async function storeLogs(filePath, parsedData) {
  const storageDir = path.dirname(filePath);
  await fs.mkdir(storageDir, { recursive: true }).catch(err => console.error(`Failed to create directory ${storageDir}: ${err.message}`));
  await fs.writeFile(filePath, JSON.stringify(parsedData, null, 2), 'utf8').catch(err => console.error(`Failed to write file ${filePath}: ${err.message}`));
}

/**
 * Main parsing function that processes a log file, parses lines, stores results, and returns parsed data.
 * @param {string} logFilePath - Path to the log file (e.g., Data/levels/level1/logs/firewall.log).
 * @returns {Promise<Array<Object>>} Array of parsed log objects.
 */
async function parseLogFile(logFilePath) {
  const level = path.basename(path.dirname(path.dirname(logFilePath))).replace('level', ''); // Extract level (e.g., "1" from "level1")
  const fileName = path.basename(logFilePath, '.log');
  const parsedData = [];

  // Use readLogFiles with the level and filter to the specific file
  const logGenerator = readLogFiles(level);
  for await (const { filename, line } of logGenerator) {
    if (filename === path.basename(logFilePath)) {
      const parsed = parseLine(line);
      if (parsed) {
        parsedData.push(parsed);
      }
    }
  }

  const storagePath = path.join(__dirname, 'storage', 'parsed', `level${level}`, `${fileName}.json`);
  await storeLogs(storagePath, parsedData);

  return parsedData;
}

module.exports = { parseLogFile };