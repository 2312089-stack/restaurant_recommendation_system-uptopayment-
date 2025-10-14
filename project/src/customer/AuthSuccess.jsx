// src/components/customer/AuthSuccess.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const token = searchParams.get('token');
      const onboarded = searchParams.get('onboarded');
      const error = searchParams.get('error');

      // Handle error cases
      if (error) {
        console.error('Google Auth Error:', error);
        navigate('/', { 
          replace: true,
          state: { error: 'Google authentication failed. Please try again.' } 
        });
        return;
      }

      // Handle success
      if (token) {
        try {
          // Fetch user data from token
          const response = await fetch('http://localhost:5000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const userData = await response.json();
            
            // Store token and user data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update AuthContext
            login(token, userData);

            // Small delay to ensure state is updated
            setTimeout(() => {
              // Navigate to main app (will be caught by your state machine)
              navigate('/', { replace: true });
            }, 100);
          } else {
            throw new Error('Failed to fetch user profile');
          }
        } catch (error) {
          console.error('Profile fetch error:', error);
          navigate('/', { 
            replace: true,
            state: { error: 'Authentication processing failed. Please try again.' } 
          });
        }
      } else {
        // No token received
        navigate('/', { 
          replace: true,
          state: { error: 'Authentication failed. Please try again.' } 
        });
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, login]);

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
            </div>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Completing Sign In...
        </h2>
        <p className="text-gray-500">Please wait while we log you in</p>
        <div className="mt-4">
          <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 75%; margin-left: 12.5%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AuthSuccess;