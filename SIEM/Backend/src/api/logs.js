const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Logs API' });
});

module.exports = router;
