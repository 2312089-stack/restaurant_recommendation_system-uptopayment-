// customer/RecentlyViewed.jsx - Recently viewed dishes section
import React, { useEffect } from 'react';
import { Clock, Star, Plus, TrendingUp, X } from 'lucide-react';
import { useViewHistory } from '../contexts/ViewHistoryContext';
import { useNavigate } from 'react-router-dom';

const RecentlyViewed = () => {
  const navigate = useNavigate();
  const { recentlyViewed, loadRecentlyViewed, clearRecentlyViewed, loading } = useViewHistory();

  useEffect(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  const handleDishClick = (dishId) => {
    navigate(`/dish/${dishId}`);
  };

  const handleClearHistory = async () => {
    if (window.confirm('Clear your viewing history?')) {
      await clearRecentlyViewed();
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

        {/* Dishes Grid - Matching your design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentlyViewed.slice(0, 8).map((dish, index) => (
            <div
              key={dish._id}
              onClick={() => handleDishClick(dish._id)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group cursor-pointer hover:scale-105"
            >
              {/* Recently Viewed Badge */}
              <div className="absolute top-3 left-3 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Recently Viewed
              </div>

              {/* Image */}
              <div className="relative">
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

                {/* View Again Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDishClick(dish._id);
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:-translate-y-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>View Again</span>
                </button>
              </div>
            </div>
          ))}
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