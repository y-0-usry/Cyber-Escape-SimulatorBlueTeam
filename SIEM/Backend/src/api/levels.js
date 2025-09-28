const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const router = express.Router();
const yaml = require('js-yaml');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../levels.log') })
  ]
});

// Path to levels directory
const levelsPath = path.join(__dirname, '../../../Data/levels');
// Path to store selected level
const selectedLevelPath = path.join(__dirname, '../core/storage/selected_level.json');

// GET /api/levels
router.get('/', async (req, res, next) => {
  try {
    const levelDirs = await fs.readdir(levelsPath);
    const levels = [];

    for (const dir of levelDirs) {
      if (dir.startsWith('level')) {
        try {
          const metadataPath = path.join(levelsPath, dir, 'metadata.yaml');
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = yaml.load(metadataContent) || {};
          levels.push({
            id: dir,
            name: metadata.name || dir,
            description: metadata.description || '',
            objectives: metadata.objectives || []
          });
        } catch (err) {
          logger.warn(`Failed to read metadata for ${dir}: ${err.message}`);
        }
      }
    }

    res.json(levels);
  } catch (err) {
    logger.error(`Error in GET /api/levels: ${err.message}`);
    next(err);
  }
});

// POST /api/levels/select
router.post('/select', async (req, res, next) => {
  try {
    const { level } = req.body;
    if (!level || !level.startsWith('level')) {
      return res.status(400).json({ error: 'Invalid level ID' });
    }

    // Ensure storage directory exists
    const storageDir = path.dirname(selectedLevelPath);
    await fs.mkdir(storageDir, { recursive: true });

    // Save selected level
    await fs.writeFile(selectedLevelPath, JSON.stringify({ level }));
    logger.info(`Selected level: ${level}`);
    res.json({ message: `Level ${level} selected` });
  } catch (err) {
    logger.error(`Error in POST /api/levels/select: ${err.message}`);
    next(err);
  }
});

module.exports = router;