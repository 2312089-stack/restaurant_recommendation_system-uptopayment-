// src/customer/AuthSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Extract token and onboarded status from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const onboarded = urlParams.get('onboarded') === 'true';

        if (!token) {
          console.error('❌ No token found in URL');
          setStatus('error');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }

        console.log('🔥 AuthSuccess: Token received:', token.substring(0, 20) + '...');
        console.log('🔥 AuthSuccess: Onboarded status:', onboarded);

        setStatus('fetching');

        // Decode JWT to get user info (without verification - backend already verified)
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔥 AuthSuccess: Decoded payload:', payload);

        const user = {
          id: payload.userId || payload.id,
          email: payload.email || payload.emailId,
          authProvider: payload.authProvider || 'google',
          onboarded: onboarded
        };

        console.log('🔥 AuthSuccess: Calling login() with user:', user);

        // Update AuthContext - this sets isAuthenticated = true
        login(token, user);

        console.log('🔥 AuthSuccess: AuthContext updated successfully');
        setStatus('success');

        // Mark that user has completed auth flow
        localStorage.setItem('hasCompletedAuthFlow', 'true');

        console.log('🔥 AuthSuccess: Navigating to home...');

        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 500);

      } catch (error) {
        console.error('❌ AuthSuccess processing error:', error);
        setStatus('error');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    processAuth();
  }, [login, navigate]);

  // Show loading screen while processing
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg animate-pulse"></div>
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
        <h2 className="text-xl font-bold text-orange-600 mb-2">TasteSphere</h2>
        <p className="text-gray-500">Completing sign in...</p>
        <div className="mt-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccess;