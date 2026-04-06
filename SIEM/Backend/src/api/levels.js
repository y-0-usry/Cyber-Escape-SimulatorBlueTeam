const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    levels: ['level1', 'level2', 'level3', 'level4', 'level5', 'level6']
  });
});

module.exports = router;
