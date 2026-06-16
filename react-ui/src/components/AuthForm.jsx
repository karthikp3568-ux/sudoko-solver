import React, { useState } from 'react';

export default function AuthForm({ onSubmit, compact = false }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email required';
    }
    
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (isSignUp && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const userData = {
        userId: Math.random().toString(36).substr(2, 9).toUpperCase(),
        email: formData.email,
        username: formData.username,
        createdAt: new Date().toISOString(),
      };
      onSubmit(userData);
      setFormData({ email: '', username: '', password: '', confirmPassword: '' });
      setErrors({});
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (compact) {
    return (
      <form className="auth-form-compact" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="auth-input"
        />
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          maxLength={18}
          className="auth-input"
        />
        <button type="submit" className="auth-button">
          {isSignUp ? 'Register' : 'Login'}
        </button>
      </form>
    );
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">
            {isSignUp ? 'Join the Sudoku Arena' : 'Sign in to your account'}
          </p>
        </div>

        <div className="auth-form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className={`auth-input ${errors.email ? 'auth-input--error' : ''}`}
          />
          {errors.email && <span className="auth-error">{errors.email}</span>}
        </div>

        <div className="auth-form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            placeholder="Your player name"
            value={formData.username}
            onChange={handleChange}
            maxLength={18}
            className={`auth-input ${errors.username ? 'auth-input--error' : ''}`}
          />
          {errors.username && <span className="auth-error">{errors.username}</span>}
        </div>

        <div className="auth-form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="At least 6 characters"
            value={formData.password}
            onChange={handleChange}
            className={`auth-input ${errors.password ? 'auth-input--error' : ''}`}
          />
          {errors.password && <span className="auth-error">{errors.password}</span>}
        </div>

        {isSignUp && (
          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`auth-input ${errors.confirmPassword ? 'auth-input--error' : ''}`}
            />
            {errors.confirmPassword && (
              <span className="auth-error">{errors.confirmPassword}</span>
            )}
          </div>
        )}

        <button type="submit" className="auth-button-primary">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <div className="auth-toggle">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="auth-toggle-button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrors({});
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}
