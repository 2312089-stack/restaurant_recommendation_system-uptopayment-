// PaymentSuccessPage.jsx - FIXED VERSION with proper data handling
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Mail, MessageSquare, Clock, MapPin, CreditCard, Package } from 'lucide-react';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from PaymentPage
  const { order, notifications } = location.state || {};

  useEffect(() => {
    // Redirect if no order data
    if (!order) {
      console.log('No order data found, redirecting to menu');
      navigate('/menu');
    }
  }, [order, navigate]);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Order Found</h2>
          <p className="text-gray-600 mb-6">Please place an order first.</p>
          <button
            onClick={() => navigate('/menu')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Menu
          </button>
        </div>
      </div>
    );
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

  const formatPaymentMethod = (method) => {
    switch (method) {
      case 'razorpay': return 'Online Payment';
      case 'cod': return 'Cash on Delivery';
      default: return method;
    }
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
                <p className="text-2xl font-bold text-orange-600">{order.orderId}</p>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-semibold text-orange-800">Total Amount</h3>
                <p className="text-2xl font-bold text-orange-600">₹{order.totalAmount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">{formatPaymentMethod(order.paymentMethod)}</span>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex items-center">
                  <span className="text-orange-700">Payment ID: {order.razorpayPaymentId}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">Est. Delivery: {order.estimatedDelivery || getEstimatedDeliveryTime()}</span>
              </div>
              <div className="flex items-center">
                <Package className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-orange-700">Status: {order.orderStatus}</span>
              </div>
            </div>
          </div>

          {/* Order Item */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Order</h3>
            <div className="flex items-center space-x-4">
              {order.item?.image && (
                <img 
                  src={order.item.image} 
                  alt={order.item.name} 
                  className="w-16 h-16 object-cover rounded-lg" 
                />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{order.item?.name}</h4>
                <p className="text-sm text-gray-600">From: {order.item?.restaurant || 'TasteSphere'}</p>
                <p className="text-sm text-gray-500">Quantity: 1</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{order.item?.price || order.totalAmount}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Delivery Address
            </h3>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{order.customerName}</p>
              <p>{order.deliveryAddress}</p>
              <p className="text-blue-600">{order.customerPhone}</p>
              {order.customerEmail && (
                <p className="text-blue-600">{order.customerEmail}</p>
              )}
            </div>
          </div>

          {/* Notification Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Order Updates
            </h3>
            <div className="space-y-2 text-sm">
              {notifications && (
                <>
                  <div className="flex items-center text-blue-700">
                    <div className={`w-4 h-4 mr-2 ${notifications.email === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                      {notifications.email === 'sent' ? <CheckCircle className="w-4 h-4" /> : '❌'}
                    </div>
                    <span>
                      Email confirmation {notifications.email === 'sent' ? 'sent successfully' : 'failed'} 
                      {order.customerEmail && ` to ${order.customerEmail}`}
                    </span>
                  </div>
                  <div className="flex items-center text-blue-700">
                    <div className={`w-4 h-4 mr-2 ${notifications.whatsapp === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                      {notifications.whatsapp === 'sent' ? <MessageSquare className="w-4 h-4" /> : '❌'}
                    </div>
                    <span>
                      WhatsApp update {notifications.whatsapp === 'sent' ? 'sent successfully' : 'failed'} 
                      {order.customerPhone && ` to ${order.customerPhone}`}
                    </span>
                  </div>
                  {notifications.summary && (
                    <div className="mt-2 p-2 bg-blue-100 rounded text-blue-800 text-xs">
                      {notifications.summary}
                    </div>
                  )}
                </>
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

          {/* Debug Information (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Debug Info (Dev Only)</h4>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify({ order, notifications }, null, 2)}
              </pre>
            </div>
          )}

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

export default PaymentSuccessPage;