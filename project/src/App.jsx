// App.jsx - QUICK FIX: Remove problematic imports temporarily
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Customer Auth flow components
import SplashScreen from "./customer/SplashScreen";
import OnboardingFlow from "./customer/OnboardingFlow";
import LoginScreen from "./customer/LoginScreen";
import ForgotPasswordScreen from "./customer/ForgotPasswordScreen";
import ResetPasswordScreen from "./customer/ResetPasswordScreen";
import ResetPasswordFromSettings from "./customer/ResetPasswordFromSettings";
import SignupScreen from "./customer/SignupScreen";

// Customer Main app components
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
//seller

// Customer Order flow page components
import AddressPage from "./customer/AddressPage";
import OrderSummaryPage from "./customer/OrderSummaryPage";
import PaymentPage from "./customer/PaymentPage";
import ConfirmationPage from "./customer/ConfirmationPage";

// TEMP: Create placeholder seller components inline to fix import errors
// ADD these imports instead:
import SellerLogin from "./components/seller/auth/SellerLogin";
import SellerSignup from "./components/seller/auth/SellerSignup";
import SellerForgotPassword from "./components/seller/auth/SellerForgotPassword";
import SellerResetPassword from "./components/seller/auth/SellerResetPassword";



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
    console.log(`Current view changed to: ${currentView}`);
  }, [currentView]);

  // Handlers for state-machine navigation
  const handleOnboardingComplete = () => {
    console.log("handleOnboardingComplete called, setting view to login");
    setCurrentView("login");
  };

  const handleLoginComplete = () => {
    console.log("handleLoginComplete called, setting view to main");
    setCurrentView("main");
  };

  const handleForgotPassword = () => {
    console.log("handleForgotPassword called");
    setCurrentView("forgot-password");
  };

  const handleCreateAccount = () => {
    console.log("handleCreateAccount called");
    setCurrentView("signup");
  };

  const handleBackToLogin = () => {
    console.log("handleBackToLogin called");
    setCurrentView("login");
  };

  const handleSignupComplete = () => {
    console.log("handleSignupComplete called, setting view to login");
    setCurrentView("login");
  };

  const handleOpenSettings = () => {
    console.log("handleOpenSettings called");
    setCurrentView("settings");
  };

  const handleCloseSettings = () => {
    console.log("handleCloseSettings called");
    setCurrentView("main");
  };

  const handleLogout = () => {
    console.log("handleLogout called, clearing auth and going to login");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView("login");
  };

  // Main state-machine view renderer
  const renderMainView = () => {
    console.log(`Rendering view: ${currentView}`);
    
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
        console.log("Rendering main home page with all components");
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
        console.log(`Unknown view: ${currentView}, falling back to splash`);
        return <SplashScreen />;
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Customer reset password routes */}
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordScreen />}
          />
          <Route
            path="/reset-password-settings/:token"
            element={<ResetPasswordFromSettings />}
          />
          
          {/* Customer email verification route */}
          <Route
            path="/verify-email-change"
            element={<VerifyEmailChange />}
          />
          
          {/* Customer order flow routes */}
          <Route path="/address" element={<AddressPage />} />
          <Route path="/order-summary" element={<OrderSummaryPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />

          {/* Seller authentication routes with placeholder components */}
          {/* Replace your current seller routes with these: */}
<Route path="/seller/login" element={
  <SellerLogin 
    onLoginComplete={() => console.log('Login complete')} 
    onForgotPassword={() => window.location.href = '/seller/forgot-password'}
    onCreateAccount={() => window.location.href = '/seller/signup'}
  />
} />
<Route path="/seller/signup" element={
  <SellerSignup 
    onBackToLogin={() => window.location.href = '/seller/login'}
    onSignupComplete={() => window.location.href = '/seller/login'}
  />
} />
<Route path="/seller/forgot-password" element={
  <SellerForgotPassword 
    onBackToLogin={() => window.location.href = '/seller/login'}
  />
} />
<Route path="/seller/reset-password/:token" element={<SellerResetPassword />} />

          {/* Main app route - This catches all other routes */}
          <Route path="*" element={renderMainView()} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;