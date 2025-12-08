const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.get('/', async (req, res) => {
  try {
    const level = req.query.level || 'level2';
    const alertsPath = path.join(__dirname, `../core/Alert Generator/storage/${level}/alerts.json`);
    
    const data = await fs.readFile(alertsPath, 'utf8');
    const alerts = JSON.parse(data);
    
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
