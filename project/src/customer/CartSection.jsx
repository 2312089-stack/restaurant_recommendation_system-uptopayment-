import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  X,
  AlertCircle,
  Loader2,
  Package
} from 'lucide-react';

const CartSection = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { 
    items, 
    itemCount, 
    totalAmount, 
    loading, 
    error,
    updateQuantity, 
    removeItem,
    clearCart 
  } = useCart();

  const [updating, setUpdating] = useState({});
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (error) {
      setLocalError(error);
      setTimeout(() => setLocalError(''), 5000);
    }
  }, [error]);

  const handleQuantityChange = async (dishId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(dishId);
      return;
    }

    setUpdating(prev => ({ ...prev, [dishId]: true }));
    try {
      await updateQuantity(dishId, newQuantity);
    } catch (err) {
      setLocalError('Failed to update quantity');
    } finally {
      setUpdating(prev => ({ ...prev, [dishId]: false }));
    }
  };

  const handleRemoveItem = async (dishId) => {
    setUpdating(prev => ({ ...prev, [dishId]: true }));
    try {
      await removeItem(dishId);
    } catch (err) {
      setLocalError('Failed to remove item');
    } finally {
      setUpdating(prev => ({ ...prev, [dishId]: false }));
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    
    onClose();
    navigate('/address', {
      state: {
        orderType: 'cart',
        fromCart: true,
        items: items,
        totalAmount: totalAmount,
        itemCount: itemCount
      }
    });
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
      } catch (err) {
        setLocalError('Failed to clear cart');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Cart</h2>
            {itemCount > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {localError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{localError}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Add some delicious items to get started</p>
              <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.dishId || item._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 relative">
                  {updating[item.dishId] && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 flex items-center justify-center rounded-lg z-10">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <img
                      src={item.dishImage || item.image || 'https://via.placeholder.com/80'}
                      alt={item.dishName || item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate pr-2">
                          {item.dishName || item.name}
                        </h4>
                        <button
                          onClick={() => handleRemoveItem(item.dishId)}
                          disabled={updating[item.dishId]}
                          className="flex-shrink-0 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                        {item.restaurantName || 'Restaurant'}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{item.price * item.quantity}
                        </span>

                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-600 rounded-lg p-1">
                          <button
                            onClick={() => handleQuantityChange(item.dishId, item.quantity - 1)}
                            disabled={updating[item.dishId]}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.dishId, item.quantity + 1)}
                            disabled={updating[item.dishId]}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-500 rounded transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                <span className="font-medium text-gray-900 dark:text-white">₹25</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">GST (5%)</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{Math.round(totalAmount * 0.05)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-lg text-orange-600">₹{totalAmount + 25 + Math.round(totalAmount * 0.05)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={handleClearCart}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSection;