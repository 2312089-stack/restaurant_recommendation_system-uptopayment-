import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Truck, ArrowRight, Loader2 } from 'lucide-react';
import { resolveImageUrl } from '../config/api.js';
import { useDishFeed } from '../hooks/useDishFeed.js';

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400';

const PopularNearYou = () => {
  const navigate = useNavigate();
  const { dishes, loading, error } = useDishFeed('/dishes/popular', { limit: 4 });

  const openMap = (restaurant) => {
    const query = encodeURIComponent(restaurant ? `${restaurant} restaurant` : 'restaurants near me');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
  };

  return (
    <section className="py-8 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Popular Near You</h2>
            <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Based on your location</span>
            </div>
          </div>
          <button
            onClick={() => openMap('')}
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            <span>See on Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-3">Loading popular dishes...</span>
          </div>
        )}

        {!loading && error && <div className="text-center py-10 text-red-500">{error}</div>}

        {!loading && !error && dishes.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No dishes available near you yet.
          </div>
        )}

        {!loading && !error && dishes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map((dish) => {
              const id = dish._id || dish.id;
              return (
                <div
                  key={id}
                  onClick={() => navigate('/discovery')}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group cursor-pointer"
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
                    {dish.isPromoted && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        Promoted
                      </div>
                    )}
                    {dish.offer && (
                      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-orange-600">
                        {dish.offer}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 truncate">{dish.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">{dish.restaurant}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                          <span className="font-semibold text-green-600 dark:text-green-400">{dish.rating}</span>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ₹{dish.currentPrice || dish.price}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMap(dish.restaurant);
                      }}
                      className="w-full mt-3 flex items-center justify-center space-x-2 text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>See on Map</span>
                    </button>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{dish.deliveryTime || '25-30 min'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                        <Truck className="w-4 h-4" />
                        <span className="text-sm font-medium">Free</span>
                      </div>
                    </div>
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

export default PopularNearYou;
