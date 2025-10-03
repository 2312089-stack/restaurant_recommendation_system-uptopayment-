import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Mail, MessageSquare, Clock, MapPin, CreditCard, TruckIcon, Package, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, connected } = useSocket();
  
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

  const [currentStatus, setCurrentStatus] = useState('pending');
  const [statusMessage, setStatusMessage] = useState('Your order has been received and is being processed');
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [success, setSuccess] = useState('');

  const selectedAddr = addresses?.find(addr => addr.id === selectedAddress);

  // Status message helper
  const getStatusMessage = useCallback((status) => {
    const messages = {
      'pending': 'Waiting for restaurant confirmation',
      'confirmed': 'Your order has been confirmed by the restaurant',
      'preparing': 'The restaurant is preparing your delicious food',
      'ready': 'Your order is ready for pickup',
      'out_for_delivery': 'Your order is on its way to you',
      'delivered': 'Your order has been delivered. Enjoy your meal!',
      'cancelled': 'Your order has been cancelled'
    };
    return messages[status] || 'Order status updated';
  }, []);

  // Handle order status updates
  const handleOrderStatusUpdate = useCallback((data) => {
    console.log('📦 Received order status update:', data);
    
    const updateMongoId = data.orderMongoId || data._id;
    const updateReadableId = data.orderId;
    
    console.log('🔍 Comparing IDs:');
    console.log('  Received MongoDB ID:', updateMongoId);
    console.log('  Received Readable ID:', updateReadableId);
    console.log('  Expected MongoDB ID:', orderData?._id);
    console.log('  Expected Readable ID:', orderId);
    
    const isMatch = updateMongoId === orderData?._id || updateReadableId === orderId;
    
    if (isMatch) {
      console.log('✅ Status update matches our order!');
      console.log(`Status: ${currentStatus} → ${data.status}`);
      
      setCurrentStatus(data.status);
      setStatusMessage(data.message || getStatusMessage(data.status));
      setLastUpdateTime(new Date());
      
      if (data.estimatedDelivery) {
        setEstimatedTime(data.estimatedDelivery);
      }
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        if (['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(data.status)) {
          new Notification('Order Status Updated', {
            body: data.message || getStatusMessage(data.status),
            icon: '/logo192.png',
            tag: `order-${orderId}`
          });
        }
      }
      
      setSuccess(`Order ${data.status.replace('_', ' ')}`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      console.log('❌ Status update is for a different order');
    }
  }, [orderData, orderId, currentStatus, getStatusMessage]);

  // DEBUG LOGGING
  useEffect(() => {
    console.log('=== CONFIRMATION PAGE MOUNTED ===');
    console.log('orderData._id:', orderData?._id);
    console.log('orderId:', orderId);
    console.log('customerEmail:', customerEmail);
    console.log('socket exists:', !!socket);
    console.log('socket connected:', connected);
  }, []);

  // Monitor connection status
  useEffect(() => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  }, [connected]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Socket.IO listener setup - Main effect
  useEffect(() => {
    if (!orderId || !orderData?._id) {
      console.warn('❌ Missing order information');
      return;
    }

    if (!socket || !connected) {
      console.log('⏳ Socket not ready');
      setConnectionStatus('disconnected');
      return;
    }

    console.log('✅ Setting up order status listeners');
    setConnectionStatus('connected');

    // Join rooms
    socket.emit('join-order-room', orderData._id);
    console.log('📥 Joined order room:', `order-${orderData._id}`);
    
    if (customerEmail) {
      socket.emit('join', `user-${customerEmail}`);
      console.log('📥 Joined user room:', `user-${customerEmail}`);
    }

    // Set up listeners
    socket.on('order-status-updated', handleOrderStatusUpdate);
    socket.on('status-update', handleOrderStatusUpdate);
    
    socket.on('order-confirmed', (data) => {
      console.log('✅ Order confirmation received:', data);
      const confirmMongoId = data.orderMongoId || data._id;
      const confirmReadableId = data.orderId;
      
      if (confirmMongoId === orderData._id || confirmReadableId === orderId) {
        setCurrentStatus('confirmed');
        setStatusMessage('Your order has been confirmed by the restaurant');
        setLastUpdateTime(new Date());
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Order Confirmed', {
            body: 'Your order has been confirmed by the restaurant',
            icon: '/logo192.png'
          });
        }
      }
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up listeners');
      socket.off('order-status-updated', handleOrderStatusUpdate);
      socket.off('status-update', handleOrderStatusUpdate);
      socket.off('order-confirmed');
    };
  }, [socket, connected, orderId, orderData, customerEmail, handleOrderStatusUpdate]);

  // Redirect if missing data
  useEffect(() => {
    if (!item || !orderId) {
      console.warn('Missing required order data, redirecting');
      navigate('/');
    }
  }, [item, orderId, navigate]);

  if (!item || !orderId) {
    return null;
  }

  const getEstimatedDeliveryTime = () => {
    if (estimatedTime) return estimatedTime;
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + (30 * 60 * 1000));
    return deliveryTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const statusSteps = [
    { id: 'pending', label: 'Order Pending', description: 'Your order has been received', icon: CheckCircle },
    { id: 'confirmed', label: 'Order Confirmed', description: 'Restaurant confirmed your order', icon: CheckCircle },
    { id: 'preparing', label: 'Preparing', description: 'Your food is being prepared', icon: CheckCircle },
    { id: 'ready', label: 'Ready for Pickup', description: 'Your order is ready', icon: CheckCircle },
    { id: 'out_for_delivery', label: 'Out for Delivery', description: 'Your order is on the way', icon: TruckIcon },
    { id: 'delivered', label: 'Delivered', description: 'Enjoy your meal!', icon: CheckCircle }
  ];

  const getStepStatus = (stepId) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (stepIndex <= currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'pending';
  };

  const ConnectionBadge = () => {
    if (connectionStatus === 'connected') {
      return (
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
          <Wifi className="w-4 h-4" />
          <span>Live tracking active</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      );
    } else if (connectionStatus === 'connecting') {
      return (
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>Connecting...</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
          <WifiOff className="w-4 h-4" />
          <span>Offline - Updates may be delayed</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 text-lg mb-4">Thank you for your order. We're preparing it now!</p>
            <ConnectionBadge />
          </div>

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 animate-fade-in">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
            </div>
          )}

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
                <span className="text-orange-700 capitalize">{paymentMethod}</span>
              </div>
              {paymentId && (
                <div className="flex items-center">
                  <span className="text-orange-700 text-xs truncate">Payment ID: {paymentId}</span>
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

          <div className={`border-l-4 p-4 mb-6 ${
            currentStatus === 'delivered' ? 'bg-green-50 border-green-500' :
            currentStatus === 'cancelled' ? 'bg-red-50 border-red-500' :
            'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Package className={`w-6 h-6 ${
                  currentStatus === 'delivered' ? 'text-green-600' :
                  currentStatus === 'cancelled' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-semibold capitalize ${
                  currentStatus === 'delivered' ? 'text-green-800' :
                  currentStatus === 'cancelled' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {currentStatus.replace('_', ' ')}
                </h3>
                <p className={`text-sm mt-1 ${
                  currentStatus === 'delivered' ? 'text-green-700' :
                  currentStatus === 'cancelled' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {statusMessage}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Your Order</h3>
            <div className="flex items-center space-x-4">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
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

          {selectedAddr && (
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
              <div className="text-sm text-gray-700">
                <p className="font-medium">{selectedAddr.fullName}</p>
                <p>{selectedAddr.address}</p>
                <p>{selectedAddr.phoneNumber}</p>
                {selectedAddr.landmark && <p className="text-gray-500">Landmark: {selectedAddr.landmark}</p>}
              </div>
            </div>
          )}

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
                  <span>SMS updates will be sent to {selectedAddr.phoneNumber}</span>
                </div>
              )}
              {connectionStatus === 'connected' ? (
                <div className="flex items-center text-green-700">
                  <div className="w-4 h-4 mr-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Real-time tracking active</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-700">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span>Real-time tracking unavailable - check back for updates</span>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-6">
              {statusSteps.map((step, index) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="relative">
                    <div className="flex items-start">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 transition-all duration-300 ${
                        status === 'completed' ? 'bg-green-600' :
                        status === 'current' ? 'bg-orange-500 ring-4 ring-orange-100 animate-pulse' :
                        'bg-gray-300'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className={`font-semibold transition-colors duration-300 ${
                          status === 'completed' ? 'text-green-600' :
                          status === 'current' ? 'text-orange-600' :
                          'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-sm mt-1 ${
                          status === 'completed' || status === 'current' ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                        {status === 'current' && (
                          <p className="text-xs text-orange-600 mt-2 font-medium flex items-center">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                            In Progress...
                          </p>
                        )}
                      </div>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div className={`absolute left-5 top-10 w-0.5 h-12 -z-0 transition-colors duration-300 ${
                        status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Continue Shopping
            </button>
            <button
              onClick={() => navigate('/order-history')}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View Order History
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>This page updates automatically when your order status changes</p>
              <p>You'll also receive email and SMS notifications</p>
              <p>Check your Order History to see all your orders</p>
              <p>Contact support if you have any questions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;