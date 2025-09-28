const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Path to store incidents
const incidentsPath = path.join(__dirname, '../core/storage/incidents.json');

// GET /api/incidents
router.get('/', async (req, res, next) => {
  try {
    try {
      const content = await fs.readFile(incidentsPath, 'utf8');
      const incidents = JSON.parse(content);
      res.json(incidents);
    } catch {
      // Return empty array if file doesn't exist
      res.json([]);
    }
  } catch (err) {
    console.error(`Error in GET /api/incidents: ${err.message}`);
    next(err);
  }
});

// POST /api/incidents
router.post('/', async (req, res, next) => {
  try {
    const { title, alerts, assignee } = req.body;
    if (!title || !assignee) {
      return res.status(400).json({ error: 'Title and assignee are required' });
    }

    let incidents = [];
    try {
      const content = await fs.readFile(incidentsPath, 'utf8');
      incidents = JSON.parse(content);
    } catch {
      // File doesn't exist, start with empty array
    }

    const newIncident = {
      id: `INC${Date.now()}`,
      title,
      alerts: alerts || [],
      status: 'open',
      owner: assignee
    };
    incidents.push(newIncident);

    await fs.mkdir(path.dirname(incidentsPath), { recursive: true });
    await fs.writeFile(incidentsPath, JSON.stringify(incidents, null, 2));
    res.json(newIncident);
  } catch (err) {
    console.error(`Error in POST /api/incidents: ${err.message}`);
    next(err);
  }
});

module.exports = router;