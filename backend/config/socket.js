import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import sellerStatusManager from '../utils/sellerStatusManager.js';
import Seller from '../models/Seller.js';

let io;

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

  sellerStatusManager.initialize(io);

  setInterval(() => {
    sellerStatusManager.cleanupInactiveSellers(30);
  }, 10 * 60 * 1000);

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // SELLER AUTHENTICATION
    socket.on('authenticate-seller', async (token) => {
      try {
        console.log('🔐 Seller authentication attempt');
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

        socket.join(`seller-${sellerId}`);

        sellerStatusManager.setSellerOnline(sellerId, socket.id);

        await Seller.findByIdAndUpdate(sellerId, {
          isOnline: true,
          lastActive: new Date(),
          dashboardStatus: 'online'
        });

        socket.emit('authenticated', {
          sellerId,
          userType: 'seller',
          status: 'online'
        });

        console.log(`✅ Seller authenticated and online: ${sellerId}`);
      } catch (error) {
        console.error('❌ Seller auth error:', error.name, error.message);
        socket.emit('auth-error', {
          error: 'Authentication failed',
          type: error.name,
          message: error.message
        });
      }
    });

    // SELLER DASHBOARD STATUS UPDATES
    socket.on('update-dashboard-status', (data) => {
      if (socket.sellerId) {
        const { status } = data;
        if (status === 'offline') {
          sellerStatusManager.setSellerOffline(socket.sellerId);
        } else {
          sellerStatusManager.updateSellerStatus(socket.sellerId, status);
        }
        console.log(`📊 Seller ${socket.sellerId} dashboard status: ${status}`);
      }
    });

    // USER AUTHENTICATION
    socket.on('authenticate-user', async (token) => {
      try {
        console.log('🔐 Customer authentication attempt');
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

        // Join user-specific rooms
        socket.join(`user-${userId}`);
        if (userEmail) {
          socket.join(`user-${userEmail}`);
        }

        socket.emit('authenticated', {
          userId,
          userEmail,
          userType: 'customer'
        });

        console.log(`✅ Customer authenticated: ${userId} (${userEmail})`);
      } catch (error) {
        console.error('❌ User auth error:', error.name, error.message);
        socket.emit('auth-error', { 
          error: 'Authentication failed',
          type: error.name,
          message: error.message
        });
      }
    });

    // JOIN ORDER ROOM - Allow customers to join specific order rooms
    socket.on('join-order-room', (orderId) => {
      if (!orderId) {
        console.warn('⚠️ join-order-room called without orderId');
        return;
      }
      
      const roomName = `order-${orderId}`;
      socket.join(roomName);
      console.log(`📥 Socket ${socket.id} joined room: ${roomName}`);
      
      socket.emit('joined-order-room', { orderId, room: roomName });
    });

    // JOIN GENERIC ROOM
    socket.on('join', (room) => {
      if (!room) {
        console.warn('⚠️ join called without room name');
        return;
      }
      
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room: ${room}`);
    });

    // LEAVE ORDER ROOM
    socket.on('leave-order-room', (orderId) => {
      if (!orderId) return;
      
      const roomName = `order-${orderId}`;
      socket.leave(roomName);
      console.log(`📤 Socket ${socket.id} left room: ${roomName}`);
    });

    // REQUEST SELLER STATUS
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

    // REQUEST ALL ONLINE SELLERS
    socket.on('request-online-sellers', () => {
      const onlineSellers = sellerStatusManager.getOnlineSellers();
      socket.emit('online-sellers-response', onlineSellers);
    });

    // DISCONNECT HANDLER
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);

      if (socket.sellerId) {
        sellerStatusManager.setSellerOffline(socket.sellerId);

        await Seller.findByIdAndUpdate(socket.sellerId, {
          isOnline: false,
          lastActive: new Date(),
          dashboardStatus: 'offline'
        }).catch(err => {
          console.error('Error updating seller offline status:', err);
        });

        console.log(`🔴 Seller ${socket.sellerId} disconnected and marked offline`);
      }

      if (socket.userId) {
        console.log(`🔴 Customer ${socket.userId} disconnected`);
      }
    });

    // ERROR HANDLER
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.IO initialized with seller status tracking');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit new order to seller
export const emitNewOrder = (sellerId, orderData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized, cannot emit new order');
    return;
  }
  
  const room = `seller-${sellerId}`;
  console.log(`📤 Emitting new-order to room: ${room}`);
  
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

// Emit order confirmation to customer
export const emitOrderConfirmation = (customerEmail, orderData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized, cannot emit order confirmation');
    return;
  }
  
  const room = `user-${customerEmail}`;
  console.log(`📤 Emitting order-confirmed to room: ${room}`);
  
  io.to(room).emit('order-confirmed', {
    orderId: orderData.orderId,
    orderMongoId: orderData._id,
    _id: orderData._id,
    status: orderData.orderStatus || orderData.status,
    message: 'Your order has been confirmed',
    timestamp: new Date()
  });
  
  console.log(`✅ Order confirmation emitted to customer ${customerEmail}`);
};

// Emit order status update to customer
export const emitOrderStatusUpdate = (orderData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized, cannot emit status update');
    return;
  }
  
  const customerEmail = orderData.customerEmail;
  const orderId = orderData._id || orderData.id;
  
  if (!customerEmail || !orderId) {
    console.warn('⚠️ Missing customer email or order ID for status update');
    return;
  }
  
  // Emit to multiple rooms for redundancy
  const rooms = [
    `user-${customerEmail}`,
    `order-${orderId}`
  ];
  
  const statusUpdate = {
    orderId: orderData.orderId,
    orderMongoId: orderId,
    _id: orderId,
    status: orderData.orderStatus || orderData.status,
    message: orderData.statusMessage || getStatusMessage(orderData.orderStatus || orderData.status),
    estimatedDelivery: orderData.estimatedDelivery,
    timestamp: new Date()
  };
  
  console.log(`📤 Emitting order-status-updated to rooms:`, rooms);
  console.log('Status update data:', statusUpdate);
  
  rooms.forEach(room => {
    io.to(room).emit('order-status-updated', statusUpdate);
    io.to(room).emit('status-update', statusUpdate); // Backup event
  });
  
  console.log(`✅ Status update emitted for order ${orderData.orderId}`);
};

// Helper function to get status message
const getStatusMessage = (status) => {
  const messages = {
    'pending': 'Your order is pending confirmation',
    'confirmed': 'Your order has been confirmed by the restaurant',
    'preparing': 'The restaurant is preparing your food',
    'ready': 'Your order is ready for pickup',
    'out_for_delivery': 'Your order is on its way',
    'delivered': 'Your order has been delivered',
    'cancelled': 'Your order has been cancelled'
  };
  return messages[status] || 'Order status updated';
};

export default { 
  initializeSocket, 
  getIO, 
  emitNewOrder, 
  emitOrderConfirmation,
  emitOrderStatusUpdate 
};