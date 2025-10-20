// src/customer/Header.jsx - COMPLETE VERSION WITH NOTIFICATIONS
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Bell,
  ShoppingCart,
  User,
  Home,
  Compass,
  Calendar,
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
  ArrowRight
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import NotificationPanel from './NotificationPanel';

const Header = ({ onOpenSettings, onOpenDiscovery, onOpenCart, onOpenWishlist, onOpenOrderHistory, onLogout }) => {
  const navigate = useNavigate();
  const { logout, user: authUser, authToken } = useAuth();
  const { socket, connected } = useSocket();

  const [location, setLocation] = useState("Detecting location...");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCartDropdownOpen, setIsCartDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
const [showNotifications, setShowNotifications] = useState(false);

  // Notification states
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

  // Fetch notifications on mount
// Replace your existing fetchNotifications useEffect with this:
useEffect(() => {
  // Fetch on mount
  if (authToken) {
    fetchNotifications();
  }

  // Refresh every 30 seconds
  const interval = setInterval(() => {
    if (authToken && !isNotificationPanelOpen) {
      fetchNotifications();
    }
  }, 30000);

  return () => clearInterval(interval);
}, [authToken]);


  // Listen for new notifications from socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      console.log('🔔 New notification received:', data);
      
      const newNotification = data.notification;
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/logo192.png',
          badge: '/logo192.png'
        });
      }

      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (e) {
        console.log('Audio not available');
      }
    };

    const handleOrderStatusUpdate = (data) => {
      console.log('📦 Order status updated:', data);
      fetchNotifications();
    };

    const handleSellerAcceptedOrder = (data) => {
      console.log('🎉 Seller accepted order:', data);
      fetchNotifications();
    };

    socket.on('new-notification', handleNewNotification);
    socket.on('order-status-updated', handleOrderStatusUpdate);
    socket.on('seller-accepted-order', handleSellerAcceptedOrder);
    
    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('order-status-updated', handleOrderStatusUpdate);
      socket.off('seller-accepted-order', handleSellerAcceptedOrder);
    };
  }, [socket]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const fetchNotifications = async () => {
    if (!authToken) return;
    
    try {
      setLoadingNotifications(true);
      
      const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Notifications fetched:', data);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error('Failed to fetch notifications:', response.status);
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
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
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
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const wasUnread = notifications.find(n => n._id === notificationId && !n.read);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };
useEffect(() => {
  if (!socket) return;

  const handleNewNotification = (data) => {
    console.log('🔔 NEW NOTIFICATION RECEIVED:', data);
    
    const newNotification = data.notification;
    
    // Add to notifications array
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: false
      });
    }

    // Play audio
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio not available');
    }
  };

  // CRITICAL: Listen for the 'new-notification' event from backend
  socket.on('new-notification', handleNewNotification);
  
  return () => {
    socket.off('new-notification', handleNewNotification);
  };
}, [socket]);
const handleNotificationClick = (notification) => {
  // Mark as read if unread
  if (!notification.read) {
    handleMarkAsRead(notification._id);
  }

  // Navigate to action URL
  if (notification.data?.actionUrl) {
    navigate(notification.data.actionUrl);
  } else if (notification.orderMongoId) {
    navigate(`/order-tracking/${notification.orderMongoId}`);
  }
  
  // Close both notification indicators
  setShowNotifications(false);
  setIsNotificationPanelOpen(false);
};

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation('Location not supported');
      return;
    }

    setLocation("Detecting location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          const locationString = `${data.locality || data.city || 'Unknown'}, ${data.principalSubdivision}`;
          setLocation(locationString);
        } catch (error) {
          console.error('Error fetching location:', error);
          setLocation('Location unavailable');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocation('Enable location access');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && refreshCart) {
      refreshCart();
    }
  }, [refreshCart]);

  useEffect(() => {
    const handleCartUpdate = (event) => {
      console.log('Cart updated, refreshing header cart...', event.detail);
      if (refreshCart) {
        refreshCart();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [refreshCart]);

  useEffect(() => {
    detectLocation();
    const locationInterval = setInterval(detectLocation, 300000);
    return () => clearInterval(locationInterval);
  }, [detectLocation]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const openSettings = () => {
    if (onOpenSettings) onOpenSettings();
    setIsAccountDropdownOpen(false);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    if (onOpenWishlist) onOpenWishlist();
  };

  const handleOrderHistoryClick = (e) => {
    e.preventDefault();
    if (onOpenOrderHistory) onOpenOrderHistory();
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      setIsAccountDropdownOpen(false);
      if (onLogout) onLogout();
    }
  };

  const handleDiscoverClick = (e) => {
    e.preventDefault();
    if (onOpenDiscovery) onOpenDiscovery();
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    console.log('Home clicked');
  };

  const handleCartClick = useCallback(() => {
    if (onOpenCart) onOpenCart();
    setIsCartDropdownOpen(false);
  }, [onOpenCart]);

  const handleQuantityChange = useCallback(async (dishId, newQuantity) => {
    try {
      await updateQuantity(dishId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }, [updateQuantity]);

  const handleRemoveItem = useCallback(async (dishId, dishName = 'Item') => {
    try {
      await removeItem(dishId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }, [removeItem]);

  const handleClearCart = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
        setIsCartDropdownOpen(false);
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  }, [clearCart]);

  const handleProceedToOrder = useCallback(() => {
    if (onOpenCart) onOpenCart();
    setIsCartDropdownOpen(false);
  }, [onOpenCart]);

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

  return (
    <>
      <div className={isDarkMode ? 'dark' : ''}>
        <header className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-900 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 relative">
                  <div className="w-full h-full bg-orange-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="relative">
                      <div className="w-6 h-6 bg-white rounded-full opacity-90"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full opacity-70"></div>
                      <div className="absolute top-1 left-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-orange-600 rounded-tl-full opacity-50"></div>
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">TasteSphere</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Food Delivery</div>
                </div>
              </div>

              {/* Search & Location */}
              <div className="flex-1 max-w-2xl mx-8">
                <div className="flex space-x-4">
                  {/* Location Dropdown */}
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <div className="text-left">
                        <div className="text-xs text-gray-500 dark:text-gray-400 leading-none">Deliver to</div>
                        <div className="text-sm font-medium truncate max-w-32 text-gray-900 dark:text-white leading-tight">
                          {location}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {isLocationDropdownOpen && (
                      <div className="absolute top-14 left-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Choose Location</h3>
                        <div className="mb-3">
                          <button
                            onClick={() => {
                              detectLocation();
                              setIsLocationDropdownOpen(false);
                            }}
                            className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Use current location</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Search for area, street name..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              setLocation(e.target.value);
                              setIsLocationDropdownOpen(false);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="flex-1 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search for restaurants, dishes, cuisines..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            handleDiscoverClick(e);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Icons */}
              <div className="flex items-center space-x-4">
                {/* Notifications Bell */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => {
                      setIsNotificationPanelOpen(!isNotificationPanelOpen);
                      if (!isNotificationPanelOpen && authToken) {
                        fetchNotifications();
                      }
                    }}
                    className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {connected && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </button>
                </div>

                {/* Cart */}
                <div className="relative dropdown-container">
                  <button
                    onClick={handleCartClick}
                    className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors group"
                    disabled={cartLoading}
                  >
                    <ShoppingCart className={`w-5 h-5 ${cartLoading ? 'animate-pulse' : ''}`} />
                    {itemCount > 0 && (
                      <span className={`absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold ${cartLoading ? 'animate-pulse' : 'animate-bounce'}`}>
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                    
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {cartError ? 'Error loading cart' : itemCount === 0 ? 'Your cart is empty' : `${itemCount} items • ₹${totalAmount}`}
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCartDropdownOpen(!isCartDropdownOpen);
                    }}
                    disabled={cartLoading}
                    className="absolute -right-2 -top-1 w-4 h-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-xs rounded-full flex items-center justify-center transition-colors"
                    title="Quick view cart"
                  >
                    <ChevronDown className="w-2 h-2" />
                  </button>

                  {/* Cart Quick View Dropdown */}
                  {isCartDropdownOpen && (
                    <div className="absolute top-12 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Cart ({itemCount})</h3>
                          <button onClick={() => setIsCartDropdownOpen(false)}>
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {cartError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-600 dark:text-red-400">{cartError}</p>
                        </div>
                      )}

                      <div className="max-h-64 overflow-y-auto p-4">
                        {cartLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                          </div>
                        ) : items && items.length > 0 ? (
                          <div className="space-y-3">
                            {items.map((item) => (
                              <div key={item.dishId} className="flex space-x-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                <img
                                  src={item.dishImage || 'https://via.placeholder.com/60'}
                                  alt={item.dishName}
                                  className="w-16 h-16 object-cover rounded"
                                  onError={(e) => e.target.src = 'https://via.placeholder.com/60'}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {item.dishName}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">₹{item.price}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <button
                                      onClick={() => handleQuantityChange(item.dishId, item.quantity - 1)}
                                      className="p-1 bg-white dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-sm font-medium">{item.quantity}</span>
                                    <button
                                      onClick={() => handleQuantityChange(item.dishId, item.quantity + 1)}
                                      className="p-1 bg-white dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveItem(item.dishId, item.dishName)}
                                      className="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Your cart is empty</p>
                          </div>
                        )}
                      </div>

                      {items && items.length > 0 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between mb-3">
                            <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                            <span className="font-bold text-orange-600">₹{totalAmount}</span>
                          </div>
                          <button
                            onClick={handleProceedToOrder}
                            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                          >
                            <span>View Full Cart</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
                    <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {authUser?.emailId || authUser?.email || 'Guest User'}
                        </p>
                        {authUser?.name && <p className="text-sm text-gray-500 dark:text-gray-400">{authUser.name}</p>}
                      </div>
                      <div className="p-2">
                        <button
                          onClick={toggleDarkMode}
                          className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {isDarkMode ? (
                            <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>

                        <button
                          onClick={openSettings}
                          className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">Settings</span>
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-600 dark:text-red-400"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8 overflow-x-auto">
                <button
                  onClick={handleHomeClick}
                  className="flex items-center space-x-2 px-3 py-3 text-orange-600 border-b-2 border-orange-600 font-medium"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                
                <button
                  onClick={handleDiscoverClick}
                  className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Discover</span>
                </button>
                
                <button className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span>Reservations</span>
                </button>
                
                <button
                  onClick={handleOrderHistoryClick}
                  className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Orders</span>
                </button>
                
                <button
                  onClick={handleWishlistClick}
                  className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span>Wishlist</span>
                </button>
              </nav>
            </div>
          </div>
        </header>
      </div>

      {/* Notification Panel Component */}
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
    </>
  );
};

export default Header;