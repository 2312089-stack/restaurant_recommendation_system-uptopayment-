import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Heart, Star, Edit3, X, HelpCircle } from 'lucide-react';

const ReorderFavorites = () => {
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const favorites = [
    {
      id: 1,
      name: "Chicken Biryani",
      restaurant: "Paradise Biryani",
      image: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹299",
      rating: 4.5,
      lastOrdered: "2 days ago",
      deliveryTime: "25 min"
    },
    {
      id: 2,
      name: "Margherita Pizza",
      restaurant: "Domino's Pizza",
      image: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹199",
      rating: 4.2,
      lastOrdered: "5 days ago",
      deliveryTime: "30 min"
    },
    {
      id: 3,
      name: "Masala Dosa",
      restaurant: "Sagar Ratna",
      image: "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹149",
      rating: 4.6,
      lastOrdered: "1 week ago",
      deliveryTime: "20 min"
    },
    {
      id: 4,
      name: "Butter Chicken",
      restaurant: "Punjabi Dhaba",
      image: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹249",
      rating: 4.4,
      lastOrdered: "3 days ago",
      deliveryTime: "35 min"
    },
    {
      id: 5,
      name: "Veg Hakka Noodles",
      restaurant: "China Bowl",
      image: "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹179",
      rating: 4.3,
      lastOrdered: "4 days ago",
      deliveryTime: "28 min"
    },
    {
      id: 6,
      name: "Paneer Tikka",
      restaurant: "Spice Garden",
      image: "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
      price: "₹229",
      rating: 4.1,
      lastOrdered: "6 days ago",
      deliveryTime: "25 min"
    }
  ];

  const handleReorder = (item) => {
    // Navigate to separate address page with item data
    navigate('/address', { state: { item } });
  };

  // Favorites Section with Horizontal Scroll
  const FavoritesSection = () => (
    <div className="bg-white min-h-screen">
      {/* Reorder Your Favorites Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reorder Your Favorites</h2>
              <p className="text-gray-600 mt-1">Your go-to dishes, just one click away</p>
            </div>
            <button className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">
              View All
            </button>
          </div>
          
          {/* Horizontal Scrollable Container */}
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4 w-max">
              {favorites.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100 w-64 flex-shrink-0">
                  <div className="relative">
                    <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded-t-xl" />
                    <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-lg text-xs font-semibold flex items-center">
                      <Heart className="w-3 h-3 mr-1 text-red-500 fill-current" />
                      {Math.floor(Math.random() * 1000) + 100}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.restaurant}</p>
                      </div>
                      <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
                        <Star className="w-3 h-3 text-green-600 fill-current" />
                        <span className="text-xs font-semibold text-green-600">{item.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{item.price}</span>
                      <span className="text-xs text-gray-400">Last: {item.lastOrdered}</span>
                    </div>
                    
                    <button 
                      onClick={() => handleReorder(item)}
                      className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reorder</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Near You Section */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Popular Near You</h2>
              <p className="text-gray-600 mt-1">Trending dishes in your area</p>
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Explore
            </button>
          </div>
          
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4 w-max">
              {favorites.slice(0, 4).map(item => (
                <div key={`popular-${item.id}`} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100 w-64 flex-shrink-0">
                  <div className="relative">
                    <img src={item.image} alt={item.name} className="w-full h-40 object-cover rounded-t-xl" />
                    <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-lg text-xs font-semibold flex items-center">
                      <Heart className="w-3 h-3 mr-1 text-red-500 fill-current" />
                      {Math.floor(Math.random() * 500) + 200}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.restaurant}</p>
                      </div>
                      <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
                        <Star className="w-3 h-3 text-green-600 fill-current" />
                        <span className="text-xs font-semibold text-green-600">{item.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{item.price}</span>
                      <span className="text-xs text-orange-600 font-medium">Trending</span>
                    </div>
                    
                    <button 
                      onClick={() => handleReorder(item)}
                      className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      <span>Order Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // Review Modal
  const ReviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Rate Your Experience</h3>
          <button
            onClick={() => setShowReviewModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">How was your order?</p>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-2xl transition-colors"
              >
                <Star 
                  className={`w-8 h-8 ${
                    star <= rating 
                      ? 'text-orange-500 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-orange-500 resize-none"
            rows="3"
            placeholder="Share your experience (optional)"
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowReviewModal(false)}
            className="flex-1 text-gray-600 font-medium py-2"
          >
            Skip
          </button>
          <button
            onClick={() => {
              setShowReviewModal(false);
              setRating(0);
              setReview('');
            }}
            disabled={rating === 0}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );

  // Help Modal
  const HelpModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <HelpCircle className="w-6 h-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Help & Support</h3>
          </div>
          <button
            onClick={() => setShowHelpModal(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          <button className="w-full text-left p-4 hover:bg-orange-50 rounded-lg transition-colors border border-gray-200 hover:border-orange-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-orange-600">📍</span>
              </div>
              <span className="font-medium text-gray-900">Track Order</span>
            </div>
          </button>
          
          <button className="w-full text-left p-4 hover:bg-orange-50 rounded-lg transition-colors border border-gray-200 hover:border-orange-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-orange-600">📋</span>
              </div>
              <span className="font-medium text-gray-900">Order History</span>
            </div>
          </button>
          
          <button className="w-full text-left p-4 hover:bg-orange-50 rounded-lg transition-colors border border-gray-200 hover:border-orange-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-orange-600">💬</span>
              </div>
              <span className="font-medium text-gray-900">Contact Support</span>
            </div>
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Need immediate assistance? Call us at 
            <span className="font-medium text-orange-600"> 1800-123-4567</span>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Only show the Favorites Section - other steps are now separate pages */}
      <FavoritesSection />
      
      {/* Keep modals if they're still needed */}
      {showHelpModal && <HelpModal />}
      {showReviewModal && <ReviewModal />}
    </div>
  );
};

export default ReorderFavorites;