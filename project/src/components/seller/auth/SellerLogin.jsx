// components/seller/auth/SellerLogin.jsx - FIXED VERSION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChefHat, Store } from 'lucide-react';

const SellerLogin = ({
 
  onLoginComplete = () => {
    // Default behavior - redirect or handle login completion
    console.log('✅ Login successful, redirecting...');
    window.location.href = '/seller/dashboard'; // or use router navigation
  }, 
  onForgotPassword = () => {
    console.log('Forgot password clicked');
  }, 
  onCreateAccount = () => {
    console.log('Create account clicked');
  } 
}) => {
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = 'http://localhost:5000/api';

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Attempting seller login for:', email);
      
      const res = await fetch(`${API_BASE_URL}/seller/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password 
        }),
      });

      const data = await res.json();
      console.log('📡 Seller login response:', data);

      if (data.success) {
        console.log('✅ Seller login successful');
        console.log('👤 Seller data received:', data.seller);

        // Store authentication data
        if (data.token) {
          localStorage.setItem('sellerToken', data.token);
        }
        if (data.seller) {
          localStorage.setItem('seller', JSON.stringify(data.seller));
          localStorage.setItem('userType', 'seller');
        }

        // Complete login - redirect to dashboard
        console.log('🚀 Redirecting to seller dashboard');
        setEmail('');
        setPassword('');
        setError('');
        
        // Call the completion handler (now has default)
        onLoginComplete();
      } else {
        console.log('❌ Seller login failed:', data.error);
        setError(data.error || data.message || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Seller login error:', err);
      setError('Network error. Please try again.');
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
    <div className="min-h-screen bg-white flex">
      {/* Left Section - Hero/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-50 to-orange-100 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <Store className="w-12 h-12 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">TasteSphere</h1>
          <h2 className="text-2xl font-semibold text-orange-600 mb-6">Partner Dashboard</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Join thousands of restaurants growing their business with TasteSphere. 
            Manage orders, track earnings, and reach more customers.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center text-gray-700">
              <ChefHat className="w-5 h-5 text-orange-500 mr-3" />
              <span>Easy menu management</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Store className="w-5 h-5 text-orange-500 mr-3" />
              <span>Real-time order tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-500 rounded-full flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">TasteSphere</h1>
            <p className="text-gray-600">Partner Dashboard</p>
          </div>

          {/* Login Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
            <p className="text-gray-600">Sign in to your partner account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Email
              </label>
              <input
                type="email"
                placeholder="Enter your business email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                onClick={onForgotPassword}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || password.length < 6}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to TasteSphere?</span>
              </div>
            </div>

            {/* Register Button */}
            <button
              onClick={onCreateAccount}
              disabled={loading}
              className="w-full bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Register as Partner
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;