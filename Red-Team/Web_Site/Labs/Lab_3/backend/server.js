const express = require('express');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const dataDir = path.join(__dirname, '../Data');
const adminFilesDir = path.join(dataDir, 'admin-files');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(adminFilesDir)) fs.mkdirSync(adminFilesDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = lowdb(adapter);
const ADMIN_EMAIL = 'admin@CyberEscape.com';
const FLAG_VALUE = 'FLAG{email_pivot_admin_file_read}';
const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\uFEFF]/;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));

function normalizeOrgName(value) {
  return String(value || '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function writeAdminFiles() {
  const files = {
    'financial-report.txt': 'Q2 enterprise billing summary\n- Renewal risk: medium\n- Revenue watchlist: internal use only\n',
    'security-audit.txt': 'Security audit notes\n- Email-based admin shortcuts still pending cleanup\n- File viewer should be reviewed\n',
    'internal-users.txt': 'Internal contacts\n- Platform owner\n- Finance lead\n- Incident coordinator\n',
    'ops-notes.txt': 'Operations notes\n- Keep org naming clean before launch\n- Trial messaging banner updated\n',
    'flag.txt': `${FLAG_VALUE}\n`
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(adminFilesDir, name), content, 'utf8');
  }
}

function seedDb() {
  writeAdminFiles();

  db.setState({
    users: [
      {
        id: 1,
        username: 'attacker1',
        password: 'OrgBreak2026!',
        token: null,
        name: 'Ammar Red',
        email: 'attacker@redops.local',
        org_id: 1
      },
      {
        id: 2,
        username: 'trialhelper',
        password: 'TrialBridge2026!',
        token: null,
        name: 'Trial Helper',
        email: 'helper@cyberescape.com',
        org_id: 2
      },
      {
        id: 3,
        username: 'admin1',
        password: 'AdminPass!2026',
        token: null,
        name: 'Cyber Escape Admin',
        email: ADMIN_EMAIL,
        org_id: 3
      }
    ],
    orgs: [
      {
        id: 1,
        owner_user_id: 1,
        raw_name: 'Red Siege Labs',
        display_name: 'Red Siege Labs',
        slug: 'red-siege-labs',
        plan: 'free',
        project_limit: 2,
        trial_days_left: 0,
        trial_expired: true,
        plan_notice: 'Your 14-day trial expired. Add billing details to create more projects.'
      },
      {
        id: 2,
        owner_user_id: 2,
        raw_name: 'Velocity Sandbox',
        display_name: 'Velocity Sandbox',
        slug: 'velocity-sandbox',
        plan: 'trial',
        project_limit: 50,
        trial_days_left: 4,
        trial_expired: false,
        sticky_trial: true,
        plan_notice: 'Trial active. 4 days left before downgrade.'
      },
      {
        id: 3,
        owner_user_id: 3,
        raw_name: 'Cyber Escape',
        display_name: 'Cyber Escape',
        slug: 'cyber-escape',
        plan: 'enterprise',
        project_limit: 500,
        trial_days_left: null,
        trial_expired: false,
        plan_notice: 'Enterprise plan active.'
      }
    ],
    org_members: [
      { org_id: 1, username: 'attacker1', role: 'owner' },
      { org_id: 2, username: 'trialhelper', role: 'owner' },
      { org_id: 3, username: 'admin1', role: 'owner' },
      { org_id: 3, username: 'ops-bot', role: 'automation' },
      { org_id: 3, username: 'finance-review', role: 'viewer' }
    ],
    projects: [
      { id: 1, org_id: 1, name: 'SOC Automation', summary: 'Alert triage runners and webhook bridge.' },
      { id: 2, org_id: 1, name: 'Tenant Drill', summary: 'Quarterly tenant isolation exercises.' },
      { id: 3, org_id: 2, name: 'Trial Ops Board', summary: 'Temporary org used for demo projects.' },
      { id: 4, org_id: 3, name: 'Billing Console Refresh', summary: 'Admin-only redesign workstream.' }
    ],
    challenge_progress: [
      { user_id: 1, flag_submitted: false }
    ]
  }).write();
}

db.defaults({ users: [], orgs: [], org_members: [], projects: [], challenge_progress: [] }).write();
if (db.get('users').size().value() === 0) seedDb();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = db.get('users').find({ token }).value();
  if (!user) return res.status(401).json({ message: 'Invalid token' });

  req.user = user;
  next();
}

function getCurrentOrg(user) {
  return db.get('orgs').find({ id: user.org_id }).value();
}

function getOrgProjects(orgId) {
  return db.get('projects').filter({ org_id: orgId }).value();
}

function isAdminEmail(user) {
  return user.email === ADMIN_EMAIL;
}

function taskOneSolved(user) {
  const org = getCurrentOrg(user);
  if (!org) return false;
  const usedMultipleSpaces = /\s{2,}/.test(org.raw_name || '');
  const usedZeroWidth = ZERO_WIDTH_REGEX.test(org.raw_name || '');
  return org.display_name === 'Cyber Escape' && org.raw_name !== 'Cyber Escape' && (usedMultipleSpaces || usedZeroWidth);
}

function taskTwoSolved(user) {
  const org = getCurrentOrg(user);
  if (!org) return false;
  return getOrgProjects(org.id).length > org.project_limit;
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/api/reset', (req, res) => {
  seedDb();
  res.json({ success: true, message: 'Lab 3 reset complete' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username, password }).value();
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const token = crypto.createHash('sha256').update(`${user.id}-${Date.now()}`).digest('hex');
  db.get('users').find({ id: user.id }).assign({ token }).write();
  res.json({ token, username: user.username });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  db.get('users').find({ id: req.user.id }).assign({ token: null }).write();
  res.json({ success: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  res.json({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name,
    email: req.user.email,
    orgId: req.user.org_id,
    orgName: org ? org.display_name : null,
    isAdmin: isAdminEmail(req.user)
  });
});

app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({
    name: req.user.name,
    email: req.user.email
  });
});

