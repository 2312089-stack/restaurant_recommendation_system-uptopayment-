// backend/routes/sellerOrderRoutes.js - FINAL FIXED VERSION (NO DUPLICATES)
import express from 'express';
import { authenticateSellerToken } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';
import OrderHistory from '../models/OrderHistory.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';
import { getIO } from '../config/socket.js';

const router = express.Router();

// ==================== HELPER: SEND CUSTOMER NOTIFICATION ====================
async function sendCustomerNotification(order, status, additionalData = {}) {
  try {
    console.log(`\n🔔 SENDING NOTIFICATION TO CUSTOMER`);
    console.log(`Order ID: ${order.orderId}`);
    console.log(`Customer ID: ${order.customerId}`);
    console.log(`Customer Email: ${order.customerEmail}`);
    console.log(`Status: ${status}`);

    // ✅ CRITICAL: Find user by customerId
    const user = await User.findById(order.customerId);
    
    if (!user) {
      console.error('❌ User not found for customerId:', order.customerId);
      return false;
    }

    console.log(`✅ User found: ${user._id} | Email: ${user.emailId}`);

    // ✅ Send database notification
    await notificationService.sendOrderStatusNotification(
      order._id,
      status,
      user._id // ← CUSTOMER's userId
    );
    console.log('✅ Database notification created');

    // ✅ Send socket notification
    const io = getIO();
    if (io) {
      const statusMessages = {
        'seller_accepted': '🎉 Restaurant accepted your order!',
        'seller_rejected': '❌ Restaurant declined your order',
        'preparing': '👨‍🍳 Your food is being prepared',
        'ready': '✓ Your order is ready!',
        'out_for_delivery': '🚗 Your order is on the way',
        'delivered': '🎉 Order delivered successfully!'
      };

      const notification = {
        orderId: order.orderId,
        orderMongoId: order._id.toString(),
        _id: order._id.toString(),
        orderStatus: status,
        status: status,
        customerEmail: order.customerEmail,
        customerId: order.customerId,
        message: statusMessages[status] || `Order ${status}`,
        timestamp: new Date(),
        ...additionalData
      };

      // ✅ CRITICAL: Emit to CUSTOMER rooms (NOT seller rooms!)
      const customerUserId = user._id.toString();
      const customerEmail = order.customerEmail;

      console.log(`📡 Emitting to customer rooms:`);
      console.log(`   - userId room: ${customerUserId}`);
      console.log(`   - user-email room: user-${customerEmail}`);
      console.log(`   - order room: order-${order._id}`);

      // Emit to ALL customer rooms
      io.to(customerUserId).emit('order-status-updated', notification);
      io.to(`user-${customerEmail}`).emit('order-status-updated', notification);
      io.to(`order-${order._id}`).emit('order-status-updated', notification);

      // Special events for important statuses
      if (status === 'seller_accepted') {
        io.to(customerUserId).emit('seller-accepted-order', notification);
        io.to(customerUserId).emit('order-confirmed', notification);
        console.log('✅ Sent seller-accepted-order and order-confirmed events');
      } else if (status === 'seller_rejected') {
        io.to(customerUserId).emit('order-rejected', notification);
        console.log('✅ Sent order-rejected event');
      }

      console.log('✅ Socket notifications sent to customer');
    } else {
      console.warn('⚠️ Socket.IO not available');
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending customer notification:', error);
    return false;
  }
}

// ==================== GET ALL ORDERS (MUST BE FIRST!) ====================
router.get('/', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller._id || req.seller.id;
    const { status, limit = 50, page = 1 } = req.query;

    console.log('📦 Fetching orders for seller:', sellerId);

    const query = { seller: sellerId };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('dish', 'name image category type price')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalOrders = await Order.countDocuments(query);

    console.log(`✅ Found ${orders.length} orders`);

    res.json({
      success: true,
      orders,
      count: orders.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders
      }
    });

  } catch (error) {
    console.error('❌ Get seller orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// ==================== GET ORDER STATUS (specific route before :orderId) ====================
router.get('/:orderId/status', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id || req.seller.id;

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).select('orderStatus status updatedAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      orderStatus: order.orderStatus || order.status,
      updatedAt: order.updatedAt
    });

  } catch (error) {
    console.error('❌ Get order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order status'
    });
  }
});

