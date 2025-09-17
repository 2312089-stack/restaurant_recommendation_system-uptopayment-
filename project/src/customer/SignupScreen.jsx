// SignupScreen.jsx - COMPLETE UPDATED VERSION WITH 6+ CHARACTER PASSWORDS
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ChevronRight, Check } from 'lucide-react';

const SignupScreen = ({ onBackToLogin, onSignupComplete }) => {
  const [email, setEmail] = useState('');
  const [currentStep, setCurrentStep] = useState('email');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  
  // Password setup state - Updated for 6+ characters
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Onboarding state
  const [onboardingData, setOnboardingData] = useState({
    cuisines: [],
    dietary: '',
    spiceLevel: '',
    mealTypes: [],
    budget: '',
    favoriteDishes: []
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

  // Helper validations
  const isOtpComplete = otp.every(digit => digit !== '');
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  // BikeIcon Component
  const BikeIcon = () => (
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
  );

  // ALL YOUR EXISTING HANDLERS (KEEP AS IS)
  const handleContinue = async () => {
    if (!email) return;
    setLoading(true); 
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/otp/send`, {
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
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
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
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email, password: password }),
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("userId", data.user.id);
        setCurrentStep('onboarding');
      } else {
        setError(data.error || 'Failed to create account');
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

  // Onboarding handlers
  const handleMultiSelect = (category, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const handleSingleSelect = (category, value) => {
    setOnboardingData(prev => ({ ...prev, [category]: value }));
  };

  // UPDATED: Complete Onboarding Handler
  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError('');
    
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User ID missing. Please signup again.");
        return;
      }

      // Save onboarding preferences
      const response = await fetch(`${API_BASE_URL}/users/${userId}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Onboarding completed successfully');
        
        // Clean up signup data
        localStorage.removeItem("userId");
        
        // Navigate to login screen using the callback from App.jsx
        onSignupComplete();
        
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error saving onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  // ONBOARDING STEP - FULL THEMED VERSION
  if (currentStep === 'onboarding') {
    const cuisineOptions = ['Indian', 'Italian', 'Chinese', 'Mexican', 'Thai', 'Japanese', 'Continental', 'Lebanese'];
    const dietaryOptions = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Gluten-Free'];
    const spiceLevels = ['Mild', 'Medium', 'Spicy', 'Extra Spicy'];
    const mealTypeOptions = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'];
    const budgetOptions = ['Budget-Friendly', 'Mid-Range', 'Premium', 'Fine Dining'];
    const dishOptions = ['Pizza', 'Biryani', 'Burger', 'Pasta', 'Sushi', 'Tacos', 'Dosa', 'Noodles'];

    return (
      <div className="min-h-screen bg-white p-6">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
                <BikeIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">Welcome to TasteSphere!</h1>
            <p className="text-gray-600">Let's personalize your food experience</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-orange-500 h-2 rounded-full w-full"></div>
          </div>

          <div className="space-y-8">
            {/* Favorite Cuisines */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What are your favorite cuisines?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => handleMultiSelect('cuisines', cuisine)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.cuisines.includes(cuisine)
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cuisine}</span>
                      {onboardingData.cuisines.includes(cuisine) && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Preference */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What's your dietary preference?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dietaryOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSingleSelect('dietary', option)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.dietary === option
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spice Level */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">How spicy do you like your food?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {spiceLevels.map((level, index) => (
                  <button
                    key={level}
                    onClick={() => handleSingleSelect('spiceLevel', level)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.spiceLevel === level
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">
                        {'🌶️'.repeat(index + 1)}
                      </div>
                      <span className="font-medium">{level}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Meal Types */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What meals do you usually order?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mealTypeOptions.map((meal) => (
                  <button
                    key={meal}
                    onClick={() => handleMultiSelect('mealTypes', meal)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.mealTypes.includes(meal)
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{meal}</span>
                      {onboardingData.mealTypes.includes(meal) && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What's your preferred budget range?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {budgetOptions.map((budget) => (
                  <button
                    key={budget}
                    onClick={() => handleSingleSelect('budget', budget)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.budget === budget
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="font-medium">{budget}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Dishes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What are some of your favorite dishes?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dishOptions.map((dish) => (
                  <button
                    key={dish}
                    onClick={() => handleMultiSelect('favoriteDishes', dish)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      onboardingData.favoriteDishes.includes(dish)
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{dish}</span>
                      {onboardingData.favoriteDishes.includes(dish) && (
                        <Check className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Button */}
          <div className="mt-12 mb-8">
            <button
              onClick={handleCompleteOnboarding}
              disabled={loading}
              className="w-full bg-orange-500 text-white font-semibold py-4 rounded-full hover:bg-orange-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Creating your account...' : 'Complete Setup'}</span>
              {!loading && <ChevronRight className="w-5 h-5 ml-2" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PASSWORD STEP - UPDATED THEME SIMILAR TO ResetPasswordFromSettings
  if (currentStep === 'password') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
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
              <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <BikeIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
            <p className="text-gray-600 mb-2">Set Your Password</p>
            <p className="text-gray-400 text-sm">Create a secure password (6+ characters)</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
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

            {/* Password hint */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-800 text-sm text-center">
                🔢 Password must be at least 6 characters long
              </p>
            </div>

            <button
              type="submit"
              disabled={!isPasswordValid || !isConfirmPasswordValid || loading}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // OTP STEP - FULL THEMED VERSION
  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
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
              <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                <BikeIcon />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
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
                name={`otp-${index}`}
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
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
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

  // EMAIL STEP - FULL THEMED VERSION (Default)
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
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
            <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14">
              <BikeIcon />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
          <p className="text-gray-500">Create your account</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6 mb-8">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={!email || loading}
          className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending OTP...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default SignupScreen;