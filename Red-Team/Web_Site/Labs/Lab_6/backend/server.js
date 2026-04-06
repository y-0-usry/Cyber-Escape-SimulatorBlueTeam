const express = require('express');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3017;
const DATA_DIR = path.join(__dirname, '../Data');
const FLAG_VALUE = 'FLAG{invite_idor_logs_cmd_injection_takeover}';
const ORG_ID = 601;
const ATTACKER_CONTROLLED_EMAIL = 'owned.manager@orglab.local';
const BACKEND_SNIPPET = [
  'from subprocess import check_output',
  '',
  '@app.get("/api/secret")',
  'def secret():',
  '    file = request.args.get("file", "")',
  '    command = "cd secret && " + file',
  '    return shell(command)'
].join('\n');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const adapter = new FileSync(path.join(DATA_DIR, 'db.json'));
const db = lowdb(adapter);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));
app.use('/Data', express.static(path.join(__dirname, '../Data')));

function roleRank(role) {
  if (role === 'admin') return 3;
  if (role === 'manager') return 2;
  return 1;
}

function roleLabel(role) {
  return role || 'employee';
}

function nextId(collection) {
  return db.get(collection).size().value() + 1;
}

function seedDb() {
  const now = new Date().toISOString();
  db.setState({
    users: [
      { id: 1, username: 'victim.admin', password: 'AdminRoot2026!', name: 'Victim Admin', email: 'admin@orglab.local', token: null, org_id: ORG_ID },
      { id: 2, username: 'attacker1', password: 'ManagerBreak2026!', name: 'Attacker Manager', email: 'attacker.manager@orglab.local', token: null, org_id: ORG_ID },
      { id: 3, username: 'helper.employee', password: 'EmployeeOnly2026!', name: 'Helper Employee', email: 'helper.employee@orglab.local', token: null, org_id: ORG_ID },
      { id: 4, username: 'owned.manager', password: 'Owned2026!', name: 'Owned Operator', email: ATTACKER_CONTROLLED_EMAIL, token: null, org_id: null }
    ],
    orgs: [
      {
        id: ORG_ID,
        name: 'Northbridge Org Cloud',
        slug: 'northbridge-org-cloud',
        description: 'Internal workspace for projects, invites, and audit operations.',
        plan: 'business',
        trial_days_left: 18,
        created_at: now
      }
    ],
    org_members: [
      { org_id: ORG_ID, user_id: 1, role: 'admin', joined_at: now },
      { org_id: ORG_ID, user_id: 2, role: 'manager', joined_at: now },
      { org_id: ORG_ID, user_id: 3, role: 'employee', joined_at: now }
    ],
    projects: [
      { id: 1, org_id: ORG_ID, name: 'Asset Inventory', summary: 'Keeps tenant assets synchronized.', status: 'active', owner_user_id: 1 },
      { id: 2, org_id: ORG_ID, name: 'Role Sync Engine', summary: 'Propagates access policy changes.', status: 'active', owner_user_id: 1 },
      { id: 3, org_id: ORG_ID, name: 'Incident Workbench', summary: 'Organizes audit and response notes.', status: 'active', owner_user_id: 2 },
      { id: 4, org_id: ORG_ID, name: 'Secure Imports', summary: 'Monitors file-driven workflows.', status: 'active', owner_user_id: 2 }
    ],
    invites: [
      { id: 7001, org_id: ORG_ID, email: 'new.admin@orglab.local', role: 'admin', status: 'pending', created_by_user_id: 1, created_at: now, accepted_by_user_id: null },
      { id: 7002, org_id: ORG_ID, email: 'new.employee@orglab.local', role: 'employee', status: 'pending', created_by_user_id: 1, created_at: now, accepted_by_user_id: null }
    ],
    logs: [
      { id: 1, file: 'auth.log', label: 'Authentication Audit', content: '[12:10] victim.admin signed in\n[12:15] attacker1 signed in' },
      { id: 2, file: 'invite.log', label: 'Invite Audit', content: '[12:21] invite 7001 created\n[12:23] invite 7002 created' },
      { id: 3, file: 'projects.log', label: 'Project Activity', content: '[12:30] Asset Inventory updated\n[12:33] Role Sync Engine saved' },
      { id: 4, file: 'billing.log', label: 'Billing Events', content: '[12:40] invoice generated\n[12:41] payment confirmed' }
    ],
    profile_updates: [],
    challenge_progress: [
      { user_id: 4, flag_submitted: false }
    ],
    audit_logs: [
      { id: 1, type: 'seed', actor_user_id: 1, target_user_id: 1, message: 'Lab 6 initialized', created_at: now }
    ]
  }).write();
}

