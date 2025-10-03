// DiscoveryPage.jsx - Updated with Real-time Seller Status
import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Star, Clock, Truck, Loader2, AlertCircle,
  ArrowLeft, Grid3X3, List, SlidersHorizontal, ShoppingCart,
  Zap, CheckCircle, Heart, XCircle
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useSocket } from '../contexts/SocketContext'; // Import Socket Context
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

const DiscoveryPage = ({ onBack, onShowDishDetails }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dishes');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    city: '',
    priceRange: '',
    sortBy: 'rating'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Data states
  const [dishes, setDishes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Context hooks
  const { addToCart, loading: cartLoading, itemCount, totalAmount, clearCart } = useCart();
  const { socket, connected } = useSocket(); // Socket.IO hook
  const { 
    addToWishlist, 
    removeFromWishlist, 
    isInWishlist, 
    toggleWishlist,
    loading: wishlistLoading 
  } = useWishlist();

  // Success message states
  const [successMessage, setSuccessMessage] = useState('');
  const [addingToCart, setAddingToCart] = useState(null);
  const [wishlistMessage, setWishlistMessage] = useState('');
  const [animatingHeart, setAnimatingHeart] = useState(null);

  // Categories
  const categories = [
    'All Categories', 'Starters', 'Main Course', 'Desserts',
    'Beverages', 'Chinese', 'Indian', 'Continental', 'South Indian'
  ];

  // REAL-TIME SELLER STATUS LISTENER
  useEffect(() => {
    if (!socket || !connected) {
      console.log('Socket not connected yet');
      return;
    }

    console.log('🎧 Setting up seller status listener');

    const handleSellerStatusChange = (data) => {
      console.log('📡 Seller status changed:', data);
      
      // Update dishes with new seller status
      setDishes(prevDishes => 
        prevDishes.map(dish => {
          if (dish.restaurantId === data.sellerId) {
            console.log(`Updating dish ${dish.name} - seller is now ${data.isOnline ? 'online' : 'offline'}`);
            return {
              ...dish,
              isSellerOnline: data.isOnline,
              sellerDashboardStatus: data.dashboardStatus
            };
          }
          return dish;
        })
      );

      // Also update restaurants
      setRestaurants(prevRestaurants =>
        prevRestaurants.map(restaurant => {
          if (restaurant.id === data.sellerId || restaurant._id === data.sellerId) {
            return {
              ...restaurant,
              isSellerOnline: data.isOnline,
              sellerDashboardStatus: data.dashboardStatus
            };
          }
          return restaurant;
        })
      );
    };

    socket.on('seller-status-changed', handleSellerStatusChange);

    return () => {
      console.log('🔇 Removing seller status listener');
      socket.off('seller-status-changed', handleSellerStatusChange);
    };
  }, [socket, connected]);

  // Fetch data based on active tab and filters
  useEffect(() => {
    if (activeTab === 'dishes') {
      fetchDishes(true);
    } else {
      fetchRestaurants(true);
    }
  }, [activeTab, filters, searchQuery]);

const fetchDishes = async (reset = false) => {
  try {
    setLoading(true);
    setError('');
    
    const currentPage = reset ? 1 : page;
    const queryParams = new URLSearchParams({
      limit: '20',
      page: currentPage.toString()
    });
    
    if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.category && filters.category !== 'All Categories') {
      queryParams.append('category', filters.category);
    }
    if (filters.type) queryParams.append('type', filters.type);

    const endpoint = searchQuery.trim() ? '/discovery/search' : '/discovery/dishes/popular';
    const response = await fetch(`${API_BASE}${endpoint}?${queryParams}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch dishes');
    }

    const newDishes = searchQuery.trim() ? data.results : data.dishes;
    
    // Extract all unique seller IDs and fetch their statuses
    const sellerIds = [...new Set(newDishes.map(dish => dish.restaurantId).filter(Boolean))];
    
    // Fetch current seller statuses
    if (sellerIds.length > 0) {
      try {
        console.log('Fetching statuses for sellers:', sellerIds);
        const statusResponse = await fetch('http://localhost:5000/api/seller-status/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellerIds })
        });
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
          console.log('Received seller statuses:', statusData.statuses);
          // Update dishes with current seller status
          newDishes.forEach(dish => {
            const status = statusData.statuses[dish.restaurantId];
            if (status) {
              dish.isSellerOnline = status.isOnline;
              dish.sellerDashboardStatus = status.dashboardStatus;
              console.log(`Dish ${dish.name}: seller online = ${status.isOnline}`);
            } else {
              dish.isSellerOnline = false;
              dish.sellerDashboardStatus = 'offline';
            }
          });
        }
      } catch (statusError) {
        console.error('Failed to fetch seller statuses:', statusError);
      }
    }
    
    if (reset) {
      setDishes(newDishes || []);
      setPage(2);
    } else {
      setDishes(prev => [...prev, ...(newDishes || [])]);
      setPage(prev => prev + 1);
    }
    
    setHasMore((newDishes || []).length === 20);
    
  } catch (err) {
    console.error('Fetch dishes error:', err);
    setError('Failed to load dishes. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const fetchRestaurants = async (reset = false) => {
    try {
      setLoading(true);
      setError('');
      
      const currentPage = reset ? 1 : page;
      const queryParams = new URLSearchParams({
        limit: '12',
        page: currentPage.toString(),
        sortBy: filters.sortBy,
        sortOrder: 'desc'
      });
      
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (filters.city) queryParams.append('location', filters.city);
      if (filters.category && filters.category !== 'All Categories') {
        queryParams.append('cuisine', filters.category);
      }
      if (filters.priceRange) queryParams.append('priceRange', filters.priceRange);

      const response = await fetch(`${API_BASE}/discovery/restaurants?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch restaurants');
      }

      const newRestaurants = data.data?.restaurants || [];
      
      if (reset) {
        setRestaurants(newRestaurants);
        setPage(2);
      } else {
        setRestaurants(prev => [...prev, ...newRestaurants]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(data.data?.pagination?.hasNextPage || false);
      
    } catch (err) {
      console.error('Fetch restaurants error:', err);
      setError('Failed to load restaurants. Please try again.');
    } finally {
      setLoading(false);

    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (activeTab === 'dishes') {
      fetchDishes(true);
    } else {
      fetchRestaurants(true);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      if (activeTab === 'dishes') {
        fetchDishes(false);
      } else {
        fetchRestaurants(false);
      }
    }
  };

  const handleLikeClick = async (dish, e) => {
    e.stopPropagation();
    
    const dishId = dish._id || dish.id;
    const isCurrentlyLiked = isInWishlist(dishId);
    
    if (!isCurrentlyLiked) {
      setAnimatingHeart(dishId);
      setTimeout(() => setAnimatingHeart(null), 600);
    }

    try {
      const result = await toggleWishlist(dish);
      
      if (result.success) {
        const message = isCurrentlyLiked 
          ? `${dish.name} removed from wishlist` 
          : `${dish.name} added to wishlist`;
        
        setWishlistMessage(message);
        setTimeout(() => setWishlistMessage(''), 3000);

        window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
          detail: { 
            action: isCurrentlyLiked ? 'remove' : 'add',
            dish: dish,
            dishId: dishId
          } 
        }));
      } else {
        setWishlistMessage(result.error || 'Failed to update wishlist');
        setTimeout(() => setWishlistMessage(''), 3000);
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      setWishlistMessage('Failed to update wishlist');
      setTimeout(() => setWishlistMessage(''), 3000);
    }
  };

  const handleAddToCart = async (dish) => {
    if (!dish || (!dish._id && !dish.id)) {
      console.error('Invalid dish object:', dish);
      alert('Error: Invalid dish data');
      return;
    }

    const dishId = dish._id || dish.id;
    
    try {
      setAddingToCart(dishId);
      const result = await addToCart(dishId, 1);
      
      if (result.success) {
        setSuccessMessage(`${dish.name} added to cart!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'add',
            dishId: dishId,
            dishName: dish.name,
            itemCount: itemCount + 1,
            totalAmount: totalAmount + dish.price,
            timestamp: Date.now()
          } 
        }));
        
      } else {
        if (result.action === 'clear_cart_required') {
          const shouldClear = window.confirm(
            `${result.error}\n\nWould you like to clear your current cart and add this item instead?`
          );
          
          if (shouldClear) {
            const clearResult = await clearCart();
            if (clearResult.success) {
              const addResult = await addToCart(dishId, 1);
              if (addResult.success) {
                setSuccessMessage(`Cart cleared and ${dish.name} added!`);
                setTimeout(() => setSuccessMessage(''), 3000);
              }
            }
          }
        } else if (result.requiresAuth) {
          const shouldLogin = window.confirm(
            `${result.error}\n\nWould you like to log in now?`
          );
          if (shouldLogin) {
            window.location.reload();
          }
        } else {
          alert(result.error || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(`Failed to add to cart: ${error.message || 'Unknown error'}`);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleOrderNow = async (dish) => {
    if (!dish || (!dish._id && !dish.id)) {
      console.error('Invalid dish object:', dish);
      alert('Error: Invalid dish data');
      return;
    }

    const dishData = {
      id: dish._id || dish.id,
      name: dish.name,
      restaurant: dish.restaurant || dish.restaurantName || 'Restaurant',
      price: dish.currentPrice || `₹${dish.price}`,
      image: dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg',
      rating: dish.rating || '4.2',
      deliveryTime: dish.deliveryTime || '25-30 min',
      category: dish.category,
      type: dish.type,
      description: dish.description || `Delicious ${dish.name}`
    };

    navigate('/address', { 
      state: { 
        item: dishData,
        fromDiscovery: true
      } 
    });
  };

  const handleDishClick = (dish) => {
    onShowDishDetails(dish._id || dish.id);
  };

  const DishCard = ({ dish }) => {
    const isBeingAdded = addingToCart === (dish._id || dish.id);
    const dishId = dish._id || dish.id;
    const isLiked = isInWishlist(dishId);
    const isAnimating = animatingHeart === dishId;
    
    // CHECK SELLER STATUS
    const isOffline = !dish.isSellerOnline || dish.sellerDashboardStatus === 'offline';
    
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border transition-all duration-200 group relative ${
        isOffline 
          ? 'opacity-60 border-red-200 dark:border-red-900' 
          : 'border-gray-100 dark:border-gray-700 hover:shadow-lg'
      }`}>
        {isBeingAdded && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-90 z-10 flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm font-medium">Adding to cart...</p>
            </div>
          </div>
        )}
        
        <div className="relative cursor-pointer" onClick={() => !isOffline && handleDishClick(dish)}>
          <img
            src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg'}
            alt={dish.name}
            className={`w-full h-48 object-cover transition-transform duration-300 ${
              isOffline ? 'grayscale' : 'group-hover:scale-105'
            }`}
            onError={(e) => {
              e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg';
            }}
          />
          
          {/* OFFLINE OVERLAY */}
          {isOffline && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <div className="text-center text-white">
                <XCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold text-lg">Restaurant Closed</p>
                <p className="text-sm mt-1">Currently unavailable</p>
              </div>
            </div>
          )}

          <div className={`absolute top-2 right-2 w-4 h-4 rounded-sm border-2 ${
            dish.type === 'veg' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'
          } flex items-center justify-center`}>
            <div className={`w-2 h-2 rounded-full ${
              dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>

          {/* STATUS BADGE */}
          <div className={`absolute bottom-2 left-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isOffline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            {isOffline ? 'Closed' : 'Open Now'}
          </div>

          {!isOffline && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                Click for details
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate flex-1 mr-2">
              {dish.name}
            </h3>
            <button
              onClick={(e) => handleLikeClick(dish, e)}
              disabled={wishlistLoading || isOffline}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                isOffline 
                  ? 'bg-gray-100 cursor-not-allowed' 
                  : isLiked 
                    ? 'bg-red-50 hover:bg-red-100' 
                    : 'bg-gray-50 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              <Heart className={`w-5 h-5 transition-all duration-200 ${
                isOffline 
                  ? 'text-gray-300' 
                  : isLiked 
                    ? 'text-red-500 fill-red-500' 
                    : 'text-gray-400'
              } ${isAnimating ? 'animate-heart-pop' : ''}`} />
              
              {isAnimating && !isOffline && (
                <>
                  <Heart className="absolute w-4 h-4 text-red-500 fill-red-500 animate-heart-float-1" />
                  <Heart className="absolute w-3 h-3 text-red-500 fill-red-500 animate-heart-float-2" />
                  <Heart className="absolute w-3 h-3 text-red-500 fill-red-500 animate-heart-float-3" />
                </>
              )}
            </button>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
            {dish.restaurant || dish.restaurantName}
          </p>

          {isOffline && (
            <div className="flex items-center space-x-1 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Restaurant dashboard offline</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 dark:text-white">
                {dish.currentPrice || `₹${dish.price}`}
              </span>
            </div>
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
              <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
              <span className="font-semibold text-green-600 dark:text-green-400">
                {dish.rating || '4.2'}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(dish);
              }}
              disabled={cartLoading || isBeingAdded || isOffline}
              className={`flex-1 flex items-center justify-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors ${
                isOffline
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300'
              }`}
            >
              {isBeingAdded ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isOffline ? 'Unavailable' : 'Add to Cart'}</span>
                </>
              )}
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOrderNow(dish);
              }}
              disabled={isBeingAdded || isOffline}
              className={`flex items-center justify-center font-medium py-2 px-3 rounded-lg transition-colors ${
                isOffline
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-400'
              }`}
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const RestaurantCard = ({ restaurant }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer hover:scale-105">
      <div className="relative">
        <img
          src={restaurant.bannerImage ? `http://localhost:5000${restaurant.bannerImage}` : 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg'}
          alt={restaurant.name}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.target.src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg';
          }}
        />
        {restaurant.isNew && (
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
            NEW
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
              {restaurant.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {restaurant.cuisine?.join(', ') || restaurant.type}
            </p>
          </div>
          {restaurant.logo && (
            <img
              src={`http://localhost:5000${restaurant.logo}`}
              alt={`${restaurant.name} logo`}
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>{restaurant.rating || '4.2'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{restaurant.deliveryTime || '25-30 min'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Truck className="w-4 h-4" />
            <span>₹{restaurant.deliveryFee || 25}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="text-sm truncate">{restaurant.address?.city}</span>
          </div>
          <span className="text-sm font-medium text-orange-600">
            {restaurant.dishCount || 0} dishes
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {wishlistMessage && (
        <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <Heart className="w-5 h-5" />
          <span className="font-medium">{wishlistMessage}</span>
        </div>
      )}

      {/* Socket Connection Status Indicator (optional - for debugging) */}
      {!connected && (
        <div className="fixed top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-xs font-medium z-50">
          Real-time updates disconnected
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Discover Food
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <form onSubmit={handleSearch} className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'dishes' ? 'Search dishes...' : 'Search restaurants...'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filters</span>
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('dishes')}
                className={`px-6 py-2 rounded-md transition-colors ${activeTab === 'dishes' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dishes
              </button>
              <button
                onClick={() => setActiveTab('restaurants')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'restaurants' 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Restaurants
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category} value={category === 'All Categories' ? '' : category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button 
                onClick={() => activeTab === 'dishes' ? fetchDishes(true) : fetchRestaurants(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!error && (
          <>
            {activeTab === 'dishes' ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {dishes.map(dish => (
                  <DishCard key={dish.id || dish._id} dish={dish} />
                ))}
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {restaurants.map(restaurant => (
                  <RestaurantCard key={restaurant.id || restaurant._id} restaurant={restaurant} />
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  Loading {activeTab}...
                </span>
              </div>
            )}

            {!loading && (activeTab === 'dishes' ? dishes.length === 0 : restaurants.length === 0) && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  No {activeTab} found
                </h3>
                <p className="text-gray-400 dark:text-gray-500">
                  Try adjusting your search or filters
                </p>
              </div>
            )}

            {!loading && hasMore && (activeTab === 'dishes' ? dishes.length > 0 : restaurants.length > 0) && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        @keyframes heart-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .animate-heart-pop {
          animation: heart-pop 0.6s ease-out;
        }

        @keyframes heart-float-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-20px, -30px) scale(0.5); opacity: 0; }
        }

        @keyframes heart-float-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(20px, -25px) scale(0.3); opacity: 0; }
        }

        @keyframes heart-float-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, -35px) scale(0.4); opacity: 0; }
        }

        .animate-heart-float-1 {
          animation: heart-float-1 0.8s ease-out;
        }

        .animate-heart-float-2 {
          animation: heart-float-2 0.9s ease-out;
        }

        .animate-heart-float-3 {
          animation: heart-float-3 0.7s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default DiscoveryPage;