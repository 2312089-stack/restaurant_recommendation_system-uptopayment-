import React, { useState } from 'react';
import { Heart, Plus, Star, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { resolveImageUrl } from '../config/api.js';
import { useDishFeed } from '../hooks/useDishFeed.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=400';

const RecommendedForYou = () => {
  const { dishes, loading, error } = useDishFeed('/dishes/recommended', { limit: 4 });
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [busyId, setBusyId] = useState(null);

  const notify = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleLike = async (dish) => {
    const id = dish._id || dish.id;
    const wasLiked = isInWishlist(id);
    const result = await toggleWishlist(dish);
    if (result.success) {
      notify(`${dish.name} ${wasLiked ? 'removed from' : 'added to'} wishlist`);
    } else {
      notify(result.error || 'Failed to update wishlist', 'error');
    }
  };

  const handleAddToCart = async (dish) => {
    const id = dish._id || dish.id;
    setBusyId(id);
    const result = await addToCart(id, 1);
    setBusyId(null);

    if (result.success) {
      notify(`${dish.name} added to cart`);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { action: 'add' } }));
    } else {
      notify(result.error || 'Failed to add to cart', 'error');
    }
  };

  return (
    <section className="py-8 bg-white dark:bg-gray-900 relative">
      {message && (
        <div
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 text-white ${
            messageType === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {messageType === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-medium">{message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recommended for You</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Curated based on your taste and preferences</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-3">Loading recommendations...</span>
          </div>
        )}

        {!loading && error && <div className="text-center py-10 text-red-500">{error}</div>}

        {!loading && !error && dishes.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No recommendations available yet.
          </div>
        )}

        {!loading && !error && dishes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map((dish) => {
              const id = dish._id || dish.id;
              const liked = isInWishlist(id);
              const isBusy = busyId === id;

              return (
                <div
                  key={id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group"
                >
                  <div className="relative">
                    <img
                      src={resolveImageUrl(dish.image, FALLBACK_IMAGE)}
                      alt={dish.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = FALLBACK_IMAGE;
                      }}
                    />
                    <button
                      onClick={() => toggleLike(dish)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        liked
                          ? 'bg-red-500 text-white'
                          : 'bg-white bg-opacity-80 text-gray-600 hover:bg-red-500 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Pick
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{dish.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">{dish.restaurant}</p>

                    {Array.isArray(dish.tags) && dish.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {dish.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900 dark:text-white">
                        ₹{dish.currentPrice || dish.price}
                      </span>
                      <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                        <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{dish.rating}</span>
                      </div>
                    </div>

                    {dish.reason && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-3 italic">
                        {dish.reason}
                      </p>
                    )}

                    <button
                      onClick={() => handleAddToCart(dish)}
                      disabled={isBusy}
                      className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>{isBusy ? 'Adding...' : 'Add to Cart'}</span>
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
