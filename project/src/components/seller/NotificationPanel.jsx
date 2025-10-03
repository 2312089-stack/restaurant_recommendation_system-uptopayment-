import React from 'react';
import { X, ShoppingBag, CheckCircle, Clock, Trash2 } from 'lucide-react';

const NotificationPanel = ({ 
  notifications, 
  isOpen, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onClear,
  onRemove 
}) => {
  if (!isOpen) return null;

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diff = Math.floor((now - notifTime) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return notifTime.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new-order':
        return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      case 'order-confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-4 top-16 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
            {notifications.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-center">No notifications yet</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                You'll see new order notifications here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      {notification.order && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <p className="text-xs text-gray-500">
                            Order #{notification.order.orderId?.slice(-8)}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {notification.order.item?.name}
                          </p>
                          <p className="text-sm text-orange-600 font-semibold">
                            ₹{notification.order.totalAmount}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                      
                      {!notification.read && (
                        <span className="inline-block mt-1 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;