import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitHub, Google, generateState, generateCodeVerifier } from 'arctic';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// CORS configuration - supports multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.endsWith('.vercel.app') || origin.endsWith('.railway.app') || origin.endsWith('.render.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  maxHttpBufferSize: 50e6 // 50MB - increased to handle large file data URLs
});

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.endsWith('.vercel.app') || origin.endsWith('.railway.app') || origin.endsWith('.render.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
// Conditional JSON parsing - skip for file uploads
app.use((req, res, next) => {
  if (req.path === '/api/messages/upload-file' && req.method === 'POST') {
    // Skip JSON parsing for file uploads - will use express.raw in route handler
    return next();
  }
  express.json({ limit: '50mb' })(req, res, next);
});
app.use((req, res, next) => {
  // Skip urlencoded parsing for file uploads too
  if (req.path === '/api/messages/upload-file' && req.method === 'POST') {
    return next();
  }
  express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// GitHub OAuth setup
const github = new GitHub(
  process.env.GITHUB_CLIENT_ID || '',
  process.env.GITHUB_CLIENT_SECRET || ''
);

// Google OAuth setup
const googleRedirectURI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback?provider=google';
const google = new Google(
  process.env.GOOGLE_CLIENT_ID || 'dummy',
  process.env.GOOGLE_CLIENT_SECRET || 'dummy',
  googleRedirectURI
);

// Session store (simple in-memory for now, can be upgraded to Redis)
const sessions = new Map();

// Initialize database tables
db.serialize(() => {
  // Users table (password is nullable for OAuth users)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT,
    avatar TEXT,
    github_id TEXT,
    google_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Add missing columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN github_id TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE users ADD COLUMN google_id TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  
  // Create unique indexes for OAuth IDs
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;`);
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;`);

  // Sessions table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Workspaces table
  db.run(`CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`);

  // Workspace members
  db.run(`CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(workspace_id, user_id)
  )`);

  // Channels table
  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_private INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY(created_by) REFERENCES users(id),
    UNIQUE(workspace_id, name)
  )`);
  
  // Add workspace_id column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE channels ADD COLUMN workspace_id TEXT;`, (err) => {
    // Ignore error if column already exists
  });

  // Channel members
  db.run(`CREATE TABLE IF NOT EXISTS channel_members (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY(channel_id) REFERENCES channels(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(channel_id, user_id)
  )`);

  // Messages table - channel_id, dm_conversation_id, and content are nullable
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    thread_id TEXT,
    dm_conversation_id TEXT,
    user_id TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES channels(id),
    FOREIGN KEY(thread_id) REFERENCES messages(id),
    FOREIGN KEY(dm_conversation_id) REFERENCES dm_conversations(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  
  // Add missing columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE messages ADD COLUMN dm_conversation_id TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE messages ADD COLUMN thread_id TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE messages ADD COLUMN file_url TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE messages ADD COLUMN file_name TEXT;`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE messages ADD COLUMN edited_at TEXT;`, (err) => {
    // Ignore error if column already exists
  });

  // Direct message conversations
  db.run(`CREATE TABLE IF NOT EXISTS dm_conversations (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id),
    UNIQUE(user1_id, user2_id)
  )`);

  // Message reactions
  db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id) REFERENCES messages(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(message_id, user_id, emoji)
  )`);

  // Canvas table
  db.run(`CREATE TABLE IF NOT EXISTS canvas (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES channels(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);
  
  // Channel templates (for storing template initialization)
  db.run(`CREATE TABLE IF NOT EXISTS channel_templates (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    initialized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES channels(id)
  )`);
  
  // User presence table
  db.run(`CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline',
    custom_status TEXT,
    status_emoji TEXT,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  
  // Pinned messages
  db.run(`CREATE TABLE IF NOT EXISTS pinned_messages (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    channel_id TEXT,
    dm_conversation_id TEXT,
    pinned_by_user_id TEXT NOT NULL,
    pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id) REFERENCES messages(id),
    FOREIGN KEY(channel_id) REFERENCES channels(id),
    FOREIGN KEY(dm_conversation_id) REFERENCES dm_conversations(id),
    FOREIGN KEY(pinned_by_user_id) REFERENCES users(id)
  )`);
  
  // Channel reads (for unread counts)
  db.run(`CREATE TABLE IF NOT EXISTS channel_reads (
    user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, channel_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(channel_id) REFERENCES channels(id)
  )`);
  
  // DM reads (for unread counts)
  db.run(`CREATE TABLE IF NOT EXISTS dm_reads (
    user_id TEXT NOT NULL,
    dm_conversation_id TEXT NOT NULL,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, dm_conversation_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(dm_conversation_id) REFERENCES dm_conversations(id)
  )`);
  
  // Add topic column to channels
  db.run(`ALTER TABLE channels ADD COLUMN topic TEXT;`, (err) => {
    // Ignore error if column already exists
  });
});

// Auth middleware
const authenticate = (req, res, next) => {
  const sessionId = req.headers['authorization']?.split(' ')[1] || 
                    req.cookies?.session || 
                    req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check session in database
  db.get(
    'SELECT * FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?',
    [sessionId, Date.now()],
    (err, row) => {
      if (err) {
        console.error('Database error during auth:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      
      req.user = {
        id: row.user_id,
        username: row.username,
        email: row.email,
        avatar: row.avatar
      };
      req.sessionId = sessionId;
      next();
    }
  );
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    db.run(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [userId, username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Email or username already exists' });
          }
          console.error('Registration error:', err);
          return res.status(500).json({ error: 'Failed to create user. Please try again.' });
        }

        // Create session
        const sessionId = uuidv4();
        const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 7); // 7 days
        
        db.run(
          'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
          [sessionId, userId, expiresAt],
          function(sessionErr) {
            if (sessionErr) {
              console.error('Session creation error:', sessionErr);
              return res.status(500).json({ error: 'Failed to create session' });
            }
            
            console.log('User registered and session created:', { userId, sessionId, expiresAt: new Date(expiresAt).toISOString() });
            
            res.json({ 
              user: { id: userId, username, email },
              sessionId
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Registration exception:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 7); // 7 days
    
    db.run(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, user.id, expiresAt]
    );
    
    res.json({ 
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      sessionId
    });
  });
});

app.get('/api/auth/github', async (req, res) => {
  try {
    const state = generateState();
    const scopes = ['user:email'];
    const url = github.createAuthorizationURL(state, scopes);
    res.json({ url: url.toString(), state });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get GitHub URL' });
  }
});

app.post('/api/auth/github/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` }
    });
    const githubUser = await response.json();

    // Check if user exists
    db.get('SELECT * FROM users WHERE github_id = ?', [githubUser.id.toString()], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      let userId;
      
      if (!user) {
        // Create new user
        userId = uuidv4();
        db.run(
          'INSERT INTO users (id, username, email, password, github_id, avatar) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, githubUser.login, githubUser.email || `${githubUser.id}@github`, null, githubUser.id.toString(), githubUser.avatar_url]
        );
      } else {
        userId = user.id;
      }

      // Create session
      const sessionId = uuidv4();
      const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 7);
      
      db.run(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        [sessionId, userId, expiresAt]
      );
      
      res.json({ 
        user: { 
          id: userId, 
          username: user?.username || githubUser.login, 
          email: user?.email || githubUser.email, 
          avatar: user?.avatar || githubUser.avatar_url 
        },
        sessionId
      });
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'GitHub authentication failed' });
  }
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  db.run('DELETE FROM sessions WHERE id = ?', [req.sessionId]);
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Store code verifiers temporarily (in production, use Redis or database)
const codeVerifiers = new Map();

