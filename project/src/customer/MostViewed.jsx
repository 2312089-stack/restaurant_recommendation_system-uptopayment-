// customer/MostViewed.jsx - Most viewed dishes matching your design
import React, { useEffect } from 'react';
import { Eye, Star, Plus, TrendingUp } from 'lucide-react';
import { useViewHistory } from '../contexts/ViewHistoryContext';
import { useLocation } from '../contexts/LocationContext';
import { useNavigate } from 'react-router-dom';

const MostViewed = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { mostViewed, loadMostViewed, loading } = useViewHistory();

  useEffect(() => {
    loadMostViewed({
      limit: 4,
      days: 7,
      city: location.city || ''
    });
  }, [location.city, loadMostViewed]);

  const handleDishClick = (dishId) => {
    navigate(`/dish/${dishId}`);
  };

  const getRankBadge = (index) => {
    const rank = index + 1;
    const colors = {
      1: 'bg-yellow-500 text-white',  // Gold
      2: 'bg-gray-400 text-white',    // Silver
      3: 'bg-amber-600 text-white',   // Bronze
      4: 'bg-orange-500 text-white'   // Orange
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
          </div>
        </div>
      </section>
    );
  }

  if (!mostViewed || mostViewed.length === 0) {
    return null;
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

        {/* Dishes Grid - EXACTLY matching your design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mostViewed.slice(0, 4).map((dish, index) => (
            <div
              key={dish._id}
              onClick={() => handleDishClick(dish._id)}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative cursor-pointer hover:scale-105"
            >
              {/* Rank Badge - exactly like your design */}
              {getRankBadge(index)}

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

                {/* Hot Badge - top right like your design */}
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Hot
                </div>

                {/* View count badge - bottom left like your design */}
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                  {dish.viewStats?.totalViews || 0} views this week
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                  {dish.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {dish.restaurantName || 'Restaurant'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {dish.description || `Delicious ${dish.name}`}
                </p>

                {/* Price and Rating */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{dish.price}
                  </span>
                  <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                    <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {dish.rating?.average?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>

                {/* Try Trending Button - exactly like your design */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDishClick(dish._id);
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:-translate-y-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Try Trending</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MostViewed;