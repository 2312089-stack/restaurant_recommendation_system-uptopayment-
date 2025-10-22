import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Heart, Star, Loader2, AlertCircle, ShoppingCart } from 'lucide-react';

const ReorderFavorites = ({ onNavigateToLogin, onNavigateToDiscovery, onNavigateToOrderHistory }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);

  const API_BASE = 'http://localhost:5000/api';

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return Boolean(token);
  };

  // Fetch reorder history from backend
  useEffect(() => {
    const fetchReorderHistory = async () => {
      if (!isAuthenticated()) {
        console.log('User not authenticated, skipping reorder history fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        console.log('🔄 Fetching reorder history...');
        
        const response = await fetch(`${API_BASE}/reorder/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('✅ Reorder history response:', data);

        if (data.success) {
          setFavorites(data.dishes || []);
        } else {
          throw new Error(data.error || 'Failed to fetch order history');
        }
      } catch (err) {
        console.error('❌ Error fetching reorder history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReorderHistory();
  }, []);

  // Handle reorder - Navigate directly to address page
  const handleReorder = async (item) => {
    if (!isAuthenticated()) {
      alert('Please log in to reorder');
      if (onNavigateToLogin) onNavigateToLogin();
      return;
    }

    if (!item.isAvailable) {
      alert('This dish is currently unavailable');
      return;
    }

    setAddingToCart(item._id);

    try {
      console.log('🔄 Starting reorder for:', item.name);
      
      // Prepare item data for checkout
      const orderItem = {
        _id: item._id,
        dishId: item._id,
        id: item._id,
        name: item.name,
        price: `₹${item.price}`,
        originalPrice: item.price,
        image: item.image,
        restaurant: item.restaurantName || item.seller?.businessName || 'Restaurant',
        category: item.category || 'Food',
        type: item.type || 'veg',
        quantity: 1
      };

      console.log('📦 Prepared order item:', orderItem);

      // Navigate directly to address page with item data
      navigate('/address', {
        state: {
          item: orderItem,
          orderType: 'single',
          fromCart: false
        }
      });

    } catch (err) {
      console.error('❌ Error processing reorder:', err);
      alert(err.message || 'Failed to process reorder');
      setAddingToCart(null);
    }
  };

  // Get image URL helper
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // Loading State
  if (loading) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading your favorites...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error State
  if (error) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Empty State - Not Authenticated
  if (!isAuthenticated()) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Login to See Your Favorites</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Sign in to view and reorder your previously ordered dishes</p>
            <button
              onClick={() => onNavigateToLogin && onNavigateToLogin()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Login Now
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Empty State - No Order History
  if (favorites.length === 0) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Order History Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start ordering to see your favorites here!</p>
            <button
              onClick={() => onNavigateToDiscovery && onNavigateToDiscovery()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Explore Dishes
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Main Reorder Section with Data
  return (
    <section className="py-8 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reorder Your Favorites</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Your go-to dishes, just one click away</p>
          </div>
          <button 
            onClick={() => onNavigateToOrderHistory && onNavigateToOrderHistory()}
            className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 font-semibold transition-colors"
          >
            View All
          </button>
        </div>
        
        {/* Horizontal Scrollable Container */}
        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-4 w-max">
            {favorites.map(item => (
              <div 
                key={item._id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-700 w-64 flex-shrink-0"
              >
                <div className="relative">
                  <img 
                    src={getImageUrl(item.image)} 
                    alt={item.name} 
                    className="w-full h-40 object-cover rounded-t-xl"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 px-2 py-1 rounded-lg text-xs font-semibold flex items-center">
                    <Heart className="w-3 h-3 mr-1 text-red-500 fill-current" />
                    <span className="text-gray-900 dark:text-white">{item.totalOrders || 1}</span>
                  </div>
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-xl flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">Unavailable</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.restaurantName || item.seller?.businessName || 'Restaurant'}</p>
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {typeof item.rating === 'object' ? (item.rating?.average || 4.5) : (item.rating || 4.5)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-900 dark:text-white">₹{item.price}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Last: {item.lastOrderedText || 'Recently'}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleReorder(item)}
                    disabled={!item.isAvailable || addingToCart === item._id}
                    className={`w-full flex items-center justify-center space-x-2 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 ${
                      !item.isAvailable 
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : addingToCart === item._id
                          ? 'bg-orange-400 text-white cursor-wait'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {addingToCart === item._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Reorder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReorderFavorites;