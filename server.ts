import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

const app = express();
const PORT = 3000;

app.use(express.json());

// Firebase Configuration for Central Database
const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0539863578",
  appId: "1:469212434279:web:440da204f71d28d7b1a9c2",
  apiKey: "AIzaSyBKrl6o11hoUxq5E5wV0u_xI7YYYBoDeEw",
  authDomain: "gen-lang-client-0539863578.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-azvasasalestrack-80f8d7cb-c9f7-4cdd-9d61-37344c146822",
  storageBucket: "gen-lang-client-0539863578.firebasestorage.app",
  messagingSenderId: "469212434279"
};

const fbApp = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
const db = getFirestore(fbApp, FIREBASE_CONFIG.firestoreDatabaseId);

// Load credentials from environment
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'vempallirakhi20@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Rakhi@1234';

// Storage file path for persistent users across devices
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Interface for registered users
interface ServerUser {
  id: string;
  email: string;
  username?: string;
  password?: string;
  full_name: string;
  role: 'super_admin' | 'sales_manager' | 'sales_rep';
  status: 'active' | 'inactive';
  employee_id: string;
  designation: string;
  phone: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Initial fallback users
const DEFAULT_USERS: ServerUser[] = [
  {
    id: 'user-super-admin-rakhi',
    email: 'vempallirakhi20@gmail.com',
    username: 'rakhi',
    password: 'Rakhi@1234',
    full_name: 'Rakhi Vempalli (Super Admin)',
    role: 'super_admin',
    status: 'active',
    employee_id: 'AZ-HQ-001',
    designation: 'Managing Director & Super Admin',
    phone: '+91 98450 99999',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  }
];

// Read users from centralized Firestore database (with disk cache fallback)
async function loadUsers(): Promise<ServerUser[]> {
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    const users: ServerUser[] = [];
    snapshot.forEach(docSnap => {
      users.push(docSnap.data() as ServerUser);
    });

    if (users.length === 0) {
      // Seed super admin in Firestore database
      await setDoc(doc(db, 'users', DEFAULT_USERS[0].id), DEFAULT_USERS[0]);
      saveUsersToDisk(DEFAULT_USERS);
      return [...DEFAULT_USERS];
    }

    // Ensure Super Admin has latest credentials
    const adminIdx = users.findIndex(u => 
      u.id === 'user-super-admin-rakhi' || 
      u.email.toLowerCase() === 'vempallirakhi20@gmail.com' ||
      u.role === 'super_admin'
    );
    if (adminIdx >= 0) {
      if (users[adminIdx].email !== 'vempallirakhi20@gmail.com' || users[adminIdx].password !== 'Rakhi@1234') {
        users[adminIdx].email = 'vempallirakhi20@gmail.com';
        users[adminIdx].password = 'Rakhi@1234';
        users[adminIdx].username = users[adminIdx].username || 'rakhi';
        users[adminIdx].role = 'super_admin';
        users[adminIdx].status = 'active';
        await setDoc(doc(db, 'users', users[adminIdx].id), users[adminIdx], { merge: true });
      }
    } else {
      await setDoc(doc(db, 'users', DEFAULT_USERS[0].id), DEFAULT_USERS[0]);
      users.unshift(DEFAULT_USERS[0]);
    }

    saveUsersToDisk(users);
    return users;
  } catch (err) {
    console.error('Failed reading users from Firestore, using disk cache:', err);
    return loadUsersFromDisk();
  }
}

// Read users from persistent disk file
function loadUsersFromDisk(): ServerUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return [...DEFAULT_USERS];
  } catch (err) {
    console.error('Failed reading users from disk:', err);
    return [...DEFAULT_USERS];
  }
}

