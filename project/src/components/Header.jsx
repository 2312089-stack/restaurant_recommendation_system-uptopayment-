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
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { API_BASE_URL } from "../config/api.js";

const Header = ({ activeView = "main", onNavigate, onOpenSettings, onLogout }) => {
  const [location, setLocation] = useState("Detecting location...");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { itemCount } = useCart();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });

  // Real-time location detection
  useEffect(() => {
    const detectLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Using a reverse geocoding service (you can replace with your preferred service)
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
    // Update location every 5 minutes
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
    setIsAccountDropdownOpen(false);
    console.log("User logged out");
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  const addNotification = useCallback((message) => {
    setNotifications((prev) =>
      [{ id: `${Date.now()}-${Math.random()}`, message, time: "Just now" }, ...prev].slice(0, 20)
    );
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Turn live cart/wishlist activity into notifications.
  useEffect(() => {
    const cartMessages = {
      add: "Item added to your cart",
      update: "Your cart was updated",
      remove: "Item removed from your cart",
      clear: "Your cart was cleared",
    };
    const wishlistMessages = {
      add: "Added to your wishlist",
      remove: "Removed from your wishlist",
      clear: "Your wishlist was cleared",
    };

    const handleCartUpdated = (event) =>
      addNotification(cartMessages[event.detail?.action] || "Cart updated");
    const handleWishlistUpdated = (event) =>
      addNotification(wishlistMessages[event.detail?.action] || "Wishlist updated");

    window.addEventListener("cartUpdated", handleCartUpdated);
    window.addEventListener("wishlistUpdated", handleWishlistUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
      window.removeEventListener("wishlistUpdated", handleWishlistUpdated);
    };
  }, [addNotification]);

  // Surface recent order activity when the user is signed in.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    let cancelled = false;

    fetch(`${API_BASE_URL}/order-history/recent?limit=3`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.orders?.length) return;
        const items = data.orders.map((order) => ({
          id: order._id,
          message: `Order ${String(order.currentStatus || "").replace(/_/g, " ")}${
            order.snapshot?.restaurantName ? ` from ${order.snapshot.restaurantName}` : ""
          }`,
          time: new Date(order.createdAt).toLocaleDateString(),
        }));
        setNotifications((prev) => [...items, ...prev].slice(0, 20));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const navTabs = [
    { id: "main", label: "Home", Icon: Home },
    { id: "discover", label: "Discover", Icon: Compass },
    { id: "reservations", label: "Reservations", Icon: Calendar },
    { id: "orders", label: "Orders", Icon: Package },
    { id: "wishlist", label: "Wishlist", Icon: Heart },
  ];

  const handleTabClick = (tabId) => {
    if (onNavigate) {
      onNavigate(tabId);
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <header className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Swiggy Style */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 relative">
                {/* Swiggy-style logo with food delivery theme */}
                <div className="w-full h-full bg-orange-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Stylized food/delivery icon */}
                  <div className="relative">
                    <div className="w-6 h-6 bg-white rounded-full opacity-90"></div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full opacity-70"></div>
                    <div className="absolute top-1 left-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                  {/* Corner accent */}
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
                <div className="relative">
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
                            // Trigger location detection again
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
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() =>
                    setIsNotificationDropdownOpen((open) => {
                      const next = !open;
                      if (next) setUnreadCount(0);
                      return next;
                    })
                  }
                  className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationDropdownOpen && (
                  <div className="absolute top-12 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No notifications yet
                      </div>
                    )}
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

              {/* Cart */}
              <button
                type="button"
                onClick={() => handleTabClick("discover")}
                className="relative p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="p-2 text-gray-600 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-500 transition-colors"
                >
                  <User className="w-5 h-5" />
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <p className="font-semibold text-gray-900 dark:text-white">{user ? (user.emailId || user.email) : "Guest User"}</p>
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

                      {/* Logout Option */}
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
              {navTabs.map(({ id, label, Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleTabClick(id)}
                    className={
                      isActive
                        ? "flex items-center space-x-2 px-3 py-3 bg-transparent text-orange-600 border-b-2 border-orange-600 font-medium"
                        : "flex items-center space-x-2 px-3 py-3 bg-transparent text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-600 transition-colors"
                    }
                  >
                    <Icon className="w-4 h-4" /><span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;