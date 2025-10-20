// src/customer/AuthSuccess.jsx - ENSURE THIS VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      console.log('🔐 AuthSuccess received:', { hasToken: !!token, error });

      if (error) {
        console.error('❌ Google Auth Error:', error);
        setStatus('error');
        setTimeout(() => navigate('/', { replace: true }), 2000);
        return;
      }

      if (token) {
        try {
          setStatus('fetching');
          console.log('📡 Fetching user profile...');
          
          const response = await fetch('http://localhost:5000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const userData = data.user;
            
            console.log('✅ User profile fetched:', userData.emailId);
            setStatus('success');
            
            // Store and update context
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            login(token, userData);

            console.log('🏠 Navigating to home...');
            
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 500);
          } else {
            throw new Error('Failed to fetch profile');
          }
        } catch (error) {
          console.error('❌ Error:', error);
          setStatus('error');
          setTimeout(() => navigate('/', { replace: true }), 2000);
        }
      } else {
        setStatus('error');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className={`absolute w-full h-full rounded-full shadow-lg ${
            status === 'error' ? 'bg-red-500' : 
            status === 'success' ? 'bg-green-500' : 
            'bg-orange-500 animate-pulse'
          }`}></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          {status === 'processing' && 'Completing Sign In...'}
          {status === 'fetching' && 'Loading Your Profile...'}
          {status === 'success' && 'Success! Redirecting...'}
          {status === 'error' && 'Authentication Failed'}
        </h2>
        <p className="text-gray-500">
          {status === 'error' ? 'Redirecting to login' : 'Please wait'}
        </p>
      </div>
    </div>
  );
};

export default AuthSuccess;