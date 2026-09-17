import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = ({ onLoginComplete, onOnboardingRequired, onAuthFailed }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invocation and re-renders
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (!token || !userJson) {
      console.error('Missing token or user in OAuth callback');
      if (onAuthFailed) onAuthFailed();
      // Use replace so the failed callback URL is not kept in history
      navigate('/', { replace: true });
      return;
    }

    try {
      // URLSearchParams.get() already percent-decodes, so parse directly.
      const user = JSON.parse(userJson);

      // Save to local storage BEFORE signalling success so the auth state
      // and token are available to the rest of the app immediately.
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('Successfully authenticated via Google');

      // The backend sends `onboardingCompleted` on the user (default false for
      // a brand new account, preserved for existing accounts). New / unfinished
      // users must complete onboarding before reaching Home.
      const requiresOnboarding = user.onboardingCompleted !== true;

      if (requiresOnboarding) {
        const userId = user._id || user.id;
        if (userId) {
          // SignupScreen's onboarding step reads this to save preferences.
          localStorage.setItem('userId', userId);
        }

        if (onOnboardingRequired) {
          onOnboardingRequired();
        }
      } else if (onLoginComplete) {
        // Existing user who already finished onboarding goes straight Home.
        onLoginComplete();
      }

      // replace: true removes token/user query params from the URL + history
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error parsing user data from OAuth callback:', error);
      if (onAuthFailed) onAuthFailed();
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, onLoginComplete, onOnboardingRequired, onAuthFailed]);

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
