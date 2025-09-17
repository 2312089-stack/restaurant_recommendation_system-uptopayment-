// components/seller/SellerAuthWrapper.jsx
import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import SellerLogin from './auth/SellerLogin';
import SellerSignup from './auth/SellerSignup';
import SellerForgotPassword from './auth/SellerForgotPassword';
import SellerResetPassword from './auth/SellerResetPassword';

const SellerAuthWrapper = () => {
  const navigate = useNavigate();

  // Navigation handlers
  const handleLoginComplete = () => {
    console.log('Seller login completed');
    // For now, redirect to login (later you can create a seller dashboard)
    navigate('/seller/login');
  };

  const handleSignupComplete = () => {
    console.log('Seller signup completed');
    navigate('/seller/login');
  };

  const handleForgotPassword = () => {
    navigate('/seller/forgot-password');
  };

  const handleCreateAccount = () => {
    navigate('/seller/signup');
  };

  const handleBackToLogin = () => {
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