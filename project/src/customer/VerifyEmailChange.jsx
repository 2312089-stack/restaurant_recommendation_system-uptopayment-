import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmailChange = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setMessage('Invalid verification link - token missing');
        setSuccess(false);
        setLoading(false);
        return;
      }

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        const response = await fetch(`${API_BASE_URL}/settings-auth/verify-email-change`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ token }) // Only send token, not userId
        });

        const data = await response.json();
        
        if (data.success) {
          setSuccess(true);
          setMessage(data.message || 'Email successfully changed!');
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setSuccess(false);
          setMessage(data.message || 'Email verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setSuccess(false);
        setMessage('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmailChange();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying email change...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className={`rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center ${
          success ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {success ? (
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {success ? 'Email Changed Successfully' : 'Email Change Failed'}
        </h1>
        <p className="text-gray-600 mb-8">{message}</p>
        
        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/settings')}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Back to Settings
          </button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailChange;