// Google OAuth routes
app.get('/api/auth/google', async (req, res) => {
  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.' 
      });
    }
    
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const scopes = ['openid', 'email', 'profile'];
    const url = google.createAuthorizationURL(state, codeVerifier, scopes);
    
    // Store code verifier with state for later validation
    codeVerifiers.set(state, codeVerifier);
    
    res.json({ url: url.toString(), state });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({ error: 'Failed to get Google URL', details: error.message });
  }
});

app.post('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  // Get code verifier from stored state
  const codeVerifier = codeVerifiers.get(state);
  if (!codeVerifier) {
    return res.status(400).json({ error: 'Invalid or expired state' });
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    
    // Clean up code verifier
    codeVerifiers.delete(state);
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }
    
    const googleUser = await response.json();

    // Check if user exists
    db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleUser.sub, googleUser.email], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      let userId;
      
      if (!user) {
        // Create new user
        userId = uuidv4();
        db.run(
          'INSERT INTO users (id, username, email, password, google_id, avatar) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, googleUser.name || googleUser.given_name || 'User', googleUser.email, null, googleUser.sub, googleUser.picture],
          function(insertErr) {
            if (insertErr) {
              console.error('User creation error:', insertErr);
              return res.status(500).json({ error: 'Failed to create user' });
            }
            createSession();
          }
        );
      } else {
        userId = user.id;
        // Update google_id if not set
        if (!user.google_id) {
          db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleUser.sub, userId]);
        }
        createSession();
      }

      function createSession() {
        // Create session
        const sessionId = uuidv4();
        const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 7);
        
        db.run(
          'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
          [sessionId, userId, expiresAt],
          function(sessionErr) {
            if (sessionErr) {
              console.error('Session creation error:', sessionErr);
              return res.status(500).json({ error: 'Failed to create session' });
            }
            
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, finalUser) => {
              if (err) {
                console.error('Error fetching final user:', err);
                return res.status(500).json({ error: 'Failed to fetch user' });
              }
              
              res.json({ 
                user: { 
                  id: userId, 
                  username: finalUser?.username || googleUser.name || googleUser.given_name || 'User', 
                  email: finalUser?.email || googleUser.email, 
                  avatar: finalUser?.avatar || googleUser.picture 
                },
                sessionId
              });
            });
          }
        );
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed', details: error.message });
  }
});

// Workspaces routes
app.get('/api/workspaces', authenticate, (req, res) => {
  db.all(
    `SELECT w.* FROM workspaces w
     JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = ?
     ORDER BY w.created_at`,
    [req.user.id],
    (err, workspaces) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workspaces' });
      }
      res.json(workspaces);
    }
  );
});

app.post('/api/workspaces', authenticate, (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  console.log('Creating workspace:', { name, userId: req.user.id });

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Function to create unique slug
  const createUniqueSlug = (baseSlug, attempt = 0, callback) => {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    
    db.get('SELECT id FROM workspaces WHERE slug = ?', [slug], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      
      if (row) {
        // Slug exists, try with increment
        createUniqueSlug(baseSlug, attempt + 1, callback);
      } else {
        // Slug is available
        callback(null, slug);
      }
    });
  };

  createUniqueSlug(baseSlug, 0, (err, slug) => {
    if (err) {
      console.error('Error checking slug uniqueness:', err);
      return res.status(500).json({ error: 'Failed to create workspace' });
    }

    const workspaceId = uuidv4();
    
    db.run(
      'INSERT INTO workspaces (id, name, slug, description, owner_id) VALUES (?, ?, ?, ?, ?)',
      [workspaceId, name, slug, description || '', req.user.id],
      function(err) {
        if (err) {
          console.error('Workspace creation error:', err);
          return res.status(500).json({ error: 'Failed to create workspace', details: err.message });
        }
        
        console.log('Workspace created, adding owner as member...');
        
        // Add owner as member
        const memberId = uuidv4();
        db.run(
          'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)',
          [memberId, workspaceId, req.user.id, 'owner'],
          function(memberErr) {
            if (memberErr) {
              console.error('Failed to add workspace member:', memberErr);
              // Still return the workspace, but log the error
            } else {
              console.log('Workspace member added successfully');
            }
            
            res.json({ id: workspaceId, name, slug, description: description || '', owner_id: req.user.id });
          }
        );
      }
    );
  });
});

