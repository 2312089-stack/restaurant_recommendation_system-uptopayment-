// Order Status Helper Utilities
// This file provides helper functions for managing order status display and behavior

/**
 * Get UI-friendly status from order
 * Handles both orderStatus and status fields
 */
export const getUIStatus = (order) => {
  return order?.orderStatus || order?.status || 'pending';
};

/**
 * Format status text for display
 */
export const formatStatusText = (status) => {
  const statusMap = {
    pending: 'Pending',
    pending_seller: 'Pending',
    seller_accepted: 'Confirmed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    seller_rejected: 'Rejected',
    cancelled: 'Cancelled'
  };
  return statusMap[status] || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get color classes for status badge
 */
export const getStatusColor = (status) => {
  const colorMap = {
    pending: 'bg-gray-100 text-gray-800',
    pending_seller: 'bg-gray-100 text-gray-800',
    seller_accepted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-purple-100 text-purple-800',
    out_for_delivery: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    seller_rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get icon component for status
 * Note: This returns icon names/identifiers, not actual React components
 * The component should map these to actual Lucide React icons
 */
export const getStatusIcon = (status) => {
  const iconMap = {
    pending: 'Clock',
    pending_seller: 'Clock',
    seller_accepted: 'Check',
    confirmed: 'Check',
    preparing: 'ChefHat',
    ready: 'Package',
    out_for_delivery: 'Truck',
    delivered: 'CheckCircle',
    seller_rejected: 'XCircle',
    cancelled: 'XCircle'
  };
  return iconMap[status] || 'Package';
};

/**
 * Check if order can be cancelled
 * Orders can be cancelled if they are in early stages
 */
export const canCancelOrder = (order) => {
  const status = getUIStatus(order);
  const cancellableStatuses = ['pending', 'pending_seller', 'seller_accepted', 'confirmed', 'preparing'];
  return cancellableStatuses.includes(status);
};

/**
 * Check if order can be rated
 * Only delivered orders can be rated
 */
export const canRateOrder = (order) => {
  const status = getUIStatus(order);
  return status === 'delivered' && !order.rating;
};

/**
 * Format order date for display
 */
export const formatOrderDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const orderDate = new Date(date);
    const now = new Date();
    const diffMs = now - orderDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 hour: show minutes
    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`;
    }
    
    // Less than 24 hours: show hours
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days: show days
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    // Otherwise: show full date
    return orderDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: orderDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Get estimated delivery time text
 */
export const getDeliveryTimeText = (order) => {
  const status = getUIStatus(order);
  
  if (status === 'delivered') {
    return order.actualDeliveryTime 
      ? `Delivered at ${formatOrderDate(order.actualDeliveryTime)}`
      : 'Delivered';
  }
  
  if (status === 'cancelled' || status === 'seller_rejected') {
    return 'Cancelled';
  }
  
  if (order.estimatedDelivery) {
    return `Est. ${order.estimatedDelivery}`;
  }
  
  return 'Calculating...';
};

/**
 * Get progress percentage for order
 */
export const getOrderProgress = (order) => {
  const status = order.orderStatus || order.status;
  
  const progressMap = {
    'pending': 5,
    'pending_seller': 10,
    'seller_accepted': 25,
    'confirmed': 25,
    'preparing': 50,
    'ready': 70,
    'out_for_delivery': 85,
    'delivered': 100,
    'seller_rejected': 0,
    'cancelled': 0
  };
  
  return progressMap[status] || 0;
};

/**
 * Get estimated time remaining
 */
export const getEstimatedTimeRemaining = (order) => {
  const status = order.orderStatus || order.status;
  
  if (status === 'delivered') return 'Delivered';
  if (status === 'cancelled' || status === 'seller_rejected') return 'N/A';
  
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const minutesElapsed = Math.floor((now - createdAt) / (1000 * 60));
  const estimatedTotal = 45; // 45 minutes total
  const remaining = Math.max(estimatedTotal - minutesElapsed, 0);
  
  if (remaining === 0) return 'Arriving soon';
  if (remaining < 5) return 'Arriving in a few minutes';
  return `${remaining} mins`;
};

/**
 * Sort orders by priority (active first, then by date)
 */
export const sortOrders = (orders) => {
  return [...orders].sort((a, b) => {
    const statusA = a.orderStatus || a.status;
    const statusB = b.orderStatus || b.status;
    
    // Priority order for sorting
    const priorityMap = {
      'pending': 0,
      'pending_seller': 1,
      'seller_accepted': 2,
      'confirmed': 3,
      'preparing': 4,
      'ready': 5,
      'out_for_delivery': 6,
      'delivered': 7,
      'seller_rejected': 8,
      'cancelled': 9
    };
    
    const priorityA = priorityMap[statusA] || 10;
    const priorityB = priorityMap[statusB] || 10;
    
    // If same priority, sort by date (newest first)
    if (priorityA === priorityB) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    
    return priorityA - priorityB;
  });
};

// Export all utilities
export default {
  getUIStatus,
  formatStatusText,
  getStatusColor,
  getStatusIcon,
  canCancelOrder,
  canRateOrder,
  formatOrderDate,
  getDeliveryTimeText,
  getOrderProgress,
  getEstimatedTimeRemaining,
  sortOrders
};