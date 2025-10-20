// backend/config/socket.js - COMPLETE VERSION WITH NOTIFICATIONS
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import sellerStatusManager from '../utils/sellerStatusManager.js';
import Seller from '../models/Seller.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';

let io;

// ==================== NOTIFICATION HELPER FUNCTIONS ====================

// Create notification helper
const createNotification = async (userId, type, title, message, data = {}) => {
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
    
    // Emit socket event
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

// Send order status notification
const sendOrderStatusNotification = async (orderMongoId, status, userId) => {
  try {
    const order = await Order.findById(orderMongoId);
    if (!order) return;

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
    if (!config) return;

    await createNotification(
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
  } catch (error) {
    console.error('❌ Error sending order notification:', error);
  }
};

// Send recommendation notification
const sendRecommendationNotification = async (userId) => {
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
    const daysSinceLastOrder = Math.floor(
      (new Date() - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24)
    );

    let notificationData = {};

    if (daysSinceLastOrder >= 7) {
      notificationData = {
        title: '🍽️ Missing Your Favorite Dish?',
        message: `Order "${lastOrder.item.name}" from ${lastOrder.item.restaurant} again!`,
        type: 'general',
        priority: 'medium'
      };
    } else if (daysSinceLastOrder >= 3) {
      notificationData = {
        title: '😋 Craving Something Delicious?',
        message: `Your favorite "${lastOrder.item.name}" is available now!`,
        type: 'general',
        priority: 'low'
      };
    }

    if (notificationData.title) {
      await createNotification(
        userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        {
          dishId: lastOrder.item.dishId,
          restaurant: lastOrder.item.restaurant,
          actionUrl: `/dish/${lastOrder.item.dishId}`,
          priority: notificationData.priority
        }
      );
    }
  } catch (error) {
    console.error('❌ Error sending recommendation:', error);
  }
};

// Send time-based notifications
const sendTimeBasedNotifications = async (userId) => {
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

// ==================== SOCKET.IO INITIALIZATION ====================

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
  });

  // Store io instance globally
  global.io = io;

  // Initialize seller status manager
  sellerStatusManager.initialize(io);

  // Cleanup inactive sellers every 10 minutes
  setInterval(() => {
    sellerStatusManager.cleanupInactiveSellers(30);
  }, 10 * 60 * 1000);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // ==================== SELLER AUTHENTICATION ====================
   
