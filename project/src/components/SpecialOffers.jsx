import React, { useState } from 'react';
import { Tag, Clock, Star, ArrowRight, Zap, Gift, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { resolveImageUrl } from '../config/api.js';
import { useDishFeed } from '../hooks/useDishFeed.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';

const formatValidUntil = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h left`;
  return `${Math.floor(diffHours / 24)}d left`;
};

const SpecialOffers = () => {
  const { dishes, loading, error } = useDishFeed('/dishes/offers', { limit: 4 });
  const { addToCart } = useCart();

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [busyId, setBusyId] = useState(null);

  const notify = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGrabDeal = async (dish) => {
    const id = dish._id || dish.id;
    setBusyId(id);
    const result = await addToCart(id, 1);
    setBusyId(null);

    if (result.success) {
      notify(`${dish.name} added with ${dish.discountPercentage}% off!`);
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
              <Gift className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Special Offers & Deals</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Save more on your favorite meals</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-3">Loading offers...</span>
          </div>
        )}

        {!loading && error && <div className="text-center py-10 text-red-500">{error}</div>}

        {!loading && !error && dishes.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No active offers right now. Check back soon!
          </div>
        )}

        {!loading && !error && dishes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map((dish) => {
              const id = dish._id || dish.id;
              const isBusy = busyId === id;
              const discount = dish.discountPercentage || 0;
              const timeLeft = formatValidUntil(dish.validUntil);

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
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      {discount}% OFF
                    </div>
                    {discount >= 30 && (
                      <div className="absolute top-3 right-3 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                        <Zap className="w-3 h-3 mr-1" />
                        Flash Deal
                      </div>
                    )}
                    {timeLeft && (
                      <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-red-400" />
                        {timeLeft}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1">
                      <Star className="w-3 h-3 text-green-600 fill-current" />
                      <span className="text-xs font-semibold text-gray-900">{dish.rating}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Tag className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400 truncate">
                        {dish.restaurant}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 truncate">{dish.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{dish.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        ₹{dish.currentPrice}
                        <span className="ml-2 text-sm font-normal text-gray-400 line-through">₹{dish.price}</span>
                      </span>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                        Save ₹{(dish.price || 0) - (dish.currentPrice || 0)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleGrabDeal(dish)}
                      disabled={isBusy}
                      className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      <span>{isBusy ? 'Adding...' : 'Grab Deal Now'}</span>
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

export default SpecialOffers;
