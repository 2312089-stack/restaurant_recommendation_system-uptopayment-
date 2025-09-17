import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

const ResetPasswordScreen = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // FIXED: Use import.meta.env for Vite or hardcode for development
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

    // Validate password for TasteSphere (minimum 6 characters)
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Attempting password reset with token');
      
      // Use correct endpoint /api/auth/reset-password
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      console.log('📡 Reset password response:', data);

      if (data.success) {
        setSuccess(true);
        console.log('✅ Password reset successful');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
        console.log('❌ Password reset failed:', data.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('❌ Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successful! 🎉</h2>
          <p className="text-gray-600 mb-8">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Go to Login
          </button>
          
          <p className="text-sm text-gray-500 mt-4">Redirecting to login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
              <div className="relative w-full h-full">
                <div className="absolute bottom-2 left-2 w-5 h-5 border-2 border-white rounded-full"></div>
                <div className="absolute bottom-2 right-2 w-5 h-5 border-2 border-white rounded-full"></div>
                <div className="absolute top-5 left-2 w-10 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-3 left-3 w-8 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-2 left-4 w-0.5 h-3 bg-white"></div>
                <div className="absolute top-1 left-3 w-3 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-2 right-3 w-0.5 h-2 bg-white"></div>
                <div className="absolute top-1 right-2 w-3 h-0.5 bg-white transform -rotate-45"></div>
                <div className="absolute top-6 left-4 w-2 h-0.5 bg-white transform rotate-12"></div>
                <div className="absolute top-0 right-1 w-3 h-3 bg-white rounded-sm"></div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-500 mb-2">Reset Your Password</p>
          <p className="text-gray-400 text-sm">Enter your new password below</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password hint */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-orange-800 text-sm text-center">
              🔢 Password must be at least 6 characters long
            </p>
          </div>

          <button
            type="submit"
            disabled={!password || !confirmPassword || loading || password.length < 6}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Back to login link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-orange-600 text-sm hover:text-orange-800 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;