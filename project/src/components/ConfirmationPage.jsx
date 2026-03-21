import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Mail, MessageSquare, Clock, MapPin, CreditCard } from 'lucide-react';

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    item,
    selectedAddress,
    addresses,
    orderTotal,
    orderId,
    paymentMethod,
    customerEmail,
    paymentId,
    orderData
  } = location.state || {};

  // Find the selected address
  const selectedAddr = addresses?.find(addr => addr.id === selectedAddress);

  useEffect(() => {
    // Redirect if no order data
    if (!item || !orderId) {
      navigate('/');
    }
  }, [item, orderId, navigate]);

  if (!item || !orderId) {
    return null;
  }

  const getEstimatedDeliveryTime = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now
    return deliveryTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 text-lg">Thank you for your order. We're preparing it now!</p>
          </div>

          {/* Order Details Card */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-orange-800">Order ID</h3>
                <p className="text-2xl font-bold text-orange-600">{orderId}</p>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-semibold text-orange-800">Total Amount</h3>
                <p className="text-2xl font-bold text-orange-600">₹{orderTotal?.total || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">{paymentMethod}</span>
              </div>
              {paymentId && (
                <div className="flex items-center">
                  <span className="text-orange-700">Payment ID: {paymentId}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">Est. Delivery: {getEstimatedDeliveryTime()}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">{selectedAddr?.type || 'Address'}</span>
              </div>
            </div>
          </div>

          {/* Order Item */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Order</h3>
            <div className="flex items-center space-x-4">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-16 h-16 object-cover rounded-lg" 
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-600">From: {item.restaurant}</p>
                <p className="text-sm text-gray-500">Quantity: 1</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{item.price}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {selectedAddr && (
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
              <div className="text-sm text-gray-700">
                <p className="font-medium">{selectedAddr.fullName}</p>
                <p>{selectedAddr.address}</p>
                <p>{selectedAddr.phoneNumber}</p>
                {selectedAddr.landmark && (
                  <p className="text-gray-500">Landmark: {selectedAddr.landmark}</p>
                )}
              </div>
            </div>
          )}

          {/* Notification Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Order Updates
            </h3>
            <div className="space-y-2 text-sm">
              {customerEmail && (
                <div className="flex items-center text-blue-700">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  <span>Email confirmation sent to {customerEmail}</span>
                </div>
              )}
              {selectedAddr?.phoneNumber && (
                <div className="flex items-center text-blue-700">
                  <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
                  <span>WhatsApp updates will be sent to {selectedAddr.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Status Timeline */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-green-600">Order Confirmed</p>
                  <p className="text-sm text-gray-500">Your order has been received and confirmed</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-400 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-orange-600">Preparing Your Order</p>
                  <p className="text-sm text-gray-500">The restaurant is preparing your food</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-gray-400">Out for Delivery</p>
                  <p className="text-sm text-gray-400">Your order will be picked up soon</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-gray-400">Delivered</p>
                  <p className="text-sm text-gray-400">Enjoy your meal!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Continue Shopping
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Print Receipt
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Track your order status via email and WhatsApp updates</p>
              <p>• Contact support if you have any questions about your order</p>
              <p>• Rate your experience after delivery to help us improve</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;