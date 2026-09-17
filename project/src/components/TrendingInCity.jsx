import React, { useState } from 'react';
import { TrendingUp, Flame, Plus, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { resolveImageUrl } from '../config/api.js';
import { useDishFeed } from '../hooks/useDishFeed.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=400';

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

const TrendingInCity = () => {
  const { dishes, loading, error } = useDishFeed('/dishes/trending', { limit: 5 });
  const { addToCart } = useCart();

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [busyId, setBusyId] = useState(null);

  const notify = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTryTrending = async (dish) => {
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

  const totalOrders = dishes.reduce((sum, dish) => sum + (dish.orderCount || 0), 0);
  const avgRating =
    dishes.length > 0
      ? (dishes.reduce((sum, dish) => sum + (Number(dish.rating) || 0), 0) / dishes.length).toFixed(1)
      : '0.0';

  return (
    <section className="py-8 bg-gray-50 dark:bg-gray-800 relative">
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
              <div className="flex items-center space-x-1">
                <Flame className="w-6 h-6 text-red-500" />
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trending Near You</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Most popular dishes this week</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-3">Loading trending dishes...</span>
          </div>
        )}

        {!loading && error && <div className="text-center py-10 text-red-500">{error}</div>}

        {!loading && !error && dishes.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No trending dishes right now.
          </div>
        )}

        {!loading && !error && dishes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {dishes.map((dish, index) => {
                const id = dish._id || dish.id;
                const rank = dish.trendRank || index + 1;
                const isBusy = busyId === id;

                return (
                  <div
                    key={id}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative"
                  >
                    <div
                      className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankColor(rank)}`}
                    >
                      #{rank}
                    </div>
                    <div className="relative">
                      <img
                        src={resolveImageUrl(dish.image, FALLBACK_IMAGE)}
                        alt={dish.name}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = FALLBACK_IMAGE;
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Hot
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                        {dish.orderCount || 0} orders
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{dish.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">{dish.restaurant}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{dish.description}</p>

                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{dish.currentPrice || dish.price}
                        </span>
                        <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">{dish.rating}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTryTrending(dish)}
                        disabled={isBusy}
                        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>{isBusy ? 'Adding...' : 'Try Trending'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">This Week's Food Trends</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{totalOrders}+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{dishes.length}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Trending Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{avgRating}★</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {dishes[0]?.restaurant?.split(' ')[0] || 'Local'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Top Spot</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TrendingInCity;