db.defaults({
  users: [],
  orgs: [],
  org_members: [],
  projects: [],
  invites: [],
  logs: [],
  profile_updates: [],
  challenge_progress: [],
  audit_logs: []
}).write();

if (db.get('users').size().value() === 0) {
  seedDb();
}

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

function getOrgMember(orgId, userId) {
  return db.get('org_members').find({ org_id: orgId, user_id: userId }).value();
}

function getCurrentOrg(user) {
  return db.get('orgs').find({ id: user.org_id }).value();
}

function getCurrentRole(user) {
  const member = getOrgMember(user.org_id, user.id);
  return member ? member.role : 'employee';
}

function addAudit(entry) {
  const id = nextId('audit_logs');
  db.get('audit_logs').push({ id, created_at: new Date().toISOString(), ...entry }).write();
}

function canUseRole(actorRole, targetRole) {
  return roleRank(actorRole) >= roleRank(targetRole);
}

function listRootFolders() {
  return ['logs/', 'backend/', 'frontend/', 'data/'];
}

function listBackendFiles() {
  return ['server.py', 'worker.py', 'queue.py', 'requirements.txt'];
}

function listFrontendFiles() {
  return ['index.html', 'login.html', 'dashboard.html', 'org.html', 'invites.html', 'logs.html', 'admin.html', 'script.js'];
}

function listDataFiles() {
  return ['db.json', 'secrets.json', 'flags.json', 'audit.json'];
}

function listLogFiles() {
  return db.get('logs').value().map((item) => item.file).sort();
}

function viewLogPath(rawPath) {
  const raw = String(rawPath || '').replace(/\\/g, '/').trim();
  const fromLogs = raw && !raw.startsWith('/')
    ? path.posix.normalize(path.posix.join('/logs', raw))
    : path.posix.normalize(raw || '/logs');
  const normalized = fromLogs.startsWith('/') ? fromLogs : `/${fromLogs}`;

  if (normalized === '/' || normalized === '/.') {
    return { mode: 'listing', title: '/', entries: listRootFolders() };
  }

  if (normalized === '/logs' || normalized === '/logs/') {
    return { mode: 'listing', title: '/logs', entries: listLogFiles() };
  }

  if (normalized === '/backend' || normalized === '/backend/') {
    return { mode: 'listing', title: '/backend', entries: listBackendFiles() };
  }

  if (normalized === '/backend/server.py') {
    return { mode: 'content', title: '/backend/server.py', content: BACKEND_SNIPPET };
  }

  if (normalized === '/frontend' || normalized === '/frontend/') {
    return { mode: 'listing', title: '/frontend', entries: listFrontendFiles() };
  }

  if (normalized === '/data' || normalized === '/data/') {
    return { mode: 'listing', title: '/data', entries: listDataFiles() };
  }

  if (normalized === '/data/db.json') {
    return { mode: 'content', title: '/data/db.json', content: JSON.stringify(db.getState(), null, 2).slice(0, 8000) };
  }

  if (normalized.startsWith('/logs/')) {
    const fileName = path.posix.basename(normalized);
    const file = db.get('logs').find({ file: fileName }).value();
    if (file) {
      return { mode: 'content', title: `/logs/${file.file}`, content: file.content };
    }
  }

  return {
    mode: 'listing',
    title: normalized,
    entries: ['No such path in simulated workspace']
  };
}