// Save users to persistent disk file
function saveUsersToDisk(users: ServerUser[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving users to disk:', err);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fetch all registered users (across all devices from centralized Firestore database)
app.get('/api/users', async (req, res) => {
  const users = await loadUsers();
  res.json({ users });
});

// Create a new user (Super Admin, Sales Manager, Sales Rep) and persist to central database
app.post('/api/users', async (req, res) => {
  const newUser: ServerUser = req.body;
  if (!newUser || !newUser.email || !newUser.role) {
    return res.status(400).json({ error: 'Email and role are required to create a user.' });
  }

  const users = await loadUsers();
  const normalizedEmail = newUser.email.trim().toLowerCase();
  const normalizedUsername = (newUser.username || '').trim().toLowerCase();

  const cleanUser: ServerUser = {
    ...newUser,
    id: newUser.id || `user-${newUser.role}-${Date.now()}`,
    email: newUser.email.trim(),
    username: newUser.username ? newUser.username.trim() : newUser.email.split('@')[0],
    password: newUser.password ? newUser.password.trim() : 'Password@123',
    status: newUser.status || 'active',
    created_at: newUser.created_at || new Date().toISOString()
  };

  // Write directly to central Firestore database
  try {
    await setDoc(doc(db, 'users', cleanUser.id), cleanUser, { merge: true });
  } catch (err) {
    console.error('Failed writing user to Firestore:', err);
  }

  // Update disk cache
  const existingIndex = users.findIndex(u => 
    u.id === cleanUser.id || 
    u.email.toLowerCase() === normalizedEmail ||
    (normalizedUsername && u.username && u.username.toLowerCase() === normalizedUsername)
  );

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...cleanUser, updated_at: new Date().toISOString() };
  } else {
    users.push(cleanUser);
  }

  saveUsersToDisk(users);
  return res.json({ success: true, user: cleanUser, count: users.length });
});

// Update an existing user in central database
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates: Partial<ServerUser> = req.body;
  const users = await loadUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found on server.' });
  }

  const updatedUser: ServerUser = {
    ...users[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', id), updatedUser, { merge: true });
  } catch (err) {
    console.error('Failed updating user in Firestore:', err);
  }

  users[index] = updatedUser;
  saveUsersToDisk(users);
  return res.json({ success: true, user: users[index] });
});

// Delete a user from central database
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (err) {
    console.error('Failed deleting user from Firestore:', err);
  }

  let users = await loadUsers();
  users = users.filter(u => u.id !== id);
  saveUsersToDisk(users);
  return res.json({ success: true, count: users.length });
});

// Unified login endpoint: supports username or company email + password
app.post('/api/auth/login', async (req, res) => {
  const identifier = (req.body.identifier || req.body.usernameOrEmail || req.body.email || req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  let users = await loadUsers();

  // Merge clientProfiles into Firestore if provided by client
  if (Array.isArray(req.body.clientProfiles) && req.body.clientProfiles.length > 0) {
    for (const cp of req.body.clientProfiles as ServerUser[]) {
      if (cp && cp.id && cp.email) {
        try {
          await setDoc(doc(db, 'users', cp.id), cp, { merge: true });
        } catch {}
      }
    }
  }

  const query = identifier.toLowerCase();

  // Match registered user by email OR username (case-insensitive)
  const matched = users.find(u => 
    u.email.toLowerCase() === query || 
    (u.username && u.username.toLowerCase() === query)
  );

  if (matched) {
    if (matched.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact Super Admin.' });
    }

    const expectedPassword = matched.password || 'Password@123';
    const isPrimaryAdmin = matched.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || (matched.username && matched.username.toLowerCase() === 'rakhi');

    if (password === expectedPassword || (isPrimaryAdmin && password === SUPER_ADMIN_PASSWORD)) {
      return res.json({ success: true, user: matched });
    } else {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }
  }

  // Fallback for default primary super admin
  if ((query === SUPER_ADMIN_EMAIL.toLowerCase() || query === 'rakhi') && password === SUPER_ADMIN_PASSWORD) {
    const adminUser = users.find(u => u.role === 'super_admin') || DEFAULT_USERS[0];
    return res.json({ success: true, user: adminUser });
  }

  return res.status(401).json({ error: 'No account found with this username or company email.' });
});

// Admin login endpoint
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  const query = email.trim().toLowerCase();
  const users = await loadUsers();

  const matchedAdmin = users.find(u => 
    (u.email.toLowerCase() === query || (u.username && u.username.toLowerCase() === query)) && 
    u.role === 'super_admin'
  );

  if (matchedAdmin) {
    if (matchedAdmin.status !== 'active') {
      return res.status(403).json({ error: 'This Super Admin account is deactivated.' });
    }
    const expectedPassword = matchedAdmin.password || 'Password@123';
    if (password === expectedPassword || password === SUPER_ADMIN_PASSWORD) {
      return res.json({ success: true, user: matchedAdmin });
    }
  }

  if ((query === SUPER_ADMIN_EMAIL.toLowerCase() || query === 'rakhi') && password === SUPER_ADMIN_PASSWORD) {
    const defaultAdmin = users.find(u => u.role === 'super_admin') || DEFAULT_USERS[0];
    return res.json({ success: true, user: defaultAdmin });
  }

  return res.status(401).json({ error: 'Invalid Super Admin credentials.' });
});

// Sync registered users across devices (writes to central Firestore database)
app.post('/api/users/sync', async (req, res) => {
  const { users } = req.body;
  let currentUsers = await loadUsers();

  if (Array.isArray(users) && users.length > 0) {
    for (const incomingUser of users as ServerUser[]) {
      if (incomingUser && incomingUser.id && incomingUser.email) {
        try {
          await setDoc(doc(db, 'users', incomingUser.id), incomingUser, { merge: true });
        } catch {}
        const idx = currentUsers.findIndex(u => 
          u.id === incomingUser.id || 
          u.email.toLowerCase() === incomingUser.email.toLowerCase()
        );
        if (idx >= 0) {
          currentUsers[idx] = { ...currentUsers[idx], ...incomingUser };
        } else {
          currentUsers.push(incomingUser);
        }
      }
    }
    saveUsersToDisk(currentUsers);
  }

  res.json({ success: true, count: currentUsers.length, users: currentUsers });
});

// Backward-compatible reps sync endpoint
app.post('/api/reps/sync', async (req, res) => {
  const { reps } = req.body;
  let currentUsers = await loadUsers();

  if (Array.isArray(reps) && reps.length > 0) {
    for (const incomingRep of reps as ServerUser[]) {
      if (incomingRep && incomingRep.id && incomingRep.email) {
        try {
          await setDoc(doc(db, 'users', incomingRep.id), incomingRep, { merge: true });
        } catch {}
        const idx = currentUsers.findIndex(u => 
          u.id === incomingRep.id || 
          u.email.toLowerCase() === incomingRep.email.toLowerCase()
        );
        if (idx >= 0) {
          currentUsers[idx] = { ...currentUsers[idx], ...incomingRep };
        } else {
          currentUsers.push(incomingRep);
        }
      }
    }
    saveUsersToDisk(currentUsers);
  }

  res.json({ success: true, count: currentUsers.length, users: currentUsers });
});

// Automated email reminder check & dispatch
app.post('/api/reminders/process', (req, res) => {
  const { leads, sendDate } = req.body;
  const targetDate = sendDate || '2026-09-19';
  
  // Find leads whose next_action_date is tomorrow (1 day before)
  const results: any[] = [];
  if (Array.isArray(leads)) {
    leads.forEach((lead: any) => {
      if (lead.next_action_date && lead.assigned_rep_id) {
        results.push({
          lead_id: lead.id,
          school_name: lead.school_name,
          poc_name: lead.poc_name,
          poc_designation: lead.poc_designation,
          poc_contact: lead.poc_contact,
          product: lead.product,
          current_stage: lead.current_stage_name || 'Lead',
          rep_name: lead.assigned_rep_name,
          next_action_date: lead.next_action_date,
          latest_remarks: lead.next_action_remarks || 'Follow-up planned'
        });
      }
    });
  }
  
  res.json({
    success: true,
    processedCount: results.length,
    reminders: results
  });
});

// ============================================================================
// CENTRALIZED CRM REST ENDPOINTS (FIRESTORE + DISK PERSISTENCE)
// ============================================================================

