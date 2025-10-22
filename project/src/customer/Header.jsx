// src/customer/Header.jsx - FIXED VERSION WITH IMPROVED GOOGLE TRANSLATE
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import {
  MapPin,
  Bell,
  ShoppingCart,
  User,
  Home,
  Compass,
  Package,
  Heart,
  Sun,
  Moon,
  Settings,
  LogOut,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  X,
  ArrowRight,
  Languages
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useLocation } from '../contexts/LocationContext';
import NotificationPanel from './NotificationPanel';

const Header = ({ onOpenSettings, onOpenDiscovery, onOpenCart, onOpenWishlist, onOpenOrderHistory, onLogout }) => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { logout, user: authUser, authToken } = useAuth();
  const { socket, connected } = useSocket();
  const { location: contextLocation, detectLocation: contextDetectLocation, isLoading: locationLoading } = useLocation();

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCartDropdownOpen, setIsCartDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const API_BASE_URL = "http://localhost:5000/api";

  const {
    items,
    totalAmount,
    itemCount,
    loading: cartLoading,
    error: cartError,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart
  } = useCart();

  // Initialize Google Translate
  useEffect(() => {
    const initGoogleTranslate = () => {
      if (!document.getElementById("google-translate-script")) {
        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.body.appendChild(script);
      }

      window.googleTranslateElementInit = function() {
        try {
          const element = document.getElementById("google_translate_element");
          if (element && window.google && window.google.translate) {
            element.innerHTML = "";
            new window.google.translate.TranslateElement(
              {
                pageLanguage: "en",
                includedLanguages: "en,ta,hi,te,kn,ml,bn,mr,gu,pa,ur",
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              },
              "google_translate_element"
            );
          }
        } catch (error) {
          console.error("❌ Google Translate error:", error);
        }
      };
    };

    initGoogleTranslate();
  }, []);

  // Reinitialize when dropdown opens
  useEffect(() => {
    if (isAccountDropdownOpen) {
      const timer = setTimeout(() => {
        if (window.google && window.google.translate) {
          const element = document.getElementById("google_translate_element");
          if (element) {
            element.innerHTML = "";
            try {
              new window.google.translate.TranslateElement(
                {
                  pageLanguage: "en",
                  includedLanguages: "en,ta,hi,te,kn,ml,bn,mr,gu,pa,ur",
                  layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                  autoDisplay: false
                },
                "google_translate_element"
              );
            } catch (error) {
              console.error("❌ Reinitialize error:", error);
            }
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isAccountDropdownOpen]);

  useEffect(() => {
    if (authToken) fetchNotifications();
    const interval = setInterval(() => {
      if (authToken && !isNotificationPanelOpen) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [authToken]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (data) => {
      const newNotification = data.notification;
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/logo192.png'
        });
      }
    };
    socket.on('new-notification', handleNewNotification);
    socket.on('order-status-updated', fetchNotifications);
    socket.on('seller-accepted-order', fetchNotifications);
    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('order-status-updated', fetchNotifications);
      socket.off('seller-accepted-order', fetchNotifications);
    };
  }, [socket]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const fetchNotifications = async () => {
    if (!authToken) return;
    try {
      setLoadingNotifications(true);
      const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const wasUnread = notifications.find(n => n._id === notificationId && !n.read);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) handleMarkAsRead(notification._id);
    if (notification.data?.actionUrl) {
      navigate(notification.data.actionUrl);
    } else if (notification.orderMongoId) {
      navigate(`/order-tracking/${notification.orderMongoId}`);
    }
    setIsNotificationPanelOpen(false);
  };

  useEffect(() => {
    if (refreshCart) refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsLocationDropdownOpen(false);
        setIsAccountDropdownOpen(false);
        setIsCartDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleQuantityChange = useCallback(async (dishId, newQuantity) => {
    try {
      await updateQuantity(dishId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }, [updateQuantity]);

  const handleRemoveItem = useCallback(async (dishId) => {
    try {
      await removeItem(dishId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }, [removeItem]);

  const handleProceedToOrder = useCallback(() => {
    if (onOpenCart) onOpenCart();
    setIsCartDropdownOpen(false);
  }, [onOpenCart]);

  const displayLocation = () => {
    if (locationLoading) return "Detecting location...";
    if (contextLocation.city && contextLocation.state) {
      return `${contextLocation.city}, ${contextLocation.state}`;
    }
    if (contextLocation.fullAddress) return contextLocation.fullAddress;
    return "Location unavailable";
  };

  // Logo Component with SVG Image
  const Logo = () => (
    <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
      <img 
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23f97316'/%3E%3Ccircle cx='30' cy='65' r='8' fill='none' stroke='white' stroke-width='3'/%3E%3Ccircle cx='70' cy='65' r='8' fill='none' stroke='white' stroke-width='3'/%3E%3Cline x1='20' y1='45' x2='35' y2='38' stroke='white' stroke-width='2'/%3E%3Cline x1='25' y1='35' x2='38' y2='30' stroke='white' stroke-width='2'/%3E%3Cline x1='35' y1='25' x2='37' y2='38' stroke='white' stroke-width='2'/%3E%3Cline x1='38' y1='20' x2='45' y2='28' stroke='white' stroke-width='1.5'/%3E%3Cline x1='70' y1='30' x2='72' y2='42' stroke='white' stroke-width='2'/%3E%3Cline x1='75' y1='25' x2='85' y2='30' stroke='white' stroke-width='2'/%3E%3Crect x='75' y='15' width='10' height='10' fill='white' rx='1'/%3E%3C/svg%3E"
        alt="TasteSphere Logo" 
        className="w-full h-full object-cover"
      />
    </div>
  );

  return (
    <>
      <div className={isDarkMode ? 'dark' : ''}>
        <header className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-900 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <Logo />
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">TasteSphere</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Food Delivery</div>
                </div>
              </div>

              {/* Location */}
              <div className="flex-1 max-w-xs mx-4">
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
                  >
                    <MapPin className={`w-4 h-4 ${locationLoading ? 'animate-pulse text-orange-400' : 'text-orange-500'}`} />
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400 leading-none">
                        {locationLoading ? 'Locating...' : 'Deliver to'}
                      </div>
                      <div className="text-sm font-medium truncate text-gray-900 dark:text-white leading-tight">
                        {displayLocation()}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>

                  {isLocationDropdownOpen && (
                    <div className="absolute top-14 left-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Choose Location</h3>
                      <button
                        onClick={() => {
                          contextDetectLocation(false);
                          setIsLocationDropdownOpen(false);
                        }}
                        disabled={locationLoading}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MapPin className={`w-4 h-4 ${locationLoading ? 'animate-spin' : ''}`} />
                        <span>{locationLoading ? 'Detecting...' : 'Detect My Location'}</span>
                      </button>
                      {contextLocation.accuracy && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          Accuracy: ±{contextLocation.accuracy}m
                        </p>
                      )}
                      {contextLocation.latitude && contextLocation.longitude && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                          {contextLocation.latitude.toFixed(4)}, {contextLocation.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Icons */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                    className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Cart */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsCartDropdownOpen(!isCartDropdownOpen)}
                    className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                  </button>

                  {isCartDropdownOpen && items.length > 0 && (
                    <div className="absolute top-12 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Cart ({itemCount})</h3>
                          <button onClick={() => setIsCartDropdownOpen(false)}>
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                        {items.map((item) => (
                          <div key={item.dishId} className="flex space-x-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                            <img src={item.dishImage || 'https://via.placeholder.com/60'} alt={item.dishName} className="w-16 h-16 object-cover rounded" />
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.dishName}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">₹{item.price}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <button onClick={() => handleQuantityChange(item.dishId, item.quantity - 1)} className="p-1 bg-white dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500">
                                  <Minus className="w-3 h-3 text-gray-900 dark:text-white" />
                                </button>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                                <button onClick={() => handleQuantityChange(item.dishId, item.quantity + 1)} className="p-1 bg-white dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500">
                                  <Plus className="w-3 h-3 text-gray-900 dark:text-white" />
                                </button>
                                <button onClick={() => handleRemoveItem(item.dishId)} className="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                          <span className="font-bold text-orange-600">₹{totalAmount}</span>
                        </div>
                        <button onClick={handleProceedToOrder} className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 flex items-center justify-center space-x-2">
                          <span>View Full Cart</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </button>

                  {isAccountDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsAccountDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Menu */}
                      <div className="absolute top-12 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {authUser?.emailId || 'Guest User'}
                          </p>
                        </div>
                        
                        <div className="p-3 space-y-1">
                          {/* Dark Mode Toggle */}
                          <button 
                            onClick={toggleDarkMode} 
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {isDarkMode ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                            <span className="text-sm text-gray-900 dark:text-white font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                          </button>

                          {/* Language Selector - IMPROVED */}
                          <div className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <div className="flex items-center space-x-3 mb-3">
                              <Languages className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white font-medium">Language</span>
                            </div>
                            
                            {/* Google Translate Container with improved z-index */}
                            <div id="google_translate_element" className="translate-wrapper relative z-[60]"></div>
                          </div>

                          {/* Settings */}
                          <button 
                            onClick={onOpenSettings} 
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white font-medium">Settings</span>
                          </button>

                          {/* Logout */}
                          <button 
                            onClick={logout} 
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                          >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Logout</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8">
                <button onClick={() => navigate('/home')} className="flex items-center space-x-2 px-3 py-3 text-orange-600 border-b-2 border-orange-600 font-medium">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <button onClick={onOpenDiscovery} className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                  <Compass className="w-4 h-4" />
                  <span>Discover</span>
                </button>
                <button onClick={onOpenOrderHistory} className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                  <Package className="w-4 h-4" />
                  <span>Orders</span>
                </button>
                <button onClick={onOpenWishlist} className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                  <Heart className="w-4 h-4" />
                  <span>Wishlist</span>
                </button>
              </nav>
            </div>
          </div>
        </header>
      </div>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDeleteNotification}
        onNotificationClick={handleNotificationClick}
        loading={loadingNotifications}
      />

      <style jsx global>{`
        body {
          top: 0 !important;
        }
        
        .goog-te-banner-frame {
          display: none !important;
        }

        .skiptranslate iframe {
          visibility: hidden !important;
          height: 0 !important;
        }

        /* IMPROVED TRANSLATE STYLING */
        .translate-wrapper {
          min-height: 40px;
        }

        #google_translate_element {
          position: relative;
          z-index: 60 !important;
        }

        #google_translate_element .goog-te-gadget {
          font-size: 0 !important;
          line-height: normal !important;
        }

        #google_translate_element .goog-te-gadget > span,
        #google_translate_element .goog-te-gadget > div > span {
          display: none !important;
        }

        #google_translate_element select.goog-te-combo {
          width: 100% !important;
          padding: 10px 12px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 8px !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          outline: none !important;
          transition: all 0.2s !important;
          appearance: auto !important;
          position: relative !important;
          z-index: 60 !important;
        }

        #google_translate_element select.goog-te-combo:hover {
          border-color: #f97316 !important;
          background-color: #fff7ed !important;
        }

        #google_translate_element select.goog-te-combo:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1) !important;
        }

        .dark #google_translate_element select.goog-te-combo {
          background-color: #1f2937 !important;
          border-color: #4b5563 !important;
          color: #ffffff !important;
        }

        .dark #google_translate_element select.goog-te-combo:hover {
          border-color: #f97316 !important;
          background-color: #374151 !important;
        }

        #google_translate_element select.goog-te-combo option {
          padding: 10px !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          font-size: 14px !important;
        }

        .dark #google_translate_element select.goog-te-combo option {
          background-color: #1f2937 !important;
          color: #ffffff !important;
        }

        /* Make dropdown menu appear above everything */
        #google_translate_element .goog-te-combo-frame {
          z-index: 9999 !important;
        }
      `}</style>
    </>
  );
};

export default Header;