// Workspace members routes (must be before channels route to match correctly)
// Get workspace members
app.get('/api/workspaces/:workspaceId/members', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  db.all(
    `SELECT wm.*, u.username, u.email, u.avatar 
     FROM workspace_members wm
     JOIN users u ON wm.user_id = u.id
     WHERE wm.workspace_id = ?`,
    [workspaceId],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workspace members' });
      }
      res.json(members);
    }
  );
});

// Add users to workspace
app.post('/api/workspaces/:workspaceId/members', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { userIds } = req.body;
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'User IDs are required' });
  }

  // Check if user is workspace admin/owner
  db.get(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, req.user.id],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      const addedMembers = [];
      let completed = 0;
      let errors = 0;

      if (userIds.length === 0) {
        return res.json({ success: true, added: [] });
      }

      userIds.forEach((userId) => {
        // Check if user is already a member
        db.get(
          'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
          [workspaceId, userId],
          (checkErr, existing) => {
            if (checkErr) {
              errors++;
              completed++;
              if (completed === userIds.length) {
                return res.status(500).json({ error: 'Failed to check membership' });
              }
              return;
            }

            if (existing) {
              completed++;
              if (completed === userIds.length) {
                return res.json({ success: true, added: addedMembers });
              }
              return;
            }

            // Add member
            const memberId = uuidv4();
            db.run(
              'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)',
              [memberId, workspaceId, userId, 'member'],
              (insertErr) => {
                if (insertErr) {
                  errors++;
                } else {
                  addedMembers.push({ id: memberId, user_id: userId, workspace_id: workspaceId });
                }
                
                completed++;
                if (completed === userIds.length) {
                  if (errors > 0 && addedMembers.length === 0) {
                    return res.status(500).json({ error: 'Failed to add members' });
                  }
                  res.json({ success: true, added: addedMembers });
                }
              }
            );
          }
        );
      });
    }
  );
});

// Invite user by email (must be before channels route to match correctly)
app.post('/api/workspaces/:workspaceId/invite-email', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Check if user is workspace member
  db.get(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, req.user.id],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      // Find user by email
      db.get(
        'SELECT id FROM users WHERE email = ?',
        [email],
        (userErr, user) => {
          if (userErr) {
            return res.status(500).json({ error: 'Failed to find user' });
          }

          if (!user) {
            // User doesn't exist - in a real app, you'd send an invitation email
            // For now, we'll just return success
            return res.json({ 
              success: true, 
              message: 'Invitation sent (user will be created when they accept)',
              invited: true
            });
          }

          // Check if user is already a member
          db.get(
            'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspaceId, user.id],
            (memberErr, existing) => {
              if (memberErr) {
                return res.status(500).json({ error: 'Failed to check membership' });
              }

              if (existing) {
                return res.status(400).json({ error: 'User is already a member of this workspace' });
              }

              // Add user to workspace
              const memberId = uuidv4();
              db.run(
                'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)',
                [memberId, workspaceId, user.id, 'member'],
                (insertErr) => {
                  if (insertErr) {
                    return res.status(500).json({ error: 'Failed to add user to workspace' });
                  }

                  res.json({ success: true, added: { user_id: user.id } });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Channels routes (after member routes)
app.get('/api/workspaces/:workspaceId/channels', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  // Check workspace membership
  db.get(
    'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, req.user.id],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get public channels and private channels user is a member of
      db.all(
        `SELECT c.* FROM channels c
         LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
         WHERE c.workspace_id = ? AND (c.is_private = 0 OR cm.user_id IS NOT NULL)
         ORDER BY c.created_at`,
        [req.user.id, workspaceId],
        (err, channels) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch channels' });
          }
          res.json(channels);
        }
      );
    }
  );
});

app.post('/api/workspaces/:workspaceId/channels', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { name, description, isPrivate, memberIds } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  console.log('Creating channel:', { name, workspaceId, userId: req.user.id });

  const channelId = uuidv4();
  db.run(
    'INSERT INTO channels (id, workspace_id, name, description, is_private, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [channelId, workspaceId, name, description || '', isPrivate ? 1 : 0, req.user.id],
    function(err) {
      if (err) {
        console.error('Channel creation error:', err);
        return res.status(500).json({ error: 'Failed to create channel', details: err.message });
      }

      // Add creator and specified members to private channels, or creator to public channels
      if (isPrivate && memberIds && memberIds.length > 0) {
        const members = [req.user.id, ...memberIds];
        let completed = 0;
        const total = members.length;
        
        members.forEach(userId => {
          db.run(
            'INSERT INTO channel_members (id, channel_id, user_id) VALUES (?, ?, ?)',
            [uuidv4(), channelId, userId],
            function(memberErr) {
              completed++;
              if (memberErr) {
                console.error('Failed to add channel member:', memberErr);
              }
              // Only send response after all members are processed (or on error)
              if (completed === total) {
                res.json({ id: channelId, workspace_id: workspaceId, name, description: description || '', is_private: isPrivate || false, created_by: req.user.id });
              }
            }
          );
        });
      } else {
        // For public channels, add creator as member
        db.run(
          'INSERT INTO channel_members (id, channel_id, user_id) VALUES (?, ?, ?)',
          [uuidv4(), channelId, req.user.id],
          function(memberErr) {
            if (memberErr) {
              console.error('Failed to add channel member:', memberErr);
            }
            res.json({ id: channelId, workspace_id: workspaceId, name, description: description || '', is_private: isPrivate || false, created_by: req.user.id });
          }
        );
      }
    }
  );
});

// Messages routes
app.get('/api/channels/:channelId/messages', authenticate, (req, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit) || 100;

  db.all(
    `SELECT m.*, u.username, u.avatar 
     FROM messages m 
     JOIN users u ON m.user_id = u.id 
     WHERE m.channel_id = ? AND m.thread_id IS NULL
     ORDER BY m.created_at ASC 
     LIMIT ?`,
    [channelId, limit],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch messages' });
      }
      res.json(messages);
    }
  );
});

