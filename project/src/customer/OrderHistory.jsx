import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Clock, Check, Truck, 
  ChefHat, AlertCircle, Package, XCircle, RefreshCw 
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const API_BASE_URL = 'http://localhost:5000/api';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState(new Set()); // ✅ Track joined rooms
// Try the debug endpoint first to see what's in the database
      
  // ✅ Fetch orders function - wrapped in useCallback
  const fetchOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('authToken') ||
                   localStorage.getItem('customerToken');
      
      if (!token) {
        setError('Please login to view your orders');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      if (data.success && data.orders) {
        const sortedOrders = data.orders.sort((a, b) => {
          const statusA = a.orderStatus || a.status;
          const statusB = b.orderStatus || b.status;
          
          if (statusA === 'cancelled' && statusB !== 'cancelled') return 1;
          if (statusA !== 'cancelled' && statusB === 'cancelled') return -1;
          
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]); // ✅ Only navigate as dependency

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ✅ FIXED: Socket.IO real-time updates - Proper cleanup and room management
  useEffect(() => {
    if (!socket || !connected) {
      console.log('Socket not ready for order history updates');
      return;
    }

    console.log('Setting up real-time order updates');

    // Join user room once
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const customerEmail = payload.email || payload.emailId;
        
        if (customerEmail) {
          socket.emit('join', `user-${customerEmail}`);
          console.log('Joined user room:', `user-${customerEmail}`);
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // ✅ Join order rooms ONLY for NEW orders
    const newRooms = new Set();
    orders.forEach(order => {
      if (order._id && !joinedRooms.has(order._id)) {
        socket.emit('join-order-room', order._id);
        newRooms.add(order._id);
        console.log('Joined order room:', order._id);
      }
    });
    
    // Update joined rooms tracker
    if (newRooms.size > 0) {
      setJoinedRooms(prev => new Set([...prev, ...newRooms]));
    }

    // ✅ Handle status updates
    const handleStatusUpdate = (data) => {
      console.log('Received order status update:', data);
      
      setOrders(prevOrders => {
        const updated = prevOrders.map(order => {
          if (order._id === data.orderMongoId || 
              order._id === data._id || 
              order.orderId === data.orderId) {
            
            console.log('Updating order:', order.orderId);
            
            return {
              ...order,
              orderStatus: data.status,
              status: data.status,
              cancellationReason: data.cancellationReason || order.cancellationReason,
              cancelledBy: data.cancelledBy || order.cancelledBy,
              cancelledAt: data.cancelledAt || order.cancelledAt,
              estimatedDelivery: data.estimatedDelivery || order.estimatedDelivery,
              actualDeliveryTime: data.actualDeliveryTime || order.actualDeliveryTime,
              refundStatus: data.refundStatus || order.refundStatus,
              refundAmount: data.refundAmount || order.refundAmount,
              updatedAt: new Date().toISOString()
            };
          }
          return order;
        });
        
        // ✅ Re-sort after update
        return updated.sort((a, b) => {
          const statusA = a.orderStatus || a.status;
          const statusB = b.orderStatus || b.status;
          
          if (statusA === 'cancelled' && statusB !== 'cancelled') return 1;
          if (statusA !== 'cancelled' && statusB === 'cancelled') return -1;
          
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      });

      // Update selected order
      setSelectedOrder(prevSelected => {
        if (!prevSelected) return null;
        
        if (prevSelected._id === data.orderMongoId || 
            prevSelected._id === data._id || 
            prevSelected.orderId === data.orderId) {
          return {
            ...prevSelected,
            orderStatus: data.status,
            status: data.status,
            cancellationReason: data.cancellationReason || prevSelected.cancellationReason,
            cancelledBy: data.cancelledBy || prevSelected.cancelledBy,
            cancelledAt: data.cancelledAt || prevSelected.cancelledAt,
            estimatedDelivery: data.estimatedDelivery || prevSelected.estimatedDelivery,
            actualDeliveryTime: data.actualDeliveryTime || prevSelected.actualDeliveryTime,
            refundStatus: data.refundStatus || prevSelected.refundStatus,
            refundAmount: data.refundAmount || prevSelected.refundAmount,
            updatedAt: new Date().toISOString()
          };
        }
        return prevSelected;
      });

      // Browser notification
      if (['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].includes(data.status)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Order Status Updated', {
            body: data.message || `Order ${data.status.replace('_', ' ')}`,
            icon: '/logo192.png'
          });
        }
      }
    };

    socket.on('order-status-updated', handleStatusUpdate);
    socket.on('status-update', handleStatusUpdate);

    // ✅ PROPER CLEANUP - Leave rooms on unmount
    return () => {
      console.log('Cleaning up socket listeners and leaving rooms');
      
      socket.off('order-status-updated', handleStatusUpdate);
      socket.off('status-update', handleStatusUpdate);
      
      // Leave all joined rooms
      orders.forEach(order => {
        if (order._id) {
          socket.emit('leave-order-room', order._id);
          console.log('Left order room:', order._id);
        }
      });
    };
  }, [socket, connected]); // ✅ FIXED: Removed orders.length dependency

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      confirmed: <Check className="w-4 h-4" />,
      preparing: <ChefHat className="w-4 h-4" />,
      ready: <Package className="w-4 h-4" />,
      out_for_delivery: <Truck className="w-4 h-4" />,
      delivered: <Check className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Package className="w-4 h-4" />;
  };

  const getStatusText = (status) => {
    const texts = {
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <Package className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Orders</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchOrders()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {connected ? 'Live' : 'Offline'}
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh orders"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">
              Start ordering delicious food and track your orders here
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = order.orderStatus || order.status;
              const isCancelled = status === 'cancelled';
              
              return (
                <div 
                  key={order._id} 
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                    isCancelled ? 'border-l-4 border-red-500' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="p-5">
                    {/* Cancellation Badge */}
                    {isCancelled && (
                      <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800 mb-1">
                              Order Cancelled {order.cancelledAt && `• ${formatDate(order.cancelledAt)}`}
                            </p>
                            <p className="text-sm text-red-700">
                              <strong>Reason:</strong> {order.cancellationReason || 'No reason provided'}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Cancelled by: {order.cancelledBy === 'seller' ? 'Restaurant' : 'You'}
                            </p>
                            {order.refundStatus && (
                              <p className="text-xs text-green-700 mt-2 flex items-center gap-1 bg-green-50 px-2 py-1 rounded"
>
                                <Check className="w-3 h-3" />
                                Refund {order.refundStatus} {order.refundAmount && `- ₹${order.refundAmount}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {order.item?.restaurant || 'Restaurant'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {getStatusText(status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.orderId}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          ₹{order.totalAmount}
                        </p>
                        <p className="text-xs text-gray-500">{order.paymentMethod?.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Order Item */}
                    <div className="flex gap-4">
                      <img
                        src={order.item?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                        alt={order.item?.name}
                        className={`w-20 h-20 rounded-lg object-cover ${isCancelled ? 'opacity-60 grayscale' : ''}`}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className={`font-medium ${isCancelled ? 'text-gray-500' : 'text-gray-900'}`}>
                          {order.item?.name || 'Food Item'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.item?.category} • Qty: {order.item?.quantity || 1}
                        </p>
                        {!isCancelled && order.estimatedDelivery && status !== 'delivered' && (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            Est: {order.estimatedDelivery}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal - Same as before */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-light"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.orderStatus || selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.orderStatus || selectedOrder.status)}
                  {getStatusText(selectedOrder.orderStatus || selectedOrder.status)}
                </span>
              </div>

              {(selectedOrder.orderStatus === 'cancelled' || selectedOrder.status === 'cancelled') && selectedOrder.cancellationReason && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-red-900 mb-2">Cancellation Details</p>
                      <p className="text-sm text-red-700 mb-2">
                        <strong>Reason:</strong> {selectedOrder.cancellationReason}
                      </p>
                      {selectedOrder.cancelledBy && (
                        <p className="text-xs text-red-600 mb-2">
                          Cancelled by: {selectedOrder.cancelledBy === 'seller' ? 'Restaurant' : 'You'}
                        </p>
                      )}
                      {selectedOrder.cancelledAt && (
                        <p className="text-xs text-red-600 mb-2">
                          Cancelled on: {formatDate(selectedOrder.cancelledAt)}
                        </p>
                      )}
                      {selectedOrder.refundStatus && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Refund Status: {selectedOrder.refundStatus}
                          </p>
                          {selectedOrder.refundAmount && (
                            <p className="text-xs text-green-700 mt-1">
                              Amount: ₹{selectedOrder.refundAmount}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{selectedOrder.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Placed on:</span>
                    <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium uppercase">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Item Details</h3>
                <div className="flex gap-4">
                  <img 
                    src={selectedOrder.item?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} 
                    alt={selectedOrder.item?.name} 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedOrder.item?.name}</h4>
                    <p className="text-sm text-gray-600">{selectedOrder.item?.restaurant}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.item?.category}</p>
                    <p className="text-sm font-medium mt-2">Quantity: {selectedOrder.item?.quantity}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Bill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item Total</span>
                    <span>₹{selectedOrder.orderBreakdown?.itemPrice || selectedOrder.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>₹{selectedOrder.orderBreakdown?.deliveryFee || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee</span>
                    <span>₹{selectedOrder.orderBreakdown?.platformFee || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST</span>
                    <span>₹{selectedOrder.orderBreakdown?.gst || 0}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold text-base">
                    <span>Total Paid</span>
                    <span className="text-orange-600">₹{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
                <p className="text-gray-700">{selectedOrder.deliveryAddress}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
