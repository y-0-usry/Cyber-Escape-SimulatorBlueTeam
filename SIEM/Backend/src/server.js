const express = require('express');
const path = require('path');
const levelsRouter = require('./api/levels');
const logsRouter = require('./api/logs');
const alertsRouter = require('./api/alerts');
const incidentsRouter = require('./api/incidents');
const reportsRouter = require('./api/reports');
const authRouter = require('./api/auth');

const app = express();
const port = process.env.PORT || 3000;

// Define the path to the Frontend/src/pages directory
const pagesPath = path.join(__dirname, '../../Frontend/src/pages');

// Serve static files (HTML, JSON, etc.) from Frontend/src/pages
app.use(express.static(pagesPath, {
  extensions: ['html', 'json'], // Automatically serve .html and .json files
  index: 'Alerts.html' // Default to Alerts.html for root path
}));

// Parse JSON bodies for POST requests
app.use(express.json());

// Mount API routes
app.use('/api/levels', levelsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', authRouter);

// Handle root route to serve Alerts.html
app.get('/', (req, res) => {
  res.sendFile(path.join(pagesPath, 'Alerts.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving Alerts.html');
    }
  });
});

// Level 1 game page
app.get('/level1', (req, res) => {
  res.sendFile(path.join(pagesPath, 'Level1.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving Level1.html');
    }
  });
});

// Answer Key page
app.get('/AnswerKey', (req, res) => {
  res.sendFile(path.join(pagesPath, 'AnswerKey.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving AnswerKey.html');
    }
  });
});

// Level 2 game page
app.get('/level2', (req, res) => {
  res.sendFile(path.join(pagesPath, 'Level2.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving Level2.html');
    }
  });
});

// Answer Key 2 page
app.get('/AnswerKey2', (req, res) => {
  res.sendFile(path.join(pagesPath, 'AnswerKey2.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving AnswerKey2.html');
    }
  });
});

app.get('/AnswerKey2.html', (req, res) => {
  res.sendFile(path.join(pagesPath, 'AnswerKey2.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving AnswerKey2.html');
    }
  });
});

// Catch-all for non-existent routes
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});