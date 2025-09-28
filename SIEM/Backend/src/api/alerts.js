const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const router = express.Router();

// Configure Winston logger for debugging
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../alerts.log') }),
    new winston.transports.Console()
  ]
});

// Path to normalized logs (absolute path for Windows compatibility)
const normalizedPath = 'D:\\Other Files\\Graduation-Project\\Cyber-Escape-SimulatorBlueTeam\\SIEM\\Backend\\src\\core\\normalization\\storage\\normalized';

// GET /api/alerts?level=X&status=...
router.get('/', async (req, res, next) => {
  try {
    const { level, status } = req.query;
    if (!level) {
      logger.warn('Missing level parameter');
      return res.status(400).json({ error: 'Level parameter is required' });
    }

    const levelDir = path.join(normalizedPath, `level${level}`);
    logger.debug(`Attempting to access directory: ${levelDir}`);

    try {
      await fs.access(levelDir);
    } catch (err) {
      logger.error(`Directory not found: ${levelDir}, error: ${err.message}`);
      return res.status(404).json({ error: `Logs for level${level} not found` });
    }

    // Read all JSON files in the level directory
    const files = await fs.readdir(levelDir);
    logger.debug(`Found files in ${levelDir}: ${files.join(', ')}`);

    let alerts = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(levelDir, file);
        logger.debug(`Reading file: ${filePath}`);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          let fileLogs;
          try {
            fileLogs = JSON.parse(content);
          } catch (parseErr) {
            logger.error(`Failed to parse JSON in ${filePath}: ${parseErr.message}`);
            continue;
          }

          const logsArray = Array.isArray(fileLogs) ? fileLogs : [fileLogs];
          const fileAlerts = logsArray
            .map((log, index) => {
              if (!log['alert.generated']) {
                logger.debug(`Log in ${file} at index ${index} is not an alert: ${JSON.stringify(log)}`);
                return null;
              }
              return {
                id: `${file}-${index}`,
                created_at: log['@timestamp'] || new Date().toISOString(),
                severity: log['alert.severity'] || 'unknown',
                status: log['alert.status'] || 'open',
                rule_id: log['alert.rule_id'] || 'force-malicious-001',
                event: log
              };
            })
            .filter(alert => alert !== null);
          alerts = alerts.concat(fileAlerts);
        } catch (err) {
          logger.error(`Error reading file ${filePath}: ${err.message}`);
        }
      }
    }

    if (alerts.length === 0) {
      logger.warn(`No alerts found in level${level}`);
    } else {
      logger.debug(`Found ${alerts.length} alerts in level${level}`);
    }

    // Filter by status
    if (status && status !== 'all') {
      alerts = alerts.filter(alert => alert.status === status);
      logger.debug(`Filtered by status '${status}': ${alerts.length} alerts remain`);
    }

    res.json({ alerts });
  } catch (err) {
    logger.error(`Error in GET /api/alerts: ${err.message}`);
    next(err);
  }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level } = req.query;
    if (!level) {
      logger.warn('Missing level parameter for alert ID: ' + id);
      return res.status(400).json({ error: 'Level parameter is required' });
    }

    const levelDir = path.join(normalizedPath, `level${level}`);
    logger.debug(`Attempting to access directory for alert: ${levelDir}`);

    try {
      await fs.access(levelDir);
    } catch {
      logger.error(`Directory not found: ${levelDir}`);
      return res.status(404).json({ error: `Logs for level${level} not found` });
    }

    // Split id to find file and index (e.g., firewall.log-0)
    const [fileName, index] = id.split('-');
    if (!fileName || !index) {
      logger.warn(`Invalid alert ID format: ${id}`);
      return res.status(400).json({ error: 'Invalid alert ID format' });
    }

    const filePath = path.join(levelDir, `${fileName}.json`);
    logger.debug(`Reading file for alert: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      let fileLogs;
      try {
        fileLogs = JSON.parse(content);
      } catch (parseErr) {
        logger.error(`Failed to parse JSON in ${filePath}: ${parseErr.message}`);
        return res.status(404).json({ error: 'Alert not found' });
      }

      const logsArray = Array.isArray(fileLogs) ? fileLogs : [fileLogs];
      const log = logsArray[parseInt(index)];
      if (!log || !log['alert.generated']) {
        logger.warn(`Alert not found for ID ${id} in ${filePath}`);
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({
        id,
        created_at: log['@timestamp'] || new Date().toISOString(),
        severity: log['alert.severity'] || 'unknown',
        status: log['alert.status'] || 'open',
        rule_id: log['alert.rule_id'] || 'force-malicious-001',
        event: log
      });
    } catch (err) {
      logger.error(`Error reading file ${filePath}: ${err.message}`);
      return res.status(404).json({ error: 'Alert not found' });
    }
  } catch (err) {
    logger.error(`Error in GET /api/alerts/:id: ${err.message}`);
    next(err);
  }
});

module.exports = router;