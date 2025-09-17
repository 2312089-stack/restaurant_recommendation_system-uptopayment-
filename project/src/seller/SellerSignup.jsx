// components/seller/auth/SellerSignup.jsx - WITHOUT ONBOARDING
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const SellerSignup = ({ onBackToLogin, onSignupComplete }) => {
  const [email, setEmail] = useState('');
  const [currentStep, setCurrentStep] = useState('email');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  
  // Password setup state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

  // Helper validations
  const isOtpComplete = otp.every(digit => digit !== '');
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  // Restaurant/Chef icon component
  const RestaurantIcon = () => (
    <div className="relative w-full h-full">
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white rounded-t-full"></div>
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-white rounded"></div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-10 h-3 bg-white rounded-full"></div>
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
      <div className="absolute bottom-1.5 right-6 w-1.5 h-1.5 bg-white rounded-full"></div>
    </div>
  );

  const handleContinue = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      // Updated endpoint for seller OTP
      const response = await fetch(`${API_BASE_URL}/seller/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) {
        setServerOtp(data.otp.toString());
        setCurrentStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      const nextInput = document.querySelector(`input[name="seller-otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="seller-otp-${index - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 4) return;
    if (enteredOtp === serverOtp.slice(0, 4)) {
      setCurrentStep('password');
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  const handleSignup = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Updated endpoint for seller registration
      const response = await fetch(`${API_BASE_URL}/seller/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        console.log('Seller account created successfully');
        
        // Clear form data
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        
        // Navigate directly to login (no onboarding)
        onSignupComplete();
      } else {
        setError(data.error || 'Failed to create seller account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setOtp(['', '', '', '']);
    setError('');
    await handleContinue();
  };

  const handleChangeEmail = () => {
    setCurrentStep('email');
    setOtp(['', '', '', '']);
    setError('');
    setServerOtp('');
  };

  // PASSWORD STEP
  if (currentStep === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setCurrentStep('otp')}
            className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <RestaurantIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
            <p className="text-gray-600 font-medium mb-2">Seller Portal</p>
            <p className="text-gray-400 text-sm">Create a secure password (6+ characters)</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (6+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    disabled={loading}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                    disabled={loading}
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

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-orange-800 text-sm text-center">
                  Password must be at least 6 characters long
                </p>
              </div>

              <button
                type="submit"
                disabled={!isPasswordValid || !isConfirmPasswordValid || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Seller Account...
                  </span>
                ) : (
                  'Create Seller Account'
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-xs text-gray-500">
            <p>You can set up your business details after logging in</p>
          </div>
        </div>
      </div>
    );
  }

  // OTP STEP
  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setCurrentStep('email')}
            className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <RestaurantIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
            <p className="text-gray-600 font-medium mb-4">Seller Portal</p>
            <p className="text-gray-600 mb-4">
              Please enter the OTP sent to <br />
              <span className="font-medium">{email}</span>{' '}
              <button
                onClick={handleChangeEmail}
                className="text-orange-500 hover:text-orange-600 transition-colors"
              >
                Change
              </button>
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-center space-x-4 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                name={`seller-otp-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-semibold border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-orange-500 transition-colors"
                maxLength={1}
                disabled={loading}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={!isOtpComplete || loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Not received your code?{' '}
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-orange-500 hover:text-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                Resend code
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // EMAIL STEP (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBackToLogin}
          className="flex items-center text-orange-600 mb-8 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute w-full h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
              <RestaurantIcon />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-600 font-medium">Seller Portal</p>
          <p className="text-gray-500 text-sm">Create your business account</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 mb-8">
          <input
            type="email"
            placeholder="Business Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={!email || loading}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? 'Sending OTP...' : 'Continue'}
        </button>

        <div className="text-center mt-6 text-xs text-gray-500">
          <p>Join thousands of businesses on TasteSphere</p>
          <p className="mt-2">Set up your restaurant & hotel details after creating account</p>
        </div>
      </div>
    </div>
  );
};

export default SellerSignup;