// File upload route (alternative to Socket.io for large files) - place before dynamic routes
app.post('/api/messages/upload-file', 
  authenticate,
  express.raw({ type: '*/*', limit: '50mb' }),
  (req, res) => {
  try {
    // Decode base64 metadata
    const metadataHeader = req.headers['x-file-metadata'];
    if (!metadataHeader || typeof metadataHeader !== 'string') {
      return res.status(400).json({ error: 'Missing file metadata' });
    }
    
    let metadata;
    try {
      // Try to decode as base64 first, then parse JSON
      const decoded = Buffer.from(metadataHeader, 'base64').toString('utf-8');
      metadata = JSON.parse(decoded);
    } catch (e) {
      // Fallback: try parsing directly (for backward compatibility)
      metadata = JSON.parse(metadataHeader);
    }
    
    const { channelId, dmConversationId, fileName: encodedFileName, contentType } = metadata;
    
    // Decode filename from base64 (Node.js uses Buffer, not atob)
    let fileName;
    if (encodedFileName) {
      try {
        // Decode from base64, then decode URI component
        const decoded = Buffer.from(encodedFileName, 'base64').toString('utf-8');
        fileName = decodeURIComponent(decoded);
      } catch (e) {
        // Fallback: use as-is if decoding fails (might not be base64 encoded)
        fileName = encodedFileName;
      }
    } else {
      fileName = 'file';
    }
    
    const userId = req.user.id;
    
    if (!fileName || (!channelId && !dmConversationId)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(fileName) || '.bin';
    const savedFileName = `${fileId}${ext}`;
    const filePath = path.join(uploadsDir, savedFileName);

    // Save file synchronously (for reliability, can be optimized later with streams)
    try {
      fs.writeFileSync(filePath, req.body);
    } catch (writeErr) {
      return res.status(500).json({ error: 'Failed to save file' });
    }

    // Create file URL
    const fileUrl = `http://localhost:3001/uploads/${savedFileName}`;

    // Create message with file
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // Use user info from req.user (already available from authenticate middleware)
    db.run(
      'INSERT INTO messages (id, channel_id, dm_conversation_id, user_id, content, file_url, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [messageId, channelId || null, dmConversationId || null, userId, '', fileUrl, fileName, timestamp],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save message' });
        }

        // Use req.user instead of querying again
        const message = {
          id: messageId,
          channel_id: channelId,
          dm_conversation_id: dmConversationId,
          user_id: userId,
          content: '',
          file_url: fileUrl,
          file_name: fileName,
          created_at: timestamp,
          username: req.user.username,
          avatar: req.user.avatar
        };

        // Emit via Socket.io (non-blocking)
        if (channelId) {
          io.to(`channel:${channelId}`).emit('new-message', message);
        } else if (dmConversationId) {
          io.to(`dm:${dmConversationId}`).emit('new-message', message);
        }

        // Send response
        res.json({ success: true, message, fileUrl });
      }
    );
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

app.get('/api/messages/:messageId/threads', authenticate, (req, res) => {
  const { messageId } = req.params;

  db.all(
    `SELECT m.*, u.username, u.avatar 
     FROM messages m 
     JOIN users u ON m.user_id = u.id 
     WHERE m.thread_id = ?
     ORDER BY m.created_at ASC`,
    [messageId],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch thread messages' });
      }
      res.json(messages);
    }
  );
});

// Direct messages routes
app.get('/api/dm-conversations', authenticate, (req, res) => {
  db.all(
    `SELECT dmc.*, 
     CASE 
       WHEN dmc.user1_id = ? THEN u2.username
       ELSE u1.username
     END as other_username,
     CASE 
       WHEN dmc.user1_id = ? THEN u2.avatar
       ELSE u1.avatar
     END as other_avatar,
     CASE 
       WHEN dmc.user1_id = ? THEN u2.id
       ELSE u1.id
     END as other_user_id
     FROM dm_conversations dmc
     JOIN users u1 ON dmc.user1_id = u1.id
     JOIN users u2 ON dmc.user2_id = u2.id
     WHERE dmc.user1_id = ? OR dmc.user2_id = ?`,
    [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
    (err, conversations) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch conversations' });
      }
      res.json(conversations);
    }
  );
});