function simulateSecretShell(input) {
  const dirs = {
    '/': ['secret', 'README.txt', 'config.txt', 'var', 'home'],
    '/secret': ['flag.txt', 'notes.txt'],
    '/var': ['log'],
    '/var/log': ['auth.log', 'system.log'],
    '/home': ['app'],
    '/home/app': ['run.sh']
  };

  const files = {
    '/README.txt': 'lab6 simulated host',
    '/config.txt': 'ENV=prod\nLOG_LEVEL=info',
    '/secret/flag.txt': FLAG_VALUE,
    '/secret/notes.txt': 'do not expose shell in production',
    '/var/log/auth.log': 'Apr 06 auth: accepted token for owned.manager',
    '/var/log/system.log': 'Apr 06 kernel: scheduler tick ok',
    '/home/app/run.sh': '#!/bin/sh\necho running'
  };

  const resolvePath = (cwd, target) => {
    const candidate = target.startsWith('/')
      ? target
      : path.posix.join(cwd, target || '.');
    const normalized = path.posix.normalize(candidate);
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  };

  const formatListing = (dirPath, longMode) => {
    const entries = dirs[dirPath] || [];
    if (!longMode) return entries.join('\n');

    return entries.map((entry) => {
      const full = path.posix.join(dirPath, entry);
      const isDir = !!dirs[full];
      const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
      const size = isDir ? 4096 : (files[full] || '').length || 64;
      return `${perms} 1 root root ${String(size).padStart(5, ' ')} Apr  6 12:00 ${entry}`;
    }).join('\n');
  };

  const normalizedInput = String(input || '').replace(/\+/g, ' ');
  const commands = normalizedInput.split(';').map((part) => part.trim()).filter(Boolean);
  let cwd = '/';
  const outputs = [];

  for (const command of commands) {
    if (command === 'pwd') {
      outputs.push(cwd);
      continue;
    }

    if (command === 'whoami') {
      outputs.push('svc-lab6');
      continue;
    }

    if (command === 'id') {
      outputs.push('uid=1001(svc-lab6) gid=1001(svc-lab6) groups=1001(svc-lab6)');
      continue;
    }

    if (command === 'uname -a') {
      outputs.push('Linux lab6-host 5.15.0-sim #1 SMP x86_64 GNU/Linux');
      continue;
    }

    if (command === 'help') {
      outputs.push('supported: ls, ls -la, pwd, cd, cat, whoami, id, uname -a, echo');
      continue;
    }

    if (command.startsWith('echo ')) {
      outputs.push(command.slice(5));
      continue;
    }

    if (command === 'ls' || command === 'dir' || command === 'ls -l' || command === 'ls -la' || command.starts    cd+secret;cat+flag.txt;With('ls ')) {
      const longMode = command.includes('-l');
      const target = command === 'ls' || command === 'dir'
        ? ''
        : command.replace(/^ls\s+-la\s*|^ls\s+-l\s*|^ls\s+/, '').trim();
      const targetPath = resolvePath(cwd, target || '.');
      const realPath = targetPath === '/.' ? '/' : targetPath;

      if (!dirs[realPath]) {
        outputs.push(`ls: cannot access '${target || realPath}': No such file or directory`);
      } else {
        outputs.push(formatListing(realPath, longMode));
      }
      continue;
    }

    if (command.startsWith('cd ')) {
      const target = command.slice(3).trim() || '/';
      const targetPath = resolvePath(cwd, target);
      if (!dirs[targetPath]) {
        outputs.push(`cd: ${target}: No such file or directory`);
      } else {
        cwd = targetPath;
      }
      continue;
    }

    if (command.startsWith('cat ')) {
      const target = command.slice(4).trim();
      const fullPath = resolvePath(cwd, target);
      if (dirs[fullPath]) {
        outputs.push(`cat: ${target}: Is a directory`);
      } else if (!(fullPath in files)) {
        outputs.push(`cat: ${target}: No such file or directory`);
      } else {
        outputs.push(files[fullPath]);
      }
      continue;
    }

    outputs.push(`sh: ${command}: command not found`);
  }

  return outputs.join('\n') || formatListing('/', false);
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/api/reset', (req, res) => {
  seedDb();
  res.json({ success: true, message: 'Lab 6 reset complete' });
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
  const member = getOrgMember(req.user.org_id, req.user.id);
  const role = member ? member.role : 'employee';

  res.json({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name,
    email: req.user.email,
    orgId: req.user.org_id,
    orgName: org ? org.name : null,
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager'
  });
});

