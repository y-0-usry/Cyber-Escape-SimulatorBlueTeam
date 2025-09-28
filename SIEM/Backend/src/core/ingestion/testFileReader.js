// Backend/src/core/ingestion/testFileReader.js
const path = require('path');
const fs = require('fs').promises;
const { parseLogFile } = require('../parser/parser');
const { normalizeLogs } = require('../normalization/normalizer');

async function test() {
  try {
    const basePath = path.join(__dirname, '../../../../Data/levels/level2/logs'); // Adjust to desired level
    
    if (!(await fs.access(basePath).then(() => true).catch(() => false))) {
      throw new Error(`Logs directory not found: ${basePath}`);
    }

    const files = (await fs.readdir(basePath)).filter(file => file.endsWith('.log'));

    if (files.length === 0) {
      console.log(`No .log files found in ${basePath}`);
      return;
    }

    const levelNum = path.basename(path.dirname(basePath)).replace('level', ''); // e.g., "2"
    const level = `level${levelNum}`; // e.g., "level2"

    for (const file of files) {
      try {
        const logFilePath = path.join(basePath, file);
        const parsedEvents = await parseLogFile(logFilePath);
        console.log(`Parsed ${parsedEvents.length} events and saved to storage/parsed/${level}/${path.basename(file, '.log')}.json`);
      } catch (err) {
        console.error(`Failed to parse ${file}: ${err.message}`);
      }
    }

    // Add a small delay to ensure files are written
    await new Promise(resolve => setTimeout(resolve, 1000));
    const normalizedResults = await normalizeLogs(level); // Pass the level
    const totalLogs = normalizedResults.length;
    console.log(`Normalization complete for level ${level}: Total ${totalLogs} logs processed`);

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();