// ==================== ACCEPT ORDER ====================
router.post('/:orderId/accept', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id || req.seller.id;

    console.log('\n========== ACCEPT ORDER ==========');
    console.log('Order ID:', orderId);
    console.log('Seller ID:', sellerId);

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).populate('dish');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    console.log('Order found:', order.orderId);
    console.log('Current status:', order.orderStatus);
    console.log('Customer ID:', order.customerId);
    console.log('Customer Email:', order.customerEmail);

    if (order.orderStatus !== 'pending_seller') {
      return res.status(400).json({
        success: false,
        error: `Order cannot be accepted. Current status: ${order.orderStatus}`
      });
    }

    // Update order
    order.orderStatus = 'seller_accepted';
    order.sellerResponse = {
      acceptedAt: new Date()
    };
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: 'seller_accepted',
      timestamp: new Date(),
      actor: 'seller',
      message: 'Restaurant accepted the order'
    });
    await order.save();
    console.log('✅ Order status updated to seller_accepted');

    // ✅ CRITICAL: Send notification to CUSTOMER
    await sendCustomerNotification(order, 'seller_accepted');

    // Update order history
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: 'seller_accepted',
          timestamp: new Date(),
          actor: 'seller',
          note: 'Restaurant confirmed your order'
        });
        history.currentStatus = 'seller_accepted';
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.warn('⚠️ Failed to update order history:', historyError);
    }

    console.log('========== ACCEPT ORDER COMPLETE ==========\n');

    res.json({
      success: true,
      message: 'Order accepted successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('❌ Accept order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== REJECT ORDER ====================
router.post('/:orderId/reject', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const sellerId = req.seller._id || req.seller.id;

    console.log('\n========== REJECT ORDER ==========');
    console.log('Order ID:', orderId);
    console.log('Reason:', reason);

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.orderStatus !== 'pending_seller') {
      return res.status(400).json({
        success: false,
        error: `Order cannot be rejected. Current status: ${order.orderStatus}`
      });
    }

    // Update order
    order.orderStatus = 'seller_rejected';
    order.sellerResponse = {
      rejectedAt: new Date(),
      rejectionReason: reason
    };
    order.cancelledBy = 'seller';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: 'seller_rejected',
      timestamp: new Date(),
      actor: 'seller',
      message: `Restaurant rejected: ${reason}`
    });
    await order.save();
    console.log('✅ Order rejected');

    // ✅ Send notification to CUSTOMER
    await sendCustomerNotification(order, 'seller_rejected', {
      cancellationReason: reason
    });

    // Update order history
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: 'seller_rejected',
          timestamp: new Date(),
          actor: 'seller',
          note: reason
        });
        history.currentStatus = 'seller_rejected';
        history.cancellationInfo = {
          cancelledBy: 'seller',
          reason: reason,
          timestamp: new Date(),
          refundStatus: order.paymentStatus === 'completed' ? 'pending' : 'none'
        };
        history.isTemporary = false;
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.warn('⚠️ Failed to update order history:', historyError);
    }

    console.log('========== REJECT ORDER COMPLETE ==========\n');

    res.json({
      success: true,
      message: 'Order rejected',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        cancellationReason: reason
      }
    });

  } catch (error) {
    console.error('❌ Reject order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject order'
    });
  }
});

// ==================== UPDATE ORDER STATUS ====================
router.patch('/:orderId/status', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.seller._id || req.seller.id;

    console.log('\n========== UPDATE ORDER STATUS ==========');
    console.log('Order ID:', orderId);
    console.log('New Status:', status);

    const validStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order
    const previousStatus = order.orderStatus;
    order.orderStatus = status;
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: status,
      timestamp: new Date(),
      actor: 'seller',
      message: `Order ${status.replace('_', ' ')}`
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();
    console.log(`✅ Order status: ${previousStatus} → ${status}`);

    // ✅ Send notification to CUSTOMER
    await sendCustomerNotification(order, status);

    // Update order history
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: status,
          timestamp: new Date(),
          actor: 'seller',
          note: `Order is now ${status.replace('_', ' ')}`
        });
        history.currentStatus = status;
        
        if (status === 'delivered') {
          history.deliveryInfo = {
            actualDeliveryTime: new Date(),
            estimatedTime: order.estimatedDelivery
          };
        }
        
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.warn('⚠️ Failed to update order history:', historyError);
    }

    console.log('========== UPDATE STATUS COMPLETE ==========\n');

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus
      }
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

// ==================== GET SINGLE ORDER (must be last among GET routes) ====================
router.get('/:orderId', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id || req.seller.id;

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).populate('dish', 'name image category type price');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

export default router;