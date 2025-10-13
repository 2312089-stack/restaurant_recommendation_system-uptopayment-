// customer/TrendingInCity.jsx - Real trending dishes based on actual data
import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Plus, Star, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

const TrendingInCity = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [trendingDishes, setTrendingDishes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrendingDishes();
  }, [location.city]);

  const fetchTrendingDishes = async () => {
    try {
      setLoading(true);
      setError('');

      // Use user's actual city if available, otherwise get all trending
      const city = location.city || '';
      const response = await fetch(
        `${API_BASE}/trending/city?city=${encodeURIComponent(city)}&limit=5&days=7&minOrders=1`
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trending dishes');
      }

      setTrendingDishes(data.trending || []);
      setStats(data.stats || null);

    } catch (err) {
      console.error('Fetch trending dishes error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900';
      case 2:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
      case 3:
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900';
      default:
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900';
    }
  };

  const handleDishClick = (dish) => {
    if (dish._id) {
      // Navigate to dish details page
      navigate(`/dish/${dish._id}`, {
        state: { 
          from: '/',
          dishId: dish._id 
        }
      });
    }
  };

  if (loading) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading trending dishes...
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-6 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Failed to load trending dishes
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!trendingDishes || trendingDishes.length === 0) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Flame className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              No trending dishes yet
            </h3>
            <p className="text-gray-400">
              Check back later for popular items in your area
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Flame className="w-6 h-6 text-red-500" />
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trending in Your City
              </h2>
            </div>
            <div className="flex items-center space-x-2 mt-1 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <p>
                {location.city ? `Most popular in ${location.city}` : 'Most popular dishes'} this week
              </p>
            </div>
          </div>
        </div>

        {/* Trending Dishes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {trendingDishes.map(dish => (
            <div 
              key={dish._id}
              onClick={() => handleDishClick(dish)}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative cursor-pointer hover:scale-105"
            >
              {/* Rank Badge */}
              <div className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankColor(dish.trendRank)}`}>
                #{dish.trendRank}
              </div>
              
              {/* Image */}
              <div className="relative">
                <img
                  src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
                  alt={dish.name}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                  }}
                />
                
                {/* Hot Badge */}
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Hot
                </div>
                
                {/* Orders Count */}
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                  {dish.recentOrders || dish.ordersThisWeek || 0} orders this week
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                  {dish.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {dish.restaurantName || dish.restaurant || 'Restaurant'}
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
                      {dish.recentAvgRating?.toFixed(1) || dish.rating?.average?.toFixed(1) || '4.2'}
                    </span>
                  </div>
                </div>

                {/* Add Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDishClick(dish);
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

        {/* Statistics Card */}
        {stats && (
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              This Week's Food Trends
              {stats.city && stats.city !== 'all cities' && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  in {stats.city}
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {stats.totalOrders > 1000 
                    ? `${(stats.totalOrders / 1000).toFixed(1)}k+` 
                    : `${stats.totalOrders}+`
                  }
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats.growthRate > 0 ? '+' : ''}{stats.growthRate}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {stats.totalDishes}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Trending Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {stats.avgRating}⭐
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingInCity;