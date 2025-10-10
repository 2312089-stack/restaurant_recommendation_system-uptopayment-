import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Package, CheckCircle, Clock, 
  Truck, Home, XCircle, AlertCircle, Loader2,
  MapPin, Phone, User, Calendar, Star, MessageSquare
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const API_BASE_URL = 'http://localhost:5000/api';

const OrderTrackingTimeline = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showRating = searchParams.get('rate') === 'true';
  const { socket, connected } = useSocket();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Rating state
  const [showRatingModal, setShowRatingModal] = useState(showRating);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/order-history/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order || data.history?.orderMongoId);
      } else {
        setError(data.error || 'Failed to load order');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // Listen for real-time status updates
  useEffect(() => {
    if (!socket || !connected || !order) return;

    const handleStatusUpdate = (data) => {
      console.log('📦 Status update received:', data);
      
      if (data.orderMongoId === order._id || data.orderId === order.orderId) {
        fetchOrderDetails();
      }
    };

    socket.on('order-status-updated', handleStatusUpdate);
    socket.on('seller-accepted-order', handleStatusUpdate);

    return () => {
      socket.off('order-status-updated', handleStatusUpdate);
      socket.off('seller-accepted-order', handleStatusUpdate);
    };
  }, [socket, connected, order]);

  // Submit rating
  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      setSubmittingRating(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/order-history/${orderId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: rating, review })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowRatingModal(false);
        fetchOrderDetails(); // Refresh to show rating
        alert('Thank you for your rating!');
      } else {
        alert(data.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Submit rating error:', err);
      alert('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Get timeline data based on order status
  const getTimeline = () => {
    if (!order) return [];

    const timeline = [];
    const status = order.orderStatus || order.status;

    const statuses = {
      'pending_seller': { 
        label: 'Order Placed', 
        desc: 'Waiting for restaurant confirmation',
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      },
      'seller_accepted': { 
        label: 'Order Confirmed', 
        desc: 'Restaurant accepted your order',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'preparing': { 
        label: 'Preparing', 
        desc: 'Your food is being prepared',
        icon: Package,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      },
      'ready': { 
        label: 'Ready for Pickup', 
        desc: 'Order is ready',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'out_for_delivery': { 
        label: 'Out for Delivery', 
        desc: 'Your order is on the way',
        icon: Truck,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      'delivered': { 
        label: 'Delivered', 
        desc: 'Order delivered successfully',
        icon: Home,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'seller_rejected': { 
        label: 'Order Rejected', 
        desc: order.cancellationReason || 'Restaurant declined your order',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      },
      'cancelled': { 
        label: 'Cancelled', 
        desc: order.cancellationReason || 'Order was cancelled',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      }
    };

    const statusOrder = ['pending_seller', 'seller_accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);

    if (status === 'seller_rejected' || status === 'cancelled') {
      timeline.push({
        ...statuses['pending_seller'],
        completed: true,
        timestamp: order.createdAt
      });
      timeline.push({
        ...statuses[status],
        timestamp: order.cancelledAt || order.sellerResponse?.rejectedAt
      });
      return timeline;
    }

    statusOrder.forEach((s, index) => {
      if (index <= currentIndex) {
        timeline.push({
          ...statuses[s],
          completed: index < currentIndex,
          active: index === currentIndex,
          timestamp: getTimestampForStatus(s)
        });
      }
    });

    return timeline;
  };

  const getTimestampForStatus = (status) => {
    if (!order) return null;

    const statusMap = {
      'pending_seller': order.createdAt,
      'seller_accepted': order.sellerResponse?.acceptedAt,
      'preparing': order.orderTimeline?.find(t => t.status === 'preparing')?.timestamp,
      'ready': order.orderTimeline?.find(t => t.status === 'ready')?.timestamp,
      'out_for_delivery': order.orderTimeline?.find(t => t.status === 'out_for_delivery')?.timestamp,
      'delivered': order.actualDeliveryTime
    };

    return statusMap[status];
  };

  const formatDate = (date) => {
    if (!date) return 'Pending';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
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
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Order</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/order-history')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const timeline = getTimeline();
  const isRejectedOrCancelled = ['seller_rejected', 'cancelled'].includes(order.orderStatus);
  const canRate = order.orderStatus === 'delivered' && !order.rating;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/order-history')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Order Details</span>
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Order Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Order #{order.orderId}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isRejectedOrCancelled 
                ? 'bg-red-100 text-red-800' 
                : order.orderStatus === 'delivered'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
            }`}>
              {order.orderStatus === 'pending_seller' ? 'Pending Confirmation' :
               order.orderStatus === 'seller_accepted' ? 'Confirmed' :
               order.orderStatus === 'seller_rejected' ? 'Rejected' :
               order.orderStatus === 'cancelled' ? 'Cancelled' :
               order.orderStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>

          {/* Item Details */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img
              src={order.item?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80'}
              alt={order.item?.name}
              className="w-20 h-20 rounded-lg object-cover"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80';
              }}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{order.item?.name}</h3>
              <p className="text-sm text-gray-600">{order.item?.restaurant}</p>
              <p className="text-sm text-gray-500 mt-1">Quantity: {order.item?.quantity || 1}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">₹{order.totalAmount}</p>
              <p className="text-xs text-gray-500">{order.paymentMethod?.toUpperCase()}</p>
              
              {/* Show existing rating */}
              {order.rating && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{order.rating}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rate button for delivered orders */}
          {canRate && !showRatingModal && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Rate this Order
            </button>
          )}
        </div>

        {/* Expected Delivery Card */}
        {!isRejectedOrCancelled && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {order.orderStatus === 'delivered' ? 'Delivered' : 'Expected Delivery'}
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  {order.estimatedDelivery || '25-30 minutes'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Timeline</h3>

          <div className="relative">
            {timeline.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === timeline.length - 1;

              return (
                <div key={index} className="relative pb-8">
                  {!isLast && (
                    <div className={`absolute left-5 top-12 h-full w-0.5 ${
                      item.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                      item.completed 
                        ? 'bg-green-500 text-white' 
                        : item.active 
                          ? item.bgColor + ' ' + item.color
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 pt-1">
                      <h4 className={`font-semibold ${
                        item.completed || item.active ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {item.label}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        item.completed || item.active ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {item.desc}
                      </p>
                      {item.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(item.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                <p className="text-sm text-gray-600 mt-1">{order.deliveryAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Customer Name</p>
                <p className="text-sm text-gray-600">{order.customerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Phone Number</p>
                <p className="text-sm text-gray-600">{order.customerPhone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Details</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Item Total</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.itemPrice || order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.deliveryFee || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform Fee</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.platformFee || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST</span>
              <span className="text-gray-900">₹{order.orderBreakdown?.gst || 0}</span>
            </div>
            
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-orange-600 text-lg">₹{order.totalAmount}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Paid via {order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Rate Your Order</h3>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-10 h-10 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-gray-600 mb-4">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}

            {/* Review Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write a review (optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
                disabled={submittingRating}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={rating === 0 || submittingRating}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;