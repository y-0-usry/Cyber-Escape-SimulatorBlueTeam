const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';

async function waitForServer(url, timeoutMs=15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, res => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Server timeout'));
        setTimeout(check, 500);
      });
    };
    check();
  });
}

async function runOnce(browser, iteration) {
  const page = await browser.newPage();
  // Auto-accept any alert dialogs to prevent blocking
  page.on('dialog', async d => { try { await d.accept(); } catch {} });
  page.on('console', msg => {
    try { console.log('[browser]', msg.type(), msg.text()); } catch {}
  });
  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('requestfailed', req => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    if (url.includes('/level2.js')) {
      console.log('[response level2.js]', status, url);
    }
    if (status >= 400) console.log('[response]', status, url);
  });
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  await page.goto(SERVER_URL + '/level2');

  // Click Start Investigation
  await page.waitForSelector('#start-btn');
  await page.click('#start-btn');

  // Wait for questions section to be shown then questions to render
  await page.waitForSelector('#questions-section:not(.hidden)', { timeout: 30000 });
  await page.waitForSelector('#questions-container [data-qid]', { timeout: 30000 });

  // Fill answers from dataset to ensure correctness
  const cards = await page.$$("#questions-container [data-qid]");
  for (const card of cards) {
    const answer = await card.evaluate(el => el.dataset.answer || '');
    const select = await card.$('select.answer-input');
    if (select && answer) { await select.select(answer); continue; }
    const checkboxes = await card.$$('.answer-multiselect input[type="checkbox"]');
    if (checkboxes && checkboxes.length && answer) {
      const ids = answer.split(',').map(s => s.trim()).filter(Boolean);
      await card.evaluate((el, ids) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        const inputs = el.querySelectorAll('.answer-multiselect input[type="checkbox"]');
        inputs.forEach(cb => {
          if (ids.includes(cb.value)) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }, ids);
      continue;
    }
    const input = await card.$('.answer-input');
    if (input && answer) { await input.evaluate(el => { el.value = ''; el.scrollIntoView({ block: 'center' }); }); await input.type(answer); }
  }

  // Submit answers twice to validate no double scoring
  await page.evaluate(() => {
    try { (window.evaluateGeneralQuestions || evaluateGeneralQuestions)(); } catch (e) { console.error('invoke evaluateGeneralQuestions failed', e); }
  });
  // Read score after first submit
  await new Promise(res => setTimeout(res, 500));
  const score1 = await page.$eval('#score', el => parseInt(el.textContent.trim(), 10));

  await page.evaluate(() => {
    try { (window.evaluateGeneralQuestions || evaluateGeneralQuestions)(); } catch (e) { console.error('invoke evaluateGeneralQuestions failed', e); }
  });
  await new Promise(res => setTimeout(res, 300));
  const score2 = await page.$eval('#score', el => parseInt(el.textContent.trim(), 10));

  if (score2 !== score1) {
    throw new Error(`Score changed on second submit in iteration ${iteration}: ${score1} -> ${score2}`);
  }

  // If Phase 1 passed, scenario section will show; otherwise, ensure no crash
  // Try go to scenario if present
  const scenarioCards = await page.$$("#scenario-container [data-qid]");
  if (scenarioCards.length) {
    // Fill scenario answers from dataset
    for (const card of scenarioCards) {
      const answer = await card.evaluate(el => el.dataset.answer || '');
      const select = await card.$('select.answer-input');
      const text = await card.$('input.answer-input');
      const checkboxes = await card.$$('.answer-multiselect input[type="checkbox"]');
      if (select && answer) { await select.select(answer); continue; }
      if (text) { await text.evaluate(el => { el.value=''; el.scrollIntoView({ block:'center' }); }); await text.type(answer || 'insider threat'); continue; }
      if (checkboxes && checkboxes.length && answer) {
        const ids = answer.split(',').map(s => s.trim()).filter(Boolean);
        await card.evaluate((el, ids) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          const inputs = el.querySelectorAll('.answer-multiselect input[type="checkbox"]');
          inputs.forEach(cb => {
            if (ids.includes(cb.value)) {
              cb.checked = true;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }, ids);
      }
    }
    await page.evaluate(() => {
      try { (window.evaluateScenarioQuestions || evaluateScenarioQuestions)(); } catch (e) { console.error('invoke evaluateScenarioQuestions failed', e); }
    });
    await new Promise(res => setTimeout(res, 300));
    const score3 = await page.$eval('#score', el => parseInt(el.textContent.trim(), 10));
    await page.evaluate(() => {
      try { (window.evaluateScenarioQuestions || evaluateScenarioQuestions)(); } catch (e) { console.error('invoke evaluateScenarioQuestions failed', e); }
    });
    await new Promise(res => setTimeout(res, 300));
    const score4 = await page.$eval('#score', el => parseInt(el.textContent.trim(), 10));
    if (score4 !== score3) {
      throw new Error(`Scenario score changed on second submit in iteration ${iteration}: ${score3} -> ${score4}`);
    }
  }

  await page.close();
}

(async () => {
  // Start server
  const server = spawn(process.execPath, [path.join('SIEM','Backend','src','server.js')], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  try {
    await waitForServer(SERVER_URL);
    const candidates = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    ];
    let executablePath = null;
    for (const p of candidates) { if (fs.existsSync(p)) { executablePath = p; break; } }
    if (!executablePath) throw new Error('Chrome/Edge not found. Please install Chrome or Edge.');
    const browser = await puppeteer.launch({ headless: 'new', executablePath, args: ['--no-sandbox','--disable-setuid-sandbox'], protocolTimeout: 60000 });
    for (let i = 1; i <= 3; i++) {
      await runOnce(browser, i);
      console.log(`Iteration ${i} passed`);
    }
    await browser.close();
    console.log('All iterations passed');
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('E2E failed:', err.message);
    server.kill();
    process.exit(1);
  }
})();
