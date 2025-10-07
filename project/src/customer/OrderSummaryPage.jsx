// OrderSummaryPage.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle, Package, MapPin } from 'lucide-react';

const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { item, selectedAddress, addresses, orderTotal } = location.state || {};
  
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  
  const selectedAddressData = addresses?.find(addr => addr.id === selectedAddress);

  // Redirect if missing required data
  useEffect(() => {
    if (!item || !selectedAddressData || !orderTotal) {
      console.log('Missing required data, redirecting...');
      navigate('/');
    }
  }, [item, selectedAddressData, orderTotal, navigate]);

  // Don't render if no data
  if (!item || !selectedAddressData || !orderTotal) {
    return null;
  }

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  };

const handlePlaceOrder = async () => {
  setPlacing(true);
  setError('');
  
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Build orderDetails from the data you actually have
    const orderPayload = {
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dishId: item.id || item._id, // CRITICAL: Use the actual item ID
      customerName: selectedAddressData.fullName,
      customerEmail: localStorage.getItem('userEmail') || 'customer@example.com', // Get from auth context/localStorage
      customerPhone: selectedAddressData.phoneNumber,
      item: {
        name: item.name,
        price: item.price,
        image: item.image,
        restaurant: item.restaurant,
        category: item.category,
        type: item.type
      },
      deliveryAddress: {
        fullName: selectedAddressData.fullName,
        address: selectedAddressData.address,
        landmark: selectedAddressData.landmark,
        phoneNumber: selectedAddressData.phoneNumber
      },
      totalAmount: orderTotal.total,
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString() // 45 minutes from now
    };

    console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderDetails: orderPayload })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Server Response:', data);
      throw new Error(data.message || 'Failed to place order');
    }

   console.log('✅ Order placed successfully:', data);

// Navigate to confirmation page with ALL required data
navigate('/confirmation', { 
  state: { 
    orderId: data.orderId,
    orderData: data.order, // Backend returns this in response
    item: item,
    orderTotal: orderTotal,
    selectedAddress: selectedAddress,
    addresses: addresses
  } 
});
    
  } catch (error) {
    console.error('Place order error:', error);
    setError(error.message || 'Failed to place order. Please try again.');
  } finally {
    setPlacing(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
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
              {/* Step 1: Address */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="ml-2 text-xs md:text-sm text-green-600 font-medium whitespace-nowrap">Address</span>
              </div>
              <div className="w-12 md:w-16 h-px bg-green-600"></div>
              
              {/* Step 2: Review Order */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
                <span className="ml-2 text-xs md:text-sm text-orange-600 font-medium whitespace-nowrap">Review</span>
              </div>
              <div className="w-12 md:w-16 h-px bg-gray-300"></div>
              
              {/* Step 3: Confirmation */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</div>
                <span className="ml-2 text-xs md:text-sm text-gray-400 whitespace-nowrap">Confirm</span>
              </div>
              <div className="w-12 md:w-16 h-px bg-gray-300"></div>
              
              {/* Step 4: Payment */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</div>
                <span className="ml-2 text-xs md:text-sm text-gray-400 whitespace-nowrap">Payment</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 mr-3" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Order Failed</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Delivery Address Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                Delivery Address
              </h3>
              <button
                onClick={() => navigate('/address', { state: { item, orderTotal } })}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Change
              </button>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="font-semibold text-gray-900">{selectedAddressData.fullName}</p>
              <p className="text-gray-700 mt-1">{selectedAddressData.address}</p>
              {selectedAddressData.landmark && (
                <p className="text-gray-600 text-sm mt-1">
                  Landmark: {selectedAddressData.landmark}
                </p>
              )}
              <p className="text-gray-600 mt-2">{selectedAddressData.phoneNumber}</p>
            </div>
          </div>

          {/* Order Item Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-orange-600" />
              Order Item
            </h3>
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
              <img 
                src={item.image || 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80'} 
                alt={item.name} 
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                onError={(e) => {
                  e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?w=80';
                }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                <p className="text-sm text-gray-600 truncate">
                  {item.restaurant || 'Restaurant'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {item.category} • {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-bold text-gray-900 text-lg">
                  {typeof item.price === 'string' ? item.price : `₹${item.price}`}
                </span>
                <p className="text-xs text-gray-500 mt-1">Qty: 1</p>
              </div>
            </div>
          </div>

          {/* Bill Details Section */}
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

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-blue-900 font-medium mb-1">Restaurant Confirmation Required</p>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Your order will be sent to the restaurant for confirmation. Once they verify 
                  availability and accept your order, you'll be able to proceed with payment.
                </p>
                <p className="text-blue-700 text-xs mt-2">
                  This usually takes 1-2 minutes. You'll be notified immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              {placing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending to Restaurant...</span>
                </div>
              ) : (
                <span>Send Order to Restaurant</span>
              )}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By placing this order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryPage;