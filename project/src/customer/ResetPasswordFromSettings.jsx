import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react';

const ResetPasswordFromSettings = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isValidToken, setIsValidToken] = useState(null);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setMessage({ type: 'error', text: 'Invalid reset link' });
        return;
      }

      try {
        // Use the correct endpoint that matches your settings component
        const response = await fetch('http://localhost:5000/api/settings-auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json();
        setIsValidToken(data.success);
        
        if (!data.success) {
          setMessage({ 
            type: 'error', 
            text: data.message || 'Invalid or expired reset link' 
          });
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidToken(false);
        setMessage({ 
          type: 'error', 
          text: 'Failed to verify reset link. Please check your internet connection.' 
        });
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage({ type: '', text: '' });
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setMessage({ 
        type: 'error', 
        text: passwordErrors.join('. ') 
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the correct endpoint that matches your settings component
      const response = await fetch('http://localhost:5000/api/settings-auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Password reset successfully! You can now login with your new password. Redirecting...' 
        });
        
        // Clear the form
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Password reset successful. Please login with your new password.' 
            } 
          });
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message || 'Failed to reset password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error occurred. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const MessageAlert = ({ type, text }) => {
    if (!text) return null;
    
    const Icon = type === 'success' ? CheckCircle : XCircle;
    
    return (
      <div className={`mb-4 p-4 rounded-lg border flex items-start space-x-3 ${
        type === 'success' 
          ? 'bg-green-50 text-green-800 border-green-200' 
          : 'bg-red-50 text-red-800 border-red-200'
      }`}>
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    );
  };

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Reset Link</h2>
          <p className="text-gray-600">Please wait while we verify your reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Reset Link</h1>
          <MessageAlert type={message.type} text={message.text} />
          <div className="space-y-3 mt-6">
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password strength indicator
  const getPasswordStrength = (password) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    
    const strength = Math.max(0, 5 - errors.length);
    const strengthMap = {
      1: { label: 'Very Weak', color: 'bg-red-500' },
      2: { label: 'Weak', color: 'bg-red-400' },
      3: { label: 'Fair', color: 'bg-yellow-500' },
      4: { label: 'Good', color: 'bg-blue-500' },
      5: { label: 'Strong', color: 'bg-green-500' }
    };
    
    return { strength, ...strengthMap[strength] || strengthMap[1] };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter a strong new password for your account</p>
        </div>

        <MessageAlert type={message.type} text={message.text} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Password requirements */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <span className={password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>•</span>
                <span className="ml-2">At least 8 characters long</span>
              </li>
              <li className="flex items-center">
                <span className={/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                <span className="ml-2">One lowercase letter</span>
              </li>
              <li className="flex items-center">
                <span className={/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                <span className="ml-2">One uppercase letter</span>
              </li>
              <li className="flex items-center">
                <span className={/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                <span className="ml-2">One number</span>
              </li>
              <li className="flex items-center">
                <span className={/(?=.*[@$!%*?&])/.test(password) ? 'text-green-600' : 'text-gray-400'}>•</span>
                <span className="ml-2">One special character (@$!%*?&)</span>
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading || password !== confirmPassword || passwordStrength.strength < 3}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate('/login')}
            className="text-orange-500 hover:text-orange-600 text-sm font-medium block w-full"
          >
            Back to Login
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-600 text-sm"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordFromSettings;