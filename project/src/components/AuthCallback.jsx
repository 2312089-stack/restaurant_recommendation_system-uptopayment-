import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = ({ onLoginComplete }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(decodeURIComponent(userJson));
        
        // Save to local storage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('Successfully authenticated via Google');
        
        // Trigger the App.jsx state machine
        if (onLoginComplete) {
          onLoginComplete();
        }
        
        // Redirect to main page
        navigate('/');
      } catch (error) {
        console.error('Error parsing user data from OAuth callback:', error);
        navigate('/login?error=auth-failed');
      }
    } else {
      console.error('Missing token or user in OAuth callback');
      navigate('/login?error=no-credentials');
    }
  }, [searchParams, navigate, onLoginComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
          Completing login...
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Just a moment while we set up your session.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
