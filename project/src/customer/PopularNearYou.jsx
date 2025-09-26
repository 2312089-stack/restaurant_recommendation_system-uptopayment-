import React, { useState, useEffect } from 'react';
import { MapPin, Star, Clock, Truck, ArrowRight, Plus, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const PopularNearYou = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCity, setUserCity] = useState('');

  // Get user's location
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const data = await response.json();
              const city = data.locality || data.city || '';
              setUserCity(city);
            } catch (err) {
              console.error('Error getting location:', err);
              setUserCity(''); // Will fetch all dishes
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            setUserCity(''); // Will fetch all dishes
          }
        );
      }
    };
    getUserLocation();
  }, []);

  // Fetch popular dishes
  useEffect(() => {
    const fetchPopularDishes = async () => {
      try {
        setLoading(true);
        setError('');
        
        const queryParams = new URLSearchParams({
          limit: '8'
        });
        
        if (userCity) {
          queryParams.append('city', userCity);
        }

        const response = await fetch(`${API_BASE}/discovery/dishes/popular?${queryParams}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch popular dishes');
        }

        setDishes(data.dishes || []);
      } catch (err) {
        console.error('Fetch popular dishes error:', err);
        setError('Unable to load popular dishes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when we have determined the city (or decided to fetch all)
    if (userCity !== undefined) {
      fetchPopularDishes();
    }
  }, [userCity]);

  const handleDishClick = (dish) => {
    console.log('Dish clicked:', dish.name);
    // TODO: Navigate to restaurant page or add to cart
  };

  if (loading) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading popular dishes...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Unable to load dishes
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
    <section className="py-8 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Popular Near You
            </h2>
            <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{userCity ? `In ${userCity}` : 'Based on your location'}</span>
            </div>
          </div>
          <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors">
            <span>See on Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {dishes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
              No popular dishes found
            </h3>
            <p className="text-gray-400 dark:text-gray-500">
              {userCity 
                ? `No popular dishes available in ${userCity} yet.`
                : 'No popular dishes available in your area yet.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map(dish => (
              <div 
                key={dish.id}
                onClick={() => handleDishClick(dish)}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group cursor-pointer hover:scale-105"
              >
                <div className="relative">
                  <img
                    src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1'}
                    alt={dish.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                    }}
                  />
                  {dish.isPromoted && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      Promoted
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-orange-600">
                    {dish.offer || 'Free Delivery'}
                  </div>
                  <div className={`absolute top-2 right-2 w-4 h-4 rounded-sm border-2 ${
                    dish.type === 'veg' 
                      ? 'border-green-500 bg-white' 
                      : 'border-red-500 bg-white'
                  } flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${
                      dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 truncate">
                    {dish.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                    {dish.restaurant}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 line-clamp-2">
                    {dish.category}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {dish.currentPrice}
                      </span>
                      {dish.currentPrice !== dish.price && (
                        <span className="text-gray-400 line-through text-xs">
                          {dish.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-green-600 dark:text-green-400 fill-current" />
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {dish.rating}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{dish.deliveryTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Truck className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {dish.distance}
                      </span>
                    </div>
                  </div>

                  <button className="w-full mt-3 flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
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

export default PopularNearYou;