app.get('/api/dashboard/summary', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  res.json({
    org,
    projectsCount: db.get('projects').filter({ org_id: req.user.org_id }).size().value(),
    membersCount: db.get('org_members').filter({ org_id: req.user.org_id }).size().value(),
    invitesCount: db.get('invites').filter({ org_id: req.user.org_id, status: 'pending' }).size().value(),
    openLogs: db.get('logs').size().value()
  });
});

app.get('/api/org/current', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  res.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    plan: org.plan,
    trial_days_left: org.trial_days_left,
    members: db.get('org_members').filter({ org_id: org.id }).value().map((member) => {
      const user = db.get('users').find({ id: member.user_id }).value();
      return {
        user_id: member.user_id,
        username: user ? user.username : `user-${member.user_id}`,
        email: user ? user.email : 'unknown@example.local',
        role: member.role
      };
    }),
    projects: db.get('projects').filter({ org_id: org.id }).value(),
    invites: db.get('invites').filter({ org_id: org.id, status: 'pending' }).value()
  });
});

app.post('/api/org/current/rename', authMiddleware, (req, res) => {
  const newName = String(req.body.name || '').trim();
  const member = getOrgMember(req.user.org_id, req.user.id);
  if (!member || member.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  if (!newName) return res.status(400).json({ message: 'Name is required' });

  db.get('orgs').find({ id: req.user.org_id }).assign({ name: newName }).write();
  addAudit({ type: 'org_rename', actor_user_id: req.user.id, message: `Org renamed to ${newName}` });
  res.json({ success: true, displayName: newName });
});

app.get('/api/org/members', authMiddleware, (req, res) => {
  const members = db.get('org_members').filter({ org_id: req.user.org_id }).value().map((member) => {
    const user = db.get('users').find({ id: member.user_id }).value();
    return {
      user_id: member.user_id,
      username: user ? user.username : `user-${member.user_id}`,
      name: user ? user.name : 'Unknown',
      email: user ? user.email : 'unknown@example.local',
      role: member.role,
      isVictimAdmin: member.user_id === 1,
      isAttackerControlled: user ? user.email === ATTACKER_CONTROLLED_EMAIL : false
    };
  });

  res.json(members);
});

app.post('/api/org/members/:id/role', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  const newRole = String(req.body.role || '').trim();
  const actorRole = getCurrentRole(req.user);
  const targetMember = getOrgMember(req.user.org_id, targetUserId);

  if (!targetMember) return res.status(404).json({ message: 'Member not found' });
  if (!['admin', 'manager', 'employee'].includes(newRole)) return res.status(400).json({ message: 'Invalid role' });
  if (actorRole !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const oldRole = targetMember.role;
  db.get('org_members').find({ org_id: req.user.org_id, user_id: targetUserId }).assign({ role: newRole }).write();
  addAudit({ type: 'role_change', actor_user_id: req.user.id, target_user_id: targetUserId, from_role: oldRole, to_role: newRole, message: `Role updated for ${targetUserId}` });
  res.json({ success: true, oldRole, newRole });
});

app.post('/api/org/members/:id/remove', authMiddleware, (req, res) => {
  const targetUserId = Number(req.params.id);
  const actorRole = getCurrentRole(req.user);
  const targetMember = getOrgMember(req.user.org_id, targetUserId);

  if (!targetMember) return res.status(404).json({ message: 'Member not found' });
  if (actorRole !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  if (targetUserId === req.user.id) return res.status(400).json({ message: 'Cannot remove yourself' });

  const user = db.get('users').find({ id: targetUserId }).value();
  db.get('org_members').remove({ org_id: req.user.org_id, user_id: targetUserId }).write();
  if (user) db.get('users').find({ id: targetUserId }).assign({ org_id: null }).write();
  addAudit({ type: 'member_remove', actor_user_id: req.user.id, target_user_id: targetUserId, message: `Member removed: ${targetUserId}` });
  res.json({ success: true, removedUserId: targetUserId });
});

app.get('/api/projects', authMiddleware, (req, res) => {
  res.json(db.get('projects').filter({ org_id: req.user.org_id }).value());
});

app.get('/api/org/projects', authMiddleware, (req, res) => {
  res.json(db.get('projects').filter({ org_id: req.user.org_id }).value());
});

app.post('/api/org/projects', authMiddleware, (req, res) => {
  const actorRole = getCurrentRole(req.user);
  if (!['admin', 'manager'].includes(actorRole)) return res.status(403).json({ message: 'Forbidden' });

  const name = String(req.body.name || '').trim();
  const summary = String(req.body.summary || '').trim();
  if (!name || !summary) return res.status(400).json({ message: 'Name and summary are required' });

  const project = {
    id: nextId('projects'),
    org_id: req.user.org_id,
    name,
    summary,
    status: 'active',
    owner_user_id: req.user.id,
    created_at: new Date().toISOString()
  };
  db.get('projects').push(project).write();
  addAudit({ type: 'project_create', actor_user_id: req.user.id, message: `Project created: ${name}` });
  res.json({ success: true, project });
});

app.get('/api/org/invites', authMiddleware, (req, res) => {
  const invites = req.user.org_id
    ? db.get('invites').filter({ org_id: req.user.org_id }).value()
    : db.get('invites').filter((invite) => invite.status === 'pending' && invite.email.toLowerCase() === req.user.email.toLowerCase()).value();
  res.json(invites);
});

app.post('/api/org/invites', authMiddleware, (req, res) => {
  const actorRole = getCurrentRole(req.user);
  const requestedEmail = String(req.body.email || '').trim();
  const requestedRole = String(req.body.role || 'employee').trim();
  const inviteId = req.body.invite_id ?? req.body.inviteId;

  if (inviteId) {
    const targetId = Number(inviteId);
    const invite = db.get('invites').find({ id: targetId, org_id: req.user.org_id }).value();
    if (!invite) return res.status(404).json({ message: 'Invite not found' });

    if (!requestedEmail) return res.status(400).json({ message: 'Email is required' });

    invite.email = requestedEmail;
    invite.updated_at = new Date().toISOString();
    invite.updated_by_user_id = req.user.id;
    db.get('invites').find({ id: invite.id }).assign(invite).write();
    addAudit({ type: 'invite_update', actor_user_id: req.user.id, target_user_id: invite.id, message: `Invite updated: ${invite.id}` });
    return res.json({ success: true, invite, hidden_idor: true });
  }

  if (!requestedEmail) return res.status(400).json({ message: 'Email is required' });
  if (!['admin', 'manager', 'employee'].includes(requestedRole)) return res.status(400).json({ message: 'Invalid role' });
  if (actorRole === 'employee') return res.status(403).json({ message: 'Forbidden' });
  if (actorRole === 'manager' && requestedRole !== 'employee') return res.status(403).json({ message: 'Forbidden' });

  const invite = {
    id: 7000 + nextId('invites'),
    org_id: req.user.org_id,
    email: requestedEmail,
    role: requestedRole,
    status: 'pending',
    created_by_user_id: req.user.id,
    created_at: new Date().toISOString(),
    accepted_by_user_id: null
  };
  db.get('invites').push(invite).write();
  addAudit({ type: 'invite_create', actor_user_id: req.user.id, target_user_id: invite.id, message: `Invite created for ${requestedEmail}` });
  res.json({ success: true, invite });
});

app.post('/api/org/invites/:id/accept', authMiddleware, (req, res) => {
  const inviteId = Number(req.params.id);
  const invite = db.get('invites').find({ id: inviteId, org_id: req.user.org_id || ORG_ID }).value();
  if (!invite) return res.status(404).json({ message: 'Invite not found' });
  if (invite.status !== 'pending') return res.status(400).json({ message: 'Invite already used' });
  if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const existing = getOrgMember(invite.org_id, req.user.id);
  if (existing) {
    db.get('org_members').find({ org_id: invite.org_id, user_id: req.user.id }).assign({ role: invite.role }).write();
  } else {
    db.get('org_members').push({ org_id: invite.org_id, user_id: req.user.id, role: invite.role, joined_at: new Date().toISOString() }).write();
  }
  db.get('users').find({ id: req.user.id }).assign({ org_id: invite.org_id }).write();
  db.get('invites').find({ id: invite.id }).assign({ status: 'accepted', accepted_by_user_id: req.user.id, accepted_at: new Date().toISOString() }).write();
  addAudit({ type: 'invite_accept', actor_user_id: req.user.id, target_user_id: invite.id, message: `Invite accepted by ${req.user.email}` });
  res.json({ success: true, role: invite.role, org_id: invite.org_id });
});

app.get('/api/logs', authMiddleware, (req, res) => {
  const role = getCurrentRole(req.user);
  if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  res.json(db.get('logs').value());
});

app.get('/api/logs/view', authMiddleware, (req, res) => {
  const role = getCurrentRole(req.user);
  if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const view = viewLogPath(req.query.log);
  res.json(view);
});

app.get('/api/backend/snippet', authMiddleware, (req, res) => {
  const role = getCurrentRole(req.user);
  if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  res.json({ file: 'backend/server.py', snippet: BACKEND_SNIPPET });
});

app.get('/api/secret', authMiddleware, (req, res) => {
  const role = getCurrentRole(req.user);
  if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const file = req.query.file || '';
  const output = simulateSecretShell(file);
  res.json({ success: true, output });
});

app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email });
});

