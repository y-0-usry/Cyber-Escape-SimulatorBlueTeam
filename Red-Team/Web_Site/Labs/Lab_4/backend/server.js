const express = require('express');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const dataDir = path.join(__dirname, '../Data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = lowdb(adapter);

const FLAG_VALUE = 'FLAG{hidden_owner_idor_delete_takeover}';
const VICTIM_ORG_ID = 200;
const ORIGINAL_OWNER_ID = 10;
const ATTACKER_ID = 11;

function roleLabel(accessRights) {
  if (accessRights === 1) return 'owner';
  if (accessRights === 2) return 'admin';
  if (accessRights === 3) return 'viewer';
  return 'unknown';
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));

function seedDb() {
  db.setState({
    users: [
      {
        id: ORIGINAL_OWNER_ID,
        username: 'account_owner',
        password: 'OwnerSafe2026!',
        token: null,
        name: 'account owner',
        email: 'owner@bigscope.local',
        org_id: VICTIM_ORG_ID
      },
      {
        id: ATTACKER_ID,
        username: 'attacker1',
        password: 'TakeOver2026!',
        token: null,
        name: 'Red Team Operator',
        email: 'attacker@redscope.local',
        org_id: VICTIM_ORG_ID
      },
      {
        id: 12,
        username: 'admin_ops',
        password: 'OpsPass2026!',
        token: null,
        name: 'Ops Admin',
        email: 'ops@bigscope.local',
        org_id: VICTIM_ORG_ID
      },
      {
        id: 13,
        username: 'viewer_audit',
        password: 'ViewerPass2026!',
        token: null,
        name: 'Audit Viewer',
        email: 'audit@bigscope.local',
        org_id: VICTIM_ORG_ID
      },
      {
        id: 14,
        username: 'viewer_support',
        password: 'ViewerPass2026!',
        token: null,
        name: 'Support Viewer',
        email: 'support@bigscope.local',
        org_id: VICTIM_ORG_ID
      }
    ],
    orgs: [
      {
        id: VICTIM_ORG_ID,
        name: 'BigScope Security',
        slug: 'bigscope-security',
        creator_user_id: ORIGINAL_OWNER_ID,
        description: 'Enterprise attack surface management workspace.',
        trial_days_left: 9,
        plan: 'business'
      }
    ],
    org_members: [
      { org_id: VICTIM_ORG_ID, user_id: ORIGINAL_OWNER_ID, access_rights: 1, joined_at: new Date().toISOString() },
      { org_id: VICTIM_ORG_ID, user_id: ATTACKER_ID, access_rights: 2, joined_at: new Date().toISOString() },
      { org_id: VICTIM_ORG_ID, user_id: 12, access_rights: 2, joined_at: new Date().toISOString() },
      { org_id: VICTIM_ORG_ID, user_id: 13, access_rights: 3, joined_at: new Date().toISOString() },
      { org_id: VICTIM_ORG_ID, user_id: 14, access_rights: 3, joined_at: new Date().toISOString() }
    ],
    projects: [
      { id: 1, org_id: VICTIM_ORG_ID, name: 'Bug Intake Automation', status: 'active' },
      { id: 2, org_id: VICTIM_ORG_ID, name: 'Triage Correlation Engine', status: 'active' },
      { id: 3, org_id: VICTIM_ORG_ID, name: 'Asset Exposure Watch', status: 'active' }
    ],
    audit_logs: [
      {
        id: 1,
        type: 'seed',
        actor_user_id: ORIGINAL_OWNER_ID,
        target_user_id: ORIGINAL_OWNER_ID,
        from_access_rights: 1,
        to_access_rights: 1,
        message: 'Seed initialized',
        created_at: new Date().toISOString()
      }
    ],
    challenge_progress: [
      { user_id: ATTACKER_ID, flag_submitted: false }
    ],
    reports: [
      { id: 1, title: 'Monthly Abuse Report', severity: 'medium', status: 'open' },
      { id: 2, title: 'Role Drift Analysis', severity: 'high', status: 'open' }
    ],
    billing_events: [
      { id: 1, event: 'invoice_generated', amount: 1200, currency: 'USD' },
      { id: 2, event: 'payment_success', amount: 1200, currency: 'USD' }
    ]
  }).write();
}

