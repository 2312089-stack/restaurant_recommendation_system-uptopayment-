import React from 'react';
import { Bell, X, Check, Package, Truck, ChefHat, Clock, AlertCircle, Gift, Star, TrendingUp, Heart } from 'lucide-react';

const UserNotificationPanel = ({ 
  notifications = [], 
  isOpen, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClear,
  onNotificationClick 
}) => {
  
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

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative">
      {/* Mobile Overlay */}
      <div 
        className="lg:hidden fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
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
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Mark all as read
            </button>
            <button
              onClick={onClear}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-sm text-gray-500">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => {
                    if (!notification.read) {
                      onMarkAsRead(notification._id);
                    }
                    if (onNotificationClick && notification.data?.actionUrl) {
                      onNotificationClick(notification);
                    }
                  }}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
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
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Order Details */}
                      {notification.data?.orderId && (
                        <div className="mt-2 text-xs text-gray-500">
                          Order #{notification.data.orderId}
                        </div>
                      )}

                      {/* Action Button */}
                      {notification.data?.actionUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNotificationClick) {
                              onNotificationClick(notification);
                            }
                          }}
                          className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          View Details →
                        </button>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
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

export default UserNotificationPanel;