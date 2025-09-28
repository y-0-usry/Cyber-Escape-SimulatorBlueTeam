const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Path to normalized logs
const normalizedPath = path.join(__dirname, '../core/normalization/storage/normalized');

// GET /api/reports?format=pdf|csv
router.get('/', async (req, res, next) => {
  try {
    const { format, level = '1' } = req.query;
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use pdf or csv' });
    }

    const levelDir = path.join(normalizedPath, `level${level}`);
    try {
      await fs.access(levelDir);
    } catch {
      return res.status(404).json({ error: `Logs for level${level} not found` });
    }

    // Read logs
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

    if (format === 'csv') {
      // Generate CSV
      const headers = ['@timestamp', 'event.action', 'source.ip', 'destination.ip', 'user.name', 'alert.severity'];
      const csvRows = [headers.join(',')];
      logs.forEach(log => {
        const row = headers.map(h => log[h] || '').join(',');
        csvRows.push(row);
      });
      const csvContent = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      res.send(csvContent);
    } else {
      // Mock PDF (simple text-based for now)
      const pdfContent = `SIEM Report for Level ${level}\n\n` + logs.map(l => JSON.stringify(l, null, 2)).join('\n\n');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      res.send(Buffer.from(pdfContent)); // Placeholder; real PDF requires a library like pdfkit
    }
  } catch (err) {
    console.error(`Error in GET /api/reports: ${err.message}`);
    next(err);
  }
});

module.exports = router;