app.post('/api/dm-conversations', authenticate, (req, res) => {
  const { userId } = req.body;
  
  if (!userId || userId === req.user.id) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Check if conversation exists (with full data)
  db.get(
    `SELECT dmc.*, 
     CASE 
       WHEN dmc.user1_id = ? THEN u2.username
       ELSE u1.username
     END as other_username,
     CASE 
       WHEN dmc.user1_id = ? THEN u2.avatar
       ELSE u1.avatar
     END as other_avatar,
     CASE 
       WHEN dmc.user1_id = ? THEN u2.id
       ELSE u1.id
     END as other_user_id
     FROM dm_conversations dmc
     JOIN users u1 ON dmc.user1_id = u1.id
     JOIN users u2 ON dmc.user2_id = u2.id
     WHERE (dmc.user1_id = ? AND dmc.user2_id = ?) OR (dmc.user1_id = ? AND dmc.user2_id = ?)`,
    [req.user.id, req.user.id, req.user.id, req.user.id, userId, userId, req.user.id],
    (err, existing) => {
      if (err) {
        console.error('Error checking existing conversation:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        return res.json(existing);
      }

      // Create new conversation
      const conversationId = uuidv4();
      db.run(
        'INSERT INTO dm_conversations (id, user1_id, user2_id) VALUES (?, ?, ?)',
        [conversationId, req.user.id, userId],
        function(err) {
          if (err) {
            console.error('Error creating conversation:', err);
            return res.status(500).json({ error: 'Failed to create conversation' });
          }
          
          // Fetch the newly created conversation with full data
          db.get(
            `SELECT dmc.*, 
             CASE 
               WHEN dmc.user1_id = ? THEN u2.username
               ELSE u1.username
             END as other_username,
             CASE 
               WHEN dmc.user1_id = ? THEN u2.avatar
               ELSE u1.avatar
             END as other_avatar,
             CASE 
               WHEN dmc.user1_id = ? THEN u2.id
               ELSE u1.id
             END as other_user_id
             FROM dm_conversations dmc
             JOIN users u1 ON dmc.user1_id = u1.id
             JOIN users u2 ON dmc.user2_id = u2.id
             WHERE dmc.id = ?`,
            [req.user.id, req.user.id, req.user.id, conversationId],
            (fetchErr, conversation) => {
              if (fetchErr || !conversation) {
                console.error('Error fetching new conversation:', fetchErr);
                return res.status(500).json({ error: 'Failed to fetch conversation' });
              }
              res.json(conversation);
            }
          );
        }
      );
    }
  );
});

app.get('/api/dm-conversations/:conversationId/messages', authenticate, (req, res) => {
  const { conversationId } = req.params;

  db.all(
    `SELECT m.*, u.username, u.avatar 
     FROM messages m 
     JOIN users u ON m.user_id = u.id 
     WHERE m.dm_conversation_id = ?
     ORDER BY m.created_at ASC`,
    [conversationId],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch messages' });
      }
      res.json(messages);
    }
  );
});

// Users routes (for DM)
// Canvas routes
app.get('/api/channels/:channelId/canvas', authenticate, (req, res) => {
  const { channelId } = req.params;
  
  db.get(
    'SELECT * FROM canvas WHERE channel_id = ? ORDER BY updated_at DESC LIMIT 1',
    [channelId],
    (err, canvas) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch canvas' });
      }
      res.json(canvas || null);
    }
  );
});

app.post('/api/channels/:channelId/canvas', authenticate, (req, res) => {
  const { channelId } = req.params;
  const { title, content } = req.body;
  
  if (!title && !content) {
    return res.status(400).json({ error: 'Title or content is required' });
  }

  const canvasId = uuidv4();
  
  db.run(
    'INSERT INTO canvas (id, channel_id, title, content, created_by) VALUES (?, ?, ?, ?, ?)',
    [canvasId, channelId, title || 'Untitled Canvas', content || '', req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create canvas' });
      }
      res.json({ id: canvasId, channel_id: channelId, title: title || 'Untitled Canvas', content: content || '', created_by: req.user.id });
    }
  );
});

app.put('/api/canvas/:canvasId', authenticate, (req, res) => {
  const { canvasId } = req.params;
  const { title, content } = req.body;
  
  db.run(
    'UPDATE canvas SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND created_by = ?',
    [title, content, canvasId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update canvas' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Canvas not found' });
      }
      res.json({ success: true });
    }
  );
});

// Channel templates route
app.post('/api/channels/:channelId/templates', authenticate, (req, res) => {
  const { channelId } = req.params;
  const { templateId } = req.body;
  
  if (!templateId) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const templateRecordId = uuidv4();
  
  // Store template initialization
  db.run(
    'INSERT INTO channel_templates (id, template_id, channel_id) VALUES (?, ?, ?)',
    [templateRecordId, templateId, channelId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to initialize template' });
      }
      
      // Create initial welcome message based on template
      const messageId = uuidv4();
      let welcomeMessage = '';
      
      switch(templateId) {
        case 'project':
          welcomeMessage = 'Project initialized! Get started by organizing your team, documents, and milestones.';
          break;
        case 'team':
          welcomeMessage = 'Team support channel ready! Use this space for weekly syncs and team discussions.';
          break;
        case 'partners':
          welcomeMessage = 'External partner collaboration channel created. Invite your partners to get started.';
          break;
        case 'invite':
          welcomeMessage = 'Ready to invite your team! Use the "Invite teammates" button to add members.';
          break;
        default:
          welcomeMessage = 'Channel template initialized.';
      }
      
      // Get user info for the message
      db.get('SELECT username, avatar FROM users WHERE id = ?', [req.user.id], (userErr, user) => {
        if (userErr || !user) {
          console.error('Failed to fetch user:', userErr);
          return res.status(500).json({ error: 'Failed to fetch user info' });
        }

        db.run(
          'INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [messageId, channelId, req.user.id, welcomeMessage],
          function(msgErr) {
            if (msgErr) {
              console.error('Failed to create welcome message:', msgErr);
              return res.status(500).json({ error: 'Failed to create welcome message' });
            }

            // Emit the message via Socket.io
            const message = {
              id: messageId,
              channel_id: channelId,
              user_id: req.user.id,
              content: welcomeMessage,
              created_at: new Date().toISOString(),
              username: user.username,
              avatar: user.avatar
            };
            io.to(`channel:${channelId}`).emit('new-message', message);

            res.json({ success: true, templateId, message });
          }
        );
      });
    }
  );
});

