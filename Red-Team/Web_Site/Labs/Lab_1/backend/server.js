const express = require('express');
const bodyParser = require('body-parser');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const cookieParser = require('cookie-parser'); // Added for cookie handling in 2FA vulnerability

const app = express();
const dataDir = path.join(__dirname, '../Data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = lowdb(adapter);

app.use(bodyParser.json());
app.use(cookieParser()); // Added for cookie handling
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));
app.use('/Data', express.static(path.join(__dirname, '../Data'))); // Serve Data folder (for Flag.mp4 and other files)

// Redirect root path to game page
app.get('/', (req, res) => {
  res.redirect('/game.html');
});

db.defaults({
  users: [],
  projects: [],
  exploits: {},
  notifications: [],
  trash: [] // Added for trash functionality
}).write();

// Request tracking disabled - race conditions now succeed 100%
// const requestCounters = {
//   '/api/projects': { count: 0, batch: 0 },
//   '/api/trash/:id/restore': { count: 0, batch: 0 },
//   '/api/projects/:id/notes': { count: 0, batch: 0 }
// };

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const user = db.get('users').find({ token }).value();
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  req.user = user;
  next();
}

app.post('/api/reset', (req, res) => {
  db.set('users', [
    { id: 1, username: 'admin1', password: 'pass1', token: null, profile: { bio: 'Admin user - Project A owner', avatar: '' }, subscribed: false },
    { id: 2, username: 'viewer2', password: 'pass2', token: null, profile: { bio: 'Viewer user', avatar: '' }, subscribed: false },
    { id: 3, username: 'creator3', password: 'pass3', token: null, profile: { bio: 'Creator user - Project B owner (has the FLAG)', avatar: '' }, subscribed: false },
    { id: 4, username: 'target_user', password: 'SecurePass456!', token: null, profile: { bio: 'Target user - Add this user to Project B to find FLAG', avatar: '' }, subscribed: false },
    { id: 5, username: 'attacker1', password: 'exploit123', token: null, profile: { bio: 'Red Team Attacker', avatar: '' }, subscribed: false }
  ]).write();

  db.set('projects', [
    {
      id: 1,
      name: 'Project A',
      description: 'Public collaboration project for team members.',
      creator_id: 1,
      members: [
        { user_id: 5, role: 'viewer', purchased: false }
      ],
      notes: [
        { id: 1, content: 'Welcome to Project A! This is a collaborative workspace.', comments: [], created_at: new Date().toISOString() }
      ],
      tasks: [],
      files: [],
      activity: [{ id: 1, type: 'project_created', user_id: 1, message: 'Project A created', timestamp: new Date().toISOString() }]
    },
    {
      id: 2,
      name: 'Secret Project - Confidential',
      description: 'RESTRICTED ACCESS - Contains classified information.',
      creator_id: 3,
      members: [],
      notes: [
        { 
          id: 1, 
          content: '🔒 CONFIDENTIAL NOTE\n\n[VIDEO ATTACHMENT: Flag.mp4]\n\n🚩 FLAG{youm_wara_youm_habiby_magani_noum}\n\n⚠️ WARNING: This project contains sensitive information. Unauthorized access is prohibited.', 
          comments: [], 
          created_at: new Date().toISOString(),
          hasVideo: true,
          videoName: 'Flag.mp4'
        }
      ],
      tasks: [],
      files: [],
      activity: [{ id: 1, type: 'project_created', user_id: 3, message: 'Secret Project created', timestamp: new Date().toISOString() }]
    }
  ]).write();

  db.set('exploits', {}).write();
  db.set('notifications', []).write();
  db.set('trash', []).write(); // Added for trash

  res.json({ message: 'Lab reset successful' });
});

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  if (db.get('users').find({ username }).value()) {
    return res.status(400).json({ message: 'Username taken' });
  }
  const id = db.get('users').size().value() + 1;
  db.get('users').push({ id, username, password, token: null, profile: { bio: '', avatar: '' }, subscribed: false }).write();
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find({ username, password }).value();
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const token = crypto.createHash('sha256').update(user.id + Date.now().toString()).digest('hex');
  db.get('users').find({ id: user.id }).assign({ token }).write();
  res.cookie('_auth', 'false', { httpOnly: false }); // Set cookie for 2FA vulnerability
  res.json({ token });
});

app.post('/api/verify-2fa', (req, res) => {
  const { code } = req.body;
  if (code === '123456') {
    res.cookie('_auth', 'true', { httpOnly: false }); // Set to true on valid code
    res.json({ success: true });
  } else {
    res.status(400).json({ message: 'Invalid 2FA code' });
  }
});

