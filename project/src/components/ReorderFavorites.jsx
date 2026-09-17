import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Heart, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { resolveImageUrl } from '../config/api.js';
import { useDishFeed } from '../hooks/useDishFeed.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=400';

const ReorderFavorites = () => {
  const navigate = useNavigate();
  const { dishes, loading, error } = useDishFeed('/dishes/recommended', { limit: 6 });
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

  const handleReorder = async (dish) => {
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

  const handleLike = async (dish, event) => {
    event.stopPropagation();
    const id = dish._id || dish.id;
    const wasLiked = isInWishlist(id);
    const result = await toggleWishlist(dish);

    if (result.success) {
      notify(`${dish.name} ${wasLiked ? 'removed from' : 'added to'} wishlist`);
    } else {
      notify(result.error || 'Failed to update wishlist', 'error');
    }
  };

  const cardImage = (dish) => resolveImageUrl(dish.image, FALLBACK_IMAGE);

  return (
    <section className="py-8 relative">
      {message && (
        <div
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 text-white ${
            messageType === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {messageType === 'error' ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reorder Your Favorites</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Your go-to dishes, just one click away</p>
          </div>
          <button
            onClick={() => navigate('/discovery')}
            className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            View All
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-3">Loading your favorites...</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-10 text-red-500">{error}</div>
        )}

        {!loading && !error && dishes.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No dishes available yet.
          </div>
        )}

        {!loading && !error && dishes.length > 0 && (
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4 w-max">
              {dishes.map((dish) => {
                const id = dish._id || dish.id;
                const liked = isInWishlist(id);
                const isBusy = busyId === id;

                return (
                  <div
                    key={id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100 dark:border-gray-700 w-64 flex-shrink-0"
                  >
                    <div className="relative">
                      <img
                        src={cardImage(dish)}
                        alt={dish.name}
                        className="w-full h-40 object-cover rounded-t-xl"
                        onError={(e) => {
                          e.target.src = FALLBACK_IMAGE;
                        }}
                      />
                      <button
                        onClick={(e) => handleLike(dish, e)}
                        className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-lg text-xs font-semibold flex items-center"
                      >
                        <Heart
                          className={`w-3 h-3 mr-1 ${liked ? 'text-red-500 fill-current' : 'text-gray-400'}`}
                        />
                        {liked ? 'Liked' : 'Like'}
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{dish.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{dish.restaurant}</p>
                        </div>
                        <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
                          <Star className="w-3 h-3 text-green-600 fill-current" />
                          <span className="text-xs font-semibold text-green-600">{dish.rating}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 dark:text-white">₹{dish.currentPrice || dish.price}</span>
                        <span className="text-xs text-gray-400">{dish.category}</span>
                      </div>

                      <button
                        onClick={() => handleReorder(dish)}
                        disabled={isBusy}
                        className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        <span>{isBusy ? 'Adding...' : 'Reorder'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReorderFavorites;
