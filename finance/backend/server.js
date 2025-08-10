import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Configure paths and initialize app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors({ 
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Helper functions
async function readUsers() {
  try {
    await fs.access(USERS_FILE); // Check if file exists
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create it with empty array
      await fs.writeFile(USERS_FILE, '[]');
      return [];
    }
    throw err;
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'FinanceR Backend API',
    endpoints: [
      { method: 'POST', path: '/register', description: 'Create new account' },
      { method: 'POST', path: '/login', description: 'Authenticate user' },
      { method: 'GET', path: '/users', description: 'List users (debug)' }
    ]
  });
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields (name, email, password) are required' 
      });
    }

    const users = await readUsers();
    
    if (users.some(user => user.email === email)) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    const newUser = { 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      password 
    };
    
    users.push(newUser);
    await writeUsers(users);
    
    res.status(201).json({ 
      success: true,
      message: 'Registration successful',
      user: { name: newUser.name, email: newUser.email } 
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const users = await readUsers();
    const user = users.find(u => 
      u.email === email.trim().toLowerCase() && 
      u.password === password
    );

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Remove password before sending user data
    const { password: _, ...userData } = user;
    
    res.json({ 
      success: true,
      message: 'Login successful',
      user: userData 
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Debug endpoint - remove in production
app.get('/users', async (req, res) => {
  try {
    const users = await readUsers();
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve users' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    message: 'An unexpected error occurred' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
});