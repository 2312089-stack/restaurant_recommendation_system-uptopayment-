// backend/controllers/notificationController.js
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import User from '../models/User.js';

// ✅ Create notification
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      orderId: data.orderId,
      orderMongoId: data.orderMongoId,
      actionUrl: data.actionUrl,
      priority: data.priority || 'medium'
    });

    await notification.save();
    
    // Emit socket event if io is available
    const io = global.io;
    if (io) {
      io.to(userId.toString()).emit('new-notification', {
        notification: notification.toJSON()
      });
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// ✅ Send order status notification
export const sendOrderStatusNotification = async (orderId, status, userId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    const statusConfig = {
      'seller_accepted': {
        title: '🎉 Restaurant Accepted Your Order!',
        message: `Your order #${order.orderId} has been confirmed. Proceed with payment.`,
        priority: 'high',
        actionUrl: `/order-tracking/${orderId}`
      },
      'payment_completed': {
        title: '✅ Payment Successful',
        message: `Payment confirmed for order #${order.orderId}. Food is being prepared!`,
        priority: 'high',
        actionUrl: `/order-tracking/${orderId}`
      },
      'preparing': {
        title: '👨‍🍳 Your Food is Being Prepared',
        message: `The restaurant is cooking your order #${order.orderId}`,
        priority: 'medium',
        actionUrl: `/order-tracking/${orderId}`
      },
      'ready': {
        title: '✓ Order Ready for Pickup!',
        message: `Your order #${order.orderId} is ready and waiting for delivery`,
        priority: 'high',
        actionUrl: `/order-tracking/${orderId}`
      },
      'out_for_delivery': {
        title: '🚗 Order is On The Way!',
        message: `Your order #${order.orderId} is out for delivery. Track it live!`,
        priority: 'urgent',
        actionUrl: `/order-tracking/${orderId}`
      },
      'delivered': {
        title: '🎊 Order Delivered Successfully!',
        message: `Enjoy your meal! Rate your order #${order.orderId}`,
        priority: 'high',
        actionUrl: `/order-history`
      },
      'seller_rejected': {
        title: '❌ Order Declined',
        message: `Sorry, restaurant declined order #${order.orderId}. Full refund initiated.`,
        priority: 'urgent',
        actionUrl: `/order-history`
      },
      'cancelled': {
        title: '🚫 Order Cancelled',
        message: `Order #${order.orderId} has been cancelled. Refund will be processed.`,
        priority: 'high',
        actionUrl: `/order-history`
      }
    };

    const config = statusConfig[status];
    if (!config) return;

    await createNotification(
      userId,
      `order_${status.replace('_', '')}`,
      config.title,
      config.message,
      {
        orderId: order.orderId,
        orderMongoId: orderId,
        status,
        priority: config.priority,
        actionUrl: config.actionUrl
      }
    );
  } catch (error) {
    console.error('❌ Error sending order notification:', error);
  }
};

// ✅ Send smart recommendation notifications (Swiggy-style)
export const sendRecommendationNotification = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Get user's recent orders
    const recentOrders = await Order.find({ 
      customerId: userId,
      orderStatus: 'delivered'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    if (recentOrders.length === 0) return;

    // Get the most recent dish ID
    const lastOrder = recentOrders[0];
    const lastDishId = lastOrder.item?.dishId;

    if (!lastDishId) return;

    const lastDish = await Dish.findById(lastDishId);
    if (!lastDish) return;

    // Create personalized recommendation
    const daysSinceLastOrder = Math.floor(
      (new Date() - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24)
    );

    let notificationData = {};

    // Different notifications based on time
    if (daysSinceLastOrder >= 7) {
      notificationData = {
        title: '🍽️ Missing Your Favorite Dish?',
        message: `Order "${lastDish.name}" from ${lastOrder.item.restaurant} again!`,
        type: 'recommendation',
        priority: 'medium'
      };
    } else if (daysSinceLastOrder >= 3) {
      notificationData = {
        title: '😋 Craving Something Delicious?',
        message: `Your favorite "${lastDish.name}" is available now!`,
        type: 'recommendation',
        priority: 'low'
      };
    }

    if (notificationData.title) {
      await createNotification(
        userId,
        'general',
        notificationData.title,
        notificationData.message,
        {
          dishId: lastDishId,
          restaurant: lastOrder.item.restaurant,
          actionUrl: `/dish/${lastDishId}`,
          priority: notificationData.priority
        }
      );
    }
  } catch (error) {
    console.error('❌ Error sending recommendation:', error);
  }
};

// ✅ Send time-based promotional notifications
export const sendTimeBasedNotifications = async (userId) => {
  try {
    const now = new Date();
    const hour = now.getHours();

    let message = '';
    let title = '';
    
    // Lunch time (11 AM - 2 PM)
    if (hour >= 11 && hour < 14) {
      title = '🍱 Lunch Time!';
      message = 'Explore delicious lunch options near you. Order now!';
    }
    // Dinner time (7 PM - 10 PM)
    else if (hour >= 19 && hour < 22) {
      title = '🌙 Dinner Time!';
      message = 'Treat yourself to a delicious dinner tonight!';
    }
    // Late night (10 PM - 12 AM)
    else if (hour >= 22 || hour < 1) {
      title = '🌃 Late Night Cravings?';
      message = 'Order from restaurants open late near you!';
    }

    if (title) {
      await createNotification(
        userId,
        'general',
        title,
        message,
        {
          actionUrl: '/discovery',
          priority: 'low'
        }
      );
    }
  } catch (error) {
    console.error('❌ Error sending time-based notification:', error);
  }
};

// ✅ Send new restaurant notification
export const sendNewRestaurantNotification = async (userId, restaurant) => {
  try {
    await createNotification(
      userId,
      'new_restaurant',
      '🎉 New Restaurant Alert!',
      `${restaurant.name} just joined TasteSphere! Explore their menu now.`,
      {
        restaurantId: restaurant._id,
        actionUrl: `/restaurant/${restaurant._id}`,
        priority: 'medium'
      }
    );
  } catch (error) {
    console.error('❌ Error sending new restaurant notification:', error);
  }
};

// ✅ Send discount offer notification
export const sendDiscountNotification = async (userId, offer) => {
  try {
    await createNotification(
      userId,
      'discount_offer',
      '🎁 Special Offer Just For You!',
      offer.message || 'Get exclusive discounts on your favorite restaurants!',
      {
        offerId: offer._id,
        discount: offer.discount,
        actionUrl: '/discovery',
        priority: 'high'
      }
    );
  } catch (error) {
    console.error('❌ Error sending discount notification:', error);
  }
};

// ✅ Get notification statistics
export const getNotificationStats = async (userId) => {
  try {
    const total = await Notification.countDocuments({ userId });
    const unread = await Notification.countDocuments({ userId, read: false });
    const byType = await Notification.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    return { total: 0, unread: 0, byType: {} };
  }
};

export default {
  createNotification,
  sendOrderStatusNotification,
  sendRecommendationNotification,
  sendTimeBasedNotifications,
  sendNewRestaurantNotification,
  sendDiscountNotification,
  getNotificationStats
};