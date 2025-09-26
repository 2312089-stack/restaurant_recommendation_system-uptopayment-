import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Store, Clock, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const CartSection = ({ onBack }) => {
  const { 
    items, 
    totalAmount, 
    itemCount, 
    loading, 
    error, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    loadCart 
  } = useCart();

  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    if (token) {
      loadCart();
    }
  }, []);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleQuantityChange = async (dishId, newQuantity) => {
    const result = await updateQuantity(dishId, newQuantity);
    if (result.success) {
      showMessage(result.message);
    }
  };

  const handleRemoveItem = async (dishId, dishName) => {
    const result = await removeFromCart(dishId);
    if (result.success) {
      showMessage(`${dishName} removed from cart`);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      const result = await clearCart();
      if (result.success) {
        showMessage('Cart cleared successfully');
      }
    }
  };

  const handleProceedToOrder = () => {
    window.location.href = '/order-summary';
  };

  const handleLogin = () => {
    // Navigate to login - you can customize this based on your app structure
    window.location.reload(); // This will trigger the login flow in your app
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Cart
              </h1>
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Login Required Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Login Required
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Please log in to view your cart and manage your orders. Your cart items will be saved for your next visit.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleLogin}
                  className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                >
                  Login to Continue
                </button>
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Browse Dishes
                </button>
              </div>

              {/* Features Preview */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3">
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Save Your Cart</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your items stay saved across sessions</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3">
                    <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Quick Checkout</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fast and secure ordering process</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-3">
                    <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Order Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track your orders in real-time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Cart
              </h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Cart
            </h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Cart Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-orange-500" />
                Your Cart
                {itemCount > 0 && (
                  <span className="ml-3 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-sm font-medium px-3 py-1 rounded-full">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h2>
              {items.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-4 bg-green-50 dark:bg-green-900 border-b border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 text-sm">{message}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center text-red-800 dark:text-red-200">
                <AlertCircle className="w-4 h-4 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Cart Content */}
          <div className="p-6">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-400 dark:text-gray-500 mb-8 max-w-md mx-auto">
                  Looks like you haven't added any delicious dishes yet. Browse our menu and discover amazing food!
                </p>
                <button
                  onClick={onBack}
                  className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                >
                  Browse Dishes
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Restaurant Info */}
                {items.length > 0 && items[0].restaurantId && (
                  <div className="flex items-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <Store className="w-6 h-6 text-orange-500 mr-4" />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {items[0].restaurantName}
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400">
                        All items from this restaurant • {itemCount} items
                      </p>
                    </div>
                  </div>
                )}

                {/* Cart Items */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.dishId._id || item.dishId} className="flex items-center space-x-4 p-6 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-orange-200 dark:hover:border-orange-700 transition-colors">
                      {/* Dish Image */}
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-xl overflow-hidden flex-shrink-0">
                        {item.dishImage ? (
                          <img
                            src={`http://localhost:5000${item.dishImage}`}
                            alt={item.dishName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Dish Info */}
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.dishName}
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400">
                          ₹{item.price} each
                        </p>
                        {item.specialInstructions && (
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Special instructions: {item.specialInstructions}
                          </p>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <button
                          onClick={() => handleQuantityChange(item.dishId._id || item.dishId, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                          disabled={loading}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <span className="w-12 text-center text-lg font-semibold text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.dishId._id || item.dishId, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600 transition-colors"
                          disabled={loading}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          ₹{item.price * item.quantity}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.dishId._id || item.dishId, item.dishName)}
                        className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cart Summary */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          Total: ₹{totalAmount}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({itemCount} items)
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>25-30 min delivery</span>
                      </div>
                    </div>

                    <button
                      onClick={handleProceedToOrder}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-3 bg-orange-500 text-white py-4 px-6 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 text-lg font-semibold"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Delivery charges and taxes will be calculated at checkout
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartSection;