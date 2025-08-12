import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Helper functions
async function readUsers() {
  try {
    await fs.access(USERS_FILE);
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
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
      { method: 'GET', path: '/user/:email', description: 'Get full user data' },
      { method: 'PUT', path: '/user/:email', description: 'Update user data' },
      { method: 'GET', path: '/users', description: 'List users (debug)' }
    ]
  });
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const users = await readUsers();

    if (users.some(user => user.email === email.trim().toLowerCase())) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      dashboard: {
        balance: { totalIncome: 0, totalExpenses: 0, netBalance: 0 },
        quickAddDefaults: { categories: [], lastUsedDate: null },
        miniCharts: { incomeVsExpense: { income: 0, expense: 0 }, recentTransactions: [] }
      },
      transactions: [],
      budgets: {},
      reports: { categoryBreakdown: {}, netWorthTrend: [], monthlySpending: [] },
      settings: { theme: 'light', exportFormat: [] }
    };

    users.push(newUser);
    await writeUsers(users);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, message: 'Registration successful', user: safeUser });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const users = await readUsers();
    const user = users.find(
      u => u.email === email.trim().toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password: _, ...safeUser } = user;
    res.json({ success: true, message: 'Login successful', user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user by email
app.get('/user/:email', async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.email === req.params.email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update user
app.put('/user/:email', async (req, res) => {
  try {
    const users = await readUsers();
    const index = users.findIndex(u => u.email === req.params.email.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Merge old data with new updates
    users[index] = { ...users[index], ...req.body };
    await writeUsers(users);

    const { password, ...safeUser } = users[index];
    res.json({ success: true, message: 'User updated successfully', user: safeUser });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
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
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'An unexpected error occurred' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