app.get('/api/users', authenticate, (req, res) => {
  const { workspaceId } = req.query;
  
  if (workspaceId) {
    // Get users NOT in workspace (for inviting)
    db.all(
      `SELECT DISTINCT u.id, u.username, u.email, u.avatar 
       FROM users u
       WHERE u.id != ? 
       AND u.id NOT IN (
         SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = ?
       )`,
      [req.user.id, workspaceId],
      (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(users);
      }
    );
  } else {
    db.all(
      'SELECT id, username, email, avatar FROM users WHERE id != ?',
      [req.user.id],
      (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json(users);
      }
    );
  }
});

// Workspace members routes (must be before other workspace routes to avoid conflicts)
// Get workspace members
app.get('/api/workspaces/:workspaceId/members', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  db.all(
    `SELECT wm.*, u.username, u.email, u.avatar 
     FROM workspace_members wm
     JOIN users u ON wm.user_id = u.id
     WHERE wm.workspace_id = ?`,
    [workspaceId],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workspace members' });
      }
      res.json(members);
    }
  );
});

// Add users to workspace
app.post('/api/workspaces/:workspaceId/members', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { userIds } = req.body;
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'User IDs are required' });
  }

  // Check if user is workspace admin/owner
  db.get(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, req.user.id],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      const addedMembers = [];
      let completed = 0;
      let errors = 0;

      if (userIds.length === 0) {
        return res.json({ success: true, added: [] });
      }

      userIds.forEach((userId) => {
        // Check if user is already a member
        db.get(
          'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
          [workspaceId, userId],
          (checkErr, existing) => {
            if (checkErr) {
              errors++;
              completed++;
              if (completed === userIds.length) {
                return res.status(500).json({ error: 'Failed to check membership' });
              }
              return;
            }

            if (existing) {
              completed++;
              if (completed === userIds.length) {
                return res.json({ success: true, added: addedMembers });
              }
              return;
            }

            // Add member
            const memberId = uuidv4();
            db.run(
              'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)',
              [memberId, workspaceId, userId, 'member'],
              (insertErr) => {
                if (insertErr) {
                  errors++;
                } else {
                  addedMembers.push({ id: memberId, user_id: userId, workspace_id: workspaceId });
                }
                
                completed++;
                if (completed === userIds.length) {
                  if (errors > 0 && addedMembers.length === 0) {
                    return res.status(500).json({ error: 'Failed to add members' });
                  }
                  res.json({ success: true, added: addedMembers });
                }
              }
            );
          }
        );
      });
    }
  );
});

// Invite user by email (must be before /api/workspaces/:workspaceId/channels route)
app.post('/api/workspaces/:workspaceId/invite-email', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Check if user is workspace member
  db.get(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, req.user.id],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      // Find user by email
      db.get(
        'SELECT id FROM users WHERE email = ?',
        [email],
        (userErr, user) => {
          if (userErr) {
            return res.status(500).json({ error: 'Failed to find user' });
          }

          if (!user) {
            // User doesn't exist - in a real app, you'd send an invitation email
            // For now, we'll just return success
            return res.json({ 
              success: true, 
              message: 'Invitation sent (user will be created when they accept)',
              invited: true
            });
          }

          // Check if user is already a member
          db.get(
            'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspaceId, user.id],
            (memberErr, existing) => {
              if (memberErr) {
                return res.status(500).json({ error: 'Failed to check membership' });
              }

              if (existing) {
                return res.status(400).json({ error: 'User is already a member of this workspace' });
              }

              // Add user to workspace
              const memberId = uuidv4();
              db.run(
                'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)',
                [memberId, workspaceId, user.id, 'member'],
                (insertErr) => {
                  if (insertErr) {
                    return res.status(500).json({ error: 'Failed to add user to workspace' });
                  }

                  res.json({ success: true, added: { user_id: user.id } });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Edit message
app.put('/api/messages/:messageId', authenticate, (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }

  // Check if user owns the message
  db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, message) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    const editedAt = new Date().toISOString();
    db.run(
      'UPDATE messages SET content = ?, edited_at = ? WHERE id = ?',
      [content, editedAt, messageId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update message' });
        }

        // Fetch username for socket event
        db.get('SELECT username, avatar FROM users WHERE id = ?', [message.user_id], (userErr, user) => {
          const updatedMessage = {
            id: messageId,
            channel_id: message.channel_id,
            dm_conversation_id: message.dm_conversation_id,
            user_id: message.user_id,
            content,
            created_at: message.created_at,
            edited_at: editedAt,
            username: user?.username || 'User',
            avatar: user?.avatar
          };

          // Emit socket event for real-time update
          if (message.channel_id) {
            io.to(`channel:${message.channel_id}`).emit('message-edited', updatedMessage);
          } else if (message.dm_conversation_id) {
            io.to(`dm:${message.dm_conversation_id}`).emit('message-edited', updatedMessage);
          }

          res.json(updatedMessage);
        });
      }
    );
  });
});

// Delete message
app.delete('/api/messages/:messageId', authenticate, (req, res) => {
  const { messageId } = req.params;

  // Check if user owns the message
  db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, message) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    db.run('DELETE FROM messages WHERE id = ?', [messageId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete message' });
      }

      // Also delete reactions for this message
      db.run('DELETE FROM message_reactions WHERE message_id = ?', [messageId]);

      // Emit socket event for real-time update
      if (message.channel_id) {
        io.to(`channel:${message.channel_id}`).emit('message-deleted', { messageId });
      } else if (message.dm_conversation_id) {
        io.to(`dm:${message.dm_conversation_id}`).emit('message-deleted', { messageId });
      }

      res.json({ success: true, messageId });
    });
  });
});

