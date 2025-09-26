import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

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
import DishDetailsPage from "./customer/DishDetailsPage";
import DiscoveryPage from "./customer/DiscoveryPage";
import CartSection from "./customer/CartSection";

// Customer Order flow page components
import AddressPage from "./customer/AddressPage";
import OrderSummaryPage from "./customer/OrderSummaryPage";
import PaymentPage from "./customer/PaymentPage";
import ConfirmationPage from "./customer/ConfirmationPage";

// Cart Context - SINGLE IMPORT ONLY
import { CartProvider } from "./contexts/CartContext";

// Seller components
import SellerLogin from "./components/seller/auth/SellerLogin";
import SellerSignup from "./components/seller/auth/SellerSignup";
import SellerForgotPassword from "./components/seller/auth/SellerForgotPassword";
import SellerResetPassword from "./components/seller/auth/SellerResetPassword";
import SellerDashboard from "./components/seller/SellerDashboard";

// Fallback components for seller auth
const SellerLoginFallback = () => (
  <div style={{
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '48px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      maxWidth: '400px',
      width: '100%'
    }}>
      <h1 style={{fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '32px'}}>
        Seller Login
      </h1>
      <p style={{color: '#6b7280', marginBottom: '32px'}}>
        Component loading...
      </p>
      <a 
        href="/seller/signup" 
        style={{
          display: 'inline-block',
          backgroundColor: '#f97316',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '500'
        }}
      >
        Sign Up Instead
      </a>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h1 style={{fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '16px'}}>
              Something went wrong
            </h1>
            <p style={{color: '#6b7280', marginBottom: '32px'}}>
              An error occurred while loading the application. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#f97316',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [currentView, setCurrentView] = useState("splash");
  const [selectedDishId, setSelectedDishId] = useState(null);

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

  const handleOpenDiscovery = () => {
    console.log("handleOpenDiscovery called");
    setCurrentView("discovery");
  };

  const handleCloseDiscovery = () => {
    console.log("handleCloseDiscovery called");
    setCurrentView("main");
  };

  // NEW: Cart page handlers
  const handleOpenCart = () => {
    console.log("handleOpenCart called");
    setCurrentView("cart");
  };

  const handleCloseCart = () => {
    console.log("handleCloseCart called");
    setCurrentView("main");
  };

  // Handle dish details navigation
  const handleShowDishDetails = (dishId) => {
    console.log("handleShowDishDetails called with dishId:", dishId);
    setSelectedDishId(dishId);
    setCurrentView("dish-details");
  };

  const handleCloseDishDetails = () => {
    console.log("handleCloseDishDetails called");
    setSelectedDishId(null);
    setCurrentView("discovery");
  };

  const handleLogout = () => {
    console.log("handleLogout called, clearing auth and going to login");
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sellerToken');
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
    setCurrentView("login");
  };

  // Protected route wrapper
  const ProtectedSellerRoute = ({ children }) => {
    const token = localStorage.getItem('sellerToken');
    if (!token) {
      return <Navigate to="/seller/login" replace />;
    }
    return children;
  };

  // Main state-machine view renderer
  const renderMainView = () => {
    console.log(`Rendering view: ${currentView}`);
    
    try {
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
              <Header 
                onOpenSettings={handleOpenSettings} 
                onOpenDiscovery={handleOpenDiscovery} 
                onOpenCart={handleOpenCart}
                onLogout={handleLogout} 
              />
              <main>
                <HeroSection onOpenDiscovery={handleOpenDiscovery} />
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
          
        case "discovery":
          return (
            <DiscoveryPage 
              onBack={handleCloseDiscovery} 
              onShowDishDetails={handleShowDishDetails}
            />
          );
          
        case "dish-details":
          return (
            <DishDetailsPage 
              dishId={selectedDishId}
              onBack={handleCloseDishDetails}
            />
          );

        // NEW: Cart page case
        case "cart":
          return (
            <CartSection onBack={handleCloseCart} />
          );
          
        default:
          console.log(`Unknown view: ${currentView}, falling back to splash`);
          return <SplashScreen />;
      }
    } catch (error) {
      console.error('Error rendering main view:', error);
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Error loading page</h2>
          <p>Please refresh and try again.</p>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <CartProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <React.Suspense 
              fallback={
                <div style={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #f3f4f6',
                      borderTop: '4px solid #f97316',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Loading...</p>
                  </div>
                </div>
              }
            >
              <Routes>
                {/* Customer reset password routes */}
                <Route path="/reset-password/:token" element={<ResetPasswordScreen />} />
                <Route path="/reset-password-settings/:token" element={<ResetPasswordFromSettings />} />
                
                {/* Customer email verification route */}
                <Route path="/verify-email-change" element={<VerifyEmailChange />} />
                
                {/* Customer order flow routes */}
                <Route path="/address" element={<AddressPage />} />
                <Route path="/order-summary" element={<OrderSummaryPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/confirmation" element={<ConfirmationPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />

                {/* Seller routes */}
                <Route 
                  path="/seller/login" 
                  element={
                    <SellerLogin 
                      onLoginComplete={() => {
                        console.log('Login successful, redirecting to dashboard');
                        window.location.href = '/seller/dashboard';
                      }}
                      onForgotPassword={() => {
                        console.log('Navigating to forgot password');
                        window.location.href = '/seller/forgot-password';
                      }}
                      onCreateAccount={() => {
                        console.log('Navigating to signup');
                        window.location.href = '/seller/signup';
                      }}
                    />
                  } 
                />
                <Route 
                  path="/seller/signup" 
                  element={
                    <SellerSignup 
                      onBackToLogin={() => {
                        console.log('Navigating back to login');
                        window.location.href = '/seller/login';
                      }}
                      onSignupComplete={() => {
                        console.log('Signup complete, redirecting to dashboard');
                        window.location.href = '/seller/dashboard';
                      }}
                    />
                  } 
                />
                <Route 
                  path="/seller/forgot-password" 
                  element={
                    <SellerForgotPassword 
                      onBackToLogin={() => {
                        console.log('Navigating back to login');
                        window.location.href = '/seller/login';
                      }}
                    />
                  } 
                />
                <Route path="/seller/reset-password/:token" element={<SellerResetPassword />} />

                {/* Protected seller dashboard route */}
                <Route 
                  path="/seller/dashboard" 
                  element={
                    <ProtectedSellerRoute>
                      <SellerDashboard />
                    </ProtectedSellerRoute>
                  } 
                />

                {/* Main app route - This catches all other routes */}
                <Route path="*" element={renderMainView()} />
              </Routes>
            </React.Suspense>
          </div>
        </CartProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
