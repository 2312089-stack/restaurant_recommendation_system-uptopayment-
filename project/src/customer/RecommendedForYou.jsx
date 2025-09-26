import React, { useState, useEffect } from 'react';
import { Heart, Plus, Star, Sparkles, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const RecommendedForYou = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wishlist, setWishlist] = useState(new Set());

  // Fetch recommended dishes
  useEffect(() => {
    const fetchRecommendedDishes = async () => {
      try {
        setLoading(true);
        setError('');
        
        const queryParams = new URLSearchParams({
          limit: '8'
        });
        
        // TODO: Add userId from auth context when available
        // if (userId) queryParams.append('userId', userId);

        const response = await fetch(`${API_BASE}/discovery/dishes/recommended?${queryParams}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch recommended dishes');
        }

        setRecommendations(data.dishes || []);
      } catch (err) {
        console.error('Fetch recommended dishes error:', err);
        setError('Unable to load recommendations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedDishes();
  }, []);

  const toggleWishlist = (dishId) => {
    setWishlist(prev => {
      const newWishlist = new Set(prev);
      if (newWishlist.has(dishId)) {
        newWishlist.delete(dishId);
      } else {
        newWishlist.add(dishId);
      }
      return newWishlist;
    });
    
    // TODO: Sync with backend when user auth is implemented
    console.log('Toggle wishlist for dish:', dishId);
  };

  const handleAddToCart = (dish) => {
    console.log('Add to cart:', dish.name);
    // TODO: Implement add to cart functionality
  };

  const handleCustomizePreferences = () => {
    console.log('Customize preferences clicked');
    // TODO: Navigate to preferences page
  };

  if (loading) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recommendations...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Unable to load recommendations
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Recommended for You
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Curated based on your taste and preferences
            </p>
          </div>
          <button 
            onClick={handleCustomizePreferences}
            className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            Customize Preferences
          </button>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
              No recommendations yet
            </h3>
            <p className="text-gray-400 dark:text-gray-500">
              Start ordering to get personalized recommendations!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group hover:scale-105"
              >
                <div className="relative">
                  <img
                    src={item.image ? `http://localhost:5000${item.image}` : 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1'}
                    alt={item.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1';
                    }}
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(item.id);
                    }}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      wishlist.has(item.id)
                        ? 'bg-red-500 text-white' 
                        : 'bg-white bg-opacity-80 text-gray-600 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlist.has(item.id) ? 'fill-current' : ''}`} />
                  </button>

                  <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Pick
                  </div>

                  <div className={`absolute top-3 left-3 w-4 h-4 rounded-sm border-2 ${
                    item.type === 'veg' 
                      ? 'border-green-500 bg-white' 
                      : 'border-red-500 bg-white'
                  } flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                    {item.restaurant}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags?.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {item.currentPrice || `₹${item.price}`}
                      </span>
                      {item.currentPrice && item.currentPrice !== `₹${item.price}` && (
                        <span className="text-gray-400 line-through text-sm">
                          ₹{item.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {item.rating}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-3 italic">
                    {item.reason}
                  </p>

                  <button 
                    onClick={() => handleAddToCart(item)}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedForYou;