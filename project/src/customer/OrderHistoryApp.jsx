import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, CheckCircle, Clock, Truck, Home,
  XCircle, Phone, MapPin, User, Star, ChevronRight,
  Loader2, AlertCircle, RefreshCw, ChefHat, Search, Filter
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const API_BASE = 'http://localhost:5000/api';

// Helper to get image URL
const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80';
  return path.startsWith('http') ? path : `${API_BASE.replace('/api', '')}/${path}`;
};

// ============= CANCEL ORDER MODAL COMPONENT =============
const CancelOrderModal = ({ order, onClose, onCancelled }) => {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const predefinedReasons = [
    'Changed my mind',
    'Ordered by mistake',
    'Found a better option',
    'Delivery taking too long',
    'Restaurant not responding',
    'Other'
  ];

  const handleCancel = async () => {
    if (!reason || reason.trim() === '') {
      setError('Please select a cancellation reason');
      return;
    }

    setCancelling(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const orderId = order.orderId || order._id;

      console.log('🚫 Cancelling order:', orderId);

      const response = await fetch(`${API_BASE}/order-history/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Order cancelled successfully');
        onClose();
        if (onCancelled) onCancelled();
        alert('Order cancelled successfully. Any payment will be refunded.');
      } else {
        setError(data.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cancel Order?</h3>
            <p className="text-sm text-gray-600">Please select a reason</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Reason Selection */}
        <div className="space-y-2 mb-6">
          {predefinedReasons.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                reason === r 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={(e) => setReason(e.target.value)}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{r}</span>
            </label>
          ))}
        </div>

        {/* Custom Reason (if Other is selected) */}
        {reason === 'Other' && (
          <div className="mb-6">
            <textarea
              placeholder="Please specify your reason..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={!reason || cancelling}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Order'
            )}
          </button>
        </div>

        {/* Refund Info */}
        {order.paymentStatus === 'completed' && (
          <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-xs text-blue-700">
              💡 Your payment will be refunded within 5-7 business days
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= ORDER HISTORY PAGE (Main View) =============
const OrderHistoryPage = ({ onOrderClick, onBack }) => {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [summary, setSummary] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleUpdate = (data) => {
      console.log('📦 Real-time order update:', data);
      fetchOrders(); // Refresh orders
    };

    socket.on('order-status-updated', handleUpdate);
    socket.on('seller-accepted-order', handleUpdate);
    socket.on('order-rejected', handleUpdate);
    socket.on('order-cancelled', handleUpdate);

    return () => {
      socket.off('order-status-updated', handleUpdate);
      socket.off('seller-accepted-order', handleUpdate);
      socket.off('order-rejected', handleUpdate);
      socket.off('order-cancelled', handleUpdate);
    };
  }, [socket, connected]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/order-history?status=${filterStatus}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending_seller': { text: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'seller_accepted': { text: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      'seller_rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      'preparing': { text: 'Preparing', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ChefHat },
      'ready': { text: 'Ready for Pickup', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'out_for_delivery': { text: 'Out for Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
      'delivered': { text: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200', icon: Home },
      'cancelled': { text: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
    };
    return badges[status] || badges['pending_seller'];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => 
    searchQuery ? 
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.snapshot?.dishName?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your orders...</p>
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
            <button onClick={onBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold text-lg">My Orders</span>
            </button>
            <button onClick={fetchOrders} className="p-2 hover:bg-gray-100 rounded-full">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalOrders || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{summary.delivered || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Pending</p>
              <p className="text-2xl font-bold text-blue-600">{summary.pending || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-orange-600">₹{summary.totalSpent || 0}</p>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search your orders here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'pending_seller', 'seller_accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-100">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">Start ordering your favorite dishes!</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const badge = getStatusBadge(order.currentStatus);
              const BadgeIcon = badge.icon;
              const canCancel = order.currentStatus === 'pending_seller';
              
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4 mb-3">
                      <img
                        src={getImageUrl(order.snapshot?.dishImage)}
                        alt={order.snapshot?.dishName}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {order.snapshot?.dishName || 'Dish'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {order.snapshot?.restaurantName || 'Restaurant'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color} flex items-center gap-1 whitespace-nowrap`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.text}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          Order #{order.orderId} • {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{order.snapshot?.totalAmount || 0}
                        </p>
                      </div>
                      <button 
                        onClick={() => onOrderClick(order.orderId)}
                        className="flex items-center gap-2 text-orange-500 font-medium hover:text-orange-600"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Status-specific actions */}
                    {order.currentStatus === 'pending_seller' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded flex-1">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span>Waiting for restaurant confirmation...</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setShowCancelModal(true);
                            }}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {order.currentStatus === 'out_for_delivery' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          <Truck className="w-4 h-4" />
                          <span>Your order is on the way!</span>
                        </div>
                      </div>
                    )}

                    {order.currentStatus === 'delivered' && !order.rating?.score && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                          <Star className="w-4 h-4" />
                          Rate this Order
                        </button>
                      </div>
                    )}

                    {order.currentStatus === 'seller_rejected' && (
  <div className="mt-3 pt-3 border-t border-gray-100">
    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded">
      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Order Rejected</p>
        <p className="text-xs mt-1">{order.cancellationReason || 'Restaurant declined your order'}</p>
      </div>
    </div>
  </div>
)}

                    {order.currentStatus === 'cancelled' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Order Cancelled</p>
                            <p className="text-xs mt-1">{order.cancellationReason || 'Order was cancelled'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <CancelOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedOrder(null);
          }}
          onCancelled={() => {
            fetchOrders();
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

// ============= ORDER DETAILS PAGE =============
const OrderDetailsPage = ({ orderId, onBack, onTrackClick }) => {
  const { socket, connected } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    
    const handleUpdate = (event) => {
      console.log('Order update received:', event.detail);
      fetchOrderDetails();
    };
    
    window.addEventListener('order-status-updated', handleUpdate);
    window.addEventListener('seller-accepted-order', handleUpdate);
    
    return () => {
      window.removeEventListener('order-status-updated', handleUpdate);
      window.removeEventListener('seller-accepted-order', handleUpdate);
    };
  }, [orderId]);

  // Socket listener
  useEffect(() => {
    if (!socket || !connected || !order) return;

    const handleSocketUpdate = (data) => {
      if (data.orderMongoId === order._id || data.orderId === order.orderId) {
        fetchOrderDetails();
      }
    };

    socket.on('order-status-updated', handleSocketUpdate);
    socket.on('seller-accepted-order', handleSocketUpdate);

    return () => {
      socket.off('order-status-updated', handleSocketUpdate);
      socket.off('seller-accepted-order', handleSocketUpdate);
    };
  }, [socket, connected, order]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/order-history/${orderId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setOrder(data.order || data.history?.orderMongoId);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Order not found</p>
          <button onClick={onBack} className="text-orange-500 font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      'pending_seller': { text: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-800' },
      'seller_accepted': { text: 'Order Confirmed', color: 'bg-blue-100 text-blue-800' },
      'seller_rejected': { text: 'Order Rejected', color: 'bg-red-100 text-red-800' },
      'preparing': { text: 'Preparing', color: 'bg-purple-100 text-purple-800' },
      'ready': { text: 'Ready for Pickup', color: 'bg-green-100 text-green-800' },
      'out_for_delivery': { text: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' },
      'delivered': { text: 'Delivered', color: 'bg-green-100 text-green-800' },
      'cancelled': { text: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[status] || badges['pending_seller'];
  };

  const badge = getStatusBadge(order.orderStatus);
  const canCancel = order.orderStatus === 'pending_seller';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-lg">Order Details</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Dish Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <img
              src={getImageUrl(order.item?.image)}
              alt={order.item?.name}
              className="w-20 h-20 rounded-lg object-cover"
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80'; }}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{order.item?.name}</h3>
              <p className="text-sm text-gray-600">{order.item?.restaurant}</p>
              <p className="text-sm text-gray-500 mt-1">Quantity: {order.item?.quantity || 1}</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className={`bg-white rounded-lg shadow-sm p-6 border-2 ${
          order.orderStatus === 'pending_seller' ? 'border-yellow-200' :
          order.orderStatus === 'seller_rejected' || order.orderStatus === 'cancelled' ? 'border-red-200' :
          'border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{badge.text}</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.color}`}>
              {badge.text}
            </span>
          </div>
          
          {order.orderStatus === 'pending_seller' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                ⏳ Waiting for restaurant to confirm your order. This usually takes 2-5 minutes.
              </p>
            </div>
          )}

          {order.orderStatus === 'seller_rejected' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-800 font-medium">Restaurant declined your order</p>
              <p className="text-xs text-red-700 mt-1">{order.cancellationReason}</p>
            </div>
          )}

          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Cancel Order
            </button>
          )}

          {!canCancel && !['seller_rejected', 'cancelled'].includes(order.orderStatus) && (
            <button 
              onClick={() => onTrackClick(orderId)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Track Order
            </button>
          )}
        </div>

        {/* Delivery Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Delivery details</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Delivery Address</p>
                <p className="text-sm text-gray-600">{order.deliveryAddress || 'Address'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <p className="text-gray-900">{order.customerName}</p>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <p className="text-gray-900">{order.customerPhone}</p>
            </div>
          </div>
        </div>

        {/* Price Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Price details</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Listing price</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.itemPrice || order.totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.deliveryFee || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.platformFee || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.gst || 0}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total amount</span>
                <span className="font-bold text-orange-600 text-lg">₹{order.totalAmount}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Payment: {order.paymentMethod === 'razorpay' ? 'Online' : 'Cash on Delivery'} 
                ({order.paymentStatus === 'completed' ? 'Paid' : 'Pending'})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelOrderModal
          order={order}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            fetchOrderDetails();
            setShowCancelModal(false);
          }}
        />
      )}
    </div>
  );
};

// ============= ORDER TRACKING PAGE =============
const OrderTrackingPage = ({ orderId, onBack }) => {
  const { socket, connected } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
    
    const handleUpdate = (event) => {
      fetchOrderDetails();
    };
    
    window.addEventListener('order-status-updated', handleUpdate);
    window.addEventListener('seller-accepted-order', handleUpdate);
    
    return () => {
      window.removeEventListener('order-status-updated', handleUpdate);
      window.removeEventListener('seller-accepted-order', handleUpdate);
    };
  }, [orderId]);

  // Socket listener
  useEffect(() => {
    if (!socket || !connected || !order) return;

    const handleSocketUpdate = (data) => {
      if (data.orderMongoId === order._id || data.orderId === order.orderId) {
        fetchOrderDetails();
      }
    };

    socket.on('order-status-updated', handleSocketUpdate);
    socket.on('seller-accepted-order', handleSocketUpdate);

    return () => {
      socket.off('order-status-updated', handleSocketUpdate);
      socket.off('seller-accepted-order', handleSocketUpdate);
    };
  }, [socket, connected, order]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/order-history/${orderId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setOrder(data.order || data.history?.orderMongoId);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <button onClick={onBack} className="text-orange-500 font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  // Get timeline based on current status
  const getTimeline = () => {
    const timeline = [];
    const status = order.orderStatus;

    const statusConfig = {
      'pending_seller': { label: 'Order Placed', icon: Clock, color: 'yellow' },
      'seller_accepted': { label: 'Order Confirmed', icon: CheckCircle, color: 'green' },
      'preparing': { label: 'Preparing', icon: ChefHat, color: 'blue' },
      'ready': { label: 'Ready', icon: CheckCircle, color: 'green' },
      'out_for_delivery': { label: 'Out for Delivery', icon: Truck, color: 'orange' },
      'delivered': { label: 'Delivered', icon: Home, color: 'green' }
    };

    const statusOrder = ['pending_seller', 'seller_accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);

    statusOrder.forEach((s, index) => {
      const config = statusConfig[s];
      timeline.push({
        ...config,
        completed: index < currentIndex,
        active: index === currentIndex,
        pending: index > currentIndex
      });
    });

    return timeline;
  };

  const timeline = getTimeline();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-lg">Order Timeline</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
          <p className="text-gray-600 mb-6">Order #{order.orderId}</p>

          {/* Timeline */}
          <div className="space-y-4">
            {timeline.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === timeline.length - 1;

              return (
                <div key={index} className="relative">
                  {!isLast && (
                    <div className={`absolute left-5 top-12 h-12 w-0.5 ${
                      item.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}

                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.completed 
                        ? 'bg-green-500 text-white' 
                        : item.active 
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        item.completed || item.active ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {item.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= MAIN APP COMPONENT =============
const OrderHistoryApp = () => {
  const [currentView, setCurrentView] = useState('history');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const handleOrderClick = (orderId) => {
    setSelectedOrderId(orderId);
    setCurrentView('details');
  };

  const handleTrackClick = (orderId) => {
    setSelectedOrderId(orderId);
    setCurrentView('tracking');
  };

  const handleBack = () => {
    if (currentView === 'tracking') {
      setCurrentView('details');
    } else {
      setCurrentView('history');
      setSelectedOrderId(null);
    }
  };

  const handleBackToHome = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'history' && (
        <OrderHistoryPage 
          onOrderClick={handleOrderClick}
          onBack={handleBackToHome}
        />
      )}
      
      {currentView === 'details' && selectedOrderId && (
        <OrderDetailsPage 
          orderId={selectedOrderId}
          onBack={handleBack}
          onTrackClick={handleTrackClick}
        />
      )}
      
      {currentView === 'tracking' && selectedOrderId && (
        <OrderTrackingPage 
          orderId={selectedOrderId}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default OrderHistoryApp;