import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import localizedFormat from "dayjs/plugin/localizedFormat";
import Chart from "chart.js/auto";
import { motion } from "framer-motion";

import {
  CurrencyRupeeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

dayjs.extend(localizedFormat);
dayjs.locale("en-gb");

export default function Dashboard() {
  const navigate = useNavigate();
  const handleclickplanner = () => {
    navigate("/planner");
  };
  const storedUser = JSON.parse(localStorage.getItem("user")) || {
    name: "You",
    transactions: [],
    dashboard: {},
  };

  const [transactions, setTransactions] = useState(
    storedUser.transactions || []
  );
  const [quickAdd, setQuickAdd] = useState({
    amount: "",
    category: "",
    date: dayjs().format("YYYY-MM-DD"),
  });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [categories] = useState(
    storedUser.dashboard?.quickAddDefaults?.categories || [
      "Salary",
      "Freelance",
      "Food",
      "Rent",
      "Travel",
      "Entertainment",
      "Bills",
      "Shopping",
      "Investment",
      "Other",
    ]
  );
  const [balance, setBalance] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
  });

  const doughnutRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/login");
    }
  }, [navigate]);

  const updateUserOnServer = async (newTransactions) => {
    try {
      const currentStored =
        JSON.parse(localStorage.getItem("user")) || storedUser;
      const updatedUserPayload = {
        ...currentStored,
        transactions: newTransactions,
      };

      const res = await fetch(
        `http://localhost:5000/user/${currentStored.email}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUserPayload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to update user on server");
      }

      const serverUser = await res.json();
      localStorage.setItem("user", JSON.stringify(serverUser));
      setTransactions(serverUser.transactions || []);
    } catch (err) {
      console.error("Failed to update server:", err);
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
      netBalance: totalIncome - totalExpenses,
    });

    // Update localStorage
    const currentStored =
      JSON.parse(localStorage.getItem("user")) || storedUser;
    const updatedUser = { ...currentStored, transactions };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Handle chart initialization/update
    const canvas = doughnutRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart with current data
    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Income", "Expenses"],
        datasets: [
          {
            data: [totalIncome, totalExpenses],
            backgroundColor: ["#4ade80", "#f87171"],
            borderWidth: 0,
            cutout: "60%",
            hoverOffset: 8,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 10,
              padding: 16,
              font: { size: 12 },
              color: "#000000",
            },
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
          animateScale: true,
        },
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
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();

    if (!quickAdd.amount || !quickAdd.category) {
      alert("Please fill amount and category");
      return;
    }

    const amount = parseFloat(quickAdd.amount);
    const isIncome = ["Salary", "Freelance", "Investment"].includes(
      quickAdd.category
    );
    const newTransaction = {
      id: Date.now(),
      date: quickAdd.date,
      description: quickAdd.category,
      category: quickAdd.category,
      amount: isIncome ? amount : -amount,
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    updateUserOnServer(updatedTransactions);
    setQuickAdd({
      amount: "",
      category: "",
      date: dayjs().format("YYYY-MM-DD"),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTransactions);
    updateUserOnServer(updatedTransactions);
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all transactions? This cannot be undone."))
      return;
    setTransactions([]);
    updateUserOnServer([]);
  };

  const filteredTransactions = transactions
    .slice()
    .reverse()
    .filter((t) =>
      categoryFilter === "All Categories" ? true : t.category === categoryFilter
    )
    .filter((t) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        dayjs(t.date).format("LL").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    });

  const currency = (v) =>
    `₹${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  if (!localStorage.getItem("user")) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-8 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 flex items-center gap-4">
                <CurrencyRupeeIcon className="h-8 w-8 text-black" />
                <div>
                  <h1 className="text-3xl font-bold text-black">FinanceR</h1>
                  <p className="text-sm text-gray-600">
                    Smart budgeting & quick entries
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                className="px-6 py-3 rounded-xl bg-gray-800 text-white cursor-pointer hover:bg-gray-700 transition-all"
                onClick={handleclickplanner}
              >
                Planner
              </button>
              <button
                title="Settings"
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <Cog6ToothIcon className="h-6 w-6 text-black" />
              </button>
              <div className="flex flex-col items-end">
                <span className="text-lg text-black font-bold">
                  {storedUser.name.toUpperCase() || "You"}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-col flex-row gap-8">
          {/* LEFT COLUMN - Chart and Quick Add */}
          <div className="w-3/5 p-5 ml-10  flex flex-col gap-8">
            {/* Chart Section */}
            <section className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-black">
                    Financial Overview
                  </h2>
                  <div className="text-sm text-gray-600">
                    Updated: {dayjs().format("LL")}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Income</p>
                    <p className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
                      <ArrowUpIcon className="h-5 w-5" />
                      {currency(balance.totalIncome)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Expenses</p>
                    <p className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
                      <ArrowDownIcon className="h-5 w-5" />
                      {currency(balance.totalExpenses)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Net Balance</p>
                    <p
                      className={`text-xl font-bold ${
                        balance.netBalance >= 0
                          ? "text-gray-800"
                          : "text-gray-800"
                      }`}
                    >
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
            </section>
          </div>

          {/* RIGHT COLUMN - Quick Add */}
          <div className="lg:w-1/3">
            <section>
              <motion.form
                onSubmit={handleAddTransaction}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    Quick Transaction
                  </h3>
                  <div className="text-sm text-gray-500 font-medium">
                    Fast entry
                  </div>
                </div>

                <div className="flex-1 space-y-5">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
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
                        className="pl-11 pr-4 py-3 block w-full rounded-xl border border-gray-300 text-center focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
                        aria-label="Amount"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={quickAdd.category}
                      onChange={handleQuickAddChange}
                      className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
                      aria-label="Category"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      name="date"
                      type="date"
                      value={quickAdd.date}
                      onChange={handleQuickAddChange}
                      className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
                      aria-label="Date"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="submit"
                    className="w-full max-w-xs inline-flex items-center justify-center gap-3 rounded-xl bg-gray-800 text-white px-5 py-3 text-base font-bold shadow-sm hover:bg-gray-700 transition-all duration-150"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Transaction
                  </button>
                </div>
              </motion.form>
            </section>
            <div className="bg-white shadow-sm h-10 flex justify-center items-center mt-8 rounded-2xl ">
              <div className="text-lg text-center align-center text-gray-600">
                Total Transactions -{" "}
                <span className="font-semibold">
                  {filteredTransactions.length}
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* TRANSACTIONS SECTION */}
        <section className="mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {/* Top controls */}
            <div className="flex flex-col  md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 mt-2 ml-2 w-100">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search transactions, category, date..."
                    className="pl-12 pr-4  text-center py-3 bg-white rounded-lg border border-gray-300 text-base w-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                  </div>
                </div>

                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg mt-2 border border-gray-300 bg-white px-4 py-3 text-base min-w-[160px]"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClearAll}
                  className="text-base font-medium text-gray-700 hover:text-red-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="h-[560px] overflow-y-auto">
                <table className="min-w-full table-auto text-base">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                            {dayjs(t.date).format("LL")}
                          </td>

                          <td className="px-6 py-3 text-gray-900 font-medium">
                            {t.description}
                          </td>

                          <td className="px-6 py-3">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                              <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
                              {t.category}
                            </span>
                          </td>

                          <td
                            className={`px-6 py-3 whitespace-nowrap font-bold text-right ${
                              t.amount > 0 ? "text-gray-800" : "text-gray-800"
                            }`}
                          >
                            {t.amount > 0 ? "+" : "-"}{" "}
                            {currency(Math.abs(t.amount))}
                          </td>

                          <td className="px-6 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-gray-500 text-lg"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <CurrencyRupeeIcon className="h-12 w-12 text-gray-300" />
                            <p>No transactions found</p>
                            <p className="text-sm text-gray-400">
                              Use Quick Add to create your first transaction
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
          </div>
        </section>
      </div>
    </div>
  );
}
