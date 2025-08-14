import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Icon = ({ name, ...props }) => {
  if (typeof window.lucide === "undefined") return null;
  const LucideIcon = window.lucide[name];
  return LucideIcon ? React.createElement(LucideIcon, props) : null;
};

export default function BudgetPlanner() {
  const navigate = useNavigate();

  // try to read user from localStorage to get email quickly
  const stored = localStorage.getItem('user');
  const localUser = stored ? JSON.parse(stored) : null;

  const [user, setUser] = useState(localUser);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', budget: '' });
  const [editingBudget, setEditingBudget] = useState(null);
  const [editValue, setEditValue] = useState('');

  // helper: fetch user from backend
  const fetchUserFromServer = async () => {
    try {
      if (!user?.email) return;
      const res = await fetch(`http://localhost:5000/user/${encodeURIComponent(user.email)}`);
      if (!res.ok) {
        // if not found or unauthorized, fallback to localStorage -> redirect
        if (res.status === 404) {
          alert('User not found on server. Please login again.');
          localStorage.removeItem('user');
          navigate('/login');
        }
        return;
      }
      const freshUser = await res.json();
      setUser(freshUser);
      // update localStorage for other parts of the app
      localStorage.setItem('user', JSON.stringify(freshUser));
      buildCategoriesFromUser(freshUser);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  // build categories array from user.budgets and user.transactions
  const buildCategoriesFromUser = (u) => {
    const budgets = u?.budgets || {};
    const transactions = u?.transactions || [];

    // compute spent per category from negative amounts
    const spentMap = transactions.reduce((acc, t) => {
      if (!t || typeof t.amount !== 'number') return acc;
      if (t.amount < 0) {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      }
      return acc;
    }, {});

    // default fallback categories (only used if no budgets present)
    const defaultCategories = [
      { id: 1, name: 'Groceries', budget: 8000, spent: spentMap['Groceries'] || 0, description: 'Track your spending on groceries' },
      { id: 2, name: 'Transportation', budget: 5000, spent: spentMap['Transportation'] || 0, description: 'Track your spending on transportation' },
      { id: 3, name: 'Entertainment', budget: 4000, spent: spentMap['Entertainment'] || 0, description: 'Track your spending on entertainment' },
      { id: 4, name: 'Dining Out', budget: 3500, spent: spentMap['Dining Out'] || 0, description: 'Track your spending on dining out' },
    ];

    const built = Object.keys(budgets).length > 0
      ? Object.entries(budgets).map(([name, limit]) => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          budget: Number(limit) || 0,
          spent: spentMap[name] || 0,
          description: `Track your spending on ${name}`
        }))
      : defaultCategories;

    setCategories(built);
  };

  // initial mount: verify user and fetch fresh copy
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // fetch from server to get transactions and latest budgets
    fetchUserFromServer();

    // listen for `userUpdated` custom events (dispatched by dashboard after adding transactions)
    const handler = (e) => {
      if (e?.detail) {
        // event may carry updated user, use it; otherwise refetch
        const updated = e.detail;
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        buildCategoriesFromUser(updated);
      } else {
        fetchUserFromServer();
      }
    };
    window.addEventListener('userUpdated', handler);

    return () => {
      window.removeEventListener('userUpdated', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: compute progress percentage
  const getProgressPercentage = (spent, budget) => {
    const b = Number(budget) || 0;
    const s = Number(spent) || 0;
    const pct = b <= 0 ? 0 : Math.min(100, Math.round((s / b) * 100));
    return pct;
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return '#0d9488'; // teal
    if (percentage < 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // save current budgets back to server (PUT /user/:email)
  const saveBudgets = async () => {
    if (!user?.email) return alert('No user found');
    try {
      // build budgets mapping
      const budgets = {};
      categories.forEach(cat => {
        budgets[cat.name] = Number(cat.budget) || 0;
      });

      const payload = { budgets };
      const res = await fetch(`http://localhost:5000/user/${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({message: 'Unknown error'}));
        console.error('Failed to save budgets', err);
        return alert('Failed to save budgets');
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Budgets saved successfully!');
      // optionally dispatch event so dashboard can pick it up
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
    } catch (err) {
      console.error('saveBudgets error', err);
      alert('Error saving budgets');
    }
  };

  // Add category (persist immediately)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.budget) {
      alert('Please fill all fields');
      return;
    }
    const budgetValue = parseFloat(newCategory.budget);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    // add locally
    const newCat = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCategory.name,
      budget: budgetValue,
      spent: 0,
      description: `Track your spending on ${newCategory.name}`
    };
    const newCats = [...categories, newCat];
    setCategories(newCats);
    setNewCategory({ name: '', budget: '' });

    // persist budgets to server immediately
    const budgets = {};
    newCats.forEach(cat => budgets[cat.name] = Number(cat.budget) || 0);

    try {
      const res = await fetch(`http://localhost:5000/user/${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      } else {
        alert('Failed to persist new category to server');
      }
    } catch (err) {
      console.error('Failed to persist category', err);
    }
  };

  // update budget value (local + persist immediately)
  const handleUpdateBudget = async (id) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }
    // optimistic UI update
    const updated = categories.map(cat => cat.id === id ? { ...cat, budget: value } : cat);
    setCategories(updated);
    setEditingBudget(null);
    setEditValue('');

    // persist the budgets mapping
    const budgets = {};
    updated.forEach(cat => budgets[cat.name] = Number(cat.budget) || 0);

    try {
      const res = await fetch(`http://localhost:5000/user/${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      } else {
        const err = await res.json().catch(()=>({message:'Unknown error'}));
        console.error('Failed to persist updated budget', err);
        alert('Failed to persist updated budget. Re-syncing...');
        fetchUserFromServer();
      }
    } catch (err) {
      console.error('handleUpdateBudget persist error', err);
      alert('Error persisting updated budget. Re-syncing...');
      fetchUserFromServer();
    }
  };

  // delete category (local + persist)
  const handleDeleteCategory = async (id) => {
    const removed = categories.filter(cat => cat.id !== id);
    setCategories(removed);

    // persist
    const budgets = {};
    removed.forEach(cat => budgets[cat.name] = Number(cat.budget) || 0);
    try {
      const res = await fetch(`http://localhost:5000/user/${encodeURIComponent(user.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      } else {
        alert('Failed to delete category on server');
      }
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-teal-700">FinanceR</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">Hello, {user.name}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Icon name="Home" className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800">Monthly Budgets</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Set your spending limits for each category to stay on track.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Spending Categories */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">Spending Categories</h2>

              <div className="space-y-8">
                {categories.map(category => {
                  const progress = getProgressPercentage(category.spent, category.budget);
                  const progressColor = getProgressColor(progress);

                  return (
                    <div key={category.id} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{category.name}</h3>
                          <p className="mt-1 text-gray-600">{category.description}</p>
                        </div>

                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Icon name="Trash2" className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Budget: ₹{Number(category.budget).toLocaleString()}</span>
                            <span className="text-sm font-medium text-gray-700">Spent: ₹{Number(category.spent).toLocaleString()}</span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: progressColor
                              }}
                            ></div>
                          </div>

                          <div className="mt-2 flex justify-between">
                            <span className="text-sm text-gray-500">0%</span>
                            <span className="text-sm text-gray-500">100%</span>
                          </div>
                        </div>

                        <div className="ml-6 flex items-center">
                          {editingBudget === category.id ? (
                            <div className="flex">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="New budget"
                                className="w-24 h-9 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                              />
                              <button
                                onClick={() => handleUpdateBudget(category.id)}
                                className="h-9 px-3 bg-teal-600 text-white rounded-r-md hover:bg-teal-700 focus:outline-none"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingBudget(category.id);
                                setEditValue(category.budget.toString());
                              }}
                              className="h-9 px-4 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Add New Category */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">Add New Category</h2>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="Enter category name"
                    className="h-11 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Amount
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      name="budget"
                      value={newCategory.budget}
                      onChange={(e) => setNewCategory({...newCategory, budget: e.target.value})}
                      placeholder="Enter budget amount"
                      className="h-11 block w-full pl-8 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  >
                    <Icon name="Plus" className="h-4 w-4 mr-2" />
                    Add Category
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Budget Summary</h2>
                <button
                  onClick={saveBudgets}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none"
                >
                  Save All Budgets
                </button>
              </div>

              <div className="space-y-4">
                {categories.map(category => {
                  const progress = getProgressPercentage(category.spent, category.budget);
                  return (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                          <span className="text-sm font-medium text-gray-700">
                            ₹{Number(category.spent).toLocaleString()} / ₹{Number(category.budget).toLocaleString()}
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: getProgressColor(progress)
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="ml-4 w-16 text-right">
                        <span className="text-sm font-medium text-gray-700">{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-lg font-medium text-gray-800">Total Budget</span>
                  <span className="text-lg font-bold text-teal-700">
                    ₹{categories.reduce((sum, cat) => sum + Number(cat.budget || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-lg font-medium text-gray-800">Total Spent</span>
                  <span className="text-lg font-bold text-red-600">
                    ₹{categories.reduce((sum, cat) => sum + Number(cat.spent || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-lg font-medium text-gray-800">Remaining</span>
                  <span className="text-lg font-bold text-emerald-600">
                    ₹{categories.reduce((sum, cat) => sum + (Number(cat.budget || 0) - Number(cat.spent || 0)), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
