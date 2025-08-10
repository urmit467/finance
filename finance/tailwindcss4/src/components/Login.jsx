// client/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "http://localhost:5000"; // change if needed

const Icon = ({ name, ...props }) => {
  if (typeof window.lucide === "undefined") return null;
  const LucideIcon = window.lucide[name];
  return LucideIcon ? React.createElement(LucideIcon, props) : null;
};

export default function Login() {
  const navigate = useNavigate();
  const [input, setInput] = useState({ email: "", password: "" });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!input.email.trim() || !input.password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }),
      });

      const data = await res.json();
      if (res.ok) {
        // Save user (without password) to localStorage for client-side state
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard"); // change route as needed
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 font-sans">
      <div className="flex flex-wrap h-screen">
        <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center bg-white p-8 md:p-12">
          <div className="w-full max-w-md">
            <div className="text-left mb-10">
              <h1 className="text-4xl font-bold text-gray-800">FinanceR</h1>
              <p className="mt-2 text-lg text-gray-600">Welcome back! Please login to your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="Mail" className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={input.email}
                    autoComplete="email"
                    onChange={handleChange}
                    required
                    className="h-12 block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="Lock" className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    value={input.password}
                    onChange={handleChange}
                    type={visible ? "text" : "password"}
                    required
                    className="h-12 block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-500 hover:text-gray-700"
                    aria-label={visible ? "Hide password" : "Show password"}
                  >
                    {visible ? <Icon name="EyeOff" className="h-5 w-5" /> : <Icon name="Eye" className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-teal-600 hover:text-teal-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-300 disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium text-teal-600 hover:text-teal-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:flex w-1/2 h-full bg-gradient-to-br from-teal-800 to-teal-900 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute bg-teal-700/30 rounded-full w-[500px] h-[500px] -top-48 -left-48"></div>
          <div className="absolute bg-teal-600/30 rounded-full w-[600px] h-[600px] -bottom-64 -right-64"></div>
          <div className="z-10 text-white text-center max-w-lg">
            <h2 className="text-5xl font-bold leading-tight mb-6">Take Control of Your Finances</h2>
            <p className="mt-4 text-xl text-teal-100">Track your income, expenses, and investments all in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
