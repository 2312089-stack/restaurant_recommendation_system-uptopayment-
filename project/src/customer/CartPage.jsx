// CartPage.jsx - UPDATED: Individual "Order Now" button for each cart item
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft,
  AlertCircle,
  Loader2,
  Package,
  ChevronRight,
  Store,
  X
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const CartPage = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { 
    items, 
    totalAmount, 
    itemCount, 
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

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
      } catch (err) {
        setLocalError('Failed to clear cart');
      }
    }
  };

  // ✅ UPDATED: Handle single dish order from cart - Direct to address page
  const handleOrderSingleDish = (cartItem) => {
    console.log('Ordering single dish from cart:', cartItem);
    
    // Prepare single dish order object (similar to DishDetailsPage)
    const orderItem = {
      id: cartItem.dishId,
      dishId: cartItem.dishId,
      name: cartItem.dishName,
      restaurant: cartItem.restaurantName,
      restaurantId: cartItem.restaurantId,
      price: `₹${cartItem.price}`,
      originalPrice: cartItem.price,
      currentPrice: `₹${cartItem.price}`,
      image: cartItem.dishImage || 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=400',
      rating: '4.2',
      deliveryTime: '25-30 min',
      distance: '1.2 km',
      category: 'Food',
      type: 'veg',
      description: `Delicious ${cartItem.dishName} from ${cartItem.restaurantName}`,
      quantity: cartItem.quantity,
      itemTotal: cartItem.price * cartItem.quantity,
      isVeg: true,
      orderType: 'single',
      fromCart: true,
      basePrice: cartItem.price,
      totalItemPrice: cartItem.price * cartItem.quantity
    };

    console.log('Navigating to address page with single cart item:', orderItem);
    
    // Navigate directly to address page
    navigate('/address', { 
      state: { 
        item: orderItem,
        orderType: 'single',
        fromCart: true,
        quantity: cartItem.quantity,
        restaurantId: cartItem.restaurantId,
        restaurantName: cartItem.restaurantName,
        previousPage: 'cart',
        dishId: cartItem.dishId
      } 
    });
  };

  // ✅ EXISTING: Navigate to address page with cart data (all items)
  const handleProceedToCheckout = () => {
    if (items.length === 0) return;

    // Calculate cart totals
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = 25;
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05);
    const total = subtotal + deliveryFee + platformFee + gst;

    // Create cart order object
    const cartOrder = {
      orderType: 'cart',
      fromCart: true,
      items: items.map(item => ({
        dishId: item.dishId,
        name: item.dishName,
        restaurant: item.restaurantName,
        restaurantId: item.restaurantId,
        price: item.price,
        quantity: item.quantity,
        image: item.dishImage
      })),
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      gst: gst,
      total: total,
      itemCount: itemCount
    };

    // Navigate to address page with cart data
    navigate('/address', {
      state: {
        item: cartOrder,
        orderType: 'cart',
        fromCart: true
      }
    });
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = 25;
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05);
    return subtotal + deliveryFee + platformFee + gst;
  };

  if (isOpen) {
    return (
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <CartPageContent
              items={items}
              totalAmount={totalAmount}
              itemCount={itemCount}
              loading={loading}
              error={localError}
              updating={updating}
              onClose={onClose}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onCheckout={handleProceedToCheckout}
              onOrderSingleDish={handleOrderSingleDish}
              calculateSubtotal={calculateSubtotal}
              calculateTotal={calculateTotal}
              isModal={true}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CartPageContent
        items={items}
        totalAmount={totalAmount}
        itemCount={itemCount}
        loading={loading}
        error={localError}
        updating={updating}
        onClose={onClose}
        onQuantityChange={handleQuantityChange}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onCheckout={handleProceedToCheckout}
        onOrderSingleDish={handleOrderSingleDish}
        calculateSubtotal={calculateSubtotal}
        calculateTotal={calculateTotal}
        isModal={false}
      />
    </div>
  );
};

const CartPageContent = ({
  items,
  totalAmount,
  itemCount,
  loading,
  error,
  updating,
  onClose,
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onOrderSingleDish,
  calculateSubtotal,
  calculateTotal,
  isModal
}) => {
  return (
    <>
      <div className={`${isModal ? 'sticky top-0' : ''} bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10`}>
        <div className={`${isModal ? 'p-4' : 'max-w-4xl mx-auto px-4 py-4'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {isModal ? <X className="w-5 h-5" /> : <><ArrowLeft className="w-5 h-5" /><span>Back</span></>}
            </button>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Cart</h1>
              {itemCount > 0 && (
                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      {error && (
        <div className={`${isModal ? 'p-4' : 'max-w-4xl mx-auto px-4 py-4'}`}>
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className={`${isModal ? 'overflow-y-auto max-h-[calc(90vh-200px)]' : 'min-h-[calc(100vh-200px)]'} ${isModal ? 'p-4' : 'max-w-4xl mx-auto px-4 py-6'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading cart...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Add some delicious items to get started</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Store className="w-5 h-5 mr-2 text-orange-600" />
                  Order Items ({items.length})
                </h2>
                {items.length > 1 && (
                  <button
                    onClick={onClearCart}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <div 
                    key={item.dishId} 
                    className="p-4 transition-all relative hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    {updating[item.dishId] && (
                      <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      </div>
                    )}

                    <div className="flex gap-4">
                      <img
                        src={item.dishImage || 'https://via.placeholder.com/100'}
                        alt={item.dishName}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border-2 border-gray-200 dark:border-gray-600"
                        onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {item.dishName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.restaurantName}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveItem(item.dishId);
                            }}
                            disabled={updating[item.dishId]}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* ✅ UPDATED: Added Individual Order Now Button */}
                        <div className="space-y-3 mt-4">
                          {/* Quantity and Price Row */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>

                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center space-x-3 rounded-lg p-2 bg-gray-100 dark:bg-gray-700"
                            >
                              <button
                                onClick={() => onQuantityChange(item.dishId, item.quantity - 1)}
                                disabled={updating[item.dishId]}
                                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                              </button>
                              <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onQuantityChange(item.dishId, item.quantity + 1)}
                                disabled={updating[item.dishId]}
                                className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                              </button>
                            </div>
                          </div>

                          {/* ✅ NEW: Order Now Button for Individual Item */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrderSingleDish(item);
                            }}
                            disabled={updating[item.dishId]}
                            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <ChevronRight className="w-4 h-4" />
                            <span>Order  Now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Bill Details</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Item Total</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{calculateSubtotal()}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹25</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Platform Fee</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹5</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>GST (5%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{Math.round(calculateSubtotal() * 0.05)}</span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white text-lg">Total Amount</span>
                  <span className="font-bold text-orange-600 text-2xl">₹{calculateTotal()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ EXISTING: Proceed to Checkout Button (Orders all items) */}
      {items.length > 0 && (
        <div className={`${isModal ? 'sticky bottom-0' : ''} bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${isModal ? 'p-4' : 'max-w-4xl mx-auto px-4 py-4'}`}>
          <button
            onClick={onCheckout}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>Proceed to Checkout (All Items)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};

export default CartPage;