app.post('/api/logout', authMiddleware, (req, res) => {
  db.get('users').find({ id: req.user.id }).assign({ token: null }).write();
  res.clearCookie('_auth');
  res.json({ success: true });
});

app.get('/api/users/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, bio: req.user.profile.bio, avatar: req.user.profile.avatar });
});

app.put('/api/users/me', authMiddleware, (req, res) => {
  const { bio, newPassword, avatar } = req.body;
  const updates = { profile: { bio: bio || req.user.profile.bio, avatar: avatar || req.user.profile.avatar } };
  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password too short' });
    }
    updates.password = newPassword;
  }
  db.get('users').find({ id: req.user.id }).assign(updates).write();
  res.json({ success: true });
});

app.get('/api/users/search', authMiddleware, (req, res) => {
  const { q } = req.query;
  const users = db.get('users').filter(u => u.username.toLowerCase().includes(q.toLowerCase()) && u.id !== req.user.id).value();
  res.json(users.map(u => ({ id: u.id, username: u.username })));
});

// Progress verification endpoint
app.get('/api/verify-progress', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  // Check total projects created by this user
  const userProjects = db.get('projects').filter(p => p.creator_id === userId).value();
  const projectsCount = userProjects.length;

  res.json({
    projectsCount: projectsCount
  });
});

app.get('/api/projects', authMiddleware, (req, res) => {
  const projects = db.get('projects').filter(p => p.creator_id === req.user.id || p.members.some(m => m.user_id === req.user.id)).value();
  res.json(projects);
});

app.get('/api/projects/:id', authMiddleware, (req, res) => {
  const project = db.get('projects').find({ id: +req.params.id }).value();
  if (!project || (project.creator_id !== req.user.id && !project.members.some(m => m.user_id === req.user.id))) {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.json(project);
});

app.put('/api/projects/:id', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  if (name) project.name = name;
  if (description) project.description = description;
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'project_updated',
    user_id: req.user.id,
    message: `Project updated by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true, name: safeName });
});

app.delete('/api/projects/:id', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.creator_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
  db.get('trash').push({ ...project, deleted_at: new Date().toISOString() }).write(); // Move to trash
  db.get('projects').remove({ id: projectId }).write();
  db.get('notifications').push({
    id: db.get('notifications').size().value() + 1,
    user_id: req.user.id,
    message: `Project ${project.name} moved to trash`,
    read: false,
    timestamp: new Date().toISOString()
  }).write();
  res.json({ success: true });
});

app.get('/api/trash', authMiddleware, (req, res) => {
  const trashProjects = db.get('trash').filter({ creator_id: req.user.id }).value();
  res.json(trashProjects);
});

app.post('/api/trash/:id/restore', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const trashProject = db.get('trash').find({ id: projectId, creator_id: req.user.id }).value();
  if (!trashProject) return res.status(404).json({ message: 'Project not found in trash' });
  const userProjects = db.get('projects').filter({ creator_id: req.user.id }).value().length;
  const limit = req.user.subscribed ? 20 : 3;
  if (userProjects >= limit) return res.status(403).json({ message: 'Project limit reached. Subscribe to restore more.' });

  // Race condition: ALL requests succeed despite limit (no rejection)
  // Collision-based delay simulates concurrent processing
  const collision = Math.random();
  const delay = collision > 0.7 ? 200 + Math.floor(Math.random() * 101) : 50 + Math.floor(Math.random() * 101); // 50-150ms or 200-300ms
  setTimeout(() => {
    db.get('projects').push({ ...trashProject, restored_at: new Date().toISOString() }).write();
    db.get('trash').remove({ id: projectId }).write();
    res.json({ success: true });
  }, delay);
});

app.post('/api/subscribe', authMiddleware, (req, res) => {
  // This endpoint is not actually used since payment always fails, but added for completeness
  db.get('users').find({ id: req.user.id }).assign({ subscribed: true }).write();
  res.json({ success: true });
});

app.post('/api/payment', (req, res) => {
  // Always reject with relevant error
  const { cardNumber, expiry, cvv } = req.body;
  if (!cardNumber || cardNumber.length < 16) {
    return res.status(400).json({ message: 'Invalid card number' });
  }
  if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ message: 'Invalid expiry date' });
  }
  if (!cvv || cvv.length < 3) {
    return res.status(400).json({ message: 'Invalid CVV' });
  }
  res.status(400).json({ message: 'Payment declined: Insufficient funds or invalid details' });
});

app.get('/api/projects/:id/access', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  const purchased = project.creator_id === req.user.id || project.members.find(m => m.user_id === req.user.id)?.purchased || false;
  res.json({
    _is_admin: { value: isAdmin ? 'true' : 'false' },
    _is_purchased: { value: purchased ? 'true' : 'false' }
  });
});

app.post('/api/projects/:id/role', authMiddleware, (req, res) => {
  const { new_role } = req.body;
  if (!['viewer', 'commenter', 'admin'].includes(new_role)) return res.status(400).json({ message: 'Invalid role' });
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const memberIndex = project.members.findIndex(m => m.user_id === req.user.id);
  if (memberIndex === -1) return res.status(403).json({ message: 'Not a member' });
  project.members[memberIndex].role = new_role;
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'role_changed',
    user_id: req.user.id,
    message: `${req.user.username} changed role to ${new_role}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  if (new_role === 'admin' && !project.members[memberIndex].purchased) {
    let exploits = db.get(`exploits.${req.user.id}`).value() || { step: 0 };
    if (exploits.step < 1) {
      exploits.step = 1;
      db.set(`exploits.${req.user.id}`, exploits).write();
    }
  }
  res.json({ success: true });
});

app.post('/api/projects/:id/pay', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const member = project.members.find(m => m.user_id === req.user.id);
  if (!member) return res.status(403).json({ message: 'Not a member' });
  member.purchased = true;
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'payment',
    user_id: req.user.id,
    message: `${req.user.username} purchased admin upgrade`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/members', authMiddleware, (req, res) => {
  const { userId, role = 'viewer' } = req.body;
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.members.some(m => m.user_id === +userId)) return res.status(400).json({ message: 'Already member' });
  
  // VULNERABILITY: Missing ownership check - allows IDOR attack
  // Comment this out to enable the vulnerability:
  // const isRealAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  // if (!isRealAdmin) return res.status(403).json({ message: 'Unauthorized' });
  
  // VULNERABILITY: No proper authorization - allows anyone to add members if they have fake admin role
  project.members.push({ user_id: +userId, role, purchased: false });
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'member_added',
    user_id: req.user.id,
    message: `User ${userId} added as ${role}`,
    timestamp: new Date().toISOString()
  });
  db.get('notifications').push({
    id: db.get('notifications').size().value() + 1,
    user_id: +userId,
    message: `You were added to project ${project.name} as ${role}`,
    read: false,
    timestamp: new Date().toISOString()
  }).write();
  db.write();
  
  // Track exploit step if this was done by a fake admin (from privilege escalation)
  const isRealAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isRealAdmin) {
    let exploits = db.get(`exploits.${req.user.id}`).value() || { step: 0 };
    if (exploits.step === 1) {
      exploits.step = 2;
      db.set(`exploits.${req.user.id}`, exploits).write();
    }
  }
  res.json({ success: true });
});

app.delete('/api/projects/:id/members/:userId', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const userId = +req.params.userId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  project.members = project.members.filter(m => m.user_id !== userId);
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'member_removed',
    user_id: req.user.id,
    message: `User ${userId} removed from project`,
    timestamp: new Date().toISOString()
  });
  db.get('notifications').push({
    id: db.get('notifications').size().value() + 1,
    user_id: userId,
    message: `You were removed from project ${project.name}`,
    read: false,
    timestamp: new Date().toISOString()
  }).write();
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/notes', authMiddleware, (req, res) => {
  const { content, fileName } = req.body;
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  const noteCount = project.notes.length;
  if (noteCount >= 10) return res.status(400).json({ message: 'Maximum 10 notes allowed per project' });

  // Race condition: ALL requests succeed despite limit (no rejection)
  // Collision-based delay simulates concurrent processing
  const collision = Math.random();
  const delay = collision > 0.7 ? 200 + Math.floor(Math.random() * 101) : 50 + Math.floor(Math.random() * 101); // 50-150ms or 200-300ms
  setTimeout(() => {
    const noteId = (project.notes.length || 0) + 1;
    const noteObj = { id: noteId, content, comments: [], created_at: new Date().toISOString() };
    if (fileName) {
      noteObj.fileName = fileName;
      const ext = fileName.split('.').pop().toLowerCase();
      const videoExts = ['mp4','webm','ogg','avi','mov'];
      if (videoExts.includes(ext)) noteObj.hasVideo = true;
    }
    project.notes.push(noteObj);
    project.activity.push({
      id: (project.activity.length || 0) + 1,
      type: 'note_added',
      user_id: req.user.id,
      message: `Note #${noteId} added by ${req.user.username}`,
      timestamp: new Date().toISOString()
    });
    db.write();
    res.json({ success: true });
  }, delay);
});

