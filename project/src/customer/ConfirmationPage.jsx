import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, connected } = useSocket();
  
  const { orderId, orderData, item, orderTotal, selectedAddress, addresses } = location.state || {};
  
  const [orderState, setOrderState] = useState(orderData?.orderStatus || 'pending_seller');
  const [cancellationInfo, setCancellationInfo] = useState(null);

  
// ConfirmationPage.jsx - Add this useEffect for auto-navigation
useEffect(() => {
  if (orderState === 'seller_accepted' && orderData?._id) {
    console.log('🎉 Seller accepted! Auto-navigating to payment...');
    
    setTimeout(() => {
      navigate('/payment', {
        state: {
          item,
          selectedAddress,
          addresses,
          orderTotal,
          orderId,
          orderData: { 
            ...orderData, 
            orderStatus: 'seller_accepted',
            _id: orderData._id
          }
        }
      });
    }, 2000); // 2 second delay to show success message
  }
}, [orderState, orderData, navigate, item, selectedAddress, addresses, orderTotal, orderId]);
  // Socket listeners
// ConfirmationPage.jsx - Update useEffect for socket listeners


useEffect(() => {
  if (!socket || !connected || !orderData?._id) return;

  const orderMongoId = orderData._id;
  
  // Join order room
  socket.emit('join-order-room', orderMongoId);

  const handleStatusUpdate = (data) => {
    const isOurOrder = 
      data.orderMongoId === orderMongoId ||
      data._id === orderMongoId ||
      data.orderId === orderId;
    
    if (!isOurOrder) return;
    
    const newStatus = data.orderStatus || data.status;
    setOrderState(newStatus);
    
    // Handle rejection
    if (newStatus === 'seller_rejected' || newStatus === 'cancelled') {
      setCancellationInfo({
        reason: data.cancellationReason,
        cancelledBy: data.cancelledBy
      });
    }
  };

  // Listen to ALL status update events
  socket.on('seller-accepted-order', handleStatusUpdate);
  socket.on('order-status-updated', handleStatusUpdate);
  socket.on('status-update', handleStatusUpdate);

  return () => {
    socket.off('seller-accepted-order');
    socket.off('order-status-updated');
    socket.off('status-update');
    socket.emit('leave-order-room', orderMongoId);
  };
}, [socket, connected, orderData, orderId]);
  const renderContent = () => {
    switch (orderState) {
      case 'pending_seller':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6 animate-pulse">
              <Clock className="w-16 h-16 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Awaiting Restaurant Confirmation
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              The restaurant is reviewing your order...
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 max-w-md mx-auto">
              <p className="text-blue-800 text-sm">
                You'll be automatically redirected to payment once the restaurant confirms availability
              </p>
            </div>
            <div className="mt-8 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for response...</span>
            </div>
          </div>
        );

      case 'seller_accepted':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Order Confirmed! 🎉
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              Great news! The restaurant has confirmed your order.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <div className="flex items-center justify-center space-x-2 text-green-800">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Redirecting to payment...</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/payment', {
                state: {
                  item,
                  selectedAddress,
                  addresses,
                  orderTotal,
                  orderId,
                  orderData: { ...orderData, orderStatus: 'seller_accepted' }
                }
              })}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl text-lg flex items-center justify-center mx-auto space-x-3 shadow-lg transform transition hover:scale-105"
            >
              <CreditCard className="w-6 h-6" />
              <span>Proceed to Payment Now</span>
            </button>
          </div>
        );

      case 'seller_rejected':
      case 'cancelled':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Declined</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto mb-6">
              <p className="text-red-800 font-medium mb-2">Reason:</p>
              <p className="text-red-700">
                {cancellationInfo?.reason || 'Restaurant was unable to accept your order'}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg shadow-lg transform transition hover:scale-105"
            >
              Browse Other Restaurants
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading order status...</p>
          </div>
        );
    }
  };

  if (!orderData || !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load order details</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          {/* Connection Status */}
          <div className="flex justify-end mb-6">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span>{connected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          {renderContent()}
          
          {/* Order Details */}
          <div className="mt-12 border-t pt-8">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">Order Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Item:</span>
                <span className="font-medium">{item?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant:</span>
                <span className="font-medium">{item?.restaurant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-orange-600">₹{orderTotal?.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium capitalize ${
                  orderState === 'seller_accepted' ? 'text-green-600' :
                  orderState === 'seller_rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {orderState.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;