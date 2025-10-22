// customer/MostViewed.jsx - Most viewed dishes with direct checkout flow
import React, { useEffect, useState } from 'react';
import { Eye, Star, Plus, TrendingUp, Loader2 } from 'lucide-react';
import { useViewHistory } from '../contexts/ViewHistoryContext';
import { useLocation } from '../contexts/LocationContext';
import { useNavigate } from 'react-router-dom';

const MostViewed = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { mostViewed, loadMostViewed, loading } = useViewHistory();
  const [processingOrder, setProcessingOrder] = useState(null);

  // Check authentication
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return Boolean(token);
  };

  useEffect(() => {
    loadMostViewed({
      limit: 4,
      days: 7,
      city: location.city || ''
    });
  }, [location.city, loadMostViewed]);

  // ✅ Handle "Try Trending" - Navigate directly to address page for checkout
  const handleTryTrending = async (dish) => {
    // Check authentication first
    if (!isAuthenticated()) {
      alert('Please log in to order this dish');
      navigate('/login');
      return;
    }

    setProcessingOrder(dish._id);

    try {
      console.log('🔥 Processing order for trending dish:', dish.name);
      
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
        description: dish.description || `Delicious ${dish.name}`,
        isTrending: true,
        viewStats: dish.viewStats
      };

      console.log('📦 Prepared order item:', orderItem);

      // Navigate directly to address page
      // Flow: Address → Order Summary → Payment → Payment Success
      navigate('/address', {
        state: {
          item: orderItem,
          orderType: 'single',
          fromCart: false,
          fromTrending: true
        }
      });

    } catch (err) {
      console.error('❌ Error processing order:', err);
      alert(err.message || 'Failed to process order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const getRankBadge = (index) => {
    const rank = index + 1;
    const colors = {
      1: 'bg-yellow-500 text-white',  // Gold - #1
      2: 'bg-gray-400 text-white',    // Silver - #2
      3: 'bg-amber-600 text-white',   // Bronze - #3
      4: 'bg-orange-500 text-white'   // Orange - #4
    };
    
    return (
      <div className={`absolute top-3 left-3 z-10 w-10 h-10 rounded-full ${colors[rank] || colors[4]} flex items-center justify-center font-bold text-lg shadow-lg`}>
        #{rank}
      </div>
    );
  };

  if (loading && mostViewed.length === 0) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading trending dishes...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!mostViewed || mostViewed.length === 0) {
    return null; // Don't show section if no data
  }

  return (
    <section className="py-8 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Eye className="w-6 h-6 text-blue-500" />
              <TrendingUp className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Most Viewed This Week
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {location.city ? `Popular in ${location.city}` : 'What everyone is checking out'}
            </p>
          </div>
        </div>

        {/* Dishes Grid - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mostViewed.slice(0, 4).map((dish, index) => {
            const isProcessing = processingOrder === dish._id;
            
            return (
              <div
                key={dish._id}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative"
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

                {/* Rank Badge - Top Left */}
                {getRankBadge(index)}

                {/* Image Section */}
                <div 
                  className="relative cursor-pointer" 
                  onClick={() => !isProcessing && handleTryTrending(dish)}
                >
                  <img
                    src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
                    alt={dish.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                    }}
                  />

                  {/* Hot Badge - Top Right */}
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center shadow-lg">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Hot
                  </div>

                  {/* View Count Badge - Bottom Left */}
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                    {dish.viewStats?.totalViews || 0} views this week
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                </div>

                {/* Content Section */}
                <div className="p-4">
                  {/* Dish Name */}
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {dish.name}
                  </h3>

                  {/* Restaurant Name */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {dish.restaurantName || 'Restaurant'}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {dish.description || `Delicious ${dish.name}`}
                  </p>

                  {/* Price and Rating */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      ₹{dish.price}
                    </span>
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {dish.rating?.average?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>

                  {/* Try Trending Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTryTrending(dish);
                    }}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform shadow-md ${
                      isProcessing
                        ? 'bg-orange-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:-translate-y-1 hover:shadow-lg'
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
                        <span>Try Trending</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
};

export default MostViewed;