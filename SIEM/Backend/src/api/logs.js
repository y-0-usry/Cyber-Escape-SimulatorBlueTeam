const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Path to normalized logs
const normalizedPath = path.join(__dirname, '../core/normalization/storage/normalized');

// GET /api/logs?level=X&q=...
router.get('/', async (req, res, next) => {
  try {
    const { level, q } = req.query;
    if (!level) {
      return res.status(400).json({ error: 'Level parameter is required' });
    }

    const levelDir = path.join(normalizedPath, `level${level}`);
    try {
      await fs.access(levelDir);
    } catch {
      return res.status(404).json({ error: `Logs for level${level} not found` });
    }

    // Read all JSON files in the level directory
    const files = await fs.readdir(levelDir);
    let logs = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(levelDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const fileLogs = JSON.parse(content);
        logs = logs.concat(Array.isArray(fileLogs) ? fileLogs : [fileLogs]);
      }
    }

    // Basic search filtering (e.g., source.ip:192.168.1.10)
    if (q) {
      const [field, value] = q.split(':').map(s => s.trim());
      if (field && value) {
        logs = logs.filter(log => {
          const keys = field.split('.');
          let val = log;
          for (const key of keys) {
            val = val[key];
            if (!val) return false;
          }
          return String(val) === value;
        });
      }
    }

    res.json({ level: `level${level}`, count: logs.length, logs });
  } catch (err) {
    console.error(`Error in GET /api/logs: ${err.message}`);
    next(err);
  }
});

module.exports = router;