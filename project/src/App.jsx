import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

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
import Home from "./pages/Home";
import VerifyEmailChange from "./customer/VerifyEmailChange";
import Settings from "./customer/SettingsComponent";
import PaymentSuccessPage from './customer/PaymentSuccessPage';
import DishDetailsPage from "./customer/DishDetailsPage";
import DiscoveryPage from "./customer/DiscoveryPage";
import WishlistPage from "./customer/WishlistPage";
import OrderHistoryApp from './customer/OrderHistoryApp';
import CartPage from "./customer/CartPage";
import AuthSuccess from './customer/AuthSuccess';
import RestaurantMenuPage from './customer/RestaurantMenuPage';

// Customer Order flow page components
import AddressPage from "./customer/AddressPage";
import OrderSummaryPage from "./customer/OrderSummaryPage";
import PaymentPage from "./customer/PaymentPage";
import ConfirmationPage from "./customer/ConfirmationPage";
import OrderTrackingTimeline from "./customer/OrderTrackingTimeline";

// Context Providers
import { SocketProvider } from './contexts/SocketContext';
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { LocationProvider } from "./contexts/LocationContext";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ViewHistoryProvider } from './contexts/ViewHistoryContext';

// Seller components
import SellerLogin from "./components/seller/auth/SellerLogin";
import SellerSignup from "./components/seller/auth/SellerSignup";
import SellerForgotPassword from "./components/seller/auth/SellerForgotPassword";
import SellerResetPassword from "./components/seller/auth/SellerResetPassword";
import SellerDashboard from "./components/seller/SellerDashboard";
import AdminLogin from "./components/admin/AdminLogin";

// Support pages
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import AdminDashboard from "./components/admin/AdminDashboard";

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

// ✅ Protected Route Component - Enforces complete auth flow
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      
      // If user hasn't seen onboarding, start from splash screen
      if (hasSeenOnboarding !== 'true') {
        console.log('❌ User tried to access protected route without seeing onboarding');
        navigate('/splash-screen', { replace: true });
      } else {
        console.log('❌ User tried to access protected route without authentication');
        navigate('/login', { replace: true, state: { from: location } });
      }
    }
  }, [loading, isAuthenticated, navigate, location]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }
  
  return children;
};

// Protected Admin Route
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || userRole !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

// Protected Seller Route
const ProtectedSellerRoute = ({ children }) => {
  const token = localStorage.getItem('sellerToken');
  if (!token) {
    return <Navigate to="/seller/login" replace />;
  }
  return children;
};

