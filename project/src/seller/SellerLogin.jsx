import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const SellerLogin = ({ onLoginComplete, onForgotPassword, onCreateAccount }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = "http://localhost:5000/api";

  // Restaurant/Chef icon component
  const RestaurantIcon = () => (
    <div className="relative w-full h-full">
      {/* Chef hat */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white rounded-t-full"></div>
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-white rounded"></div>
      {/* Plate */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-10 h-3 bg-white rounded-full"></div>
      {/* Food items on plate */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 right-6 w-1.5 h-1.5 bg-white rounded-full"></div>
    </div>
  );

  const handleLogin = async () => {
    if (!email || !password) {
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
      console.log('🔐 Attempting seller login for:', email);
      
      // Updated endpoint for seller authentication
      const res = await fetch(`${API_BASE_URL}/seller/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('📡 Seller login response:', data);

      if (data.success) {
        console.log('✅ Seller login successful');
        
        // Store seller-specific data
        if (data.token) {
          localStorage.setItem('sellerToken', data.token);
          console.log('💾 Seller token stored successfully');
        }
        
        if (data.seller) {
          localStorage.setItem('seller', JSON.stringify(data.seller));
          localStorage.setItem('sellerType', 'seller'); // Distinguish from regular users
          console.log('👤 Seller data stored');
        }
        
        // Clear form
        setEmail('');
        setPassword('');
        setError('');
        
        // Call parent callback
        onLoginComplete();
      } else {
        console.log('❌ Seller login failed:', data.error);
        setError(data.error || data.message || "Login failed");
      }
    } catch (err) {
      console.error("❌ Seller login error:", err);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
              <RestaurantIcon />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-600 font-medium">Seller Portal</p>
          <p className="text-gray-500 text-sm">Manage your restaurant & bookings</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4 mb-6">
          <input
            type="email"
            placeholder="Business Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={loading}
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            🔒 Password must be at least 6 characters long
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
          disabled={loading || !email || password.length < 6}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {loading ? "Signing in..." : "Sign In to Seller Portal"}
        </button>

        {/* Create Account */}
        <button
          onClick={onCreateAccount}
          disabled={loading}
          className="w-full mt-4 bg-transparent border-2 border-orange-500 text-orange-600 font-semibold py-3 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Register as New Seller
        </button>

        {/* Info */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Manage restaurants, dishes, and table reservations</p>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;