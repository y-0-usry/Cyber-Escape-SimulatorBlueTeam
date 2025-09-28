const express = require('express');
const router = express.Router();

// Mock users and rules (replace with real data source if needed)
const mockUsers = [
  { username: 'admin', role: 'Administrator' },
  { username: 'analyst', role: 'Analyst' }
];

const mockRules = [
  { id: 'rule-001', name: 'Suspicious Login', enabled: true },
  { id: 'rule-002', name: 'Malicious IP', enabled: false }
];

// GET /api/users
router.get('/users', (req, res) => {
  res.json(mockUsers);
});

// GET /api/rules
router.get('/rules', (req, res) => {
  res.json(mockRules);
});

module.exports = router;