import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Truck, 
  ShoppingCart, 
  Zap, 
  Heart,
  MapPin,
  Share2,
  Loader2,
  AlertCircle,
  Phone,
  User,
  ChefHat,
  DollarSign,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  Users,
  Mail,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  TrendingUp,
  Award,
  Send
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const API_BASE = 'http://localhost:5000/api';

const DishDetailsPage = ({ dishId, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showRestaurantDetails, setShowRestaurantDetails] = useState(false);
  const [isSellerOnline, setIsSellerOnline] = useState(true);
  const { socket, connected } = useSocket();

  // Review states
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // all, 5, 4, 3, 2, 1
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest, helpful
  
  // Review form states
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    anonymous: false
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Success message state
  const [successMessage, setSuccessMessage] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  const { addToCart, loading: cartLoading, itemCount, totalAmount, clearCart } = useCart();

  // Get user token for authenticated requests
  const getUserToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('userToken');
  };

  // Check if user can review (has ordered this dish)
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (dishId) {
      fetchDishDetails();
      fetchReviews();
      checkReviewEligibility();
    }
  }, [dishId]);
useEffect(() => {
    if (!socket || !connected || !dish) return;

    const handleStatusChange = (data) => {
      if (data.sellerId === dish.seller?._id) {
        setIsSellerOnline(data.isOnline && data.dashboardStatus !== 'offline');
      }
    };

    socket.on('seller-status-changed', handleStatusChange);

    return () => {
      socket.off('seller-status-changed', handleStatusChange);
    };
  }, [socket, connected, dish]);
  const fetchDishDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/dishes/${dishId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dish details');
      }

      setDish(data.dish);
    } catch (err) {
      console.error('Fetch dish details error:', err);
      setError('Failed to load dish details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_BASE}/reviews/dish/${dishId}`);
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    const token = getUserToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/reviews/eligibility/${dishId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCanReview(data.canReview);
        setHasReviewed(data.hasReviewed);
      }
    } catch (err) {
      console.error('Check review eligibility error:', err);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    const token = getUserToken();
    
    if (!token) {
      setError('Please login to submit a review');
      return;
    }

    try {
      setReviewSubmitting(true);
      setError('');

      const response = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dishId,
          rating: reviewForm.rating,
          title: reviewForm.title,
          comment: reviewForm.comment,
          anonymous: reviewForm.anonymous
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Reset form and refresh data
      setReviewForm({ rating: 5, title: '', comment: '', anonymous: false });
      setShowReviewForm(false);
      setHasReviewed(true);
      await fetchReviews();
      await fetchDishDetails(); // Refresh to update average rating
      
    } catch (err) {
      console.error('Submit review error:', err);
      setError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const markReviewHelpful = async (reviewId) => {
    const token = getUserToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE}/reviews/${reviewId}/helpful`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      fetchReviews(); // Refresh reviews
    } catch (err) {
      console.error('Mark review helpful error:', err);
    }
  };

  // Filter and sort reviews
  const filteredAndSortedReviews = reviews
    .filter(review => {
      if (reviewFilter === 'all') return true;
      return review.rating === parseInt(reviewFilter);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        case 'helpful':
          return (b.helpfulCount || 0) - (a.helpfulCount || 0);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  // Calculate review statistics
  const reviewStats = {
    total: reviews.length,
    average: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0,
    distribution: {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    }
  };

  // Enhanced add to cart with visual feedback
  const handleAddToCart = async () => {
    if (!dish || (!dish._id && !dish.id)) {
      console.error('Invalid dish object:', dish);
      alert('Error: Invalid dish data');
      return;
    }

    const dishId = dish._id || dish.id;
    
    try {
      setAddingToCart(true);
      console.log('Adding to cart from dish details:', {
        dishId,
        dishName: dish.name,
        price: dish.price,
        quantity
      });
      
      const result = await addToCart(dishId, quantity);
      
      if (result.success) {
        // Show success message
        setSuccessMessage(`${dish.name} (${quantity}x) added to cart!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        console.log('Cart updated successfully');
        
        // Dispatch cart update event for header refresh
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { 
            action: 'add',
            dishId: dishId,
            dishName: dish.name,
            quantity: quantity,
            itemCount: itemCount + quantity,
            totalAmount: totalAmount + (dish.price * quantity),
            timestamp: Date.now()
          } 
        }));
        
      } else {
        if (result.action === 'clear_cart_required') {
          const shouldClear = window.confirm(
            `${result.error}\n\nWould you like to clear your current cart and add this item instead?`
          );
          
          if (shouldClear) {
            try {
              const clearResult = await clearCart();
              if (clearResult.success) {
                const addResult = await addToCart(dishId, quantity);
                if (addResult.success) {
                  setSuccessMessage(`Cart cleared and ${dish.name} (${quantity}x) added!`);
                  setTimeout(() => setSuccessMessage(''), 3000);
                  
                  window.dispatchEvent(new CustomEvent('cartUpdated', { 
                    detail: { 
                      action: 'replace',
                      dishId: dishId,
                      dishName: dish.name,
                      quantity: quantity,
                      itemCount: quantity,
                      totalAmount: dish.price * quantity,
                      timestamp: Date.now()
                    } 
                  }));
                } else {
                  throw new Error(addResult.error || 'Failed to add item after clearing cart');
                }
              } else {
                throw new Error(clearResult.error || 'Failed to clear cart');
              }
            } catch (clearError) {
              console.error('Error during cart clear and add:', clearError);
              alert(`Failed to clear cart and add item: ${clearError.message}`);
            }
          }
        } else if (result.requiresAuth) {
          const shouldLogin = window.confirm(
            `${result.error}\n\nWould you like to log in now?`
          );
          if (shouldLogin) {
            navigate('/login', { state: { from: location } });
          }
        } else {
          alert(result.error || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(`Failed to add to cart: ${error.message || 'Unknown error'}`);
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle order now - navigate to address page with dish data
  // Updated handleOrderNow function for DishDetailsPage.jsx
// Updated handleOrderNow function for DishDetailsPage.jsx
// Replace the existing handleOrderNow function with this corrected version

const handleOrderNow = async () => {
  if (!dish || (!dish._id && !dish.id)) {
    console.error('Invalid dish object:', dish);
    alert('Error: Invalid dish data');
    return;
  }

  console.log('Order now clicked for dish:', dish.name, 'quantity:', quantity);
  
  try {
    // Clean price conversion - handle different price formats
    let cleanPrice = 0;
    if (typeof dish.price === 'string') {
      cleanPrice = parseInt(dish.price.replace(/[^\d]/g, '')) || 0;
    } else if (typeof dish.price === 'number') {
      cleanPrice = dish.price;
    }

    // Transform dish data to match AddressPage expectations
    const orderItem = {
      id: dish._id || dish.id,
      dishId: dish._id || dish.id,
      name: dish.name,
      restaurant: dish.restaurant || dish.restaurantName || 'Restaurant',
      restaurantId: dish.restaurantId || dish.restaurant_id,
      price: `₹${cleanPrice}`, // Format as string for display
      originalPrice: cleanPrice, // Keep numeric value for calculations
      currentPrice: dish.currentPrice || `₹${cleanPrice}`,
      image: dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1',
      rating: dish.rating?.average || reviewStats.average || '4.2',
      deliveryTime: dish.deliveryTime || '25-30 min',
      distance: dish.distance || '1.2 km',
      category: dish.category,
      type: dish.type,
      description: dish.description || `Delicious ${dish.name} from ${dish.restaurant || dish.restaurantName || 'our kitchen'}`,
      ingredients: dish.ingredients,
      nutritionalInfo: dish.nutritionalInfo,
      quantity: quantity,
      itemTotal: cleanPrice * quantity,
      isVeg: dish.type === 'veg',
      // Additional metadata for order flow
      orderType: 'direct',
      fromDishDetails: true,
      basePrice: cleanPrice,
      totalItemPrice: cleanPrice * quantity
    };

    console.log('Navigating to address page with order data:', orderItem);
    
    // Navigate to address page with the properly formatted item data
    navigate('/address', { 
      state: { 
        // Pass the single item that matches AddressPage expectations
        item: orderItem,
        
        // Additional context for the order flow
        orderType: 'direct',
        fromDishDetails: true,
        quantity: quantity,
        
        // Restaurant info
        restaurantId: dish.restaurantId || dish.restaurant_id,
        restaurantName: dish.restaurant || dish.restaurantName,
        
        // Navigation context
        previousPage: 'dish-details',
        dishId: dish._id || dish.id
      } 
    });
    
  } catch (error) {
    console.error('Order now error:', error);
    alert(`Failed to process order: ${error.message || 'Unknown error'}`);
  }
};

// Also ensure the calculateOrderTotal function in AddressPage can handle the data structure
// Add this helper function to AddressPage.jsx if it doesn't exist:

const calculateOrderTotal = (item) => {
  // Handle different price formats from dish details
  let itemPrice = 0;
  
  if (item.originalPrice) {
    // Use the numeric price if available
    itemPrice = item.originalPrice;
  } else if (typeof item.price === 'string') {
    // Extract number from string format like "₹299"
    itemPrice = parseInt(item.price.replace(/[^\d]/g, '')) || 0;
  } else if (typeof item.price === 'number') {
    itemPrice = item.price;
  }
  
  const deliveryFee = 25;
  const platformFee = 5;
  const gst = Math.round(itemPrice * 0.05);
  
  return {
    itemPrice,
    deliveryFee,
    platformFee,
    gst,
    total: itemPrice + deliveryFee + platformFee + gst
  };
};
  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: dish.name,
        text: `Check out this delicious ${dish.name} from ${dish.restaurant}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatOperatingHours = (hours) => {
    if (!hours) return 'Hours not available';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map(day => {
      const dayHours = hours[day];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      
      if (!dayHours || dayHours.closed) {
        return `${dayName}: Closed`;
      }
      return `${dayName}: ${dayHours.open} - ${dayHours.close}`;
    }).join('\n');
  };

  const StarRating = ({ rating, size = 'sm', interactive = false, onChange }) => {
    const starSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${starSize} ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            } ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            onClick={() => interactive && onChange && onChange(star)}
            disabled={!interactive}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dish details...</p>
        </div>
      </div>
    );
  }

  if (error && !dish) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-x-3">
            <button 
              onClick={fetchDishDetails}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={handleBack}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Dish not found</p>
          <button 
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Main Dish Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Dish Image */}
            <div className="relative h-80 md:h-96">
              <img
                src={dish.image ? `http://localhost:5000${dish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=1'}
                alt={dish.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=1';
                }}
              />
              
              {/* Veg/Non-veg indicator */}
              <div className={`absolute top-6 right-6 w-8 h-8 rounded-lg border-3 ${
                dish.type === 'veg' 
                  ? 'border-green-500 bg-white' 
                  : 'border-red-500 bg-white'
              } flex items-center justify-center shadow-lg`}>
                <div className={`w-4 h-4 rounded-full ${
                  dish.type === 'veg' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
              </div>

              {/* Offer badge */}
              {dish.offerText && (
                <div className="absolute bottom-6 left-6 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                  {dish.offerText}
                </div>
              )}
            </div>

            {/* Dish Information */}
            <div className="p-6 md:p-8">
              {/* Basic Info */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {dish.name}
                </h1>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span className="text-lg">{dish.restaurant}</span>
                  {dish.isVerified && (
                    <CheckCircle className="w-4 h-4 text-green-500" title="Verified Restaurant" />
                  )}
                </div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-sm font-medium">
                    {dish.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dish.type === 'veg'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {dish.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {dish.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {dish.description}
                  </p>
                </div>
              )}

              {/* Price and Rating */}
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {dish.currentPrice || `₹${dish.price}`}
                    </span>
                    {dish.currentPrice !== `₹${dish.price}` && dish.currentPrice && (
                      <span className="ml-2 text-xl text-gray-400 line-through">
                        ₹{dish.price}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-green-100 dark:bg-green-900 px-4 py-2 rounded-lg">
                  <Star className="w-5 h-5 text-green-600 dark:text-green-400 fill-current" />
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {reviewStats.average || dish.ratingDisplay || '4.2'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({reviewStats.total} reviews)
                  </span>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="flex items-center justify-around p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-6">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-5 h-5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Delivery Time</p>
                    <p className="font-semibold">{dish.deliveryTime || '25-30 min'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <Truck className="w-5 h-5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Distance</p>
                    <p className="font-semibold">{dish.distance || '1.2 km'}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-500">Status</p>
                  <div className="flex items-center justify-center space-x-1">
                    {dish.isOpenNow === true ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-600">Open</span>
                      </>
                    ) : dish.isOpenNow === false ? (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-red-600">Closed</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-gray-500">Unknown</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              {dish.ingredients && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Ingredients
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {Array.isArray(dish.ingredients) 
                      ? dish.ingredients.join(', ')
                      : dish.ingredients
                    }
                  </p>
                </div>
              )}

              {/* Nutritional Information */}
              {dish.nutritionalInfo && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Nutritional Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dish.nutritionalInfo).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{key}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selection & Action Buttons */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium text-gray-900 dark:text-white">Quantity:</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-lg font-semibold text-gray-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button 
                    onClick={handleAddToCart}
                    disabled={cartLoading || addingToCart}
                    className="flex-1 flex items-center justify-center space-x-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 text-lg"
                  >
                    {addingToCart ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-6 h-6" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleOrderNow}
                    disabled={addingToCart}
                    className="flex items-center justify-center space-x-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 text-lg"
                  >
                    <Zap className="w-6 h-6" />
                    <span>Order Now</span>
                  </button>
                </div>

                {/* Total Price Display */}
                <div className="mt-4 text-center">
                  <span className="text-lg text-gray-600 dark:text-gray-400">
                    Total: <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{(dish.price * quantity)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <MessageCircle className="w-6 h-6" />
                  <span>Reviews & Ratings</span>
                </h2>
                
                {canReview && !hasReviewed && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Star className="w-4 h-4" />
                    <span>Write Review</span>
                  </button>
                )}
              </div>

              {/* Review Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Overall Rating */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">
                    {reviewStats.average}
                  </div>
                  <StarRating rating={Math.round(parseFloat(reviewStats.average))} size="md" />
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Based on {reviewStats.total} reviews
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviewStats.distribution[rating];
                    const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                    
                    return (
                      <div key={rating} className="flex items-center space-x-2">
                        <span className="text-sm font-medium w-6">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={reviewFilter}
                      onChange={(e) => setReviewFilter(e.target.value)}
                      className="text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="all">All ratings</option>
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="highest">Highest rated</option>
                    <option value="lowest">Lowest rated</option>
                    <option value="helpful">Most helpful</option>
                  </select>
                </div>

                <div className="text-sm text-gray-500">
                  {filteredAndSortedReviews.length} of {reviews.length} reviews
                </div>
              </div>
 <div className="min-h-screen bg-gray-50">
      {/* Restaurant Status Banner */}
      {!isSellerOnline && (
        <div className="bg-red-50 border-b-2 border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">
              This restaurant is currently closed. You cannot place orders at this time.
            </p>
          </div>
        </div>
      )}

      {/* Dish Content */}
      {dish && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Action Buttons - Disabled when offline */}
          <div className="flex space-x-4">
            <button 
              onClick={handleAddToCart}
              disabled={!isSellerOnline}
              className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold text-lg transition-colors ${
                !isSellerOnline
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <ShoppingCart className="w-6 h-6" />
              <span>{isSellerOnline ? 'Add to Cart' : 'Restaurant Closed'}</span>
            </button>
            
            <button 
              onClick={handleOrderNow}
              disabled={!isSellerOnline}
              className={`flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold text-lg transition-colors ${
                !isSellerOnline
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Zap className="w-6 h-6" />
              <span>Order Now</span>
            </button>
          </div>

          {!isSellerOnline && (
            <p className="text-center text-sm text-red-600 mt-3">
              The restaurant dashboard is currently offline. Orders will be available when they come back online.
            </p>
          )}
        </div>
      )}
    </div>
              {/* Review Form */}
              {showReviewForm && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Write Your Review
                  </h3>
                  
                  <form onSubmit={submitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Rating
                      </label>
                      <StarRating
                        rating={reviewForm.rating}
                        size="lg"
                        interactive={true}
                        onChange={(rating) => setReviewForm(prev => ({ ...prev, rating }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Review Title
                      </label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Summarize your experience..."
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Review
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white resize-none"
                        rows="4"
                        placeholder="Share details about your experience..."
                        maxLength={1000}
                        required
                      ></textarea>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="anonymous"
                        checked={reviewForm.anonymous}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, anonymous: e.target.checked }))}
                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="anonymous" className="text-sm text-gray-600 dark:text-gray-400">
                        Post anonymously
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reviewSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">Loading reviews...</span>
                </div>
              ) : filteredAndSortedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No reviews yet</h3>
                  <p className="text-gray-400">Be the first to share your experience with this dish</p>
                  {canReview && !hasReviewed && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      Write First Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredAndSortedReviews.map((review) => (
                    <div key={review._id} className="border-b border-gray-200 dark:border-gray-600 pb-6 last:border-b-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {review.anonymous ? 'Anonymous User' : review.displayName || review.userName}
                              </span>
                              {review.verified && (
                                <Award className="w-4 h-4 text-green-500" title="Verified Purchase" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <StarRating rating={review.rating} size="sm" />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {review.title}
                      </h4>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                        {review.comment}
                      </p>

                      {/* Restaurant Response */}
                      {review.restaurantResponse && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-blue-900 dark:text-blue-300">
                              Response from {dish.restaurant}
                            </span>
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              {new Date(review.restaurantResponse.respondedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">
                            {review.restaurantResponse.message}
                          </p>
                        </div>
                      )}

                      {/* Review Actions */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => markReviewHelpful(review._id)}
                            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>Helpful ({review.helpfulCount || 0})</span>
                          </button>
                        </div>

                        <span className="text-xs text-gray-400">
                          {review.timeAgo || `${Math.floor((new Date() - new Date(review.createdAt)) / (1000 * 60 * 60 * 24))}d ago`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Restaurant Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Restaurant Information
                </h2>
                <button
                  onClick={() => setShowRestaurantDetails(!showRestaurantDetails)}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {showRestaurantDetails ? 'Show Less' : 'Show More'}
                </button>
              </div>

              {/* Restaurant Header */}
              <div className="flex items-start space-x-4 mb-6">
                {dish.restaurantLogo && (
                  <div className="flex-shrink-0">
                    <img
                      src={`http://localhost:5000${dish.restaurantLogo}`}
                      alt={`${dish.restaurant} logo`}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {dish.restaurant}
                    </h3>
                    {dish.isVerified && (
                      <CheckCircle className="w-5 h-5 text-green-500" title="Verified Restaurant" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      {dish.businessType || 'Restaurant'}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full capitalize">
                      {dish.priceRange || 'mid-range'} pricing
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{reviewStats.average || 'New'}</span>
                      <span className="text-gray-500">({reviewStats.total} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Truck className="w-4 h-4 text-gray-500" />
                      <span>{dish.orderCount || 0} orders</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extended Details (Collapsible) */}
              {showRestaurantDetails && (
                <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {/* Operating Hours */}
                  {dish.operatingHours && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2 mb-3">
                        <Clock className="w-4 h-4" />
                        <span>Operating Hours</span>
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line font-mono">
                          {formatOperatingHours(dish.operatingHours)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Additional Restaurant Stats */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Restaurant Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {dish.orderCount || 0}
                        </div>
                        <div className="text-sm text-gray-500">Total Orders</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {reviewStats.average || 'New'}
                        </div>
                        <div className="text-sm text-gray-500">Average Rating</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {reviewStats.total || 0}
                        </div>
                        <div className="text-sm text-gray-500">Reviews</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles for Animations */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
};

export default DishDetailsPage;