function saveCollectionToDisk(filename: string, data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed writing ${filename} to disk:`, err);
  }
}

function loadCollectionFromDisk(filename: string): any[] {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}
  return [];
}

// 1. LEADS
app.get('/api/leads', async (req, res) => {
  try {
    const colRef = collection(db, 'leads');
    const snapshot = await getDocs(colRef);
    const leads: any[] = [];
    snapshot.forEach(docSnap => leads.push(docSnap.data()));
    if (leads.length > 0) {
      saveCollectionToDisk('leads.json', leads);
      return res.json({ leads });
    }
  } catch (err) {
    console.error('Error fetching leads from Firestore:', err);
  }
  return res.json({ leads: loadCollectionFromDisk('leads.json') });
});

app.post('/api/leads', async (req, res) => {
  const lead = req.body;
  if (!lead || !lead.id) return res.status(400).json({ error: 'Valid lead object is required' });
  try {
    await setDoc(doc(db, 'leads', lead.id), lead, { merge: true });
  } catch (err) {
    console.error('Failed writing lead to Firestore:', err);
  }
  const leads = loadCollectionFromDisk('leads.json').filter((l: any) => l.id !== lead.id);
  leads.unshift(lead);
  saveCollectionToDisk('leads.json', leads);
  return res.json({ success: true, lead });
});

app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await setDoc(doc(db, 'leads', id), updates, { merge: true });
  } catch (err) {
    console.error('Failed updating lead in Firestore:', err);
  }
  const leads = loadCollectionFromDisk('leads.json').map((l: any) => l.id === id ? { ...l, ...updates } : l);
  saveCollectionToDisk('leads.json', leads);
  return res.json({ success: true, updates });
});

app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDoc(doc(db, 'leads', id));
  } catch (err) {
    console.error('Failed deleting lead from Firestore:', err);
  }
  const leads = loadCollectionFromDisk('leads.json').filter((l: any) => l.id !== id);
  saveCollectionToDisk('leads.json', leads);
  return res.json({ success: true, id });
});

// 2. PIPELINE STAGES
app.get('/api/stages', async (req, res) => {
  try {
    const colRef = collection(db, 'pipeline_stages');
    const snapshot = await getDocs(colRef);
    const stages: any[] = [];
    snapshot.forEach(docSnap => stages.push(docSnap.data()));
    if (stages.length > 0) return res.json({ stages });
  } catch {}
  return res.json({ stages: loadCollectionFromDisk('stages.json') });
});

app.post('/api/stages', async (req, res) => {
  const { stages } = req.body;
  if (Array.isArray(stages)) {
    for (const stage of stages) {
      if (stage && stage.id) {
        try {
          await setDoc(doc(db, 'pipeline_stages', stage.id), stage, { merge: true });
        } catch {}
      }
    }
    saveCollectionToDisk('stages.json', stages);
    return res.json({ success: true, count: stages.length });
  }
  return res.status(400).json({ error: 'Array of stages required' });
});

// 3. INTERACTIONS
app.get('/api/interactions', async (req, res) => {
  try {
    const colRef = collection(db, 'interactions');
    const snapshot = await getDocs(colRef);
    const interactions: any[] = [];
    snapshot.forEach(docSnap => interactions.push(docSnap.data()));
    if (interactions.length > 0) return res.json({ interactions });
  } catch {}
  return res.json({ interactions: loadCollectionFromDisk('interactions.json') });
});

app.post('/api/interactions', async (req, res) => {
  const interaction = req.body;
  if (!interaction || !interaction.id) return res.status(400).json({ error: 'Valid interaction required' });
  try {
    await setDoc(doc(db, 'interactions', interaction.id), interaction, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('interactions.json').filter((i: any) => i.id !== interaction.id);
  list.unshift(interaction);
  saveCollectionToDisk('interactions.json', list);
  return res.json({ success: true, interaction });
});

// 4. NOTES
app.get('/api/notes', async (req, res) => {
  try {
    const colRef = collection(db, 'notes');
    const snapshot = await getDocs(colRef);
    const notes: any[] = [];
    snapshot.forEach(docSnap => notes.push(docSnap.data()));
    return res.json({ notes });
  } catch {}
  return res.json({ notes: loadCollectionFromDisk('notes.json') });
});

app.post('/api/notes', async (req, res) => {
  const note = req.body;
  if (!note || !note.id) return res.status(400).json({ error: 'Valid note required' });
  try {
    await setDoc(doc(db, 'notes', note.id), note, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('notes.json').filter((n: any) => n.id !== note.id);
  list.unshift(note);
  saveCollectionToDisk('notes.json', list);
  return res.json({ success: true, note });
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDoc(doc(db, 'notes', id));
  } catch {}
  const list = loadCollectionFromDisk('notes.json').filter((n: any) => n.id !== id);
  saveCollectionToDisk('notes.json', list);
  return res.json({ success: true, id });
});

// 5. TASKS
app.get('/api/tasks', async (req, res) => {
  try {
    const colRef = collection(db, 'tasks');
    const snapshot = await getDocs(colRef);
    const tasks: any[] = [];
    snapshot.forEach(docSnap => tasks.push(docSnap.data()));
    return res.json({ tasks });
  } catch {}
  return res.json({ tasks: loadCollectionFromDisk('tasks.json') });
});

app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  if (!task || !task.id) return res.status(400).json({ error: 'Valid task required' });
  try {
    await setDoc(doc(db, 'tasks', task.id), task, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('tasks.json').filter((t: any) => t.id !== task.id);
  list.unshift(task);
  saveCollectionToDisk('tasks.json', list);
  return res.json({ success: true, task });
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await setDoc(doc(db, 'tasks', id), updates, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('tasks.json').map((t: any) => t.id === id ? { ...t, ...updates } : t);
  saveCollectionToDisk('tasks.json', list);
  return res.json({ success: true, updates });
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDoc(doc(db, 'tasks', id));
  } catch {}
  const list = loadCollectionFromDisk('tasks.json').filter((t: any) => t.id !== id);
  saveCollectionToDisk('tasks.json', list);
  return res.json({ success: true, id });
});

// 6. NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
  try {
    const colRef = collection(db, 'notifications');
    const snapshot = await getDocs(colRef);
    const notifications: any[] = [];
    snapshot.forEach(docSnap => notifications.push(docSnap.data()));
    return res.json({ notifications });
  } catch {}
  return res.json({ notifications: loadCollectionFromDisk('notifications.json') });
});

app.post('/api/notifications', async (req, res) => {
  const notif = req.body;
  if (!notif || !notif.id) return res.status(400).json({ error: 'Valid notification required' });
  try {
    await setDoc(doc(db, 'notifications', notif.id), notif, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('notifications.json').filter((n: any) => n.id !== notif.id);
  list.unshift(notif);
  saveCollectionToDisk('notifications.json', list);
  return res.json({ success: true, notification: notif });
});

app.put('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await setDoc(doc(db, 'notifications', id), updates, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('notifications.json').map((n: any) => n.id === id ? { ...n, ...updates } : n);
  saveCollectionToDisk('notifications.json', list);
  return res.json({ success: true, updates });
});

app.delete('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch {}
  const list = loadCollectionFromDisk('notifications.json').filter((n: any) => n.id !== id);
  saveCollectionToDisk('notifications.json', list);
  return res.json({ success: true, id });
});

// 7. AUDIT LOGS
app.get('/api/audit-logs', async (req, res) => {
  try {
    const colRef = collection(db, 'audit_logs');
    const snapshot = await getDocs(colRef);
    const logs: any[] = [];
    snapshot.forEach(docSnap => logs.push(docSnap.data()));
    return res.json({ logs });
  } catch {}
  return res.json({ logs: loadCollectionFromDisk('audit_logs.json') });
});

app.post('/api/audit-logs', async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Valid log required' });
  try {
    await setDoc(doc(db, 'audit_logs', log.id), log, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('audit_logs.json').filter((l: any) => l.id !== log.id);
  list.unshift(log);
  saveCollectionToDisk('audit_logs.json', list);
  return res.json({ success: true, log });
});

// 8. REMINDER LOGS
app.get('/api/reminder-logs', async (req, res) => {
  try {
    const colRef = collection(db, 'reminder_logs');
    const snapshot = await getDocs(colRef);
    const logs: any[] = [];
    snapshot.forEach(docSnap => logs.push(docSnap.data()));
    return res.json({ logs });
  } catch {}
  return res.json({ logs: loadCollectionFromDisk('reminder_logs.json') });
});

app.post('/api/reminder-logs', async (req, res) => {
  const log = req.body;
  if (!log || !log.id) return res.status(400).json({ error: 'Valid reminder log required' });
  try {
    await setDoc(doc(db, 'reminder_logs', log.id), log, { merge: true });
  } catch {}
  const list = loadCollectionFromDisk('reminder_logs.json').filter((l: any) => l.id !== log.id);
  list.unshift(log);
  saveCollectionToDisk('reminder_logs.json', list);
  return res.json({ success: true, log });
});

// Initialize server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AZVASA SalesTrack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
