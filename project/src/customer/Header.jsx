import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useCart } from "../contexts/CartContext";

const Header = ({ onOpenSettings, onOpenDiscovery, onOpenCart, onLogout }) => {
  const [location, setLocation] = useState("Detecting location...");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCartDropdownOpen, setIsCartDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationCount] = useState(2);
  const [user, setUser] = useState({ email: "user@example.com", name: "John Doe" });

  // Cart functionality from context
  const { 
    items, 
    totalAmount, 
    itemCount, 
    loading: cartLoading, 
    error: cartError,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    loadCart,
    clearError
  } = useCart();

  // Load cart on component mount and set up real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadCart();
    }
  }, [loadCart]);

  // Listen for cart updates from other components with debouncing
  useEffect(() => {
    let timeoutId;
    
    const handleCartUpdate = (event) => {
      console.log('Cart updated, refreshing header cart...', event.detail);
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce cart refresh to avoid multiple rapid updates
      timeoutId = setTimeout(() => {
        loadCart();
      }, 100);
    };

    // Listen for custom cart update events
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadCart]);

  // Auto-refresh cart periodically for real-time sync
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const cartRefreshInterval = setInterval(() => {
      // Only refresh if not currently loading to avoid race conditions
      if (!cartLoading) {
        loadCart();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(cartRefreshInterval);
  }, [loadCart, cartLoading]);

  // Real-time location detection
  useEffect(() => {
    const detectLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const data = await response.json();
              const locationString = `${data.locality || data.city || 'Unknown'}, ${data.principalSubdivision || ''}`;
              setLocation(locationString);
            } catch (error) {
              console.error('Error fetching location:', error);
              setLocation("Location unavailable");
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            setLocation("Enable location access");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setLocation("Location not supported");
      }
    };

    detectLocation();
    const locationInterval = setInterval(detectLocation, 300000);
    return () => clearInterval(locationInterval);
  }, []);

  // Dark mode persistence
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const openSettings = () => {
    onOpenSettings && onOpenSettings();
    setIsAccountDropdownOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAccountDropdownOpen(false);
    onLogout && onLogout();
    console.log("User logged out");
  };

  // Navigation handlers
  const handleDiscoverClick = (e) => {
    e.preventDefault();
    console.log('Discover clicked - navigating to discovery page');
    onOpenDiscovery && onOpenDiscovery();
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    console.log('Home clicked');
  };

  // Enhanced cart handlers with error handling
  const handleCartClick = useCallback(() => {
    console.log('Cart clicked - opening cart page with', itemCount, 'items');
    if (onOpenCart) {
      onOpenCart();
    }
    setIsCartDropdownOpen(false); // Close dropdown if open
  }, [itemCount, onOpenCart]);

  const handleQuantityChange = useCallback(async (dishId, newQuantity) => {
    console.log('Updating quantity for dish:', dishId, 'to:', newQuantity);
    
    // Clear any previous errors
    if (cartError) {
      clearError();
    }
    
    try {
      const result = await updateQuantity(dishId, newQuantity);
      if (result.success) {
        console.log('Quantity updated successfully');
        // The global event will be triggered from CartContext
      } else {
        console.error('Failed to update quantity:', result.error);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }, [updateQuantity, cartError, clearError]);

  const handleRemoveItem = useCallback(async (dishId, dishName = 'Item') => {
    console.log('Removing item from cart:', dishId);
    
    // Clear any previous errors
    if (cartError) {
      clearError();
    }
    
    try {
      const result = await removeFromCart(dishId);
      if (result.success) {
        console.log(`${dishName} removed from cart successfully`);
        // The global event will be triggered from CartContext
      } else {
        console.error('Failed to remove item:', result.error);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }, [removeFromCart, cartError, clearError]);

  const handleClearCart = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      console.log('Clearing entire cart');
      
      // Clear any previous errors
      if (cartError) {
        clearError();
      }
      
      try {
        const result = await clearCart();
        if (result.success) {
          console.log('Cart cleared successfully');
          setIsCartDropdownOpen(false);
          // The global event will be triggered from CartContext
        } else {
          console.error('Failed to clear cart:', result.error);
        }
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  }, [clearCart, cartError, clearError]);

  const handleProceedToOrder = useCallback(() => {
    console.log('Proceeding to order with', itemCount, 'items, total: ₹', totalAmount);
    window.location.href = '/order-summary';
    setIsCartDropdownOpen(false);
  }, [itemCount, totalAmount]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsLocationDropdownOpen(false);
        setIsNotificationDropdownOpen(false);
        setIsAccountDropdownOpen(false);
        setIsCartDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, message: "Your order from Pizza Palace is ready!", time: "2 min ago" },
    { id: 2, message: "Time to reorder your favorite Biryani 🍛", time: "1 hour ago" },
    { id: 3, message: "50% off on all desserts today!", time: "3 hours ago" },
  ];

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <header className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Swiggy Style */}
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

            {/* Search + Location */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="flex space-x-4">
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors bg-white dark:bg-gray-800"
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
                            setLocation("Detecting location...");
                            navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                const { latitude, longitude } = position.coords;
                                try {
                                  const response = await fetch(
                                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                                  );
                                  const data = await response.json();
                                  const locationString = `${data.locality || data.city || 'Unknown'}, ${data.principalSubdivision || ''}`;
                                  setLocation(locationString);
                                } catch (error) {
                                  setLocation("Location unavailable");
                                }
                              },
                              () => setLocation("Enable location access")
                            );
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
              {/* Notifications */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                  className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {isNotificationDropdownOpen && (
                  <div className="absolute top-12 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <p className="text-sm text-gray-900 dark:text-white">{notification.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ENHANCED Cart Button with Real-time Updates and Error Handling */}
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
                  
                  {/* Enhanced Hover tooltip with error state */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {cartError ? 'Error loading cart' : itemCount === 0 ? 'Your cart is empty' : `${itemCount} items • ₹${totalAmount}`}
                  </div>
                </button>

                {/* Cart Dropdown Toggle Button */}
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

                {/* Enhanced Cart Dropdown with Error Handling */}
                {isCartDropdownOpen && (
                  <div className="absolute top-12 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="w-5 h-5 text-orange-600" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Cart ({itemCount})
                          </h3>
                          {itemCount > 0 && (
                            <span className="text-sm text-orange-600 font-medium">
                              ₹{totalAmount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleCartClick}
                            className="text-orange-500 hover:text-orange-700 text-sm font-medium transition-colors"
                          >
                            View Cart
                          </button>
                          <button
                            onClick={() => setIsCartDropdownOpen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error State */}
                    {cartError && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between">
                          <p className="text-red-600 dark:text-red-400 text-sm">{cartError}</p>
                          <button
                            onClick={() => {
                              clearError();
                              loadCart();
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}

                    {cartLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">Updating cart...</p>
                      </div>
                    ) : items.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ShoppingCart className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Your cart is empty</p>
                        <button
                          onClick={handleDiscoverClick}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                        >
                          Browse Dishes
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Restaurant Info */}
                        {items.length > 0 && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {items[0].restaurantName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{totalAmount}
                            </p>
                          </div>
                        )}

                        {/* Cart Items */}
                        <div className="max-h-60 overflow-y-auto">
                          {items.slice(0, 3).map((item) => (
                            <div key={item.dishId._id || item.dishId} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                {/* Dish Image */}
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                                  {item.dishImage ? (
                                    <img
                                      src={`http://localhost:5000${item.dishImage}`}
                                      alt={item.dishName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                </div>

                                {/* Dish Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {item.dishName}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    ₹{item.price} × {item.quantity}
                                  </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleQuantityChange(item.dishId._id || item.dishId, item.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                    disabled={cartLoading}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(item.dishId._id || item.dishId, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                    disabled={cartLoading}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Item Total & Remove */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    ₹{item.price * item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveItem(item.dishId._id || item.dishId, item.dishName)}
                                    className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                    disabled={cartLoading}
                                    title={`Remove ${item.dishName}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="p-4 text-center text-sm text-gray-500 border-b border-gray-100 dark:border-gray-700">
                              +{items.length - 3} more items
                            </div>
                          )}
                        </div>

                        {/* Cart Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                Total: ₹{totalAmount}
                              </span>
                              <p className="text-xs text-gray-500">
                                + taxes & delivery charges
                              </p>
                            </div>
                            {items.length > 1 && (
                              <button
                                onClick={handleClearCart}
                                className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors disabled:opacity-50"
                                disabled={cartLoading}
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleCartClick}
                              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                            >
                              View Full Cart
                            </button>
                            <button
                              onClick={handleProceedToOrder}
                              disabled={cartLoading || itemCount === 0}
                              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center space-x-1"
                            >
                              <span>Checkout</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
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
                      <p className="font-semibold text-gray-900 dark:text-white">{user ? user.email : "Guest User"}</p>
                      {user && user.name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.name}</p>
                      )}
                    </div>
                    <div className="p-2">
                      <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {isDarkMode ? <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                        <span className="text-sm text-gray-900 dark:text-white">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
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
                <Home className="w-4 h-4" /><span>Home</span>
              </button>
              <button 
                onClick={handleDiscoverClick}
                className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
              >
                <Compass className="w-4 h-4" /><span>Discover</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                <Calendar className="w-4 h-4" /><span>Reservations</span>
              </button>
              <button 
                onClick={handleProceedToOrder}
                className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
              >
                <Package className="w-4 h-4" /><span>Orders</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-3 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors">
                <Heart className="w-4 h-4" /><span>Wishlist</span>
              </button>
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;