db.defaults({ users: [], orgs: [], org_members: [], projects: [], audit_logs: [], challenge_progress: [], reports: [], billing_events: [] }).write();
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

function getMember(orgId, userId) {
  return db.get('org_members').find({ org_id: orgId, user_id: userId }).value();
}

function getCurrentOrg(user) {
  return db.get('orgs').find({ id: user.org_id }).value();
}

function addAuditLog(entry) {
  const nextId = db.get('audit_logs').size().value() + 1;
  db.get('audit_logs').push({ id: nextId, created_at: new Date().toISOString(), ...entry }).write();
}

function taskOneSolved(userId) {
  const member = getMember(VICTIM_ORG_ID, userId);
  if (!member || member.access_rights !== 1) return false;

  return db.get('audit_logs').find((log) =>
    log.type === 'role_change' &&
    log.actor_user_id === userId &&
    log.target_user_id === userId &&
    log.from_access_rights === 2 &&
    log.to_access_rights === 1
  ).value() !== undefined;
}

function taskTwoSolved(userId) {
  return db.get('audit_logs').find((log) =>
    log.type === 'role_change' &&
    log.actor_user_id === userId &&
    log.target_user_id === ORIGINAL_OWNER_ID &&
    log.from_access_rights === 1 &&
    (log.to_access_rights === 2 || log.to_access_rights === 3)
  ).value() !== undefined;
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.post('/api/reset', (req, res) => {
  seedDb();
  res.json({ success: true, message: 'Lab 4 reset complete' });
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
  const member = getMember(req.user.org_id, req.user.id);
  res.json({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name,
    email: req.user.email,
    orgId: req.user.org_id,
    orgName: org ? org.name : null,
    access_rights: member ? member.access_rights : null,
    role: member ? roleLabel(member.access_rights) : 'none'
  });
});

app.get('/api/dashboard/summary', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  const membersCount = db.get('org_members').filter({ org_id: req.user.org_id }).size().value();
  const projectsCount = db.get('projects').filter({ org_id: req.user.org_id }).size().value();
  const reportsCount = db.get('reports').size().value();
  res.json({
    org,
    membersCount,
    projectsCount,
    reportsCount,
    unresolvedFindings: 6
  });
});

app.get('/api/org/current', authMiddleware, (req, res) => {
  const org = getCurrentOrg(req.user);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  res.json({
    ...org,
    membersCount: db.get('org_members').filter({ org_id: org.id }).size().value(),
    projectsCount: db.get('projects').filter({ org_id: org.id }).size().value()
  });
});

app.get('/api/org/members', authMiddleware, (req, res) => {
  const members = db.get('org_members').filter({ org_id: req.user.org_id }).value().map((member) => {
    const user = db.get('users').find({ id: member.user_id }).value();
    return {
      user_id: member.user_id,
      username: user ? user.username : `user-${member.user_id}`,
      name: user ? user.name : 'Unknown',
      email: user ? user.email : 'unknown@example.local',
      access_rights: member.access_rights,
      role: roleLabel(member.access_rights),
      is_original_owner: member.user_id === ORIGINAL_OWNER_ID
    };
  });

  res.json(members);
});