// ✅ Splash Screen Wrapper with navigation
const SplashScreenWrapper = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("✅ Splash screen loaded at /splash-screen");
    
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    
    const timer = setTimeout(() => {
      if (hasSeenOnboarding === 'true') {
        console.log("User has seen onboarding, redirecting to /login");
        navigate('/login', { replace: true });
      } else {
        console.log("First time user, redirecting to /onboarding");
        navigate('/onboarding', { replace: true });
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  return <SplashScreen />;
};

// ✅ Onboarding Wrapper with navigation
const OnboardingWrapper = () => {
  const navigate = useNavigate();
  
  const handleOnboardingComplete = () => {
    console.log("✅ Onboarding completed, setting flag and navigating to login");
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login', { replace: true });
  };
  
  return <OnboardingFlow onComplete={handleOnboardingComplete} />;
};

// ✅ Login Wrapper - Marks that user has passed authentication flow
const LoginWrapper = () => {
  const navigate = useNavigate();
  
  const handleLoginComplete = () => {
    console.log("✅ Login successful, navigating to home");
    // Mark that user has completed auth flow
    localStorage.setItem('hasCompletedAuthFlow', 'true');
    navigate('/home', { replace: true });
  };
  
  const handleForgotPassword = () => {
    console.log("Navigating to forgot password");
    navigate('/forgot-password');
  };
  
  const handleCreateAccount = () => {
    console.log("Navigating to signup");
    navigate('/signup');
  };
  
  return (
    <LoginScreen
      onLoginComplete={handleLoginComplete}
      onForgotPassword={handleForgotPassword}
      onCreateAccount={handleCreateAccount}
    />
  );
};

// ✅ Signup Wrapper - Also marks auth flow completion
const SignupWrapper = () => {
  const navigate = useNavigate();
  
  const handleBackToLogin = () => {
    navigate('/login');
  };
  
  const handleSignupComplete = () => {
    console.log("Signup complete, navigating to login");
    // After signup, user still needs to login
    navigate('/login');
  };
  
  return (
    <SignupScreen 
      onBackToLogin={handleBackToLogin}
      onSignupComplete={handleSignupComplete}
    />
  );
};

// ✅ Forgot Password Wrapper
const ForgotPasswordWrapper = () => {
  const navigate = useNavigate();
  
  const handleBackToLogin = () => {
    navigate('/login');
  };
  
  return <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
};

// ✅ Home Wrapper with clickable navigation + logout clears auth flow
const HomeWrapper = () => {
  const navigate = useNavigate();
  
  const handleOpenSettings = () => {
    console.log("Opening settings");
    navigate('/settings');
  };
  
  const handleOpenDiscovery = () => {
    console.log("Opening discovery");
    navigate('/discovery');
  };
  
  const handleOpenCart = () => {
    console.log("Opening cart");
    navigate('/cart');
  };
  
  const handleOpenWishlist = () => {
    console.log("Opening wishlist");
    navigate('/wishlist');
  };
  
  const handleOpenOrderHistory = () => {
    console.log("Opening order history");
    navigate('/order-history');
  };
  
  const handleLogout = () => {
    console.log("Logging out - clearing auth flow flags");
    // Clear auth flags on logout
    localStorage.removeItem('hasCompletedAuthFlow');
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  return (
    <>
      <Header 
        onOpenSettings={handleOpenSettings}
        onOpenDiscovery={handleOpenDiscovery}
        onOpenCart={handleOpenCart}
        onOpenWishlist={handleOpenWishlist}
        onOpenOrderHistory={handleOpenOrderHistory}
        onLogout={handleLogout}
      />
      <Home 
        onOpenDiscovery={handleOpenDiscovery}
        onNavigateToLogin={() => navigate('/login')}
        onNavigateToOrderHistory={handleOpenOrderHistory}
        onNavigateToCart={handleOpenCart}
      />
    </>
  );
};

// ✅ Settings Wrapper with back navigation
const SettingsWrapper = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    console.log("Closing settings, going back to home");
    navigate('/home');
  };
  
  return <Settings onClose={handleClose} />;
};

// ✅ Discovery Wrapper with navigation
const DiscoveryWrapper = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    console.log("Going back to home from discovery");
    navigate('/home');
  };
  
  const handleShowDishDetails = (dishId) => {
    console.log("Navigating to dish details:", dishId);
    navigate(`/dish/${dishId}`);
  };
  
  const handleShowRestaurantMenu = (restaurantId) => {
    console.log("Navigating to restaurant menu:", restaurantId);
    navigate(`/restaurant/${restaurantId}`);
  };
  
  return (
    <DiscoveryPage 
      onBack={handleBack}
      onShowDishDetails={handleShowDishDetails}
      onShowRestaurantMenu={handleShowRestaurantMenu}
    />
  );
};

// ✅ Dish Details Wrapper
const DishDetailsWrapper = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    console.log("Going back to discovery from dish details");
    navigate('/discovery');
  };
  
  return <DishDetailsPage onBack={handleBack} />;
};

// ✅ Restaurant Menu Wrapper
const RestaurantMenuWrapper = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    console.log("Going back to discovery from restaurant menu");
    navigate('/discovery');
  };
  
  return <RestaurantMenuPage onBack={handleBack} />;
};

// ✅ Cart Wrapper
const CartWrapper = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    console.log("Closing cart, going back to home");
    navigate('/home');
  };
  
  return <CartPage isOpen={false} onClose={handleClose} />;
};

// ✅ Wishlist Wrapper
const WishlistWrapper = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    console.log("Going back to home from wishlist");
    navigate('/home');
  };
  
  return (
    <WishlistPage 
      onBack={handleBack}
      onNavigateBack={handleBack}
      onAddToCart={(item) => {
        console.log('Item added to cart from wishlist:', item);
      }}
      onShareWishlist={() => {
        console.log('Share wishlist functionality');
      }}
    />
  );
};

// ✅ Order History Wrapper
const OrderHistoryWrapper = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    console.log("Going back to home from order history");
    navigate('/home');
  };
  
  return (
    <OrderHistoryApp 
      authToken={localStorage.getItem('token')}
      onBack={handleBack}
      onNavigateBack={handleBack}
    />
  );
};