app.put('/api/projects/:id/notes/:noteId', authMiddleware, (req, res) => {
  const { content } = req.body;
  const projectId = +req.params.id;
  const noteId = +req.params.noteId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  const note = project.notes.find(n => n.id === noteId);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.content = content;
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'note_updated',
    user_id: req.user.id,
    message: `Note #${noteId} updated by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.delete('/api/projects/:id/notes/:noteId', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const noteId = +req.params.noteId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  project.notes = project.notes.filter(n => n.id !== noteId);
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'note_deleted',
    user_id: req.user.id,
    message: `Note #${noteId} deleted by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/notes/:noteId/comments', authMiddleware, (req, res) => {
  const { text } = req.body;
  const projectId = +req.params.id;
  const noteId = +req.params.noteId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const role = project.creator_id === req.user.id ? 'admin' : project.members.find(m => m.user_id === req.user.id)?.role;
  if (role !== 'commenter' && role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const note = project.notes.find(n => n.id === noteId);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.comments.push({ user_id: req.user.id, text, timestamp: new Date().toISOString() });
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'note_comment',
    user_id: req.user.id,
    message: `Comment added to Note #${noteId} by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/tasks', authMiddleware, (req, res) => {
  const { title, description, assigned_to } = req.body;
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  const taskId = (project.tasks.length || 0) + 1;
  project.tasks.push({ id: taskId, title, description, status: 'pending', assigned_to: assigned_to || null, comments: [], created_at: new Date().toISOString() });
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'task_added',
    user_id: req.user.id,
    message: `Task #${taskId} added by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  if (assigned_to) {
    db.get('notifications').push({
      id: db.get('notifications').size().value() + 1,
      user_id: +assigned_to,
      message: `You were assigned to task "${title}" in project ${project.name}`,
      read: false,
      timestamp: new Date().toISOString()
    }).write();
  }
  db.write();
  res.json({ success: true });
});

app.put('/api/projects/:id/tasks/:taskId', authMiddleware, (req, res) => {
  const { title, description, status, assigned_to } = req.body;
  const projectId = +req.params.id;
  const taskId = +req.params.taskId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (title) task.title = title;
  if (description) task.description = description;
  if (status) task.status = status;
  if (assigned_to) task.assigned_to = assigned_to;
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'task_updated',
    user_id: req.user.id,
    message: `Task #${taskId} updated by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  if (assigned_to && assigned_to !== task.assigned_to) {
    db.get('notifications').push({
      id: db.get('notifications').size().value() + 1,
      user_id: +assigned_to,
      message: `You were assigned to task "${task.title}" in project ${project.name}`,
      read: false,
      timestamp: new Date().toISOString()
    }).write();
  }
  db.write();
  res.json({ success: true });
});

app.delete('/api/projects/:id/tasks/:taskId', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const taskId = +req.params.taskId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  project.tasks = project.tasks.filter(t => t.id !== taskId);
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'task_deleted',
    user_id: req.user.id,
    message: `Task #${taskId} deleted by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/tasks/:taskId/comments', authMiddleware, (req, res) => {
  const { text } = req.body;
  const projectId = +req.params.id;
  const taskId = +req.params.taskId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const role = project.creator_id === req.user.id ? 'admin' : project.members.find(m => m.user_id === req.user.id)?.role;
  if (role !== 'commenter' && role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  task.comments.push({ user_id: req.user.id, text, timestamp: new Date().toISOString() });
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'task_comment',
    user_id: req.user.id,
    message: `Comment added to Task #${taskId} by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.post('/api/projects/:id/files', authMiddleware, (req, res) => {
  const { name, content } = req.body;
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  // Sanitize filename to prevent path traversal and unsafe characters
  let safeName = path.basename(name || 'upload.bin');
  safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // If content is a DataURL, decode and write to disk under the Data directory
  try {
    if (typeof content === 'string' && content.startsWith('data:')) {
      const commaIndex = content.indexOf(',');
      const meta = content.substring(5, commaIndex); // e.g. image/png;base64
      const isBase64 = meta.includes(';base64');
      const dataPart = content.substring(commaIndex + 1);
      const buffer = isBase64 ? Buffer.from(dataPart, 'base64') : Buffer.from(decodeURIComponent(dataPart), 'utf8');
      const writePath = path.join(dataDir, safeName);
      fs.writeFileSync(writePath, buffer);
    }
  } catch (err) {
    console.error('Failed to write uploaded file to disk:', err);
    // continue — still store file entry in DB so frontend can reference it if needed
  }

  const fileId = (project.files.length || 0) + 1;
  project.files.push({ id: fileId, name: safeName, content, uploaded_by: req.user.id, created_at: new Date().toISOString() });
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'file_uploaded',
    user_id: req.user.id,
    message: `File ${name} uploaded by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.delete('/api/projects/:id/files/:fileId', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const fileId = +req.params.fileId;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isAdmin = project.creator_id === req.user.id || project.members.some(m => m.user_id === req.user.id && m.role === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Unauthorized' });
  const file = project.files.find(f => f.id === fileId);
  if (!file) return res.status(404).json({ message: 'File not found' });
  // Remove file entry and attempt to delete the on-disk copy if it exists
  project.files = project.files.filter(f => f.id !== fileId);
  try {
    const diskPath = path.join(dataDir, path.basename(file.name));
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.error('Failed to remove file from disk:', err);
  }
  project.activity.push({
    id: (project.activity.length || 0) + 1,
    type: 'file_deleted',
    user_id: req.user.id,
    message: `File ${file.name} deleted by ${req.user.username}`,
    timestamp: new Date().toISOString()
  });
  db.write();
  res.json({ success: true });
});

app.get('/api/projects/:id/stats', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.creator_id !== req.user.id && !project.members.some(m => m.user_id === req.user.id)) return res.status(403).json({ message: 'Access denied' });
  const stats = {
    membersCount: project.members.length + 1,
    notesCount: project.notes.length,
    tasksCount: project.tasks.length,
    filesCount: project.files.length,
    activityCount: project.activity.length
  };
  res.json(stats);
});

app.get('/api/projects/:id/activity', authMiddleware, (req, res) => {
  const projectId = +req.params.id;
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.creator_id !== req.user.id && !project.members.some(m => m.user_id === req.user.id)) return res.status(403).json({ message: 'Access denied' });
  res.json(project.activity);
});

