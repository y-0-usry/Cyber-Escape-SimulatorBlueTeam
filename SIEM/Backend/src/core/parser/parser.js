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

  // Check for DNS logs (format: 2025-12-07 10:23:45 192.168.1.100 A malware.com)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s+[\d.]+\s+[A-Z]+\s+[\w.-]+/.test(line) && /\s(A|AAAA|MX|CNAME|TXT|NS)\s/.test(line)) {
    return parseDns;
  }

  // Check for IDS/IPS alerts (contains Alert: and SID:)
  if (/Alert:|SID:|Priority:/i.test(line) && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(line)) {
    return parseIds;
  }

  // Check for SSH/System auth logs (sshd or auth-related)
  if (/sshd\[|authentication\s+failure|\binvalid\s+user\b|failed\s+password/i.test(line)) {
    return parseSsh;
  }

  // Check for Web server logs (Apache/Nginx format with [date])
  if (/\[.+\]\s+"[A-Z]+\s+\/.+\s+HTTP\/\d\.\d"\s+\d{3}/.test(line)) {
    return parseWebServer;
  }

  // Check for Database logs (format: [AUDIT] or QUERY)
  if (/\[AUDIT\]|\[QUERY\]|SELECT|INSERT|UPDATE|DELETE/i.test(line) && /User:|Query:/i.test(line)) {
    return parseDatabase;
  }

  // Check for VPN logs (VPN_CONNECT, VPN_DISCONNECT)
  if (/VPN_(CONNECT|DISCONNECT)|OpenVPN|IPSec/i.test(line) && /Status:/i.test(line)) {
    return parseVpn;
  }

  // Check for Proxy logs (method like CONNECT, GET, POST)
  if (/\s+(CONNECT|GET|POST|HEAD|PUT|DELETE)\s+[\w.-]+:\d+\s+\d{3}\s+\d+/i.test(line) && /^\d{4}-\d{2}-\d{2}/.test(line)) {
    return parseProxy;
  }

  // Check for Windows security log (starts with timestamp and "SECURITY_")
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} SECURITY_/.test(line)) {
    return parseWindows;
  }

  // Check for firewall log pattern (timestamp at start)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (ALLOW|DENY|DROP|ACCEPT|REJECT)/.test(line)) {
    return parseFirewall;
  }

  // Check for CSV (simple comma-separated values)
  if (line.includes(',') && !line.match(/^\d{4}-\d{2}-\d{2}/)) {
    return parseCsv;
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
 * Parses a DNS log line.
 * @param {string} line - DNS log line (e.g., "2025-12-07 10:23:45 192.168.1.100 A malware.com 8.8.8.8 NOERROR 0.052").
 * @returns {Object} Parsed log object.
 */
function parseDns(line) {
  const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+([\d.]+)\s+(\w+)\s+([\w.-]+)\s+([\d.]+)\s+(\w+)/);
  if (!match) return { "@timestamp": new Date().toISOString(), "raw": line, "event": { "type": "dns", "action": "query" } };
  
  const [, timestamp, clientIp, queryType, domain, resolverIp, responseCode] = match;
  return {
    "@timestamp": timestamp,
    "event": { "action": "dns_query", "type": "dns" },
    "dns": { "question": { "name": domain, "type": queryType }, "response_code": responseCode },
    "source": { "ip": clientIp },
    "destination": { "ip": resolverIp },
    "raw": line
  };
}

/**
 * Parses an IDS/IPS alert line.
 * @param {string} line - IDS log (e.g., "2025-12-07T10:23:45Z | Alert: ET MALWARE | SID: 2013504 | Source: 192.168.1.100").
 * @returns {Object} Parsed log object.
 */
function parseIds(line) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
  const alertMatch = line.match(/Alert:\s*(.*?)\s*\|/);
  const sidMatch = line.match(/SID:\s*(\d+)/);
  const sourceMatch = line.match(/Source:\s*([\d.]+)/);
  const destMatch = line.match(/Dest(?:ination)?:\s*([\d.]+)/);
  const priorityMatch = line.match(/Priority:\s*(\d+)/);

  return {
    "@timestamp": timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    "event": { "action": "alert", "type": "ids_alert" },
    "rule": { "name": alertMatch ? alertMatch[1].trim() : "Unknown", "id": sidMatch ? sidMatch[1] : "0" },
    "source": { "ip": sourceMatch ? sourceMatch[1] : "0.0.0.0" },
    "destination": { "ip": destMatch ? destMatch[1] : "0.0.0.0" },
    "severity": priorityMatch ? parseInt(priorityMatch[1]) : 0,
    "raw": line
  };
}

/**
 * Parses SSH/System authentication logs.
 * @param {string} line - SSH log (e.g., "2025-12-07T10:23:45Z sshd[12345]: Invalid user admin from 203.0.113.45").
 * @returns {Object} Parsed log object.
 */
