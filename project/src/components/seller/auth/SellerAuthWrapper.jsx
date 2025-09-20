// components/seller/SellerAuthWrapper.jsx
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import SellerLogin from './auth/SellerLogin';
import SellerSignup from './auth/SellerSignup';
import SellerForgotPassword from './auth/SellerForgotPassword';
import SellerResetPassword from './auth/SellerResetPassword';

const SellerAuthWrapper = () => {
  const navigate = useNavigate();

  // Navigation handlers
  const handleLoginComplete = () => {
    console.log('Seller login completed, redirecting to dashboard...');
    // For now, redirect to a dashboard route (you'll create this later)
    window.location.href = '/seller/dashboard';
    // OR use: navigate('/seller/dashboard');
  };

  const handleSignupComplete = () => {
    console.log('Seller signup completed, redirecting to dashboard...');
    // After successful onboarding, redirect to dashboard
    window.location.href = '/seller/dashboard';
    // OR use: navigate('/seller/dashboard');
  };

  const handleForgotPassword = () => {
    console.log('Navigating to forgot password...');
    navigate('/seller/forgot-password');
  };

  const handleCreateAccount = () => {
    console.log('Navigating to signup...');
    navigate('/seller/signup');
  };

  const handleBackToLogin = () => {
    console.log('Navigating back to login...');
    navigate('/seller/login');
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <SellerLogin
            onLoginComplete={handleLoginComplete}
            onForgotPassword={handleForgotPassword}
            onCreateAccount={handleCreateAccount}
          />
        } 
      />
      <Route 
        path="/signup" 
        element={
          <SellerSignup
            onBackToLogin={handleBackToLogin}
            onSignupComplete={handleSignupComplete}
          />
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          <SellerForgotPassword
            onBackToLogin={handleBackToLogin}
          />
        } 
      />
      <Route 
        path="/reset-password/:token" 
        element={<SellerResetPassword />} 
      />
      {/* Default route redirects to login */}
      <Route 
        path="*" 
        element={
          <SellerLogin
            onLoginComplete={handleLoginComplete}
            onForgotPassword={handleForgotPassword}
            onCreateAccount={handleCreateAccount}
          />
        } 
      />
    </Routes>
  );
};

export default SellerAuthWrapper;