// ✅ Root Redirect Component
const RootRedirect = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      
      if (isAuthenticated) {
        console.log("User authenticated, redirecting to /home");
        navigate('/home', { replace: true });
      } else if (hasSeenOnboarding === 'true') {
        console.log("User has seen onboarding, redirecting to /login");
        navigate('/login', { replace: true });
      } else {
        console.log("First time user, redirecting to /splash-screen");
        navigate('/splash-screen', { replace: true });
      }
    }
  }, [loading, isAuthenticated, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <LocationProvider>
              <ViewHistoryProvider>
                <CartProvider>
                  <WishlistProvider>
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
                          {/* ✅ ROOT ROUTE - Smart redirect */}
                          <Route path="/" element={<RootRedirect />} />
                          
                          {/* ✅ SPLASH SCREEN & ONBOARDING - Frontend only, with clickable navigation */}
                          <Route path="/splash-screen" element={<SplashScreenWrapper />} />
                          <Route path="/onboarding" element={<OnboardingWrapper />} />
                          
                          {/* ✅ AUTHENTICATION ROUTES - With clickable buttons working */}
                          <Route path="/login" element={<LoginWrapper />} />
                          <Route path="/signup" element={<SignupWrapper />} />
                          <Route path="/forgot-password" element={<ForgotPasswordWrapper />} />
                          <Route path="/auth-success" element={<AuthSuccess />} />
                          
                          {/* Password reset with token */}
                          <Route path="/reset-password/:token" element={<ResetPasswordScreen />} />
                          <Route path="/reset-password-settings/:token" element={<ResetPasswordFromSettings />} />
                          
                          {/* Email verification */}
                          <Route path="/verify-email-change" element={<VerifyEmailChange />} />
                          
                          {/* ✅ PROTECTED CUSTOMER ROUTES - With clickable navigation */}
                          <Route 
                            path="/home" 
                            element={
                              <ProtectedRoute>
                                <HomeWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/settings" 
                            element={
                              <ProtectedRoute>
                                <SettingsWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/discovery" 
                            element={
                              <ProtectedRoute>
                                <DiscoveryWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/dish/:dishId" 
                            element={
                              <ProtectedRoute>
                                <DishDetailsWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/restaurant/:restaurantId" 
                            element={
                              <ProtectedRoute>
                                <RestaurantMenuWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/cart" 
                            element={
                              <ProtectedRoute>
                                <CartWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/wishlist" 
                            element={
                              <ProtectedRoute>
                                <WishlistWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/order-history" 
                            element={
                              <ProtectedRoute>
                                <OrderHistoryWrapper />
                              </ProtectedRoute>
                            } 
                          />
                          
                          {/* Order flow routes */}
                          <Route 
                            path="/address" 
                            element={
                              <ProtectedRoute>
                                <AddressPage />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/order-summary" 
                            element={
                              <ProtectedRoute>
                                <OrderSummaryPage />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/payment" 
                            element={
                              <ProtectedRoute>
                                <PaymentPage />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/confirmation" 
                            element={
                              <ProtectedRoute>
                                <ConfirmationPage />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/payment-success" 
                            element={
                              <ProtectedRoute>
                                <PaymentSuccessPage />
                              </ProtectedRoute>
                            } 
                          />
                          
                          <Route 
                            path="/order-tracking/:orderId" 
                            element={
                              <ProtectedRoute>
                                <OrderTrackingTimeline />
                              </ProtectedRoute>
                            } 
                          />
                          
                          {/* ✅ SELLER ROUTES */}
                          <Route path="/seller/login" element={<SellerLogin />} />
                          <Route path="/seller/signup" element={<SellerSignup />} />
                          <Route path="/seller/forgot-password" element={<SellerForgotPassword />} />
                          <Route path="/seller/reset-password/:token" element={<SellerResetPassword />} />
                          
                          <Route 
                            path="/seller/dashboard" 
                            element={
                              <ProtectedSellerRoute>
                                <SellerDashboard />
                              </ProtectedSellerRoute>
                            } 
                          />
                          
                          {/* ✅ ADMIN ROUTES */}
                          <Route path="/admin/login" element={<AdminLogin />} />
                          
                          <Route 
                            path="/admin/dashboard" 
                            element={
                              <ProtectedAdminRoute>
                                <AdminDashboard />
                              </ProtectedAdminRoute>
                            } 
                          />
                          
                          {/* ✅ PUBLIC SUPPORT PAGES */}
                          <Route path="/help-center" element={<HelpCenter />} />
                          <Route path="/contact-us" element={<ContactUs />} />
                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/terms-of-service" element={<TermsOfService />} />
                          <Route path="/refund-policy" element={<RefundPolicy />} />
                          
                          {/* 404 - Redirect to root */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </React.Suspense>
                    </div>
                  </WishlistProvider>
                </CartProvider>
              </ViewHistoryProvider>
            </LocationProvider>
          </Router> 
        </SocketProvider>
      </AuthProvider> 
    </ErrorBoundary>
  );
}

export default App;