app.post('/api/profile', authMiddleware, (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string') updates.name = req.body.name.trim() || req.user.name;
  if (typeof req.body.email === 'string') updates.email = req.body.email.trim() || req.user.email;

  db.get('users').find({ id: req.user.id }).assign(updates).write();
  const updatedUser = db.get('users').find({ id: req.user.id }).value();
  res.json({ success: true, user: updatedUser, isAdmin: isAdminEmail(updatedUser) });
});

app.get('/api/orgs/current', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  res.json({
    ...org,
    projects: getOrgProjects(org.id),
    members: db.get('org_members').filter({ org_id: org.id }).value()
  });
});

app.post('/api/orgs/current/rename', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const rawInput = String(req.body.name || '');
  if (!rawInput.trim()) return res.status(400).json({ message: 'Organization name is required' });

  const exactDuplicate = db.get('orgs').find((candidate) => candidate.id !== org.id && String(candidate.raw_name || '').toLowerCase() === rawInput.toLowerCase()).value();
  if (exactDuplicate) {
    return res.status(400).json({ message: 'Organization name already exists' });
  }

  const displayName = normalizeOrgName(rawInput);
  db.get('orgs').find({ id: org.id }).assign({ raw_name: rawInput, display_name: displayName }).write();
  res.json({ success: true, rawName: rawInput, displayName });
});

app.get('/api/orgs/current/projects', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json(getOrgProjects(org.id));
});

app.post('/api/orgs/:orgId/projects', authMiddleware, (req, res) => {
  const targetOrgId = +req.params.orgId;
  const targetOrg = db.get('orgs').find({ id: targetOrgId }).value();
  if (!targetOrg) return res.status(404).json({ message: 'Organization not found' });
  if (targetOrg.owner_user_id !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const sourceTrialOrgId = +req.body.sourceTrialOrgId;
  const sourceTrialOrg = db.get('orgs').find({ id: sourceTrialOrgId }).value() || targetOrg;
  const targetProjects = getOrgProjects(targetOrg.id);
  const targetLimitReached = targetOrg.plan === 'free' && targetProjects.length >= targetOrg.project_limit;
  const activeTrialContext = sourceTrialOrg.plan === 'trial' && sourceTrialOrg.trial_expired === false;

  if (targetLimitReached && !activeTrialContext) {
    return res.status(403).json({ message: 'Upgrade plan required before creating more projects' });
  }

  const name = String(req.body.name || '').trim();
  const summary = String(req.body.summary || '').trim();
  if (!name) return res.status(400).json({ message: 'Project name is required' });

  const nextId = db.get('projects').size().value() + 1;
  const project = {
    id: nextId,
    org_id: targetOrg.id,
    name,
    summary: summary || 'No summary provided.'
  };

  db.get('projects').push(project).write();
  res.json({ success: true, project });
});

app.get('/api/pricing', (req, res) => {
  res.json({
    plans: [
      { name: 'Free', price: '$0', projects: 2 },
      { name: 'Trial', price: '$0 for 14 days', projects: 50 },
      { name: 'Enterprise', price: 'Contact sales', projects: 500 }
    ]
  });
});

app.get('/api/admin/files', authMiddleware, (req, res) => {
  if (!isAdminEmail(req.user)) return res.status(403).json({ message: 'Forbidden' });

  res.json([
    { name: 'financial-report.txt', label: 'Finance Snapshot' },
    { name: 'security-audit.txt', label: 'Security Audit' },
    { name: 'internal-users.txt', label: 'Internal Contacts' },
    { name: 'ops-notes.txt', label: 'Operations Notes' }
  ]);
});

app.get('/api/admin/file', authMiddleware, (req, res) => {
  if (!isAdminEmail(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const requestedFile = path.basename(String(req.query.file || ''));
  if (!requestedFile) return res.status(400).json({ message: 'File parameter is required' });

  const filePath = path.join(adminFilesDir, requestedFile);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ file: requestedFile, content });
});

app.get('/api/challenge/status', authMiddleware, (req, res) => {
  const progress = db.get('challenge_progress').find({ user_id: req.user.id }).value() || { flag_submitted: false };
  const org = getCurrentOrg(req.user);
  res.json({
    task1: taskOneSolved(req.user),
    task2: taskTwoSolved(req.user),
    task3: !!progress.flag_submitted,
    orgName: org ? org.display_name : null,
    rawOrgName: org ? org.raw_name : null,
    projectCount: org ? getOrgProjects(org.id).length : 0
  });
});

app.post('/api/challenge/submit-flag', authMiddleware, (req, res) => {
  const { flag } = req.body;
  if (flag !== FLAG_VALUE) {
    return res.status(400).json({ success: false, message: 'Incorrect flag' });
  }

  const existing = db.get('challenge_progress').find({ user_id: req.user.id }).value();
  if (existing) {
    db.get('challenge_progress').find({ user_id: req.user.id }).assign({ flag_submitted: true }).write();
  } else {
    db.get('challenge_progress').push({ user_id: req.user.id, flag_submitted: true }).write();
  }

  res.json({ success: true });
});

app.listen(3013, () => {
  console.log('Lab 3 server running at http://localhost:3013');
});
