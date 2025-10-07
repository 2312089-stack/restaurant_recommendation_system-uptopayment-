import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
const LoginScreen = ({ onLoginComplete, onForgotPassword, onCreateAccount }) => {
    const { login } = useAuth(); // ADD THIS

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = "http://localhost:5000/api";

const handleLogin = async () => {
  if (!username || !password) {
    setError("Email and password required");
    return;
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters long");
    return;
  }

  setLoading(true);
  setError('');

 try {
      const res = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Use AuthContext instead of manual localStorage
        login(data.token, data.user); // REPLACE localStorage calls
        
        setUsername('');
        setPassword('');
        setError('');
        
        onLoginComplete();
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
              <div className="relative w-full h-full">
                {/* Bicycle logo parts */}
                <div className="absolute bottom-1 left-2 w-4 h-4 border-2 border-white rounded-full"></div>
                <div className="absolute bottom-1 right-2 w-4 h-4 border-2 border-white rounded-full"></div>
                <div className="absolute top-5 left-2 w-8 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-3 left-3 w-6 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-2 left-4 w-0.5 h-3 bg-white"></div>
                <div className="absolute top-1 left-3 w-2 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-3 right-3 w-0.5 h-2 bg-white"></div>
                <div className="absolute top-2 right-2 w-3 h-0.5 bg-white transform -rotate-45"></div>
                <div className="absolute top-5 left-4 w-2 h-0.5 bg-white transform rotate-12"></div>
                <div className="absolute top-0 right-1 w-2 h-2 bg-white rounded-sm"></div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-500">Please Login to your account</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <div className="space-y-4 mb-6">
          <input
            type="email"
            placeholder="Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={loading}
          />
          
          {/* Updated Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 pr-12 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-orange-800 text-sm text-center">
            Password must be at least 6 characters long
          </p>
        </div>

        {/* Forgot Password */}
        <div className="text-center mb-6">
          <button
            onClick={onForgotPassword}
            className="text-orange-600 underline text-sm hover:text-orange-800"
            disabled={loading}
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading || !username || password.length < 6}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Create Account */}
        <button
          onClick={onCreateAccount}
          disabled={loading}
          className="w-full mt-4 bg-transparent border-2 border-orange-500 text-orange-600 font-semibold py-3 rounded-full hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create New Account
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;