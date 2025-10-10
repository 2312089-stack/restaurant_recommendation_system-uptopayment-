// CartSuccessNotification.jsx
import React, { useEffect } from 'react';
import { Check, ShoppingCart } from 'lucide-react';

/**
 * CartSuccessNotification Component
 * 
 * Shows a success message when items are added to cart
 * with a "View Cart" button for immediate navigation
 * 
 * @param {string} dishName - Name of the dish added to cart
 * @param {function} onViewCart - Callback to open cart modal
 * @param {function} onClose - Callback to close notification
 */

const CartSuccessNotification = ({ dishName, onViewCart, onClose }) => {
  useEffect(() => {
    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl max-w-sm animate-slide-in">
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className="bg-white bg-opacity-20 rounded-full p-1.5">
            <Check className="w-5 h-5 flex-shrink-0" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-0.5">
              Added to cart!
            </p>
            <p className="text-green-100 text-xs">
              {dishName}
            </p>
          </div>
        </div>
        
        <button
          onClick={onViewCart}
          className="bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex items-center space-x-1.5 shadow-sm"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>View Cart</span>
        </button>
        
        <button
          onClick={onClose}
          className="text-white hover:text-green-100 transition-colors text-2xl leading-none ml-2 font-light"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default CartSuccessNotification;

/* 
 * Add this to your global CSS (index.css or App.css):
 *
 * @keyframes slide-in {
 *   from {
 *     transform: translateX(100%);
 *     opacity: 0;
 *   }
 *   to {
 *     transform: translateX(0);
 *     opacity: 1;
 *   }
 * }
 * 
 * .animate-slide-in {
 *   animation: slide-in 0.3s ease-out;
 * }
 */