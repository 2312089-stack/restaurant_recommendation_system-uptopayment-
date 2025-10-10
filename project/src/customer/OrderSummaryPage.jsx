// OrderSummaryPage.jsx - FIXED: Handles both cart and single dish orders
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Package, MapPin } from 'lucide-react';

const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get all data from AddressPage
  const { 
    item, 
    selectedAddress, 
    addresses, 
    orderTotal,
    orderType,
    fromCart,
    isCartOrder 
  } = location.state || {};
  
  const [error, setError] = useState('');
  
  const selectedAddressData = addresses?.find(addr => addr.id === selectedAddress);

  // Check if this is a cart order
  const isCart = isCartOrder || orderType === 'cart' || fromCart === true;

  // Redirect if missing required data
  useEffect(() => {
    if (!item || !selectedAddressData || !orderTotal) {
      console.log('Missing required data, redirecting...', {
        hasItem: !!item,
        hasAddress: !!selectedAddressData,
        hasTotal: !!orderTotal
      });
      navigate('/');
    }
  }, [item, selectedAddressData, orderTotal, navigate]);

  if (!item || !selectedAddressData || !orderTotal) {
    return null;
  }

  // Direct navigation to payment - no order creation yet
  const handleProceedToPayment = () => {
    console.log('📋 Proceeding to payment with:', {
      isCart,
      itemCount: isCart ? item.items?.length : 1,
      total: orderTotal.total
    });
    
    navigate('/payment', { 
      state: { 
        item,
        selectedAddress,
        addresses,
        orderTotal,
        orderType,
        fromCart,
        isCartOrder: isCart
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
            <div className="w-20"></div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 overflow-x-auto">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">✓</div>
                <span className="ml-2 text-sm text-green-600 font-medium">Address</span>
              </div>
              <div className="w-12 md:w-16 h-px bg-green-600"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">2</div>
                <span className="ml-2 text-sm text-orange-600 font-medium">Review</span>
              </div>
              <div className="w-12 md:w-16 h-px bg-gray-300"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
                <span className="ml-2 text-sm text-gray-400">Payment</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 mr-3" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Delivery Address */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                Delivery Address
              </h3>
              <button
                onClick={() => navigate('/address', { state: { item, orderTotal, orderType, fromCart } })}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Change
              </button>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="font-semibold text-gray-900">{selectedAddressData.fullName}</p>
              <p className="text-gray-700 mt-1">{selectedAddressData.address}</p>
              {selectedAddressData.landmark && (
                <p className="text-gray-600 text-sm mt-1">Landmark: {selectedAddressData.landmark}</p>
              )}
              <p className="text-gray-600 mt-2">{selectedAddressData.phoneNumber}</p>
            </div>
          </div>

          {/* Order Items - Different display for cart vs single item */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-orange-600" />
              Order {isCart ? 'Items' : 'Item'}
            </h3>
            
            {isCart && item.items ? (
              // CART ORDER - Multiple items
              <div className="space-y-3">
                {item.items.map((cartItem, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <img 
                      src={cartItem.image || 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80'} 
                      alt={cartItem.name} 
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80'}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{cartItem.name}</h4>
                      <p className="text-sm text-gray-600">{cartItem.restaurant}</p>
                      <p className="text-xs text-gray-500 mt-1">Qty: {cartItem.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">₹{cartItem.price * cartItem.quantity}</span>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 p-4 rounded-lg border-t-2 border-orange-500">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Items</span>
                    <span className="font-bold text-orange-600">{item.itemCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              // SINGLE ITEM ORDER
              <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <img 
                  src={item.image || 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80'} 
                  alt={item.name} 
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80'}
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.restaurant || 'Restaurant'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.category} • {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900 text-lg">
                    {typeof item.price === 'string' ? item.price : `₹${item.price}`}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity || 1}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bill Details */}
          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Bill Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Item Total</span>
                <span className="text-gray-900">₹{orderTotal.itemPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="text-gray-900">₹{orderTotal.deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee</span>
                <span className="text-gray-900">₹{orderTotal.platformFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (5%)</span>
                <span className="text-gray-900">₹{orderTotal.gst}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-gray-900 text-base">Total Amount</span>
                <span className="font-bold text-orange-600 text-lg">₹{orderTotal.total}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-lg"
            >
              Go Back
            </button>
            <button
              onClick={handleProceedToPayment}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryPage;