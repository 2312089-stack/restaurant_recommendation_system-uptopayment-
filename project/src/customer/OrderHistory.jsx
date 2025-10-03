import React, { useState, useEffect } from 'react';
import { 
  Package, Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp,
  Star, ArrowLeft, Filter, MapPin, Phone, AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const OrderHistory = ({ onBack, onNavigateBack }) => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('=== AUTH CHECK ===');
    console.log('Token exists:', !!token);
    
    if (!token) {
      setError('Please login to view order history');
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }
    
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrderHistory();
      loadStats();
    }
  }, [statusFilter, isAuthenticated]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const headers = getAuthHeaders();
      // ✅ CORRECTED URL
      const url = `${API_BASE}/orders/history?status=${statusFilter}`;
      
      console.log('=== LOADING ORDER HISTORY ===');
      console.log('URL:', url);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers 
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (data.success) {
        const fetchedOrders = data.orders || [];
        console.log('✅ Total orders fetched:', fetchedOrders.length);
        setOrders(fetchedOrders);
        setError('');
      } else {
        setError(data.error || 'Failed to load order history');
        setOrders([]);
      }
    } catch (err) {
      console.error('❌ Load order history error:', err);
      if (err.message === 'No authentication token found') {
        setError('Please login to view order history');
        setIsAuthenticated(false);
      } else if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Check if backend is running on port 5000.');
      } else {
        setError(err.message || 'Failed to load order history');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const headers = getAuthHeaders();
      // ✅ CORRECTED URL
      const response = await fetch(`${API_BASE}/orders/stats/summary`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.warn('Failed to load stats:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const handleReorder = async (orderId) => {
    try {
      const headers = getAuthHeaders();
      // ✅ CORRECTED URL
      const response = await fetch(`${API_BASE}/orders/${orderId}/reorder`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        for (const item of data.items) {
          await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              dishId: item.dishId,
              quantity: item.quantity
            })
          });
        }
        
        alert('Items added to cart! Proceed to checkout.');
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        alert(data.error || 'Failed to reorder');
      }
    } catch (err) {
      console.error('Reorder error:', err);
      alert('Failed to reorder: ' + err.message);
    }
  };

  const handleLogin = () => {
    if (onBack) onBack();
    if (onNavigateBack) onNavigateBack();
    window.location.href = '/';
  };

  const getStatusColor = (status) => {
    const colors = {
      'delivered': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100',
      'confirmed': 'text-blue-600 bg-blue-100',
      'pending': 'text-yellow-600 bg-yellow-100',
      'preparing': 'text-orange-600 bg-orange-100',
      'ready': 'text-purple-600 bg-purple-100',
      'out_for_delivery': 'text-indigo-600 bg-indigo-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'confirmed': 'Confirmed',
      'pending': 'Pending',
      'preparing': 'Preparing',
      'ready': 'Ready for Pickup',
      'out_for_delivery': 'Out for Delivery'
    };
    return labels[status] || status;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please login to view your order history</p>
          <button
            onClick={handleLogin}
            className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack || onNavigateBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
                <p className="text-sm text-gray-500">View all your past orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                </div>
                <Package className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.active || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-orange-600">₹{stats.totalSpent || 0}</p>
                </div>
                <Star className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2 flex-wrap">
              {['all', 'active', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={loadOrderHistory}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-800"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {statusFilter === 'all' 
                ? "You haven't placed any orders yet"
                : `No ${statusFilter} orders found`
              }
            </p>
            <button
              onClick={onBack || onNavigateBack}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.orderStatus || order.status)}`}>
                        {getStatusIcon(order.orderStatus || order.status)}
                        <span>{getStatusLabel(order.orderStatus || order.status)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Order #{order.orderId}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₹{order.total}</p>
                      <p className="text-sm text-gray-500">{order.paymentMethod?.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {order.items?.[0]?.dishImage && (
                        <img
                          src={`http://localhost:5000${order.items[0].dishImage}`}
                          alt={order.items[0].dishName}
                          className="w-16 h-16 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.src = 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400';
                          }}
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{order.restaurantName}</p>
                        <p className="text-sm text-gray-600">
                          {order.items?.[0]?.dishName} {order.items?.length > 1 && `+${order.items.length - 1} more`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedOrder === order._id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {expandedOrder === order._id && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.dishName} × {item.quantity}
                            </span>
                            <span className="text-gray-900">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">₹{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="text-gray-900">₹{order.deliveryFee}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Taxes</span>
                          <span className="text-gray-900">₹{order.taxes}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t">
                          <span>Total</span>
                          <span className="text-orange-600">₹{order.total}</span>
                        </div>
                      </div>
                      {order.deliveryAddress && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Delivery Address
                          </p>
                          <p className="text-sm text-gray-600">{order.deliveryAddress.address}</p>
                          {order.deliveryAddress.phoneNumber && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="w-4 h-4 mr-1" />
                              {order.deliveryAddress.phoneNumber}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex space-x-3">
                  {(order.orderStatus === 'delivered' || order.status === 'delivered') && (
                    <>
                      <button
                        onClick={() => handleReorder(order._id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Reorder</span>
                      </button>
                      <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                        <Star className="w-4 h-4" />
                        <span>Rate Order</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;