socket.on('authenticate-seller', async (token) => {
  try {
    console.log('Seller authentication attempt');
    if (!token) {
      socket.emit('auth-error', { error: 'No token provided' });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';
    const decoded = jwt.verify(token, JWT_SECRET);
    const sellerId = decoded.sellerId || decoded.id;

    if (!sellerId) {
      socket.emit('auth-error', { error: 'Invalid seller token' });
      return;
    }

    socket.sellerId = sellerId;
    socket.userType = 'seller';
    
    // ✅ FIXED: Only join seller-specific rooms
    socket.join(`seller-${sellerId}`);
    // This line was causing sellers to receive customer notifications!

    sellerStatusManager.setSellerOnline(sellerId, socket.id);

    await Seller.findByIdAndUpdate(sellerId, {
      isOnline: true,
      lastActive: new Date(),
      dashboardStatus: 'online'
    });

    socket.emit('authenticated', {
      sellerId,
      userType: 'seller',
      status: 'online',
      rooms: [`seller-${sellerId}`] // ✅ Added for debugging
    });

    console.log(`✅ Seller authenticated: ${sellerId} | Rooms: [seller-${sellerId}]`);
  } catch (error) {
    console.error('Seller auth error:', error.name, error.message);
    socket.emit('auth-error', {
      error: 'Authentication failed',
      type: error.name,
      message: error.message
    });
  }
});
    // ==================== CUSTOMER AUTHENTICATION ====================
socket.on('authenticate-user', async (token) => {
  try {
    console.log('Customer authentication attempt');
    if (!token) {
      socket.emit('auth-error', { error: 'No token provided' });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    const userEmail = decoded.email || decoded.emailId;

    if (!userId) {
      socket.emit('auth-error', { error: 'Invalid user token' });
      return;
    }

    socket.userId = userId;
    socket.userEmail = userEmail;
    socket.userType = 'customer';

    // ✅ CORRECT: Join customer-specific rooms for notifications
    socket.join(`user-${userId}`);
    socket.join(userId.toString()); // ← For new-notification events (customers only!)
    if (userEmail) {
      socket.join(`user-${userEmail}`);
    }

    socket.emit('authenticated', {
      userId,
      userEmail,
      userType: 'customer',
      rooms: [`user-${userId}`, userId.toString(), userEmail ? `user-${userEmail}` : null].filter(Boolean) // ✅ Added for debugging
    });

    console.log(`✅ Customer authenticated: ${userId} | Rooms: [user-${userId}, ${userId.toString()}, user-${userEmail}]`);
  } catch (error) {
    console.error('User auth error:', error.name, error.message);
    socket.emit('auth-error', { 
      error: 'Authentication failed',
      type: error.name,
      message: error.message
    });
  }
});
    // ==================== SELLER DASHBOARD STATUS ====================
    socket.on('update-dashboard-status', (data) => {
      if (socket.sellerId) {
        const { status } = data;
        if (status === 'offline') {
          sellerStatusManager.setSellerOffline(socket.sellerId);
        } else {
          sellerStatusManager.updateSellerStatus(socket.sellerId, status);
        }
        console.log(`Seller ${socket.sellerId} dashboard status: ${status}`);
      }
    });

    // ==================== ROOM MANAGEMENT ====================
    socket.on('join-order-room', (orderId) => {
      if (!orderId) {
        console.warn('join-order-room called without orderId');
        return;
      }
      
      const roomName = `order-${orderId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
      socket.emit('joined-order-room', { orderId, room: roomName });
    });

    socket.on('join', (room) => {
      if (!room) {
        console.warn('join called without room name');
        return;
      }
      
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('leave-order-room', (orderId) => {
      if (!orderId) return;
      
      const roomName = `order-${orderId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);
    });

    // ==================== NOTIFICATION EVENTS ====================

    // Customer views notifications
    socket.on('view-notifications', async () => {
      if (socket.userType !== 'customer' || !socket.userId) return;
      
      try {
        const total = await Notification.countDocuments({ userId: socket.userId });
        const unread = await Notification.countDocuments({ userId: socket.userId, read: false });
        const byType = await Notification.aggregate([
          { $match: { userId: socket.userId } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        const stats = {
          total,
          unread,
          byType: byType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        };

        socket.emit('notification-stats', stats);
      } catch (error) {
        console.error('Error getting notification stats:', error);
      }
    });

    // Trigger recommendation notifications
    socket.on('trigger-recommendations', async () => {
      if (socket.userType !== 'customer' || !socket.userId) return;
      
      try {
        await sendRecommendationNotification(socket.userId);
        console.log(`✅ Recommendation sent to ${socket.userId}`);
      } catch (error) {
        console.error('Error sending recommendation:', error);
      }
    });

    // Trigger time-based notifications
    socket.on('trigger-time-notification', async () => {
      if (socket.userType !== 'customer' || !socket.userId) return;
      
      try {
        await sendTimeBasedNotifications(socket.userId);
        console.log(`✅ Time-based notification sent to ${socket.userId}`);
      } catch (error) {
        console.error('Error sending time notification:', error);
      }
    });

    // ==================== SELLER STATUS REQUESTS ====================
    socket.on('request-seller-status', (data) => {
      const { sellerId, sellerIds } = data;

      if (sellerId) {
        const status = sellerStatusManager.getSellerStatus(sellerId);
        socket.emit('seller-status-response', { sellerId, ...status });
      } else if (sellerIds && Array.isArray(sellerIds)) {
        const statuses = sellerStatusManager.getMultipleSellerStatuses(sellerIds);
        socket.emit('seller-statuses-response', statuses);
      }
    });

    socket.on('request-online-sellers', () => {
      const onlineSellers = sellerStatusManager.getOnlineSellers();
      socket.emit('online-sellers-response', onlineSellers);
    });

    // ==================== DISCONNECT HANDLER ====================
    socket.on('disconnect', async (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);

      if (socket.sellerId) {
        sellerStatusManager.setSellerOffline(socket.sellerId);

        await Seller.findByIdAndUpdate(socket.sellerId, {
          isOnline: false,
          lastActive: new Date(),
          dashboardStatus: 'offline'
        }).catch(err => {
          console.error('Error updating seller offline status:', err);
        });

        console.log(`Seller ${socket.sellerId} disconnected and marked offline`);
      }

      if (socket.userId) {
        console.log(`Customer ${socket.userId} disconnected`);
      }
    });

    // ==================== ERROR HANDLER ====================
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // ==================== CRON-LIKE FUNCTIONALITY ====================
  
  // Send recommendation notifications every 24 hours
  setInterval(async () => {
    try {
      const users = await User.find({ isActive: true }).limit(100);
      
      for (const user of users) {
        await sendRecommendationNotification(user._id);
      }
      
      console.log(`✅ Sent recommendations to ${users.length} users`);
    } catch (error) {
      console.error('Error in recommendation cron:', error);
    }
  }, 24 * 60 * 60 * 1000);

  // Send time-based notifications every hour
  setInterval(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour === 11 || hour === 19 || hour === 22) {
        const users = await User.find({ isActive: true }).limit(100);
        
        for (const user of users) {
          await sendTimeBasedNotifications(user._id);
        }
        
        console.log(`✅ Sent time-based notifications to ${users.length} users`);
      }
    } catch (error) {
      console.error('Error in time-based cron:', error);
    }
  }, 60 * 60 * 1000);

  console.log('✅ Socket.IO initialized with notifications and seller tracking');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// ==================== EMISSION HELPERS ====================

// Emit new order to seller with notification
export const emitNewOrder = async (sellerId, orderData) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }
  
  const room = `seller-${sellerId}`;
  console.log(`Emitting new-order to room: ${room}`);
  
  io.to(room).emit('new-order', {
    order: orderData,
    notification: {
      title: 'New Order Received',
      message: `Order #${orderData.orderId} - ₹${orderData.totalAmount}`,
      timestamp: new Date()
    }
  });
  
  console.log(`✅ New order emitted to seller ${sellerId}`);
};