function parseSsh(line) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
  const processMatch = line.match(/(\w+)\[(\d+)\]/);
  const userMatch = line.match(/(?:user|for)\s+(\w+)/i);
  const ipMatch = line.match(/from\s+([\d.]+)/);
  const portMatch = line.match(/port\s+(\d+)/);

  let action = 'unknown';
  if (/failed\s+password|authentication\s+failure/i.test(line)) action = 'failed_auth';
  else if (/invalid\s+user/i.test(line)) action = 'invalid_user';
  else if (/accepted|successful/i.test(line)) action = 'successful_auth';

  return {
    "@timestamp": timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    "event": { "action": action, "type": "authentication" },
    "process": { "name": processMatch ? processMatch[1] : "unknown", "pid": processMatch ? parseInt(processMatch[2]) : 0 },
    "user": { "name": userMatch ? userMatch[1] : "unknown" },
    "source": { "ip": ipMatch ? ipMatch[1] : "0.0.0.0", "port": portMatch ? parseInt(portMatch[1]) : 0 },
    "raw": line
  };
}

/**
 * Parses Web server logs (Apache/Nginx).
 * @param {string} line - Web log (e.g., "192.168.1.100 - - [07/Dec/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 401").
 * @returns {Object} Parsed log object.
 */
function parseWebServer(line) {
  const ipMatch = line.match(/^([\d.]+)/);
  const dateMatch = line.match(/\[(.*?)\]/);
  const requestMatch = line.match(/"(\w+)\s+([^\s]+)\s+HTTP\/([\d.]+)"/);
  const statusMatch = line.match(/"\s+(\d{3})/);
  const sizeMatch = line.match(/\d{3}\s+(\d+|-)/);
  const userAgentMatch = line.match(/"([^"]*)"$/);

  return {
    "@timestamp": dateMatch ? dateMatch[1] : new Date().toISOString(),
    "event": { "action": "http_request", "type": "web_traffic" },
    "http": { "method": requestMatch ? requestMatch[1] : "unknown", "target": requestMatch ? requestMatch[2] : "/", "version": requestMatch ? requestMatch[3] : "1.1", "status_code": statusMatch ? parseInt(statusMatch[1]) : 0 },
    "source": { "ip": ipMatch ? ipMatch[1] : "0.0.0.0" },
    "user_agent": { "original": userAgentMatch ? userAgentMatch[1] : "unknown" },
    "raw": line
  };
}

/**
 * Parses Database logs.
 * @param {string} line - Database log (e.g., "2025-12-07 10:23:45 [AUDIT] User: dbadmin | Query: SELECT * FROM users").
 * @returns {Object} Parsed log object.
 */
function parseDatabase(line) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  const auditMatch = line.match(/\[(\w+)\]/);
  const userMatch = line.match(/User:\s*([\w@]+)/);
  const queryMatch = line.match(/Query:\s*([^|]+)/);
  const rowsMatch = line.match(/Result:\s*(\d+)/);

  return {
    "@timestamp": timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    "event": { "action": "database_query", "type": "database" },
    "database": { "audit_level": auditMatch ? auditMatch[1] : "unknown", "user": userMatch ? userMatch[1] : "unknown", "query": queryMatch ? queryMatch[1].trim() : "unknown" },
    "rows_returned": rowsMatch ? parseInt(rowsMatch[1]) : 0,
    "raw": line
  };
}

/**
 * Parses VPN logs.
 * @param {string} line - VPN log (e.g., "2025-12-07T10:23:45Z VPN_CONNECT User: jdoe | IP: 203.0.113.100 | Status: SUCCESS").
 * @returns {Object} Parsed log object.
 */
function parseVpn(line) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
  const eventMatch = line.match(/(VPN_\w+)/);
  const userMatch = line.match(/User:\s*([\w.]+)/);
  const ipMatch = line.match(/IP:\s*([\d.]+)/);
  const statusMatch = line.match(/Status:\s*(\w+)/);

  return {
    "@timestamp": timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    "event": { "action": eventMatch ? eventMatch[1].toLowerCase() : "vpn_event", "type": "vpn" },
    "user": { "name": userMatch ? userMatch[1] : "unknown" },
    "source": { "ip": ipMatch ? ipMatch[1] : "0.0.0.0" },
    "event_outcome": statusMatch ? statusMatch[1].toLowerCase() : "unknown",
    "raw": line
  };
}

/**
 * Parses Proxy logs.
 * @param {string} line - Proxy log (e.g., "2025-12-07 10:23:45 192.168.1.100 CONNECT example.com:443 200").
 * @returns {Object} Parsed log object.
 */
function parseProxy(line) {
  const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  const ipMatch = line.match(/\d{2}:\d{2}:\d{2}\s+([\d.]+)/);
  const methodMatch = line.match(/(CONNECT|GET|POST|HEAD|PUT|DELETE)/);
  const destMatch = line.match(/(CONNECT|GET|POST|HEAD|PUT|DELETE)\s+([\w.:-]+)/);
  const statusMatch = line.match(/\s(\d{3})\s+/);
  const bytesMatch = line.match(/\d{3}\s+(\d+)/);

  return {
    "@timestamp": timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    "event": { "action": methodMatch ? methodMatch[1].toLowerCase() : "proxy_request", "type": "proxy" },
    "source": { "ip": ipMatch ? ipMatch[1] : "0.0.0.0" },
    "destination": { "domain": destMatch ? destMatch[2] : "unknown" },
    "http": { "method": methodMatch ? methodMatch[1] : "unknown", "status_code": statusMatch ? parseInt(statusMatch[1]) : 0 },
    "bytes_transferred": bytesMatch ? parseInt(bytesMatch[1]) : 0,
    "raw": line
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