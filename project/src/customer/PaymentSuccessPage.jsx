import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Package, MapPin, Clock, Phone, Mail, ChevronRight } from 'lucide-react';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  
  const { order, notifications } = location.state || {};

  useEffect(() => {
    if (!order) {
      navigate('/menu');
    }
    
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [order, navigate]);

  if (!order) {
    return null;
  }

  const getEstimatedDeliveryTime = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + (30 * 60 * 1000));
    return deliveryTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                ['bg-green-500', 'bg-orange-500', 'bg-blue-500', 'bg-yellow-500'][i % 4]
              }`} />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Success Icon and Message - Flipkart Style */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-4 text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              {/* Outer circles */}
              <div className="absolute inset-0 animate-ping">
                <div className="w-32 h-32 rounded-full bg-green-100 opacity-75"></div>
              </div>
              <div className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed</h1>
          <p className="text-gray-600 text-lg mb-1">Your order has been confirmed</p>
          <p className="text-sm text-gray-500">Order ID: <span className="font-semibold text-gray-700">{order.orderId}</span></p>
        </div>

        {/* Delivery Estimate - Flipkart Style */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Delivery</p>
                <p className="text-lg font-semibold text-gray-900">{order.estimatedDelivery || getEstimatedDeliveryTime()}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-gray-700" />
            Order Details
          </h2>
          
          <div className="flex items-center space-x-4 pb-4 border-b">
            {order.item?.image && (
              <img 
                src={order.item.image} 
                alt={order.item.name} 
                className="w-20 h-20 object-cover rounded-lg border" 
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{order.item?.name}</h3>
              <p className="text-sm text-gray-600">{order.item?.restaurant || 'TasteSphere'}</p>
              <p className="text-sm text-gray-500 mt-1">Qty: 1</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">₹{order.item?.price || order.totalAmount}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium text-gray-900">
                {order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
              </span>
            </div>
            {order.razorpayPaymentId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment ID</span>
                <span className="font-mono text-xs text-gray-700">{order.razorpayPaymentId}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gray-700" />
            Delivery Address
          </h2>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-gray-900">{order.customerName}</p>
            <p className="text-gray-700">{order.deliveryAddress}</p>
            <div className="flex items-center space-x-4 mt-3 pt-3 border-t">
              <div className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-1" />
                <span>{order.customerPhone}</span>
              </div>
              {order.customerEmail && (
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-1" />
                  <span className="text-xs">{order.customerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Updates Notification */}
        {notifications && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">Order updates sent</p>
                <p className="text-xs text-blue-700">
                  We've sent confirmation {notifications.email === 'sent' && 'via email'} 
                  {notifications.email === 'sent' && notifications.whatsapp === 'sent' && ' and '}
                  {notifications.whatsapp === 'sent' && 'WhatsApp'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Flipkart Style */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-lg transition-colors shadow-sm flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            Continue Shopping
          </button>
          
          <button
            onClick={() => navigate('/order-history')}
            className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold py-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Package className="w-5 h-5 mr-2" />
            View All Orders
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact support or track your order in the Orders section
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;