// Reactions routes
app.post('/api/messages/:messageId/reactions', authenticate, (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  // Check if reaction exists
  db.get(
    'SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [messageId, req.user.id, emoji],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        // Remove reaction
        db.run(
          'DELETE FROM message_reactions WHERE id = ?',
          [existing.id]
        );
        return res.json({ removed: true });
      } else {
        // Add reaction
        const reactionId = uuidv4();
        db.run(
          'INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)',
          [reactionId, messageId, req.user.id, emoji],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to add reaction' });
            }
            res.json({ id: reactionId, message_id: messageId, user_id: req.user.id, emoji });
          }
        );
      }
    }
  );
});

app.get('/api/messages/:messageId/reactions', authenticate, (req, res) => {
  const { messageId } = req.params;

  db.all(
    `SELECT mr.*, u.username 
     FROM message_reactions mr
     JOIN users u ON mr.user_id = u.id
     WHERE mr.message_id = ?`,
    [messageId],
    (err, reactions) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch reactions' });
      }
      
      // Group by emoji
      const grouped = reactions.reduce((acc, r) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = [];
        }
        acc[r.emoji].push(r);
        return acc;
      }, {});
      
      res.json(grouped);
    }
  );
});

// Socket.io for real-time messaging
const typingUsers = new Map();

// ===================================
// NEW BACKEND FEATURES
// ===================================

// 1. USER PRESENCE ENDPOINTS

// Update user status
app.put('/api/users/me/status', authenticate, (req, res) => {
  const { status, custom_status, status_emoji } = req.body;
  
  db.run(
    `INSERT INTO user_presence (user_id, status, custom_status, status_emoji, last_activity)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       custom_status = excluded.custom_status,
       status_emoji = excluded.status_emoji,
       last_activity = datetime('now')`,
    [req.user.id, status || 'online', custom_status, status_emoji],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update status' });
      }
      res.json({ user_id: req.user.id, status, custom_status, status_emoji });
    }
  );
});

// Get workspace members' presence
app.get('/api/workspaces/:workspaceId/presence', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  db.all(
    `SELECT u.id, u.username, u.avatar, p.status, p.custom_status, p.status_emoji, p.last_activity
     FROM workspace_members wm
     JOIN users u ON wm.user_id = u.id
     LEFT JOIN user_presence p ON u.id = p.user_id
     WHERE wm.workspace_id = ?`,
    [workspaceId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch presence' });
      }
      res.json(rows || []);
    }
  );
});

// 2. PINNED MESSAGES ENDPOINTS

// Pin a message
app.post('/api/messages/:messageId/pin', authenticate, (req, res) => {
  const { messageId } = req.params;
  const { channelId, dmConversationId } = req.body;
  
  db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, message) => {
    if (err || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const pinId = uuidv4();
    db.run(
      'INSERT INTO pinned_messages (id, message_id, channel_id, dm_conversation_id, pinned_by_user_id) VALUES (?, ?, ?, ?, ?)',
      [pinId, messageId, channelId || null, dmConversationId || null, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to pin message' });
        }
        res.json({ id: pinId, message_id: messageId, pinned_by: req.user.username });
      }
    );
  });
});

// Unpin a message
app.delete('/api/messages/:messageId/unpin', authenticate, (req, res) => {
  const { messageId } = req.params;
  
  db.run('DELETE FROM pinned_messages WHERE message_id = ?', [messageId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to unpin message' });
    }
    res.json({ success: true });
  });
});

// Get pinned messages for channel
app.get('/api/channels/:channelId/pinned', authenticate, (req, res) => {
  const { channelId } = req.params;
  
  db.all(
    `SELECT m.*, p.pinned_at, p.pinned_by_user_id, u.username as pinned_by_username,
            msg_user.username, msg_user.avatar
     FROM pinned_messages p
     JOIN messages m ON p.message_id = m.id
     JOIN users msg_user ON m.user_id = msg_user.id
     LEFT JOIN users u ON p.pinned_by_user_id = u.id
     WHERE p.channel_id = ?
     ORDER BY p.pinned_at DESC`,
    [channelId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch pinned messages' });
      }
      res.json(rows || []);
    }
  );
});

// 3. UNREAD COUNTS ENDPOINTS

// Mark channel as read
app.post('/api/channels/:channelId/mark-read', authenticate, (req, res) => {
  const { channelId } = req.params;
  
  db.run(
    `INSERT INTO channel_reads (user_id, channel_id, last_read_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id, channel_id) DO UPDATE SET
       last_read_at = datetime('now')`,
    [req.user.id, channelId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to mark as read' });
      }
      res.json({ success: true });
    }
  );
});

// Get unread counts for all channels in workspace
app.get('/api/workspaces/:workspaceId/unread-counts', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  db.all(
    `SELECT 
       c.id as channel_id,
       COUNT(CASE WHEN m.created_at > COALESCE(cr.last_read_at, '1970-01-01') THEN 1 END) as unread_count
     FROM channels c
     LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
     LEFT JOIN channel_reads cr ON c.id = cr.channel_id AND cr.user_id = ?
     LEFT JOIN messages m ON c.id = m.channel_id
     WHERE c.workspace_id = ?
     GROUP BY c.id`,
    [req.user.id, req.user.id, workspaceId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch unread counts' });
      }
      res.json(rows || []);
    }
  );
});

