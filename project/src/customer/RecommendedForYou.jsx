import React, { useState, useEffect } from 'react';
import { Heart, Plus, Star, Sparkles, Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

const API_BASE = 'http://localhost:5000/api';

const RecommendedForYou = ({ onNavigateToCart }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [addingToCart, setAddingToCart] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(null);
  
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/recommendations/personalized?limit=8`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (response.ok && data.success) {
            const transformed = data.recommendations.map(dish => ({
              id: dish._id,
              name: dish.name,
              description: dish.description,
              restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
              restaurantId: dish.seller?._id,
              image: dish.image,
              price: dish.price,
              currentPrice: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date() 
                ? Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) 
                : dish.price,
              rating: dish.rating?.average || 4.2,
              reason: dish.recommendationReason || 'Recommended for you',
              category: dish.category,
              type: dish.type,
              tags: dish.tags || [],
              recommendationScore: dish.recommendationScore || 0.8
            }));

            setRecommendations(transformed);
            setIsPersonalized(true);
            console.log('✅ Loaded personalized recommendations:', data.strategies);
            return;
          }
        } catch (personalizedError) {
          console.log('Personalized recommendations not available, falling back to popular dishes');
        }
      }

      const response = await fetch(`${API_BASE}/discovery/dishes/recommended?limit=8`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      setRecommendations(data.dishes || []);
      setIsPersonalized(false);

    } catch (err) {
      console.error('Fetch recommendations error:', err);
      setError('Unable to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeClick = async (dish, e) => {
    e.stopPropagation();
    
    try {
      await toggleWishlist(dish);
      trackBehavior('wishlist_add', dish.id);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleAddToCart = async (dish) => {
    try {
      setAddingToCart(dish.id);
      const result = await addToCart(dish.id, 1);
      
      if (result.success) {
        trackBehavior('add_to_cart', dish.id);
        console.log(`${dish.name} added to cart!`);
        
        setShowSuccessMessage({
          dishName: dish.name,
          timestamp: Date.now()
        });
        
      } else {
        if (result.action === 'clear_cart_required') {
          const confirmClear = window.confirm(
            'Your cart contains items from a different restaurant. Would you like to clear your cart and add this item?'
          );
          if (confirmClear) {
            console.log('User wants to clear cart - implement clearCart functionality in your CartContext');
          }
        } else {
          console.error('Add to cart failed:', result.error);
          alert(result.error || 'Failed to add item to cart');
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert('Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleGoToCart = () => {
    setShowSuccessMessage(null);
    if (onNavigateToCart) {
      onNavigateToCart();
    }
  };

  const trackBehavior = async (action, dishId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_BASE}/recommendations/behavior`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, dishId })
      });
    } catch (error) {
      console.log('Behavior tracking failed:', error);
    }
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
                onClick={fetchRecommendations}
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
    <section className="py-8 bg-white dark:bg-gray-900 relative">
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Notification */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-sm animate-slideIn">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {showSuccessMessage.dishName} added to cart!
                </p>
              </div>
              <button
                onClick={handleGoToCart}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium transition-colors flex-shrink-0"
              >
                View Cart
              </button>
              <button
                onClick={() => setShowSuccessMessage(null)}
                className="text-green-200 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isPersonalized ? 'Personalized for You' : 'Recommended for You'}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isPersonalized 
                ? 'Curated based on your taste and preferences' 
                : 'Popular dishes you might love'}
            </p>
          </div>
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
            {recommendations.map(item => {
              const dishId = item.id || item._id;
              const isLiked = isInWishlist(dishId);
              const isAddingThisItem = addingToCart === dishId;
              
              return (
                <div
                  key={dishId}
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
                      onClick={(e) => handleLikeClick(item, e)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isLiked
                          ? 'bg-red-500 text-white' 
                          : 'bg-white bg-opacity-80 text-gray-600 hover:bg-red-500 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>

                    {isPersonalized && (
                      <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Pick
                      </div>
                    )}

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
                          ₹{item.currentPrice || item.price}
                        </span>
                        {item.currentPrice && item.currentPrice !== item.price && (
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

                    {isPersonalized && item.reason && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-3 italic line-clamp-2">
                        {item.reason}
                      </p>
                    )}

                    <button 
                      onClick={() => handleAddToCart(item)}
                      disabled={isAddingThisItem}
                      className={`w-full flex items-center justify-center space-x-2 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 ${
                        isAddingThisItem
                          ? 'bg-green-500 text-white cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {isAddingThisItem ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedForYou;