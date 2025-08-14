import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "http://localhost:5000";

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
              {/* Form fields remain unchanged */}
              
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
              <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
                Login
              </Link>
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