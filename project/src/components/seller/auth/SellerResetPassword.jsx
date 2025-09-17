import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Store } from 'lucide-react';

const SellerResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // API Base URL
  const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
    }
  }, [token]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    // Validate password for seller account (minimum 8 characters, more secure)
    if (password.length < 8) {
      setError("Business account password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Attempting seller password reset with token');
      
      // Use seller-specific endpoint
      const response = await fetch(`${API_BASE_URL}/seller/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      console.log('📡 Seller reset password response:', data);

      if (data.success) {
        setSuccess(true);
        console.log('✅ Seller password reset successful');
        
        // Redirect to seller login after 3 seconds
        setTimeout(() => {
          navigate('/seller/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
        console.log('❌ Seller password reset failed:', data.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('❌ Reset seller password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Password Reset Successful! 🎉</h2>
          <p className="text-gray-600 mb-8">
            Your business account password has been successfully reset. You can now login to your seller dashboard with your new password.
          </p>
          
          <button
            onClick={() => navigate('/seller/login')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg"
          >
            Go to Seller Login
          </button>
          
          <p className="text-sm text-gray-500 mt-4">Redirecting to seller login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-8">
            This business account password reset link is invalid or has expired. Please request a new one from the seller portal.
          </p>
          
          <button
            onClick={() => navigate('/seller/forgot-password')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Seller Logo */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Store className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            TasteSphere Business
          </h1>
          <p className="text-gray-600 mb-2">Reset Business Password</p>
          <p className="text-gray-500 text-sm">Enter your new business account password</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Business Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new business password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 transition-all duration-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new business password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 transition-all duration-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password requirements for business account */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Store className="w-4 h-4 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">Business Account Security</span>
            </div>
            <ul className="text-orange-700 text-sm space-y-1">
              <li className="flex items-center">
                <span className="w-1 h-1 bg-orange-500 rounded-full mr-2"></span>
                Password must be at least 8 characters long
              </li>
              <li className="flex items-center">
                <span className="w-1 h-1 bg-orange-500 rounded-full mr-2"></span>
                Use a strong password to protect your business data
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!password || !confirmPassword || loading || password.length < 8}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-[1.02]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Business Password...
              </span>
            ) : (
              'Reset Business Password'
            )}
          </button>
        </form>

        {/* Back to seller login link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/seller/login')}
            className="text-orange-600 text-sm hover:text-orange-800 transition-colors font-medium"
          >
            Back to Seller Login
          </button>
        </div>

        {/* Business portal indicator */}
        <div className="text-center mt-4 px-4 py-2 bg-white/50 rounded-lg">
          <p className="text-xs text-gray-500 flex items-center justify-center">
            <Store className="w-3 h-3 mr-1" />
            TasteSphere Business Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerResetPassword;