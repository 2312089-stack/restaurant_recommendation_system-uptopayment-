// customer/RecentlyViewed.jsx - Recently viewed dishes with direct checkout
import React, { useEffect, useState } from 'react';
import { Clock, Star, Plus, X, Loader2 } from 'lucide-react';
import { useViewHistory } from '../contexts/ViewHistoryContext';
import { useNavigate } from 'react-router-dom';

const RecentlyViewed = () => {
  const navigate = useNavigate();
  const { recentlyViewed, loadRecentlyViewed, clearRecentlyViewed, loading } = useViewHistory();
  const [processingOrder, setProcessingOrder] = useState(null);

  // Check authentication
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return Boolean(token);
  };

  useEffect(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  const handleClearHistory = async () => {
    if (window.confirm('Clear your viewing history?')) {
      await clearRecentlyViewed();
    }
  };

  // ✅ NEW: Handle "View Again" - Navigate directly to address page
  const handleViewAgain = async (dish) => {
    // Check authentication first
    if (!isAuthenticated()) {
      alert('Please log in to order this dish');
      navigate('/login');
      return;
    }

    setProcessingOrder(dish._id);

    try {
      console.log('🔄 Processing order for recently viewed:', dish.name);
      
      // Prepare item data for checkout
      const orderItem = {
        _id: dish._id,
        dishId: dish._id,
        id: dish._id,
        name: dish.name,
        price: `₹${dish.price}`,
        originalPrice: dish.price,
        image: dish.image,
        restaurant: dish.restaurantName || dish.restaurant || 'Restaurant',
        category: dish.category || 'Food',
        type: dish.type || 'veg',
        quantity: 1,
        rating: dish.rating?.average || dish.rating || 4.2,
        description: dish.description || `Delicious ${dish.name}`
      };

      console.log('📦 Prepared order item:', orderItem);

      // Navigate directly to address page with item data
      // Flow: Address → Order Summary → Payment → Payment Success
      navigate('/address', {
        state: {
          item: orderItem,
          orderType: 'single',
          fromCart: false,
          fromRecentlyViewed: true
        }
      });

    } catch (err) {
      console.error('❌ Error processing order:', err);
      alert(err.message || 'Failed to process order');
    } finally {
      setProcessingOrder(null);
    }
  };

  if (loading && recentlyViewed.length === 0) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!recentlyViewed || recentlyViewed.length === 0) {
    return null; // Don't show section if no history
  }

  return (
    <section className="py-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Recently Viewed
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Continue exploring where you left off
            </p>
          </div>
          
          {recentlyViewed.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentlyViewed.slice(0, 8).map((dish) => {
            const isProcessing = processingOrder === dish._id;
            
            return (
              <div
                key={dish._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative"
              >
                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-orange-500 bg-opacity-90 z-20 flex items-center justify-center rounded-xl">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Processing order...</p>
                    </div>
                  </div>
                )}

                {/* Recently Viewed Badge */}
                <div className="absolute top-3 left-3 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Recently Viewed
                </div>

                {/* Image */}
                <div className="relative cursor-pointer" onClick={() => !isProcessing && handleViewAgain(dish)}>
                  <img
                    src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
                    alt={dish.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                    }}
                  />

                  {/* Time ago badge */}
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                    {getTimeAgo(dish.viewedAt)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {dish.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {dish.restaurantName || 'Restaurant'}
                  </p>

                  {/* Price and Rating */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{dish.price}
                    </span>
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {dish.rating?.average?.toFixed(1) || '4.2'}
                      </span>
                    </div>
                  </div>

                  {/* Order Again Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAgain(dish);
                    }}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform ${
                      isProcessing
                        ? 'bg-orange-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:-translate-y-1'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Helper function to format time ago
const getTimeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  
  const now = new Date();
  const viewed = new Date(dateString);
  const diffMs = now - viewed;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return 'A week ago';
};

export default RecentlyViewed;