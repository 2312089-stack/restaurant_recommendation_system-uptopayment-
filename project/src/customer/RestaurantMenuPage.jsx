import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, Clock, MapPin, Phone, Loader2, 
  ShoppingCart, Heart, Zap, XCircle, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useSocket } from '../contexts/SocketContext';

const API_BASE = 'http://localhost:5000/api';

const RestaurantMenuPage = ({ restaurantId, onBack, onShowDishDetails }) => {
  const navigate = useNavigate();
  const { addToCart, clearCart, loading: cartLoading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { socket, connected } = useSocket();

  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(null);
  const [isSellerOnline, setIsSellerOnline] = useState(false);
  const [sellerDashboardStatus, setSellerDashboardStatus] = useState('offline');
  const [animatingHeart, setAnimatingHeart] = useState(null);

  // Toast notification states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [wishlistMessage, setWishlistMessage] = useState('');

  // Auto-hide messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => setInfoMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  useEffect(() => {
    if (wishlistMessage) {
      const timer = setTimeout(() => setWishlistMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [wishlistMessage]);

  // Fetch restaurant data
  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId]);

  // ✅ Fetch real-time seller status after restaurant loads
  useEffect(() => {
    if (restaurantId && !loading) {
      fetchSellerStatus();
    }
  }, [restaurantId, loading]);

  // ✅ Fetch seller status function
  const fetchSellerStatus = async () => {
    try {
      console.log('🔍 Fetching seller status for:', restaurantId);
      const response = await fetch(`${API_BASE}/seller-status/${restaurantId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 Fetched seller status:', data.status);
        const newIsOnline = data.status.isOnline || false;
        const newDashboardStatus = data.status.dashboardStatus || 'offline';
        
        setIsSellerOnline(newIsOnline);
        setSellerDashboardStatus(newDashboardStatus);
        
        console.log('✅ Status updated:', {
          isOnline: newIsOnline,
          dashboardStatus: newDashboardStatus
        });
        
        // Update dishes with current status
        setDishes(prevDishes => 
          prevDishes.map(dish => ({
            ...dish,
            isSellerOnline: newIsOnline,
            sellerDashboardStatus: newDashboardStatus
          }))
        );
      } else {
        console.warn('⚠️ Failed to fetch seller status:', data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch seller status:', error);
    }
  };

  // Listen for real-time seller status changes
  useEffect(() => {
    if (!socket || !connected || !restaurantId) {
      console.log('⚠️ Socket not ready:', { socket: !!socket, connected, restaurantId });
      return;
    }

    console.log('👂 Listening for seller status changes for:', restaurantId);

    const handleStatusChange = (data) => {
      console.log('📡 Seller status event received:', data);
      
      if (data.sellerId === restaurantId || data.sellerId === restaurantId.toString()) {
        console.log('✅ Status change matches our restaurant!');
        
        const newIsOnline = data.isOnline;
        const newDashboardStatus = data.dashboardStatus;
        
        setIsSellerOnline(newIsOnline);
        setSellerDashboardStatus(newDashboardStatus);
        
        console.log('🔄 Updated status:', {
          isOnline: newIsOnline,
          dashboardStatus: newDashboardStatus
        });
        
        // Update dishes status
        setDishes(prevDishes => 
          prevDishes.map(dish => ({
            ...dish,
            isSellerOnline: newIsOnline,
            sellerDashboardStatus: newDashboardStatus
          }))
        );

        // Update restaurant status
        setRestaurant(prev => prev ? ({
          ...prev,
          isSellerOnline: newIsOnline,
          dashboardStatus: newDashboardStatus,
          isOnline: newIsOnline
        }) : null);
        
        // Show notification to user
        if (newIsOnline && newDashboardStatus === 'online') {
          setSuccessMessage('🎉 Restaurant is now open!');
        } else {
          setErrorMessage('Restaurant is now closed');
        }
      } else {
        console.log('⏭️ Status change for different restaurant:', data.sellerId);
      }
    };

    socket.on('seller-status-changed', handleStatusChange);

    return () => {
      console.log('🧹 Cleaning up socket listener');
      socket.off('seller-status-changed', handleStatusChange);
    };
  }, [socket, connected, restaurantId]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Fetching restaurant data for:', restaurantId);
      const response = await fetch(`${API_BASE}/discovery/restaurant/${restaurantId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch restaurant');
      }

      console.log('✅ Restaurant data received:', {
        name: data.restaurant.name,
        isOnline: data.restaurant.isOnline,
        isSellerOnline: data.restaurant.isSellerOnline,
        dashboardStatus: data.restaurant.dashboardStatus
      });

      setRestaurant(data.restaurant);
      setDishes(data.restaurant.dishes || []);
      
      // ✅ Set initial status from restaurant data - CHECK MULTIPLE FIELDS
      const initialOnlineStatus = 
        data.restaurant.isSellerOnline || 
        data.restaurant.isOnline || 
        false;
      
      const initialDashboardStatus = 
        data.restaurant.dashboardStatus || 
        data.restaurant.sellerDashboardStatus || 
        'offline';
      
      setIsSellerOnline(initialOnlineStatus);
      setSellerDashboardStatus(initialDashboardStatus);

      console.log('📊 Initial seller status set:', {
        isOnline: initialOnlineStatus,
        dashboardStatus: initialDashboardStatus
      });

    } catch (err) {
      console.error('❌ Failed to fetch restaurant:', err);
      setError(err.message || 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (dish) => {
    if (!dish || (!dish._id && !dish.id)) {
      setErrorMessage('Invalid dish data. Please try again.');
      return;
    }

    // ✅ Check offline status using state variables
    const isOffline = !isSellerOnline || sellerDashboardStatus !== 'online';
    
    console.log('🛒 Add to cart check:', {
      dishName: dish.name,
      isSellerOnline,
      sellerDashboardStatus,
      isOffline
    });
    
    if (isOffline) {
      setErrorMessage(`${restaurant?.name || 'Restaurant'} is currently closed. Cannot add to cart.`);
      return;
    }

    const dishId = dish._id || dish.id;
    
    try {
      setAddingToCart(dishId);
      const result = await addToCart(dishId, 1);
      
      if (result.success) {
        setSuccessMessage(`${dish.name} added to cart!`);
      } else {
        if (result.action === 'clear_cart_required') {
          const shouldClear = window.confirm(
            `${result.error}\n\nWould you like to clear your current cart and add this item instead?`
          );
          
          if (shouldClear) {
            const clearResult = await clearCart();
            if (clearResult.success) {
              const addResult = await addToCart(dishId, 1);
              if (addResult.success) {
                setSuccessMessage(`Cart cleared and ${dish.name} added!`);
              }
            }
          }
        } else {
          setErrorMessage(result.error || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      setErrorMessage('Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleOrderNow = (dish) => {
    if (!dish || (!dish._id && !dish.id)) {
      setErrorMessage('Invalid dish data. Please try again.');
      return;
    }

    // ✅ Check offline status using state variables
    const isOffline = !isSellerOnline || sellerDashboardStatus !== 'online';
    
    console.log('⚡ Order now check:', {
      dishName: dish.name,
      isSellerOnline,
      sellerDashboardStatus,
      isOffline
    });
    
    if (isOffline) {
      setErrorMessage(`${restaurant?.name || 'Restaurant'} is currently closed. Please try again later.`);
      return;
    }

    const dishData = {
      id: dish._id || dish.id,
      name: dish.name,
      restaurant: restaurant.name,
      price: dish.price,
      image: dish.image ? `http://localhost:5000${dish.image}` : null,
      rating: dish.rating || restaurant.rating,
      deliveryTime: '25-30 min',
      category: dish.category,
      type: dish.type,
      description: dish.description,
      restaurantId: restaurantId
    };

    navigate('/address', { 
      state: { 
        item: dishData,
        fromRestaurant: true
      } 
    });
  };

  const handleDishClick = (dish) => {
    if (!dish || (!dish._id && !dish.id)) {
      setInfoMessage('Invalid dish data. Please try again.');
      return;
    }

    // ✅ Allow viewing details even when offline
    const dishId = dish._id || dish.id;
    console.log('🍽️ Dish clicked:', dish.name, 'ID:', dishId);
    
    if (onShowDishDetails) {
      onShowDishDetails(dishId);
    } else {
      console.warn('⚠️ onShowDishDetails not provided');
    }
  };

  const handleLikeClick = async (dish, e) => {
    e.stopPropagation();
    
    const dishId = dish._id || dish.id;
    const isCurrentlyLiked = isInWishlist(dishId);
    
    if (!isCurrentlyLiked) {
      setAnimatingHeart(dishId);
      setTimeout(() => setAnimatingHeart(null), 600);
    }

    try {
      const result = await toggleWishlist(dish);
      
      if (result.success) {
        const message = isCurrentlyLiked 
          ? `${dish.name} removed from wishlist` 
          : `${dish.name} added to wishlist`;
        
        setWishlistMessage(message);
      } else {
        setWishlistMessage(result.error || 'Failed to update wishlist');
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      setWishlistMessage('Failed to update wishlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ Calculate if restaurant is actually online
  const isRestaurantOnline = isSellerOnline && sellerDashboardStatus === 'online';

  console.log('🎨 Rendering with status:', {
    isSellerOnline,
    sellerDashboardStatus,
    isRestaurantOnline
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SUCCESS NOTIFICATION */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* ERROR NOTIFICATION */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* INFO NOTIFICATION */}
      {infoMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <Info className="w-5 h-5" />
          <span className="font-medium">{infoMessage}</span>
        </div>
      )}

      {/* WISHLIST NOTIFICATION */}
      {wishlistMessage && (
        <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-50 bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <Heart className="w-5 h-5" />
          <span className="font-medium">{wishlistMessage}</span>
        </div>
      )}

      {/* Socket Connection Status */}
      {!connected && (
        <div className="fixed top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-xs font-medium z-50">
          Real-time updates disconnected
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Discovery</span>
          </button>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{restaurant.rating}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{restaurant.address?.city}</span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isRestaurantOnline
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isRestaurantOnline ? 'Open Now' : 'Closed'}
            </div>
          </div>

          {!isRestaurantOnline && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800 font-medium">
                  This restaurant is currently closed. You cannot place orders right now.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dishes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
        
        {dishes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No dishes available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dishes.map(dish => {
              const dishId = dish._id || dish.id;
              const isBeingAdded = addingToCart === dishId;
              const isLiked = isInWishlist(dishId);
              const isAnimating = animatingHeart === dishId;
              
              // ✅ Use consistent state for online check
              const isDishAvailable = isRestaurantOnline;

              return (
                <div
                  key={dishId}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all relative ${
                    isDishAvailable
                      ? 'border-gray-100 hover:shadow-lg cursor-pointer' 
                      : 'border-red-200 cursor-not-allowed'
                  }`}
                >
                  {isBeingAdded && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-90 z-10 flex items-center justify-center rounded-xl">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm font-medium">Adding to cart...</p>
                      </div>
                    </div>
                  )}

                  <div 
                    className="relative group"
                    onClick={() => handleDishClick(dish)}
                  >
                    <img
                      src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg'}
                      alt={dish.name}
                      className={`w-full h-48 object-cover transition-transform duration-300 ${
                        isDishAvailable ? 'group-hover:scale-105' : ''
                      }`}
                      onError={(e) => {
                        e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg';
                      }}
                    />

                    {/* OFFLINE OVERLAY */}
                    {!isDishAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-white">
                          <XCircle className="w-12 h-12 mx-auto mb-2" />
                          <p className="font-semibold text-lg">Restaurant Closed</p>
                          <p className="text-sm mt-1">Currently unavailable</p>
                        </div>
                      </div>
                    )}

                    {/* VEG/NON-VEG INDICATOR */}
                    <div className={`absolute top-2 right-2 w-4 h-4 rounded-sm border-2 ${
                      dish.type === 'veg' ? 'border-green-500 bg-white' : 'border-red-500 bg-white'
                    } flex items-center justify-center`}>
                      <div className={`w-2 h-2 rounded-full ${
                        dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>

                    {/* STATUS BADGE */}
                    <div className={`absolute bottom-2 left-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      isDishAvailable ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {isDishAvailable ? 'Available' : 'Unavailable'}
                    </div>

                    {/* HOVER EFFECT - Only when online */}
                    {isDishAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white px-3 py-1 rounded-full text-sm font-medium">
                          Click for details
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-lg text-gray-900 truncate flex-1">{dish.name}</h3>
                      <button
                        onClick={(e) => handleLikeClick(dish, e)}
                        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                          isLiked ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Heart className={`w-5 h-5 transition-all duration-200 ${
                          isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'
                        } ${isAnimating ? 'animate-heart-pop' : ''}`} />
                        
                        {isAnimating && (
                          <>
                            <Heart className="absolute w-4 h-4 text-red-500 fill-red-500 animate-heart-float-1" />
                            <Heart className="absolute w-3 h-3 text-red-500 fill-red-500 animate-heart-float-2" />
                            <Heart className="absolute w-3 h-3 text-red-500 fill-red-500 animate-heart-float-3" />
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dish.description}</p>
                    
                    {/* WARNING WHEN OFFLINE */}
                    {!isDishAvailable && (
                      <div className="flex items-center space-x-1 mt-2 bg-red-50 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">Restaurant currently closed</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-orange-600">₹{dish.price}</span>
                      <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
                        <Star className="w-3 h-3 text-green-600 fill-current" />
                        <span className="text-sm font-semibold text-green-600">
                          {dish.ratingDisplay || '4.2'}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(dish);
                        }}
                        disabled={!isDishAvailable || isBeingAdded}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                          isDishAvailable
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isBeingAdded ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span>{isDishAvailable ? 'Add to Cart' : 'Unavailable'}</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderNow(dish);
                        }}
                        disabled={!isDishAvailable}
                        className={`flex items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                          isDishAvailable
                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        @keyframes heart-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .animate-heart-pop {
          animation: heart-pop 0.6s ease-out;
        }

        @keyframes heart-float-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-20px, -30px) scale(0.5); opacity: 0; }
        }

        @keyframes heart-float-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(20px, -25px) scale(0.3); opacity: 0; }
        }

        @keyframes heart-float-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, -35px) scale(0.4); opacity: 0; }
        }

        .animate-heart-float-1 {
          animation: heart-float-1 0.8s ease-out;
        }

        .animate-heart-float-2 {
          animation: heart-float-2 0.9s ease-out;
        }

        .animate-heart-float-3 {
          animation: heart-float-3 0.7s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default RestaurantMenuPage;