// client/src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
const API_BASE = "http://localhost:5000"; // change if backend runs elsewhere

const Icon = ({ name, ...props }) => {
  if (typeof window.lucide === "undefined") return null;
  const LucideIcon = window.lucide[name];
  return LucideIcon ? React.createElement(LucideIcon, props) : null;
};

export default function Register() {
  const navigate = useNavigate();

  const [input, setInput] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInput((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (!input.name.trim() || !input.email.trim() || !input.password) {
      return "Please fill all required fields.";
    }
    // basic email check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(input.email)) return "Please enter a valid email address.";
    if (input.password.length < 6) return "Password must be at least 6 characters.";
    if (input.password !== input.confirmPassword) return "Passwords do not match.";
    if (!input.terms) return "You must agree to the Terms and Conditions.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // success — redirect to login
        alert("Account created successfully! Please log in.");
        navigate("/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
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
              <p className="mt-2 text-lg text-gray-600">Create your account to get started.</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="User" className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="name"
                    type="text"
                    value={input.name}
                    autoComplete="name"
                    required
                    className="h-9 block w-full px-3 py-3 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="John Doe"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                    className="h-9 block w-full px-3 py-3 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="flex items-center mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="Lock" className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    value={input.password}
                    onChange={handleChange}
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className="h-9 block w-full px-3 py-3 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={visible ? "Hide password" : "Show password"}
                  >
                    {visible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="flex items-center mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    value={input.confirmPassword}
                    onChange={handleChange}
                    type={confirmVisible ? "text" : "password"}
                    required
                    className="h-9 block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmVisible((v) => !v)}
                    className="absolute right-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={confirmVisible ? "Hide confirm" : "Show confirm"}
                  >
                    {confirmVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={input.terms}
                  onChange={handleChange}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{" "}
                  <a href="#" className="text-teal-600 hover:text-teal-500">
                    Terms and Conditions
                  </a>
                </label>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-300 disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/">Login</Link>
            </p>
          </div>
        </div>

        <div className="hidden md:flex w-1/2 h-full bg-teal-900 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute bg-teal-800 rounded-full w-96 h-96 -top-20 -left-20 opacity-50"></div>
          <div className="absolute bg-teal-700 rounded-full w-[500px] h-[500px] -bottom-48 -right-24 opacity-50"></div>
          <div className="z-10 text-white text-center">
            <h2 className="text-5xl font-bold leading-tight">Start Your Financial Journey</h2>
            <p className="mt-4 text-lg text-teal-200 max-w-md">
              Join thousands of users managing their finances smarter and growing their wealth daily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
