const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ message: 'Login API' });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout API' });
});

module.exports = router;
