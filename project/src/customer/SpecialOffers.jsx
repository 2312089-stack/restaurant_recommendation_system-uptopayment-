import React, { useState, useEffect } from 'react';
import { Tag, Clock, ArrowRight, Zap, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

const SpecialOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingDeal, setProcessingDeal] = useState(null);

  // Check authentication
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return Boolean(token);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      console.log('🎁 Loading special offers from offers endpoint...');
      
      const response = await fetch(`${API_BASE}/discovery/dishes/offers?limit=8&sortBy=discount`);
      const data = await response.json();

      console.log('📦 Offers API response:', data);

      if (data.success) {
        // Filter only dishes with valid offers
        const validOffers = data.dishes.filter(dish => {
          return dish.offer?.hasOffer && 
                 dish.offer?.validUntil && 
                 new Date(dish.offer.validUntil) > new Date();
        });

        console.log(`✅ Found ${validOffers.length} active offers`);
        setOffers(validOffers);
      } else {
        console.error('❌ API returned error:', data.error);
        setError(data.error || 'Failed to load offers');
      }
    } catch (err) {
      console.error('❌ Failed to load offers:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `http://localhost:5000/${cleanPath}`;
  };

  const getTimeRemaining = (validUntil) => {
    const now = new Date();
    const end = new Date(validUntil);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Ending soon';
  };

  const calculateDiscountedPrice = (price, percentage) => {
    return Math.round(price - (price * percentage / 100));
  };

  const isFlashDeal = (validUntil) => {
    const timeLeft = new Date(validUntil) - new Date();
    return timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours
  };

  // Handle Grab Deal - Navigate directly to address page (similar to reorder flow)
  const handleGrabDeal = async (dish) => {
    // Check authentication first
    if (!isAuthenticated()) {
      alert('Please log in to grab this deal');
      navigate('/login');
      return;
    }

    setProcessingDeal(dish._id);

    try {
      console.log('🎁 Processing deal for:', dish.name);

      // Calculate discounted price
      const discountedPrice = calculateDiscountedPrice(dish.price, dish.offer.discountPercentage);
      
      // Prepare item data for checkout with offer details
      const orderItem = {
        _id: dish._id,
        dishId: dish._id,
        id: dish._id,
        name: dish.name,
        price: `₹${discountedPrice}`,
        originalPrice: discountedPrice,
        actualPrice: dish.price, // Store original price for reference
        image: dish.image,
        restaurant: dish.restaurantName || dish.restaurant || 'Restaurant',
        category: dish.category || 'Food',
        type: dish.type || 'veg',
        quantity: 1,
        offer: {
          hasOffer: true,
          discountPercentage: dish.offer.discountPercentage,
          validUntil: dish.offer.validUntil,
          savedAmount: dish.price - discountedPrice
        }
      };

      console.log('📦 Prepared order item with offer:', orderItem);

      // Navigate directly to address page with item data
      navigate('/address', {
        state: {
          item: orderItem,
          orderType: 'single',
          fromCart: false,
          hasOffer: true,
          offerDetails: {
            discount: dish.offer.discountPercentage,
            savedAmount: dish.price - discountedPrice,
            validUntil: dish.offer.validUntil
          }
        }
      });

    } catch (err) {
      console.error('❌ Error processing deal:', err);
      alert(err.message || 'Failed to process deal');
    } finally {
      setProcessingDeal(null);
    }
  };

  if (loading) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Special Offers & Deals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button 
              onClick={loadOffers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (offers.length === 0) {
    console.log('ℹ️ No offers available, hiding section');
    return null; // Don't show section if no offers
  }

  return (
    <section className="py-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <Tag className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Special Offers & Deals
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Save more on your favorite meals • {offers.length} active offers
            </p>
          </div>
          <button 
            onClick={() => navigate('/discovery')}
            className="hidden md:flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            <span>View All Offers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {offers.map((dish) => {
            const discountedPrice = calculateDiscountedPrice(dish.price, dish.offer.discountPercentage);
            const isFlash = isFlashDeal(dish.offer.validUntil);
            const isProcessing = processingDeal === dish._id;
            
            return (
              <div
                key={dish._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group"
              >
                {/* Image Section */}
                <div className="relative">
                  {dish.image ? (
                    <img
                      src={getImageUrl(dish.image)}
                      alt={dish.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 flex items-center justify-center">
                      <Tag className="w-16 h-16 text-orange-300" />
                    </div>
                  )}

                  {/* Discount Badge */}
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {dish.offer.discountPercentage}% OFF
                  </div>

                  {/* Flash Deal Badge */}
                  {isFlash && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center shadow-lg animate-pulse">
                      <Zap className="w-3 h-3 mr-1" />
                      Flash Deal
                    </div>
                  )}

                  {/* Time Remaining Badge */}
                  {isFlash && (
                    <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-red-400" />
                      {getTimeRemaining(dish.offer.validUntil)}
                    </div>
                  )}

                  {/* Rating Badge */}
                  <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1">
                    <Star className="w-3 h-3 text-green-600 fill-current" />
                    <span className="text-xs font-semibold text-gray-900">
                      {dish.rating?.average?.toFixed(1) || '4.2'}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4">
                  {/* Restaurant Name */}
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {dish.restaurantName || dish.restaurant || 'Restaurant'}
                    </span>
                  </div>

                  {/* Dish Name */}
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {dish.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {dish.description || `Delicious ${dish.name}`}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₹{discountedPrice}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ₹{dish.price}
                      </span>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-semibold">
                      Save ₹{dish.price - discountedPrice}
                    </span>
                  </div>

                  {/* Time Remaining for non-flash deals */}
                  {!isFlash && (
                    <div className="flex items-center space-x-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900 px-3 py-2 rounded-lg mb-3">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{getTimeRemaining(dish.offer.validUntil)}</span>
                    </div>
                  )}

                  {/* CTA Button */}
                  <button
                    onClick={() => handleGrabDeal(dish)}
                    disabled={isProcessing}
                    className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                      isProcessing
                        ? 'bg-orange-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:-translate-y-1'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Grab Deal Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Mobile Button */}
        <div className="md:hidden mt-6 text-center">
          <button 
            onClick={() => navigate('/discovery')}
            className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            <span>View All Offers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;