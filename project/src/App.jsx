// App.jsx - Updated with separate order flow pages
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Auth flow components
import SplashScreen from "./customer/SplashScreen";
import OnboardingFlow from "./customer/OnboardingFlow";
import LoginScreen from "./customer/LoginScreen";
import ForgotPasswordScreen from "./customer/ForgotPasswordScreen";
import ResetPasswordScreen from "./customer/ResetPasswordScreen";
import ResetPasswordFromSettings from "./customer/ResetPasswordFromSettings";
import SignupScreen from "./customer/SignupScreen";

// Main app components
import Header from "./customer/Header";
import HeroSection from "./customer/HeroSection";
import ReorderFavorites from "./customer/ReorderFavorites";
import PopularNearYou from "./customer/PopularNearYou";
import RecommendedForYou from "./customer/RecommendedForYou";
import TrendingInCity from "./customer/TrendingInCity";
import SpecialOffers from "./customer/SpecialOffers";
import Footer from "./customer/Footer";
import VerifyEmailChange from "./customer/VerifyEmailChange";
import Settings from "./customer/SettingsComponent";
import PaymentSuccessPage from './customer/PaymentSuccessPage';

// NEW: Order flow page components
import AddressPage from "./customer/AddressPage";
import OrderSummaryPage from "./customer/OrderSummaryPage";
import PaymentPage from "./customer/PaymentPage";
import ConfirmationPage from "./customer/ConfirmationPage";

function App() {
  const [currentView, setCurrentView] = useState("splash");

  // Show splash for 3 seconds
  useEffect(() => {
    console.log("App initialized, showing splash screen");
    const timer = setTimeout(() => {
      console.log("Splash timeout, moving to onboarding");
      setCurrentView("onboarding");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Debug: Log current view changes
  useEffect(() => {
    console.log(`📄 Current view changed to: ${currentView}`);
  }, [currentView]);

  // Handlers for state-machine navigation
  const handleOnboardingComplete = () => {
    console.log("🎯 handleOnboardingComplete called, setting view to login");
    setCurrentView("login");
  };

  const handleLoginComplete = () => {
    console.log("🎯 handleLoginComplete called, setting view to main");
    setCurrentView("main");
  };

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

  const handleLogout = () => {
    console.log("🎯 handleLogout called, clearing auth and going to login");
    localStorage.removeItem('token');
    localStorage.removeUser('user');
    setCurrentView("login");
  };

  // CLEAN: Direct render function for the main state-machine view
  const renderMainView = () => {
    console.log(`🎨 Rendering view: ${currentView}`);
    
    switch (currentView) {
      case "splash":
        return <SplashScreen />;
        
      case "onboarding":
        return <OnboardingFlow onComplete={handleOnboardingComplete} />;
        
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

          {/* Main app route - This catches all other routes */}
          <Route path="*" element={renderMainView()} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;