// 4. CHANNEL TOPIC ENDPOINT

// Update channel topic
app.put('/api/channels/:channelId/topic', authenticate, (req, res) => {
  const { channelId } = req.params;
  const { topic } = req.body;
  
  db.run(
    'UPDATE channels SET topic = ? WHERE id = ?',
    [topic || '', channelId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update topic' });
      }
      res.json({ channel_id: channelId, topic });
    }
  );
});

// 5. MESSAGE SEARCH ENDPOINT

// Search messages in workspace
app.get('/api/workspaces/:workspaceId/search', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.json([]);
  }
  
  const searchTerm = `%${q}%`;
  
  db.all(
    `SELECT m.*, u.username, u.avatar, c.name as channel_name
     FROM messages m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN channels c ON m.channel_id = c.id
     WHERE c.workspace_id = ? AND m.content LIKE ?
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [workspaceId, searchTerm],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Search failed' });
      }
      res.json(rows || []);
    }
  );
});

// ===================================
// SOCKET.IO CONNECTION
// ===================================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Track user presence on connection
  socket.on('user-online', (data) => {
    const { userId, workspaceId } = data;
    
    db.run(
      `INSERT INTO user_presence (user_id, status, last_activity)
       VALUES (?, 'online', datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         status = 'online',
         last_activity = datetime('now')`,
      [userId],
      function(err) {
        if (!err) {
          // Broadcast presence to workspace
          io.to(`workspace:${workspaceId}`).emit('presence-update', {
            user_id: userId,
            status: 'online'
          });
        }
      }
    );
  });
  
  // Handle user going offline
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Note: In production, you'd track userId per socket connection
    // For now, presence will be updated via heartbeat or explicit events
  });

  socket.on('join-channel', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('leave-channel', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('join-dm', (conversationId) => {
    socket.join(`dm:${conversationId}`);
  });

  socket.on('send-message', (data) => {
    console.log('📨 Received send-message event');
    const fileSize = data.fileUrl?.length || 0;
    console.log('📎 File data:', { 
      fileName: data.fileName || 'none',
      fileUrlLength: fileSize,
      fileSizeKB: fileSize ? (fileSize / 1024).toFixed(2) + 'KB' : 'none'
    });
    
    // Reject files over 1MB via Socket.io to prevent disconnection
    if (fileSize > 1024 * 1024) {
      console.error('❌ File too large for Socket.io:', fileSize, 'bytes');
      return socket.emit('error', { message: 'File too large. Maximum size is 1MB.' });
    }
    
    const { channelId, dmConversationId, userId, content, threadId, fileUrl, fileName } = data;

    if (!userId) {
      console.error('❌ Invalid message data - missing userId');
      return socket.emit('error', { message: 'Invalid message data - missing userId' });
    }

    if (!content && !fileUrl) {
      console.error('❌ Invalid message data - no content and no fileUrl');
      return socket.emit('error', { message: 'Invalid message data - no content and no file' });
    }

    db.get('SELECT username, avatar FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        return socket.emit('error', { message: 'User not found' });
      }

      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      db.run(
        'INSERT INTO messages (id, channel_id, dm_conversation_id, thread_id, user_id, content, file_url, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [messageId, channelId || null, dmConversationId || null, threadId || null, userId, content || '', fileUrl || null, fileName || null, timestamp],
        (err) => {
          if (err) {
            console.error('❌ Failed to save message:', err);
            return socket.emit('error', { message: 'Failed to save message', details: err.message });
          }

          console.log('✅ Message saved successfully:', messageId);

          const message = {
            id: messageId,
            channel_id: channelId,
            dm_conversation_id: dmConversationId,
            thread_id: threadId,
            user_id: userId,
            content: content || '',
            file_url: fileUrl || null,
            file_name: fileName || null,
            created_at: timestamp,
            username: user.username,
            avatar: user.avatar
          };

          console.log('📤 Prepared message to emit:', {
            id: message.id,
            hasContent: !!message.content,
            hasFileUrl: !!message.file_url,
            fileUrlLength: message.file_url?.length || 0,
            fileName: message.file_name
          });

          if (channelId) {
            console.log('📤 Emitting new-message to channel:', channelId);
            io.to(`channel:${channelId}`).emit('new-message', message);
          } else if (dmConversationId) {
            console.log('📤 Emitting new-message to DM:', dmConversationId);
            io.to(`dm:${dmConversationId}`).emit('new-message', message);
          }
        }
      );
    });
  });

  socket.on('typing', (data) => {
    const { channelId, dmConversationId, userId, username } = data;
    const key = channelId ? `channel:${channelId}` : `dm:${dmConversationId}`;
    typingUsers.set(socket.id, { userId, username, key });
    socket.to(key).emit('user-typing', { userId, username });
  });

  socket.on('stop-typing', (data) => {
    const { channelId, dmConversationId } = data;
    const key = channelId ? `channel:${channelId}` : `dm:${dmConversationId}`;
    const typing = typingUsers.get(socket.id);
    if (typing) {
      socket.to(key).emit('user-stop-typing', { userId: typing.userId });
      typingUsers.delete(socket.id);
    }
  });

  socket.on('disconnect', () => {
    const typing = typingUsers.get(socket.id);
    if (typing) {
      socket.to(typing.key).emit('user-stop-typing', { userId: typing.userId });
      typingUsers.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Catch-all route for 404s
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path, req.url);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
