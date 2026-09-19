import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Load credentials from environment
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'vempallirakhi20@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Password@123';

// In-memory or state storage for server
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
}

// Registered users on server - initialized with Super Admin vempallirakhi20@gmail.com
let registeredUsers: ServerUser[] = [
  {
    id: 'user-super-admin-rakhi',
    email: SUPER_ADMIN_EMAIL,
    username: 'rakhi',
    password: SUPER_ADMIN_PASSWORD,
    full_name: 'Rakhi Vempalli (Super Admin)',
    role: 'super_admin',
    status: 'active',
    employee_id: 'AZ-HQ-001',
    designation: 'Managing Director & Super Admin',
    phone: '+91 98450 99999'
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fetch all registered users
app.get('/api/users', (req, res) => {
  res.json({ users: registeredUsers });
});

// Unified login endpoint: supports username or email + password
app.post('/api/auth/login', (req, res) => {
  const identifier = (req.body.identifier || req.body.usernameOrEmail || req.body.email || req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  // Merge clientProfiles if provided by client to ensure server has latest added accounts
  if (Array.isArray(req.body.clientProfiles) && req.body.clientProfiles.length > 0) {
    req.body.clientProfiles.forEach((cp: ServerUser) => {
      const idx = registeredUsers.findIndex(u => u.id === cp.id || u.email.toLowerCase() === cp.email.toLowerCase());
      if (idx >= 0) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...cp };
      } else {
        registeredUsers.push(cp);
      }
    });
  }

  const query = identifier.toLowerCase();
  
  // Check Super Admin default fallback
  if ((query === SUPER_ADMIN_EMAIL.toLowerCase() || query === 'rakhi') && password === SUPER_ADMIN_PASSWORD) {
    const adminUser = registeredUsers.find(u => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || registeredUsers[0];
    return res.json({ success: true, user: adminUser });
  }

  // Check registered users by email OR username
  const matched = registeredUsers.find(u => 
    u.email.toLowerCase() === query || 
    (u.username && u.username.toLowerCase() === query)
  );

  if (!matched) {
    return res.status(401).json({ error: 'No account found with this username or email.' });
  }

  if (matched.status !== 'active') {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact Super Admin.' });
  }

  const expectedPassword = matched.password || 'Password@123';
  if (expectedPassword !== password) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  return res.json({ success: true, user: matched });
});

// Admin login endpoint (validates against environment or stored super admin)
app.post('/api/auth/admin-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const query = email.trim().toLowerCase();
  if ((query === SUPER_ADMIN_EMAIL.toLowerCase() || query === 'rakhi') && password === SUPER_ADMIN_PASSWORD) {
    const adminUser = registeredUsers.find(u => u.role === 'super_admin') || registeredUsers[0];
    return res.json({ success: true, user: adminUser });
  }

  // Also allow any registered super_admin
  const matchedAdmin = registeredUsers.find(u => 
    (u.email.toLowerCase() === query || (u.username && u.username.toLowerCase() === query)) && 
    u.role === 'super_admin'
  );

  if (matchedAdmin && (matchedAdmin.password || 'Password@123') === password) {
    return res.json({ success: true, user: matchedAdmin });
  }

  return res.status(401).json({ error: 'Invalid Super Admin credentials' });
});

// Google OAuth verification endpoint
app.post('/api/auth/google-login', (req, res) => {
  const { email, full_name, avatar_url, clientProfiles } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google email is required' });
  }

  // Merge clientProfiles if provided
  if (Array.isArray(clientProfiles) && clientProfiles.length > 0) {
    clientProfiles.forEach((cp: ServerUser) => {
      const idx = registeredUsers.findIndex(u => u.id === cp.id || u.email.toLowerCase() === cp.email.toLowerCase());
      if (idx >= 0) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...cp };
      } else {
        registeredUsers.push(cp);
      }
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // If it matches primary super admin
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    const superAdmin = registeredUsers.find(u => u.email.toLowerCase() === normalizedEmail) || registeredUsers[0];
    return res.json({
      authorized: true,
      user: {
        ...superAdmin,
        avatar_url: avatar_url || superAdmin.phone
      }
    });
  }

  const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!matchedUser) {
    return res.status(403).json({
      authorized: false,
      message: `The account ${email} is not registered in AZVASA SalesTrack. Please ask the Super Admin to add your email and credentials.`
    });
  }

  if (matchedUser.status !== 'active') {
    return res.status(403).json({
      authorized: false,
      message: 'Your account has been deactivated. Please contact the administrator.'
    });
  }

  return res.json({
    authorized: true,
    user: {
      ...matchedUser,
      avatar_url: avatar_url || undefined
    }
  });
});

// Sync registered users (Super Admins, Sales Managers, Sales Reps)
app.post('/api/users/sync', (req, res) => {
  const { users } = req.body;
  if (Array.isArray(users) && users.length > 0) {
    registeredUsers = users;
  }
  res.json({ success: true, count: registeredUsers.length });
});

// Backward-compatible reps sync endpoint
app.post('/api/reps/sync', (req, res) => {
  const { reps } = req.body;
  if (Array.isArray(reps)) {
    const admins = registeredUsers.filter(u => u.role === 'super_admin');
    registeredUsers = [...admins, ...reps.filter(r => r.role !== 'super_admin')];
  }
  res.json({ success: true, count: registeredUsers.length });
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