app.get('/api/notifications', authMiddleware, (req, res) => {
  const notifications = db.get('notifications').filter({ user_id: req.user.id }).value();
  res.json(notifications);
});

app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const notificationId = +req.params.id;
  const notification = db.get('notifications').find({ id: notificationId, user_id: req.user.id }).value();
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  db.get('notifications').find({ id: notificationId }).assign({ read: true }).write();
  res.json({ success: true });
});

app.get('/api/progress', authMiddleware, (req, res) => {
  const exploits = db.get(`exploits.${req.user.id}`).value() || { step: 0 };
  res.json({ step: exploits.step });
});

// Added safe functions to simulate larger site
app.get('/api/users/:id/profile', authMiddleware, (req, res) => {
  const userId = +req.params.id;
  const user = db.get('users').find({ id: userId }).value();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ username: user.username, bio: user.profile.bio, avatar: user.profile.avatar });
});

app.post('/api/feedback', authMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Feedback required' });
  // Simulate storing feedback safely
  res.json({ success: true });
});

app.post('/api/projects', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const userProjects = db.get('projects').filter({ creator_id: req.user.id }).value().length;
  const limit = req.user.subscribed ? 20 : 3;
  if (userProjects >= limit) return res.status(403).json({ message: 'Project limit reached. Subscribe to create more.' });

  // Race condition: ALL requests succeed despite limit (no rejection)
  // Collision-based delay simulates concurrent processing
  const collision = Math.random();
  const delay = collision > 0.7 ? 200 + Math.floor(Math.random() * 101) : 50 + Math.floor(Math.random() * 101); // 50-150ms or 200-300ms
  setTimeout(() => {
    const id = db.get('projects').size().value() + 1;
    db.get('projects').push({
      id,
      name,
      description,
      creator_id: req.user.id,
      members: [],
      notes: [],
      tasks: [],
      files: [],
      activity: [{ id: 1, type: 'project_created', user_id: req.user.id, message: `${name} created`, timestamp: new Date().toISOString() }]
    }).write();
    db.get('notifications').push({
      id: db.get('notifications').size().value() + 1,
      user_id: req.user.id,
      message: `You created project ${name}`,
      read: false,
      timestamp: new Date().toISOString()
    }).write();
    res.json({ id });
  }, delay);
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});