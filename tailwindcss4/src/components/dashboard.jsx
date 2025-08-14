import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';

import {
  CurrencyRupeeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

dayjs.extend(localizedFormat);
dayjs.locale('en-gb');

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user')) || { 
    name: 'You', 
    transactions: [], 
    dashboard: {} 
  };

  const [transactions, setTransactions] = useState(storedUser.transactions || []);
  const [quickAdd, setQuickAdd] = useState({ 
    amount: '', 
    category: '', 
    date: dayjs().format('YYYY-MM-DD') 
  });
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [categories] = useState(
    storedUser.dashboard?.quickAddDefaults?.categories || [
      'Salary', 'Freelance', 'Food', 'Rent', 'Travel', 
      'Entertainment', 'Bills', 'Shopping', 'Investment', 'Other'
    ]
  );
  const [balance, setBalance] = useState({ 
    totalIncome: 0, 
    totalExpenses: 0, 
    netBalance: 0 
  });

  const doughnutRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      navigate('/login');
    }
  }, [navigate]);

  const updateUserOnServer = async (newTransactions) => {
    try {
      const currentStored = JSON.parse(localStorage.getItem('user')) || storedUser;
      const updatedUserPayload = { 
        ...currentStored, 
        transactions: newTransactions 
      };

      const res = await fetch(`http://localhost:5000/user/${currentStored.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUserPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to update user on server');
      }

      const serverUser = await res.json();
      localStorage.setItem('user', JSON.stringify(serverUser));
      setTransactions(serverUser.transactions || []);
    } catch (err) {
      console.error('Failed to update server:', err);
    }
  };

  // Combined effect for balance calculation and chart management
  useEffect(() => {
    // Calculate balance
    let totalIncome = 0;
    let totalExpenses = 0;
    
    transactions.forEach((t) => {
      if (t.amount > 0) totalIncome += t.amount;
      else totalExpenses += Math.abs(t.amount);
    });
    
    setBalance({ 
      totalIncome, 
      totalExpenses, 
      netBalance: totalIncome - totalExpenses 
    });

    // Update localStorage
    const currentStored = JSON.parse(localStorage.getItem('user')) || storedUser;
    const updatedUser = { ...currentStored, transactions };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Handle chart initialization/update
    const canvas = doughnutRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart with current data
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          data: [totalIncome, totalExpenses],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
          cutout: '60%',
          hoverOffset: 8,
        }],
      },
      options: {
        plugins: {
          legend: { 
            display: true, 
            position: 'bottom', 
            labels: { 
              boxWidth: 10, 
              padding: 16,
              font: { size: 12 }
            } 
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `₹${Number(ctx.raw).toLocaleString()}`,
            },
          },
        },
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          animateRotate: true,
          animateScale: true
        }
      },
    });
  }, [transactions]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const handleQuickAddChange = (e) => {
    setQuickAdd((prev) => ({ 
      ...prev, 
      [e.target.name]: e.target.value 
    }));
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    
    if (!quickAdd.amount || !quickAdd.category) {
      alert('Please fill amount and category');
      return;
    }
    
    const amount = parseFloat(quickAdd.amount);
    const isIncome = ['Salary', 'Freelance', 'Investment'].includes(quickAdd.category);
    const newTransaction = { 
      id: Date.now(), 
      date: quickAdd.date, 
      description: quickAdd.category, 
      category: quickAdd.category, 
      amount: isIncome ? amount : -amount 
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    updateUserOnServer(updatedTransactions);
    setQuickAdd({ 
      amount: '', 
      category: '', 
      date: dayjs().format('YYYY-MM-DD') 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTransactions);
    updateUserOnServer(updatedTransactions);
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear all transactions? This cannot be undone.')) return;
    setTransactions([]);
    updateUserOnServer([]);
  };

  const filteredTransactions = transactions
    .slice()
    .reverse()
    .filter((t) => (categoryFilter === 'All Categories' ? true : t.category === categoryFilter))
    .filter((t) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        dayjs(t.date).format('LL').toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    });

  const currency = (v) => `₹${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  if (!localStorage.getItem('user')) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* HEADER WITH DISTINCT BACKGROUND */}
        <header className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-7 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-xl bg-white/20 p-3 flex items-center gap-4">
                <CurrencyRupeeIcon className="h-8 w-8 text-white" />
                <div className='w-45'>
                  <h1 className="text-3xl font-bold">FinanceR</h1>
                  <p className="text-sm opacity-90">Smart budgeting & quick entries</p>
                </div>
              </div>

              <div className="flex flex-col ml-4">
                <span className="text-base text-white/80">Welcome back,</span>
                <span className="text-xl font-bold">{storedUser.name || 'You'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                title="Settings" 
                className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all"
              >
                <Cog6ToothIcon className="h-6 w-6 text-white" />
              </button>

              <button 
                onClick={handleLogout} 
                className="mr-3 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/20 text-base font-medium hover:bg-white/30 transition-all"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" /> 
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT — overview + quick add */}
          <section className="space-y-8 lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white rounded-2xl p-7 shadow-xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Financial Overview</h2>
                <div className="text-sm text-gray-500">Updated: {dayjs().format('LL')}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 shadow">
                  <p className="text-sm text-gray-600 mb-1">Income</p>
                  <p className="text-xl font-bold text-emerald-700 flex items-center gap-2">
                    <ArrowUpIcon className="h-5 w-5" /> 
                    {currency(balance.totalIncome)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 shadow">
                  <p className="text-sm text-gray-600 mb-1">Expenses</p>
                  <p className="text-xl font-bold text-rose-600 flex items-center gap-2">
                    <ArrowDownIcon className="h-5 w-5" /> 
                    {currency(balance.totalExpenses)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 shadow">
                  <p className="text-sm text-gray-600 mb-1">Net Balance</p>
                  <p className={`text-xl font-bold ${balance.netBalance >= 0 ? 'text-sky-700' : 'text-orange-600'}`}>
                    {currency(balance.netBalance)}
                  </p>
                </div>
              </div>

              <div className="h-64 flex items-center justify-center">
                <div className="w-full h-full">
                  <canvas ref={doughnutRef} />
                </div>
              </div>
            </motion.div>

            {/* Quick add card */}
            <motion.form 
              onSubmit={handleAddTransaction} 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white rounded-2xl p-7 shadow-xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-800">Quick Transaction</h3>
                <div className="text-sm text-gray-500">Fast entry</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Amount</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <CurrencyRupeeIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <input 
                      name="amount" 
                      value={quickAdd.amount} 
                      onChange={handleQuickAddChange} 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="0.00" 
                      className="text-center pl-10 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-300" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Category</label>
                  <select 
                    name="category" 
                    value={quickAdd.category} 
                    onChange={handleQuickAddChange} 
                    className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Date</label>
                  <input 
                    name="date" 
                    type="date" 
                    value={quickAdd.date} 
                    onChange={handleQuickAddChange} 
                    className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-300" 
                  />
                </div>

                <div className="flex items-end">
                  <button 
                    type="submit" 
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-3 text-base font-bold shadow-lg hover:bg-blue-700 transition-all"
                  >
                    <PlusIcon className="h-5 w-5" /> 
                    Add Transaction
                  </button>
                </div>
              </div>
            </motion.form>
          </section>

          {/* RIGHT — transactions */}
          <section className="lg:col-span-2">
            <div className="relative bg-sky-100 rounded-2xl p-7 shadow-xl border border-gray-100 h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="relative flex-grow">
                    <input 
                      value={query} 
                      onChange={(e) => setQuery(e.target.value)} 
                      placeholder="Search transactions, category, date..." 
                      className="text-center pl-12 pr-4 py-3 rounded-lg border border-gray-300 text-base w-full focus:outline-none focus:ring-2 focus:ring-sky-300" 
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>

                  <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)} 
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base min-w-[140px]"
                  >
                    <option value="All Categories">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleClearAll} 
                    className="text-base font-medium text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => navigator.clipboard?.writeText(JSON.stringify(transactions, null, 2))} 
                    className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Export Data
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full table-auto text-base">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-7 py-5 text-left font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-7 py-5 text-left font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="px-7 py-5 text-left font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-7 py-5 text-right font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-7 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t) => (
                        <React.Fragment key={t.id}>
                          <tr className="hover:bg-blue-50 transition-colors">
                            <td className="px-7 py-5 whitespace-nowrap text-gray-600">
                              {dayjs(t.date).format('LL')}
                            </td>
                            <td className="px-7 py-5 text-gray-900 font-medium">
                              {t.description}
                            </td>
                            <td className="px-7 py-5">
                              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                                {t.category}
                              </span>
                            </td>
                            <td className={`px-7 py-5 whitespace-nowrap font-bold text-right ${
                              t.amount > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              {t.amount > 0 ? '+' : '-'} {currency(Math.abs(t.amount))}
                            </td>
                            <td className="px-7 py-5 whitespace-nowrap text-right">
                              <button 
                                onClick={() => handleDelete(t.id)} 
                                className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium"
                              >
                                <TrashIcon className="h-5 w-5" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                          
                          {/* Visual separator between transactions */}
                          <tr className="h-2 bg-transparent">
                            <td colSpan={5} className="p-0">
                              <div className="h-px bg-gray-100 mx-7"></div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-7 py-16 text-center text-gray-500 text-lg">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <CurrencyRupeeIcon className="h-12 w-12 text-gray-300" />
                            <p>No transactions found</p>
                            <p className="text-sm text-gray-400">Use Quick Add to create your first transaction</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="absolute inset-x-0 bottom-0 mt-6 flex items-center justify-between text-base text-gray-600">
                <div className="font-medium">
                  Showing <span className="text-blue-600">{filteredTransactions.length}</span> transactions
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Last sync</span>
                  <span className="text-sm font-medium">{dayjs().format('LT')}</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}