app.post('/api/profile', authMiddleware, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name is required' });
  db.get('users').find({ id: req.user.id }).assign({ name }).write();
  addAudit({ type: 'profile_update', actor_user_id: req.user.id, message: `Profile updated: ${name}` });
  res.json({ success: true, name });
});

function taskOneSolved() {
  const attackerUser = db.get('users').find({ email: ATTACKER_CONTROLLED_EMAIL }).value();
  const attackerMember = attackerUser ? getOrgMember(ORG_ID, attackerUser.id) : null;
  const victimMember = getOrgMember(ORG_ID, 1);
  const victimDowngradedOrRemoved = !victimMember || victimMember.role !== 'admin';

  return !!attackerMember && attackerMember.role === 'admin' && victimDowngradedOrRemoved;
}

app.get('/api/challenge/status', authMiddleware, (req, res) => {
  const progress = db.get('challenge_progress').find({ user_id: 4 }).value() || { flag_submitted: false };
  const me = db.get('users').find({ id: req.user.id }).value();
  const member = getOrgMember(req.user.org_id, req.user.id);
  res.json({
    task1: taskOneSolved(),
    task2: !!progress.flag_submitted,
    isAdmin: member ? member.role === 'admin' : false,
    email: me ? me.email : null
  });
});

app.post('/api/challenge/submit-flag', authMiddleware, (req, res) => {
  const submittedFlag = String(req.body.flag || '').trim();
  if (submittedFlag !== FLAG_VALUE) {
    return res.status(400).json({ success: false, message: 'Incorrect flag' });
  }

  const existing = db.get('challenge_progress').find({ user_id: 4 }).value();
  if (existing) {
    db.get('challenge_progress').find({ user_id: 4 }).assign({ flag_submitted: true }).write();
  } else {
    db.get('challenge_progress').push({ user_id: 4, flag_submitted: true }).write();
  }

  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log(`Lab 6 server running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing Lab 6 server or start this one with a different PORT.`);
    process.exitCode = 1;
    return;
  }

  throw error;
});
