/**
 * Login Page
 * Allows employees (HR/Interviewer) to sign in using their registered credentials.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Hook to access our global auth state
  const toast = useToast();   // Hook for showing popup notifications

  // State to hold form data and UI status
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handles the login form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Attempt to login using the credentials provided
      await login(form.email, form.password);
      toast.success('Glad to have you back!');
      navigate('/'); // Take the user to the home page on success
    } catch (err) {
      // If something goes wrong, tell the user why (common: wrong password)
      toast.error(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Light/Dark mode switcher */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <ThemeToggle />
      </div>

      <div className="auth-container animate-scale-in">
        {/* Simple back button to return to public view */}
        <button className="auth-back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Back to Home
        </button>

        <div className="auth-header">
          <div className="auth-icon-wrap">
            <LogIn size={24} />
          </div>
          <h1>Welcome Back</h1>
          <p>Please sign in to access the Interview Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {/* Password Field with Hide/Show toggle */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
