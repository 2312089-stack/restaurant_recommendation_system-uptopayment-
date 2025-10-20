import React from 'react';
import { Bell, X, Check, Package, Truck, ChefHat, Clock, AlertCircle, Gift, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = ({ 
  isOpen, 
  onClose, 
  notifications = [], 
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNotificationClick,
  loading 
}) => {
  const navigate = useNavigate();
  
  const getNotificationIcon = (type) => {
    const iconMap = {
      'order_selleraccepted': <Check className="w-5 h-5 text-green-500" />,
      'order_paymentcompleted': <Check className="w-5 h-5 text-blue-500" />,
      'order_preparing': <ChefHat className="w-5 h-5 text-orange-500" />,
      'order_ready': <Package className="w-5 h-5 text-purple-500" />,
      'order_outfordelivery': <Truck className="w-5 h-5 text-blue-600" />,
      'order_delivered': <Check className="w-5 h-5 text-green-600" />,
      'order_cancelled': <X className="w-5 h-5 text-red-500" />,
      'order_sellerrejected': <AlertCircle className="w-5 h-5 text-red-600" />,
      'seller-accepted': <Check className="w-5 h-5 text-green-500" />,
      'status-update': <Package className="w-5 h-5 text-blue-500" />,
      'new-order': <Bell className="w-5 h-5 text-orange-500" />,
      'reorder_suggestion': <TrendingUp className="w-5 h-5 text-purple-500" />,
      'discount_offer': <Gift className="w-5 h-5 text-pink-500" />,
      'new_restaurant': <Star className="w-5 h-5 text-yellow-500" />,
      'time_based_promo': <Clock className="w-5 h-5 text-blue-400" />,
      'general': <Bell className="w-5 h-5 text-gray-500" />
    };
    return iconMap[type] || iconMap['general'];
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      'order_selleraccepted': 'bg-green-50 border-green-200',
      'order_paymentcompleted': 'bg-blue-50 border-blue-200',
      'order_preparing': 'bg-orange-50 border-orange-200',
      'order_ready': 'bg-purple-50 border-purple-200',
      'order_outfordelivery': 'bg-blue-50 border-blue-200',
      'order_delivered': 'bg-green-50 border-green-200',
      'order_cancelled': 'bg-red-50 border-red-200',
      'order_sellerrejected': 'bg-red-50 border-red-200',
      'seller-accepted': 'bg-green-50 border-green-200',
      'status-update': 'bg-blue-50 border-blue-200',
      'new-order': 'bg-orange-50 border-orange-200',
      'reorder_suggestion': 'bg-purple-50 border-purple-200',
      'discount_offer': 'bg-pink-50 border-pink-200',
      'new_restaurant': 'bg-yellow-50 border-yellow-200',
      'time_based_promo': 'bg-blue-50 border-blue-200',
      'general': 'bg-gray-50 border-gray-200'
    };
    return colorMap[type] || colorMap['general'];
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationTime.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification._id || notification.id);
    }

    // Navigate if there's an action URL
    if (notification.data?.actionUrl) {
      navigate(notification.data.actionUrl);
      onClose();
    } else if (notification.orderMongoId) {
      navigate(`/order-tracking/${notification.orderMongoId}`);
      onClose();
    } else if (notification.orderId) {
      navigate('/order-history');
      onClose();
    }

    // Call custom handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative">
      {/* Mobile Overlay */}
      <div 
        className="lg:hidden fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-orange-100 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Mark all as read
            </button>
            <button
              onClick={() => {
                if (window.confirm('Clear all notifications?')) {
                  notifications.forEach(n => onDelete && onDelete(n._id || n.id));
                }
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification._id || notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${getNotificationColor(notification.type)} border-l-4`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Order Details */}
                      {(notification.orderId || notification.data?.orderId) && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Order #{notification.data?.orderId || notification.orderId}
                        </div>
                      )}

                      {/* Cancellation Reason */}
                      {notification.cancellationReason && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          Reason: {notification.cancellationReason}
                        </div>
                      )}

                      {/* Action Button */}
                      {(notification.data?.actionUrl || notification.orderMongoId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                          className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          View Details →
                        </button>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(notification.timestamp || notification.createdAt)}
                        </p>
                        
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(notification._id || notification.id, e);
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600 text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NotificationPanel;