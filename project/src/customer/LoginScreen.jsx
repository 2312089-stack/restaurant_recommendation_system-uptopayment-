import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // ✅ IMPORT useAuth

const LoginScreen = ({ onLoginComplete, onForgotPassword, onCreateAccount }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth(); // ✅ GET login function from AuthContext

  const API_BASE_URL = "http://localhost:5000/api";

  // ✅ Check for Google OAuth errors in URL when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const messageParam = urlParams.get('message');

    if (errorParam === 'account_not_found') {
      setError(messageParam || 'Account not found. Please sign up first using the "Create New Account" button below.');
    } else if (errorParam === 'google_auth_failed') {
      setError('Google authentication failed. Please try again.');
    } else if (errorParam === 'google_not_configured') {
      setError('Google sign-in is temporarily unavailable. Please use email/password login.');
    } else if (errorParam === 'no_user') {
      setError('Authentication failed. Please try again.');
    } else if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }

    // Clean URL after showing error
    if (errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleSignIn = () => {
    // Clear any existing errors before redirecting
    setError('');
    window.location.href = `${API_BASE_URL}/auth/google?signup=false`;
  };

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
        console.log('🔥 LOGIN SUCCESS - Updating AuthContext');
        
        // ✅ CRITICAL: Update AuthContext state (this sets isAuthenticated = true)
        login(data.token, data.user);
        
        // Clear form
        setUsername('');
        setPassword('');
        setError('');
        
        console.log('🔥 Calling onLoginComplete to navigate to home');
        // ✅ Navigate to home
        onLoginComplete();
      } else {
        if (data.hint === 'account_not_found') {
          setError("Account not found. Please sign up first using the 'Create New Account' button below.");
        } else if (data.hint === 'google_only') {
          setError("This account uses Google Sign-In. Please click 'Continue with Google' button above.");
        } else {
          setError(data.error || "Login failed");
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && username && password.length >= 6 && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
              <div className="relative w-full h-full">
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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <div className="space-y-4 mb-6">
          <input
            type="email"
            placeholder="Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            disabled={loading}
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 pr-12 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
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

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-orange-800 text-sm text-center">
            Password must be at least 6 characters long
          </p>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={onForgotPassword}
            className="text-orange-600 underline text-sm hover:text-orange-800"
            disabled={loading}
          >
            Forgot Password?
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !username || password.length < 6}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

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