// Emit order confirmation to customer with notification
export const emitOrderConfirmation = async (customerEmail, orderData) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }
  
  const room = `user-${customerEmail}`;
  console.log(`Emitting order-confirmed to room: ${room}`);
  
  const confirmationData = {
    orderId: orderData.orderId,
    orderMongoId: orderData._id,
    _id: orderData._id,
    status: orderData.orderStatus || orderData.status,
    message: 'Your order has been confirmed',
    timestamp: new Date()
  };
  
  io.to(room).emit('order-confirmed', confirmationData);
  
  // Also send notification to database
  if (orderData.customerId) {
    await sendOrderStatusNotification(
      orderData._id,
      orderData.orderStatus || 'seller_accepted',
      orderData.customerId
    );
  }
  
  console.log(`✅ Order confirmation emitted to ${customerEmail}`);
};

// Emit order status update with notification
export const emitOrderStatusUpdate = async (orderData) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }
  
  const customerEmail = orderData.customerEmail;
  const orderId = orderData._id || orderData.id;
  
  if (!customerEmail || !orderId) {
    console.warn('Missing customer email or order ID');
    return;
  }
  
  const statusUpdate = {
    orderId: orderData.orderId,
    orderMongoId: orderId,
    _id: orderId,
    status: orderData.orderStatus || orderData.status,
    orderStatus: orderData.orderStatus || orderData.status,
    message: orderData.statusMessage || getStatusMessage(orderData.orderStatus || orderData.status),
    estimatedDelivery: orderData.estimatedDelivery,
    cancelledAt: orderData.cancelledAt,
    cancellationReason: orderData.cancellationReason,
    cancelledBy: orderData.cancelledBy,
    timestamp: new Date()
  };
  
  console.log('Emitting status update:', statusUpdate);
  
  const rooms = [
    `user-${customerEmail}`,
    `order-${orderId}`
  ];
  
  rooms.forEach(room => {
    io.to(room).emit('order-status-updated', statusUpdate);
    io.to(room).emit('status-update', statusUpdate);
    console.log(`Emitted to room: ${room}`);
  });
  
  // Send notification to database
  if (orderData.customerId) {
    await sendOrderStatusNotification(
      orderId,
      orderData.orderStatus || orderData.status,
      orderData.customerId
    );
  }
  
  if (orderData.seller) {
    const sellerRoom = `seller-${orderData.seller}`;
    io.to(sellerRoom).emit('order-status-updated', statusUpdate);
  }
};

// Helper function
const getStatusMessage = (status) => {
  const messages = {
    'pending': 'Your order is pending confirmation',
    'pending_seller': 'Waiting for restaurant confirmation',
    'seller_accepted': 'Restaurant accepted your order',
    'confirmed': 'Your order has been confirmed by the restaurant',
    'preparing': 'The restaurant is preparing your food',
    'ready': 'Your order is ready for pickup',
    'out_for_delivery': 'Your order is on its way',
    'delivered': 'Your order has been delivered',
    'cancelled': 'Your order has been cancelled',
    'seller_rejected': 'Restaurant declined your order'
  };
  return messages[status] || 'Order status updated';
};

// Emit order cancellation with notification
export const emitOrderCancellation = async (customerEmail, orderData, cancellationReason) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }
  
  const customerRoom = `user-${customerEmail}`;
  const orderId = orderData._id || orderData.id;
  
  console.log(`Emitting cancellation to: ${customerRoom}`);
  
  const cancellationData = {
    orderId: orderData.orderId,
    orderMongoId: orderId,
    _id: orderId,
    status: 'cancelled',
    orderStatus: 'cancelled',
    cancellationReason: cancellationReason,
    cancelledBy: orderData.cancelledBy || 'seller',
    cancelledAt: orderData.cancelledAt || new Date(),
    message: `Your order has been cancelled. ${cancellationReason}`,
    timestamp: new Date()
  };
  
  io.to(customerRoom).emit('order-status-updated', cancellationData);
  io.to(customerRoom).emit('status-update', cancellationData);
  
  const orderRoom = `order-${orderId}`;
  io.to(orderRoom).emit('order-status-updated', cancellationData);
  
  // Send notification to database
  if (orderData.customerId) {
    await sendOrderStatusNotification(
      orderId,
      'cancelled',
      orderData.customerId
    );
  }
  
  console.log('✅ Cancellation notification sent');
};

export default { 
  initializeSocket, 
  getIO, 
  emitNewOrder, 
  emitOrderConfirmation,
  emitOrderStatusUpdate,
  emitOrderCancellation
};