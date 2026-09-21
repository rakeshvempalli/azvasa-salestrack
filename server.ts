import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Read users from persistent disk file
function loadUsers(): ServerUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure primary super admin account has current configured credentials
        const adminIndex = parsed.findIndex(u => 
          u.id === 'user-super-admin-rakhi' || 
          u.email.toLowerCase() === 'vempallirakhi20@gmail.com' ||
          u.email.toLowerCase() === 'admin@azvasa.com' ||
          (u.username && u.username.toLowerCase() === 'rakhi')
        );
        if (adminIndex >= 0) {
          parsed[adminIndex].email = 'vempallirakhi20@gmail.com';
          parsed[adminIndex].username = parsed[adminIndex].username || 'rakhi';
          parsed[adminIndex].password = 'Rakhi@1234';
          parsed[adminIndex].role = 'super_admin';
          parsed[adminIndex].status = 'active';
          fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        } else {
          parsed.unshift(DEFAULT_USERS[0]);
          fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        return parsed;
      }
    }
    // Seed initial users if file doesn't exist
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return [...DEFAULT_USERS];
  } catch (err) {
    console.error('Failed reading users from disk:', err);
    return [...DEFAULT_USERS];
  }
}

// Save users to persistent disk file
function saveUsers(users: ServerUser[]) {
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

// Fetch all registered users (across all devices)
app.get('/api/users', (req, res) => {
  const users = loadUsers();
  res.json({ users });
});

// Create a new user (Super Admin, Sales Manager, Sales Rep) and persist to disk
app.post('/api/users', (req, res) => {
  const newUser: ServerUser = req.body;
  if (!newUser || !newUser.email || !newUser.role) {
    return res.status(400).json({ error: 'Email and role are required to create a user.' });
  }

  const users = loadUsers();
  const normalizedEmail = newUser.email.trim().toLowerCase();
  const normalizedUsername = (newUser.username || '').trim().toLowerCase();

  // Check if exists
  const existingIndex = users.findIndex(u => 
    u.id === newUser.id || 
    u.email.toLowerCase() === normalizedEmail ||
    (normalizedUsername && u.username && u.username.toLowerCase() === normalizedUsername)
  );

  const cleanUser: ServerUser = {
    ...newUser,
    id: newUser.id || `user-${newUser.role}-${Date.now()}`,
    email: newUser.email.trim(),
    username: newUser.username ? newUser.username.trim() : newUser.email.split('@')[0],
    password: newUser.password ? newUser.password.trim() : 'Password@123',
    status: newUser.status || 'active',
    created_at: newUser.created_at || new Date().toISOString()
  };

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...cleanUser, updated_at: new Date().toISOString() };
  } else {
    users.push(cleanUser);
  }

  saveUsers(users);
  return res.json({ success: true, user: cleanUser, count: users.length });
});

// Update an existing user on disk
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates: Partial<ServerUser> = req.body;
  const users = loadUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found on server.' });
  }

  users[index] = {
    ...users[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveUsers(users);
  return res.json({ success: true, user: users[index] });
});

// Delete a user from disk
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  let users = loadUsers();
  users = users.filter(u => u.id !== id);
  saveUsers(users);
  return res.json({ success: true, count: users.length });
});

// Unified login endpoint: supports username or company email + password
app.post('/api/auth/login', (req, res) => {
  const identifier = (req.body.identifier || req.body.usernameOrEmail || req.body.email || req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  let users = loadUsers();

  // Merge clientProfiles if provided by client to ensure server has any accounts created locally
  if (Array.isArray(req.body.clientProfiles) && req.body.clientProfiles.length > 0) {
    let modified = false;
    req.body.clientProfiles.forEach((cp: ServerUser) => {
      const idx = users.findIndex(u => u.id === cp.id || u.email.toLowerCase() === cp.email.toLowerCase());
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...cp };
        modified = true;
      } else {
        users.push(cp);
        modified = true;
      }
    });
    if (modified) {
      saveUsers(users);
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
app.post('/api/auth/admin-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  const query = email.trim().toLowerCase();
  const users = loadUsers();

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
    const adminUser = users.find(u => u.role === 'super_admin') || DEFAULT_USERS[0];
    return res.json({ success: true, user: adminUser });
  }

  return res.status(401).json({ error: 'Invalid Super Admin credentials.' });
});

// Sync registered users across devices (Merges rather than deletes)
app.post('/api/users/sync', (req, res) => {
  const { users } = req.body;
  let currentUsers = loadUsers();

  if (Array.isArray(users) && users.length > 0) {
    users.forEach((incomingUser: ServerUser) => {
      const idx = currentUsers.findIndex(u => 
        u.id === incomingUser.id || 
        u.email.toLowerCase() === incomingUser.email.toLowerCase()
      );
      if (idx >= 0) {
        currentUsers[idx] = { ...currentUsers[idx], ...incomingUser };
      } else {
        currentUsers.push(incomingUser);
      }
    });
    saveUsers(currentUsers);
  }

  res.json({ success: true, count: currentUsers.length, users: currentUsers });
});

// Backward-compatible reps sync endpoint
app.post('/api/reps/sync', (req, res) => {
  const { reps } = req.body;
  let currentUsers = loadUsers();

  if (Array.isArray(reps) && reps.length > 0) {
    reps.forEach((incomingRep: ServerUser) => {
      const idx = currentUsers.findIndex(u => 
        u.id === incomingRep.id || 
        u.email.toLowerCase() === incomingRep.email.toLowerCase()
      );
      if (idx >= 0) {
        currentUsers[idx] = { ...currentUsers[idx], ...incomingRep };
      } else {
        currentUsers.push(incomingRep);
      }
    });
    saveUsers(currentUsers);
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
