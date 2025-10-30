import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const verifyEmailChange = async () => {
      const token = searchParams.get('token');

      console.log('🔍 Verification started');
      console.log('📧 Token:', token ? 'Present' : 'Missing');

      if (!token) {
        console.error('❌ No token in URL');
        setMessage('Invalid verification link - token missing');
        setSuccess(false);
        setLoading(false);
        return;
      }

      try {
        // ✅ FIXED: Use correct API URL - remove /api from base URL
        const API_BASE_URL = 'http://localhost:5000';
        const apiUrl = `${API_BASE_URL}/api/settings-auth/verify-email-change`;
        
        console.log('🌐 API URL:', apiUrl);
        console.log('📤 Sending verification request...');
        console.log('📦 Request body:', { token });
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ token })
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        
        const data = await response.json();
        console.log('📧 Response data:', data);
        
        if (response.ok && data.success) {
          console.log('✅ Email verification successful!');
          setSuccess(true);
          setMessage(data.message || 'Email successfully changed!');
          setNewEmail(data.newEmail || '');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            console.log('🔄 Redirecting to login...');
            navigate('/login', { 
              state: { 
                message: 'Email changed successfully! Please login with your new email.',
                email: data.newEmail 
              }
            });
          }, 3000);
        } else {
          console.error('❌ Verification failed:', data.message);
          setSuccess(false);
          setMessage(data.message || 'Email verification failed');
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setSuccess(false);
        setMessage(`Network error: ${error.message}. Please check your connection.`);
      } finally {
        setLoading(false);
      }
    };

    verifyEmailChange();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold text-lg">Verifying your email...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
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
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          {success ? '✅ Email Changed Successfully!' : '❌ Email Change Failed'}
        </h1>
        
        <div className={`p-4 rounded-lg mb-6 ${
          success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-center ${success ? 'text-green-800' : 'text-red-800'}`}>
            {message}
          </p>
        </div>

        {success && newEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 text-center mb-1">Your new email:</p>
            <p className="font-semibold text-blue-900 text-center break-all">{newEmail}</p>
          </div>
        )}
        
        {success ? (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Login Now with New Email
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-lg"
            >
              Try Again in Settings
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}

        {!success && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 text-center font-medium mb-2">
              Common reasons for failure:
            </p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Link expired (valid for 24 hours)</li>
              <li>• Link already used</li>
              <li>• Invalid or corrupted token</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailChange;