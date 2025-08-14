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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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

// Small helper to recompute dashboard.balance from transactions (keeps dashboard consistent)
function recomputeBalanceFromTransactions(transactions = []) {
  const totalIncome = transactions.reduce((acc, t) => acc + (typeof t.amount === 'number' && t.amount > 0 ? t.amount : 0), 0);
  const totalExpenses = transactions.reduce((acc, t) => acc + (typeof t.amount === 'number' && t.amount < 0 ? Math.abs(t.amount) : 0), 0);
  return { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses };
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
      { method: 'GET', path: '/users', description: 'List users (debug)' },
      { method: 'POST', path: '/user/:email/transaction', description: 'Add a transaction (expense/income) for user' }
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
      budgets: {},                    // budgets are stored here in JSON and persisted by PUT /user/:email
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
    // Return the user object directly (no wrapper) — frontend expects this format
    res.json(safeUser);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
  Safe Update (PUT /user/:email)
  - Finds the user by email
  - Performs a shallow merge of stored user and req.body (this preserves fields not present in req.body)
  - Ensures stored user's email is preserved (request cannot change email)
  - Writes back to users.json
  - Returns the updated user object (without password) directly in response
*/
app.put('/user/:email', async (req, res) => {
  try {
    const users = await readUsers();
    const emailParam = req.params.email.toLowerCase();
    const index = users.findIndex(u => u.email === emailParam);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Shallow merge (preserve any fields not present in req.body)
    const merged = { ...users[index], ...req.body };

    // Always preserve the original email (prevent accidental change)
    merged.email = users[index].email;

    // If password was included accidentally in the body, preserve existing password unless intended
    if (!req.body.password) {
      merged.password = users[index].password;
    }

    // If transactions were updated via PUT, recompute dashboard.balance (defensive)
    if (Array.isArray(merged.transactions)) {
      merged.dashboard = merged.dashboard || {};
      merged.dashboard.balance = recomputeBalanceFromTransactions(merged.transactions);
    }

    users[index] = merged;
    await writeUsers(users);

    // Return the user object (without password) directly — matches frontend expectations
    const { password, ...safeUser } = users[index];
    res.json(safeUser);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// New: Add transaction for a user (expense/income)
app.post('/user/:email/transaction', async (req, res) => {
  try {
    const emailParam = req.params.email.toLowerCase();
    const { date, description, category, amount } = req.body;

    if (typeof amount !== 'number' || !description || !category) {
      return res.status(400).json({ success: false, message: 'transaction must include description, category and numeric amount' });
    }

    const users = await readUsers();
    const idx = users.findIndex(u => u.email === emailParam);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tx = {
      id: Date.now(),
      date: date || new Date().toISOString().slice(0, 10),
      description,
      category,
      amount
    };

    users[idx].transactions = users[idx].transactions || [];
    users[idx].transactions.push(tx);

    // recompute dashboard.balance
    users[idx].dashboard = users[idx].dashboard || {};
    users[idx].dashboard.balance = recomputeBalanceFromTransactions(users[idx].transactions);

    // update recentTransactions list in miniCharts (store absolute amounts)
    users[idx].dashboard.miniCharts = users[idx].dashboard.miniCharts || {};
    const recent = users[idx].dashboard.miniCharts.recentTransactions || [];
    recent.push(Math.abs(amount));
    users[idx].dashboard.miniCharts.recentTransactions = recent.slice(-7);

    await writeUsers(users);

    const { password, ...safeUser } = users[idx];
    res.json({ success: true, message: 'Transaction added', user: safeUser });
  } catch (err) {
    console.error('Add transaction error:', err);
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
