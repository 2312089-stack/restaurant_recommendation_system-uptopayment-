import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Clock, 
  Truck, 
  Plus, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Grid3X3,
  List,
  SlidersHorizontal,
  X,
  ShoppingCart,
  Zap,
  ChevronRight,
  Heart,
  CheckCircle
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const API_BASE = 'http://localhost:5000/api';

const DiscoveryPage = ({ onBack, onShowDishDetails }) => {
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
  
  // Modal state for dish details
  const [selectedDish, setSelectedDish] = useState(null);
  const [showDishModal, setShowDishModal] = useState(false);
  
  // Data states
  const [dishes, setDishes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Cart integration
const { addToCart, loading: cartLoading, itemCount, totalAmount, clearCart } = useCart();

  // Success message state
  const [successMessage, setSuccessMessage] = useState('');
  const [addingToCart, setAddingToCart] = useState(null); // Track which item is being added

  // Categories for filter dropdown
  const categories = [
    'All Categories',
    'Starters',
    'Main Course', 
    'Desserts',
    'Beverages',
    'Chinese',
    'Indian',
    'Continental',
    'South Indian'
  ];

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
      
      if (searchQuery.trim()) {
        queryParams.append('q', searchQuery.trim());
      }
      
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.category && filters.category !== 'All Categories') {
        queryParams.append('category', filters.category);
      }
      if (filters.type) queryParams.append('type', filters.type);

      const endpoint = searchQuery.trim() 
        ? '/discovery/search' 
        : '/discovery/dishes/popular';
      
      const response = await fetch(`${API_BASE}${endpoint}?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dishes');
      }

      const newDishes = searchQuery.trim() ? data.results : data.dishes;
      
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
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
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

  // Enhanced add to cart with visual feedback
const handleAddToCart = async (dish) => {
  if (!dish || (!dish._id && !dish.id)) {
    console.error('Invalid dish object:', dish);
    alert('Error: Invalid dish data');
    return;
  }

  const dishId = dish._id || dish.id;
  
  try {
    setAddingToCart(dishId);
    console.log('Adding to cart from discovery page:', {
      dishId,
      dishName: dish.name,
      price: dish.price
    });
    
    // Clear any previous cart errors
    clearError && clearError();
    
    const result = await addToCart(dishId, 1);
    
    if (result.success) {
      // Show success message
      setSuccessMessage(`${dish.name} added to cart!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      console.log('Cart updated successfully, triggering header refresh');
      
      // Trigger header update event with detailed information
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
      // Handle different error scenarios
      if (result.action === 'clear_cart_required') {
        const shouldClear = window.confirm(
          `${result.error}\n\nWould you like to clear your current cart and add this item instead?`
        );
        
        if (shouldClear) {
          try {
            // Clear cart first, then add item
            const clearResult = await clearCart();
            if (clearResult.success) {
              const addResult = await addToCart(dishId, 1);
              if (addResult.success) {
                setSuccessMessage(`Cart cleared and ${dish.name} added!`);
                setTimeout(() => setSuccessMessage(''), 3000);
                
                window.dispatchEvent(new CustomEvent('cartUpdated', { 
                  detail: { 
                    action: 'replace',
                    dishId: dishId,
                    dishName: dish.name,
                    itemCount: 1,
                    totalAmount: dish.price,
                    timestamp: Date.now()
                  } 
                }));
              } else {
                throw new Error(addResult.error || 'Failed to add item after clearing cart');
              }
            } else {
              throw new Error(clearResult.error || 'Failed to clear cart');
            }
          } catch (clearError) {
            console.error('Error during cart clear and add:', clearError);
            alert(`Failed to clear cart and add item: ${clearError.message}`);
          }
        }
      } else if (result.requiresAuth) {
        // Handle authentication required
        const shouldLogin = window.confirm(
          `${result.error}\n\nWould you like to log in now?`
        );
        if (shouldLogin) {
          // Redirect to login or trigger login modal
          window.location.reload(); // This will trigger the login flow
        }
      } else {
        // Show generic error
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

  // Handle order now
 const handleOrderNow = async (dish) => {
  if (!dish || (!dish._id && !dish.id)) {
    console.error('Invalid dish object:', dish);
    alert('Error: Invalid dish data');
    return;
  }

  const dishId = dish._id || dish.id;
  
  try {
    setAddingToCart(dishId);
    
    // Clear any previous cart errors
    clearError && clearError();
    
    const result = await addToCart(dishId, 1);
    
    if (result.success) {
      // Navigate to order flow immediately
      console.log('Item added, navigating to order summary');
      window.location.href = '/order-summary';
    } else {
      // If cart has different restaurant items, offer to clear
      if (result.action === 'clear_cart_required') {
        const shouldClear = window.confirm(
          `${result.error}\n\nWould you like to clear your cart and order this item?`
        );
        
        if (shouldClear) {
          try {
            const clearResult = await clearCart();
            if (clearResult.success) {
              const addResult = await addToCart(dishId, 1);
              if (addResult.success) {
                window.location.href = '/order-summary';
              } else {
                throw new Error(addResult.error || 'Failed to add item after clearing cart');
              }
            } else {
              throw new Error(clearResult.error || 'Failed to clear cart');
            }
          } catch (clearError) {
            console.error('Error during clear and order:', clearError);
            alert(`Failed to process order: ${clearError.message}`);
          }
        }
      } else if (result.requiresAuth) {
        // Handle authentication required
        const shouldLogin = window.confirm(
          `${result.error}\n\nWould you like to log in to place your order?`
        );
        if (shouldLogin) {
          // Redirect to login
          window.location.reload();
        }
      } else {
        alert(result.error || 'Failed to process order');
      }
    }
  } catch (error) {
    console.error('Order now error:', error);
    // Show error but allow fallback navigation for better UX
    if (window.confirm(`Error adding to cart: ${error.message}\n\nWould you like to continue to order page anyway?`)) {
      window.location.href = '/order-summary';
    }
  } finally {
    setAddingToCart(null);
  }
};

  // Handle dish image click to show details
  const handleDishClick = (dish) => {
    // Navigate to dish details page instead of showing modal
    onShowDishDetails(dish._id || dish.id);
  };

  const DishCard = ({ dish }) => {
    const isBeingAdded = addingToCart === (dish._id || dish.id);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative">
        {/* Success overlay */}
        {isBeingAdded && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-90 z-10 flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm font-medium">Adding to cart...</p>
            </div>
          </div>
        )}
        
        <div className="relative cursor-pointer" onClick={() => handleDishClick(dish)}>
          <img
            src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
            alt={dish.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
            }}
          />
          <div className={`absolute top-2 right-2 w-4 h-4 rounded-sm border-2 ${
            dish.type === 'veg' 
              ? 'border-green-500 bg-white' 
              : 'border-red-500 bg-white'
          } flex items-center justify-center`}>
            <div className={`w-2 h-2 rounded-full ${
              dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
          {dish.offer && (
            <div className="absolute bottom-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
              {dish.offer}
            </div>
          )}
          {/* Click to view overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium text-gray-900 dark:text-white">
              Click for details
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 truncate">
            {dish.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
            {dish.restaurant || dish.restaurantName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 line-clamp-2">
            {dish.category}
          </p>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 dark:text-white">
                {dish.currentPrice || `₹${dish.price}`}
              </span>
              {dish.currentPrice !== `₹${dish.price}` && dish.currentPrice && (
                <span className="text-gray-400 line-through text-xs">
                  ₹{dish.price}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
              <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
              <span className="font-semibold text-green-600 dark:text-green-400">
                {dish.rating || '4.2'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{dish.deliveryTime || '25-30 min'}</span>
            </div>
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <Truck className="w-4 h-4" />
              <span className="text-sm font-medium">
                {dish.distance || '1.2 km'}
              </span>
            </div>
          </div>

          {/* Enhanced Split Button with Loading States */}
          <div className="mt-3 flex">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(dish);
              }}
              disabled={cartLoading || isBeingAdded}
              className="flex-1 flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 px-4 rounded-l-lg transition-colors duration-200 relative overflow-hidden"
            >
              {isBeingAdded ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleOrderNow(dish);
              }}
              disabled={isBeingAdded}
              className="flex items-center justify-center bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-2 px-3 rounded-r-lg border-l border-orange-400 transition-colors duration-200"
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
          src={restaurant.bannerImage ? `http://localhost:5000${restaurant.bannerImage}` : 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&dpr=1'}
          alt={restaurant.name}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.target.src = 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&dpr=1';
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
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Header */}
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

          {/* Search and Tabs */}
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

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('dishes')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'dishes' 
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

          {/* Filters */}
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

                {activeTab === 'dishes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">All Types</option>
                      <option value="veg">Vegetarian</option>
                      <option value="non-veg">Non-Vegetarian</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="rating">Rating</option>
                    <option value="price">Price</option>
                    <option value="deliveryTime">Delivery Time</option>
                    <option value="distance">Distance</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
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
            {/* Results Grid */}
            {activeTab === 'dishes' ? (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {dishes.map(dish => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {restaurants.map(restaurant => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  Loading {activeTab}...
                </span>
              </div>
            )}

            {/* Empty State */}
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

            {/* Load More Button */}
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

      {/* Custom Styles for Animations */}
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
      `}</style>
    </div>
  );
};

export default DiscoveryPage;