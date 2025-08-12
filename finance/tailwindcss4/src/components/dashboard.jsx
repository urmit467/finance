import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrencyRupeeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb'; // Import the locale
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
dayjs.locale('en-gb'); // Use the locale

export default function Dashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [transactions, setTransactions] = useState(user?.transactions || []);
    const [quickAdd, setQuickAdd] = useState({
        amount: '',
        category: '',
        date: dayjs().format('YYYY-MM-DD'),
    });
    const [categories] = useState(user?.dashboard?.quickAddDefaults?.categories || [
        'Salary', 'Food', 'Rent', 'Travel', 'Entertainment', 'Bills', 'Shopping', 'Investment',
    ]);
    const [balance, setBalance] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;

        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach((transaction) => {
            if (transaction.amount > 0) {
                totalIncome += transaction.amount;
            } else {
                totalExpenses += Math.abs(transaction.amount);
            }
        });

        const netBalance = totalIncome - totalExpenses;
        setBalance({ totalIncome, totalExpenses, netBalance });

        const updatedUser = { ...user, transactions };
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }, [transactions, user]);

    const handleQuickAddChange = (e) => {
        setQuickAdd((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddTransaction = (e) => {
        e.preventDefault();
        if (!quickAdd.amount || !quickAdd.category) {
            alert('Please fill all required fields');
            return;
        }
        const amount = parseFloat(quickAdd.amount);
        const isIncome = ['Salary', 'Freelance', 'Investment'].includes(quickAdd.category);
        const newTransaction = {
            date: quickAdd.date,
            description: quickAdd.category,
            category: quickAdd.category,
            amount: isIncome ? amount : -amount,
        };
        setTransactions((prev) => [...prev, newTransaction]);
        setQuickAdd({ amount: '', category: '', date: dayjs().format('YYYY-MM-DD') });
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-100 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-teal-600">FinanceR</h1>
                    <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Logout
                    </button>
                </header>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Balance Card */}
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Balance</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="bg-green-100 text-green-600 rounded-full p-2 mr-2">
                                        <ArrowUpIcon className="h-5 w-5" />
                                    </div>
                                    <p className="text-gray-600 font-medium">Income</p>
                                </div>
                                <p className="text-xl font-semibold text-green-700">
                                    ₹{balance.totalIncome.toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="bg-red-100 text-red-600 rounded-full p-2 mr-2">
                                        <ArrowDownIcon className="h-5 w-5" />
                                    </div>
                                    <p className="text-gray-600 font-medium">Expenses</p>
                                </div>
                                <p className="text-xl font-semibold text-red-700">
                                    ₹{balance.totalExpenses.toLocaleString()}
                                </p>
                            </div>
                            <div className="py-2 border-t border-gray-200">
                                <p className="text-gray-600 font-semibold">Net Balance</p>
                                <p className={`text-2xl font-bold ${
                                    balance.netBalance >= 0 ? 'text-teal-700' : 'text-orange-700'
                                }`}>
                                    ₹{balance.netBalance.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Add Widget */}
                    <div className="bg-white shadow-md rounded-lg p-6 md:col-span-2 lg:col-span-1">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Add Transaction</h2>
                        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <CurrencyRupeeIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="number" name="amount" id="amount" value={quickAdd.amount} onChange={handleQuickAddChange}
                                        placeholder="0.00" min="0" step="0.01" required
                                        className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    id="category" name="category" value={quickAdd.category} onChange={handleQuickAddChange} required
                                    className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                    <option value="">Select category</option>
                                    {categories.map((cat, index) => (
                                        <option key={index} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date" name="date" id="date" value={quickAdd.date} onChange={handleQuickAddChange}
                                    className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="sm:col-span-2 md:col-span-1">
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 w-full"
                                >
                                    Add Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6">
                        <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transactions.length > 0 ? (
                                    transactions
                                        .slice()
                                        .reverse()
                                        .map((transaction, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dayjs(transaction.date).format('LL')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800">{transaction.category}</span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {transaction.amount > 0 ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500" colSpan="4">
                                            No transactions recorded yet. Use the "Quick Add" form to add your first transaction!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}