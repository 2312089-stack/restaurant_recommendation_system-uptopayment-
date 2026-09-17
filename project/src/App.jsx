// App.jsx - Updated with separate order flow pages
import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

const hasStoredSession = () => {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch (error) {
    return false;
  }
};

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
};

// An authenticated user who has not finished onboarding must be sent there
// before they can reach Home.
const needsOnboarding = () => {
  const user = getStoredUser();
  return Boolean(user) && user.onboardingCompleted !== true;
};

// The main app is a state machine, but several components navigate to real
// URLs ("/login", "/forgot-password", "/settings", "/menu"). Map those paths
// back to the matching state-machine view so those navigations actually work.
const viewForPath = (pathname) => {
  switch (pathname) {
    case "/login":
      return "login";
    case "/signup":
      return "signup";
    case "/forgot-password":
      return "forgot-password";
    case "/settings":
      return "settings";
    case "/onboarding":
      return "profile-onboarding";
    case "/menu":
    case "/home":
      return "main";
    default:
      return null;
  }
};

// Lives inside <Router> so it can observe client-side navigation and sync the
// state-machine view. Renders nothing.
const PathSync = ({ onPathChange }) => {
  const location = useLocation();

  useEffect(() => {
    onPathChange(location.pathname);
  }, [location.pathname, onPathChange]);

  return null;
};

// Auth flow components
import SplashScreen from "./components/SplashScreen";
import OnboardingFlow from "./components/OnboardingFlow";
import LoginScreen from "./components/LoginScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import ResetPasswordFromSettings from "./components/ResetPasswordFromSettings";
import SignupScreen from "./components/SignupScreen";

// Main app components
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import ReorderFavorites from "./components/ReorderFavorites";
import PopularNearYou from "./components/PopularNearYou";
import RecommendedForYou from "./components/RecommendedForYou";
import TrendingInCity from "./components/TrendingInCity";
import SpecialOffers from "./components/SpecialOffers";
import Footer from "./components/Footer";
import VerifyEmailChange from "./components/VerifyEmailChange";
import Settings from "./components/SettingsComponent";
import PaymentSuccessPage from './components/PaymentSuccessPage';

// NEW: Order flow page components
import AddressPage from "./components/AddressPage";
import OrderSummaryPage from "./components/OrderSummaryPage";
import PaymentPage from "./components/PaymentPage";
import ConfirmationPage from "./components/ConfirmationPage";
import AuthCallback from "./components/AuthCallback";

function App() {
  // Restore the authenticated session on load. An authenticated user who has
  // not finished onboarding is sent to onboarding first; everyone else goes to
  // Home. Deep links such as /login or /settings are honored on first load.
  const [currentView, setCurrentView] = useState(() => {
    const mappedView = viewForPath(window.location.pathname);
    const isAuthenticated = hasStoredSession();

    if (isAuthenticated && needsOnboarding()) {
      return "profile-onboarding";
    }

    if (mappedView === "main" || mappedView === "profile-onboarding") {
      return isAuthenticated ? mappedView : "login";
    }

    if (mappedView) {
      return mappedView;
    }

    return isAuthenticated ? "main" : "splash";
  });

  const handlePathChange = useCallback((pathname) => {
    const mappedView = viewForPath(pathname);

    if (!mappedView) {
      return;
    }

    const isAuthenticated = hasStoredSession();
    const requiresAuth =
      mappedView === "main" || mappedView === "profile-onboarding";

    if (requiresAuth && !isAuthenticated) {
      setCurrentView("login");
      return;
    }

    setCurrentView(mappedView);
  }, []);

  // Show splash for 3 seconds only while we are actually on the splash view.
  // This is cancelled automatically if auth completes (e.g. OAuth callback)
  // and moves the view to "main" before the timeout fires.
  useEffect(() => {
    if (currentView !== "splash") {
      return undefined;
    }

    console.log("App initialized, showing splash screen");
    const timer = setTimeout(() => {
      console.log("Splash timeout, moving to onboarding");
      setCurrentView("onboarding");
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentView]);

  // Debug: Log current view changes
  useEffect(() => {
    console.log(`📄 Current view changed to: ${currentView}`);
  }, [currentView]);

  // Handlers for state-machine navigation
  const handleOnboardingComplete = () => {
    console.log("🎯 handleOnboardingComplete called, setting view to login");
    setCurrentView("login");
  };

  const handleLoginComplete = useCallback(() => {
    // Any authenticated user who has not finished onboarding must complete it
    // before reaching Home (covers Google and email/password accounts that
    // abandoned onboarding earlier).
    const user = getStoredUser();

    if (user && user.onboardingCompleted !== true) {
      const userId = user.id || user._id;
      if (userId) {
        localStorage.setItem("userId", userId);
      }
      console.log("🎯 handleLoginComplete: onboarding required");
      setCurrentView("profile-onboarding");
      return;
    }

    console.log("🎯 handleLoginComplete called, setting view to main");
    setCurrentView("main");
  }, []);

  const handleOnboardingRequired = useCallback(() => {
    console.log("🎯 handleOnboardingRequired called, setting view to profile onboarding");
    setCurrentView("profile-onboarding");
  }, []);

  const handleAuthFailed = useCallback(() => {
    console.log("🎯 handleAuthFailed called, returning to login");
    setCurrentView("login");
  }, []);

  const handleForgotPassword = () => {
    console.log("🎯 handleForgotPassword called");
    setCurrentView("forgot-password");
  };

  const handleCreateAccount = () => {
    console.log("🎯 handleCreateAccount called");
    setCurrentView("signup");
  };

  const handleBackToLogin = () => {
    console.log("🎯 handleBackToLogin called");
    setCurrentView("login");
  };

  const handleSignupComplete = () => {
    console.log("🎯 handleSignupComplete called, setting view to login");
    setCurrentView("login");
  };

  const handleOpenSettings = () => {
    console.log("🎯 handleOpenSettings called");
    setCurrentView("settings");
  };

  const handleCloseSettings = () => {
    console.log("🎯 handleCloseSettings called");
    setCurrentView("main");
  };

  const handleLogout = useCallback(() => {
    console.log("🎯 handleLogout called, clearing auth and going to login");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userPreferences');
    setCurrentView("login");
  }, []);

  // CLEAN: Direct render function for the main state-machine view
  const renderMainView = () => {
    console.log(`🎨 Rendering view: ${currentView}`);
    
    switch (currentView) {
      case "splash":
        return <SplashScreen />;
        
      case "onboarding":
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;

      // Profile preferences onboarding for authenticated users who have not
      // finished it (e.g. brand new Google accounts). Reuses the existing
      // SignupScreen onboarding step instead of duplicating the UI.
      case "profile-onboarding":
        return (
          <SignupScreen
            startStep="onboarding"
            onBackToLogin={handleLoginComplete}
            onSignupComplete={handleLoginComplete}
          />
        );
        
      case "login":
        return (
          <LoginScreen
            onLoginComplete={handleLoginComplete}
            onForgotPassword={handleForgotPassword}
            onCreateAccount={handleCreateAccount}
          />
        );
        
      case "forgot-password":
        return <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
        
      case "signup":
        return (
          <SignupScreen 
            onBackToLogin={handleBackToLogin} 
            onSignupComplete={handleSignupComplete}
          />
        );
        
      case "main":
        console.log("🏠 Rendering main home page with all components");
        return (
          <>
            <Header onOpenSettings={handleOpenSettings} onLogout={handleLogout} />
            <main>
              <HeroSection />
              <ReorderFavorites />
              <PopularNearYou />
              <RecommendedForYou />
              <TrendingInCity />
              <SpecialOffers />
            </main>
            <Footer />
          </>
        );
        
      case "settings":
        return <Settings onClose={handleCloseSettings} />;
        
      default:
        console.log(`⚠️ Unknown view: ${currentView}, falling back to splash`);
        return <SplashScreen />;
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PathSync onPathChange={handlePathChange} />
        <Routes>
          {/* Original reset password from forgot password flow */}
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordScreen />}
          />
          {/* Reset password from settings */}
          <Route
            path="/reset-password-settings/:token"
            element={<ResetPasswordFromSettings />}
          />
          {/* Email verification route */}
          <Route
            path="/verify-email-change"
            element={<VerifyEmailChange />}
          />
          
          {/* NEW: Order flow routes - These are separate pages */}
          <Route path="/address" element={<AddressPage />} />
   <Route path="/order-summary" element={<OrderSummaryPage />} />
   <Route path="/payment" element={<PaymentPage />} />
   <Route path="/confirmation" element={<ConfirmationPage />} />
  <Route path="/payment-success" element={<PaymentSuccessPage />} />
  <Route
    path="/auth/callback"
    element={
      <AuthCallback
        onLoginComplete={handleLoginComplete}
        onOnboardingRequired={handleOnboardingRequired}
        onAuthFailed={handleAuthFailed}
      />
    }
  />

          {/* Main app route - This catches all other routes */}
          <Route path="*" element={renderMainView()} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
