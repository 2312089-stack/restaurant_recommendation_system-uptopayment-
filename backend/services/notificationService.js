// backend/services/notificationService.js - COMPLETE FIXED VERSION
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import User from '../models/User.js';

class NotificationService {
  // ==================== CORE NOTIFICATION CREATION ====================
  
  // In notificationService.js - Update createNotification:
async createNotification(userId, type, title, message, data = {}) {
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
    
    // ✅ CRITICAL: Emit to user's room
    if (global.io) {
      const userRoom = userId.toString();
      
      console.log('🔔 Emitting new-notification to room:', userRoom);
      
      global.io.to(userRoom).emit('new-notification', {
        notification: notification.toJSON()
      });
      
      console.log('✅ Notification emitted successfully');
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

  // ==================== ORDER NOTIFICATIONS ====================

  async sendOrderStatusNotification(orderMongoId, status, userId) {
    try {
      const order = await Order.findById(orderMongoId);
      if (!order) {
        console.warn('Order not found for notification:', orderMongoId);
        return;
      }

      const statusConfig = {
        'seller_accepted': {
          title: '🎉 Restaurant Accepted Your Order!',
          message: `Your order #${order.orderId} has been confirmed. Proceed with payment.`,
          priority: 'high',
          actionUrl: `/order-tracking/${orderMongoId}`
        },
        'payment_completed': {
          title: '✅ Payment Successful',
          message: `Payment confirmed for order #${order.orderId}. Food is being prepared!`,
          priority: 'high',
          actionUrl: `/order-tracking/${orderMongoId}`
        },
        'preparing': {
          title: '👨‍🍳 Your Food is Being Prepared',
          message: `The restaurant is cooking your order #${order.orderId}`,
          priority: 'medium',
          actionUrl: `/order-tracking/${orderMongoId}`
        },
        'ready': {
          title: '✓ Order Ready for Pickup!',
          message: `Your order #${order.orderId} is ready and waiting for delivery`,
          priority: 'high',
          actionUrl: `/order-tracking/${orderMongoId}`
        },
        'out_for_delivery': {
          title: '🚗 Order is On The Way!',
          message: `Your order #${order.orderId} is out for delivery. Track it live!`,
          priority: 'urgent',
          actionUrl: `/order-tracking/${orderMongoId}`
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
      if (!config) {
        console.warn('Unknown order status for notification:', status);
        return;
      }

      await this.createNotification(
        userId,
        `order_${status.replace('_', '')}`,
        config.title,
        config.message,
        {
          orderId: order.orderId,
          orderMongoId: orderMongoId,
          status,
          priority: config.priority,
          actionUrl: config.actionUrl
        }
      );

      console.log(`✅ Order status notification sent: ${status} for order ${order.orderId}`);
    } catch (error) {
      console.error('❌ Error sending order notification:', error);
    }
  }

  // ==================== RECOMMENDATION NOTIFICATIONS ====================

  async sendRecommendationNotification(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const recentOrders = await Order.find({ 
        customerId: userId,
        orderStatus: 'delivered'
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

      if (recentOrders.length === 0) return;

      const lastOrder = recentOrders[0];
      const lastDishId = lastOrder.item?.dishId || lastOrder.dish;

      if (!lastDishId) return;

      const lastDish = await Dish.findById(lastDishId);
      if (!lastDish) return;

      const daysSinceLastOrder = Math.floor(
        (new Date() - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24)
      );

      let notificationData = {};

      if (daysSinceLastOrder >= 7) {
        notificationData = {
          title: '🍽️ Missing Your Favorite Dish?',
          message: `Order "${lastDish.name}" from ${lastOrder.item.restaurant} again!`,
          type: 'reorder_suggestion',
          priority: 'medium'
        };
      } else if (daysSinceLastOrder >= 3) {
        notificationData = {
          title: '😋 Craving Something Delicious?',
          message: `Your favorite "${lastDish.name}" is available now!`,
          type: 'reorder_suggestion',
          priority: 'low'
        };
      }

      if (notificationData.title) {
        await this.createNotification(
          userId,
          notificationData.type,
          notificationData.title,
          notificationData.message,
          {
            dishId: lastDishId,
            restaurant: lastOrder.item.restaurant,
            actionUrl: `/dish/${lastDishId}`,
            priority: notificationData.priority
          }
        );
        console.log(`✅ Recommendation sent to user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error sending recommendation:', error);
    }
  }

  async sendReorderSuggestion(userId) {
    return this.sendRecommendationNotification(userId);
  }

  // ==================== TIME-BASED NOTIFICATIONS ====================

  async sendTimeBasedNotifications(userId) {
    try {
      const now = new Date();
      const hour = now.getHours();

      let message = '';
      let title = '';
      
      if (hour >= 11 && hour < 14) {
        title = '🍱 Lunch Time!';
        message = 'Explore delicious lunch options near you. Order now!';
      } else if (hour >= 19 && hour < 22) {
        title = '🌙 Dinner Time!';
        message = 'Treat yourself to a delicious dinner tonight!';
      } else if (hour >= 22 || hour < 1) {
        title = '🌃 Late Night Cravings?';
        message = 'Order from restaurants open late near you!';
      }

      if (title) {
        await this.createNotification(
          userId,
          'time_based_promo',
          title,
          message,
          {
            actionUrl: '/discovery',
            priority: 'low'
          }
        );
        console.log(`✅ Time-based notification sent to user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error sending time-based notification:', error);
    }
  }

  // ==================== PROMOTIONAL NOTIFICATIONS ====================

  async sendNewRestaurantNotification(userId, restaurant) {
    try {
      await this.createNotification(
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
      console.log(`✅ New restaurant notification sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending new restaurant notification:', error);
    }
  }

  async sendDiscountNotification(userId, offer) {
    try {
      await this.createNotification(
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
      console.log(`✅ Discount notification sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending discount notification:', error);
    }
  }

  // ==================== BULK NOTIFICATIONS ====================

  async sendBulkNotifications(userIds, type, title, message, data = {}) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data,
        priority: data.priority || 'medium',
        actionUrl: data.actionUrl
      }));

      const result = await Notification.insertMany(notifications);
      
      // Emit to all users via Socket.IO
      if (global.io) {
        userIds.forEach(userId => {
          global.io.to(userId.toString()).emit('new-notification', {
            notification: { type, title, message, data }
          });
        });
      }

      console.log(`✅ Bulk notifications sent to ${userIds.length} users`);
      return result;
    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error);
      throw error;
    }
  }

  // ==================== DAILY DIGEST ====================

  async sendDailyDigest(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Get user's favorite restaurants based on order history
      const recentOrders = await Order.find({
        customerId: userId,
        orderStatus: 'delivered',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).limit(5);

      if (recentOrders.length === 0) return;

      const restaurants = [...new Set(recentOrders.map(o => o.item.restaurant))];
      
      await this.createNotification(
        userId,
        'general',
        '📬 Your Daily Food Digest',
        `Check out new dishes from ${restaurants.slice(0, 3).join(', ')} and more!`,
        {
          actionUrl: '/discovery',
          priority: 'low'
        }
      );

      console.log(`✅ Daily digest sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending daily digest:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  async getUserNotifications(userId, { limit = 50, skip = 0, unreadOnly = false }) {
    try {
      const query = { userId };
      if (unreadOnly) query.read = false;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ userId, read: false });

      return {
        notifications,
        total,
        unreadCount,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: skip + notifications.length < total
        }
      };
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );
      return result;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.findOneAndDelete({ 
        _id: notificationId, 
        userId 
      });
      return result;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(daysOld = 30) {
    try {
      const deletedCount = await Notification.cleanupOld(daysOld);
      console.log(`✅ Cleaned up ${deletedCount} old notifications`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
      throw error;
    }
  }

  async getNotificationStats(userId) {
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
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;