app.post('/api/org/members/:id/access', authMiddleware, (req, res) => {
  const targetIdUrl = +req.params.id;
  const targetIdBody = +req.body.user_id;
  const newAccess = +req.body.access_rights;

  if (![1, 2, 3].includes(newAccess)) {
    return res.status(400).json({ message: 'Invalid access_rights value' });
  }

  const actorMember = getMember(req.user.org_id, req.user.id);
  const targetMember = getMember(req.user.org_id, targetIdUrl);
  if (!actorMember || !targetMember) return res.status(404).json({ message: 'Member not found' });

  const actorRoleBefore = actorMember.access_rights;

  // Hidden-role vulnerability: admin can set self to owner by aligning URL + body ids.
  const hiddenRoleBypass = actorRoleBefore === 2 &&
    targetIdUrl === req.user.id &&
    targetIdBody === req.user.id &&
    newAccess === 1;

  // Outside the hidden bypass path, owner role is not assignable via normal UI/workflow.
  if (newAccess === 1 && !hiddenRoleBypass) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (!hiddenRoleBypass) {
    if (actorRoleBefore === 3) return res.status(403).json({ message: 'Forbidden' });

    if (actorRoleBefore === 2) {
      if (targetMember.access_rights === 1) return res.status(403).json({ message: 'Forbidden' });
      if (![2, 3].includes(newAccess)) return res.status(403).json({ message: 'Forbidden' });
    }

    if (actorRoleBefore === 1) {
      // Owner can change any role. This supports scenario #2 once attacker becomes owner.
    }
  }

  const oldAccess = targetMember.access_rights;
  db.get('org_members').find({ org_id: req.user.org_id, user_id: targetIdUrl }).assign({ access_rights: newAccess }).write();

  addAuditLog({
    type: 'role_change',
    actor_user_id: req.user.id,
    target_user_id: targetIdUrl,
    from_access_rights: oldAccess,
    to_access_rights: newAccess,
    hidden_role_bypass: hiddenRoleBypass,
    message: `Role updated for user ${targetIdUrl}`
  });

  res.json({
    success: true,
    target_user_id: targetIdUrl,
    old_access_rights: oldAccess,
    new_access_rights: newAccess,
    hidden_role_bypass: hiddenRoleBypass
  });
});

app.post('/api/org/members/:id/delete', authMiddleware, (req, res) => {
  const targetId = +req.params.id;
  const actorMember = getMember(req.user.org_id, req.user.id);
  const targetMember = getMember(req.user.org_id, targetId);

  if (!actorMember || !targetMember) return res.status(404).json({ message: 'Member not found' });
  if (actorMember.access_rights !== 1) return res.status(403).json({ message: 'Forbidden' });

  if (targetMember.access_rights === 1) {
    return res.status(403).json({ message: 'Cannot delete active owner' });
  }

  db.get('org_members').remove({ org_id: req.user.org_id, user_id: targetId }).write();

  const deletedUser = db.get('users').find({ id: targetId }).value();
  addAuditLog({
    type: 'member_delete',
    actor_user_id: req.user.id,
    target_user_id: targetId,
    from_access_rights: targetMember.access_rights,
    to_access_rights: null,
    hidden_role_bypass: false,
    message: `Member deleted: ${deletedUser ? deletedUser.username : targetId}`
  });

  const takeoverDelete = req.user.id === ATTACKER_ID && targetId === ORIGINAL_OWNER_ID;
  if (takeoverDelete) {
    return res.json({
      success: true,
      message: 'Member deleted successfully',
      flag: FLAG_VALUE
    });
  }

  res.json({ success: true, message: 'Member deleted successfully' });
});

app.get('/api/projects', authMiddleware, (req, res) => {
  const projects = db.get('projects').filter({ org_id: req.user.org_id }).value();
  res.json(projects);
});

app.get('/api/reports', authMiddleware, (req, res) => {
  res.json(db.get('reports').value());
});

app.get('/api/billing/events', authMiddleware, (req, res) => {
  res.json(db.get('billing_events').value());
});

app.get('/api/audit/logs', authMiddleware, (req, res) => {
  const logs = db.get('audit_logs').value().slice().reverse();
  res.json(logs);
});

app.get('/api/challenge/status', authMiddleware, (req, res) => {
  const progress = db.get('challenge_progress').find({ user_id: req.user.id }).value() || { flag_submitted: false };
  const member = getMember(req.user.org_id, req.user.id);
  res.json({
    task1: taskOneSolved(req.user.id),
    task2: taskTwoSolved(req.user.id),
    task3: !!progress.flag_submitted,
    role: member ? roleLabel(member.access_rights) : 'none',
    access_rights: member ? member.access_rights : null,
    logsCount: db.get('audit_logs').size().value()
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

app.listen(3014, () => {
  console.log('Lab 4 server running at http://localhost:3014');
});
