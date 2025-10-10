// routes/sellerOrderRoutes.js - COMPLETE FIXED VERSION
import express from 'express';
import { authenticateSellerToken } from '../middleware/authMiddleware.js';
import Order from '../models/Order.js';
import OrderHistory from '../models/OrderHistory.js';
import { getIO } from '../config/socket.js';

const router = express.Router();

// ✅ ACCEPT ORDER - FIXED
router.post('/:orderId/accept', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id || req.seller.id;

    console.log('🔄 Seller accepting order:', orderId, 'Seller:', sellerId);

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
    order.orderTimeline.push({
      status: 'seller_accepted',
      timestamp: new Date(),
      actor: 'seller',
      message: 'Restaurant accepted the order'
    });
    await order.save();
    console.log('✅ Order updated to seller_accepted');

    // ✅ UPDATE ORDER HISTORY
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
      } else {
        console.warn('⚠️ Order history not found for:', orderId);
      }
    } catch (historyError) {
      console.error('⚠️ Failed to update order history:', historyError);
    }

    // ✅ EMIT SOCKET EVENTS - MULTIPLE ROOMS
    try {
      const io = getIO();
      if (io) {
        const notification = {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          _id: order._id.toString(),
          orderStatus: 'seller_accepted',
          status: 'seller_accepted',
          customerEmail: order.customerEmail,
          message: 'Restaurant has accepted your order!',
          timestamp: new Date()
        };

        // Emit to ALL possible rooms
        io.to(`user-${order.customerEmail}`).emit('seller-accepted-order', notification);
        io.to(`order-${order._id}`).emit('seller-accepted-order', notification);
        io.to(`user-${order.customerEmail}`).emit('order-status-updated', notification);
        io.to(`order-${order._id}`).emit('order-status-updated', notification);
        
        // Also emit general order-confirmed event
        io.to(`user-${order.customerEmail}`).emit('order-confirmed', notification);
        
        console.log('✅ Socket notifications sent to customer:', order.customerEmail);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket notification failed:', socketError);
    }

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
      details: error.message
    });
  }
});

// POST /api/seller/orders/:orderId/reject
router.post('/:orderId/reject', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const sellerId = req.seller._id || req.seller.id;

    console.log('❌ Seller rejecting order:', orderId);

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
    order.orderTimeline.push({
      status: 'seller_rejected',
      timestamp: new Date(),
      actor: 'seller',
      message: `Restaurant rejected: ${reason}`
    });
    await order.save();
    console.log('✅ Order rejected');

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
        history.isTemporary = false; // Move to permanent
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.error('⚠️ Failed to update order history:', historyError);
    }

    // Emit socket events
    try {
      const io = req.app.get('io');
      if (io) {
        const notification = {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          orderStatus: 'seller_rejected',
          status: 'seller_rejected',
          customerEmail: order.customerEmail,
          message: `Restaurant declined your order: ${reason}`,
          cancellationReason: reason,
          timestamp: new Date()
        };

        io.to(`user-${order.customerEmail}`).emit('order-status-updated', notification);
        io.to(`order-${order._id}`).emit('order-status-updated', notification);
        io.to(`user-${order.customerEmail}`).emit('order-rejected', notification);
        
        console.log('✅ Rejection notification sent');
      }
    } catch (socketError) {
      console.warn('⚠️ Socket notification failed:', socketError);
    }

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

// ✅ UPDATE ORDER STATUS - FIXED
router.patch('/:orderId/status', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    const sellerId = req.seller._id || req.seller.id;

    console.log('📦 Updating order status:', orderId, 'to', status);

    const validStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: preparing, ready, out_for_delivery, delivered'
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
    order.orderStatus = status;
    order.orderTimeline.push({
      status: status,
      timestamp: new Date(),
      actor: 'seller',
      message: note || `Order status changed to ${status}`
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();
    console.log('✅ Order status updated');

    // ✅ UPDATE ORDER HISTORY
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: status,
          timestamp: new Date(),
          actor: 'seller',
          note: note || `Order is now ${status.replace('_', ' ')}`
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
      console.error('⚠️ Failed to update order history:', historyError);
    }

    // ✅ EMIT SOCKET EVENTS
    try {
      const io = getIO();
      if (io) {
        const statusMessages = {
          preparing: '👨‍🍳 Your food is being prepared',
          ready: '✓ Your order is ready!',
          out_for_delivery: '🚗 Your order is on the way',
          delivered: '🎉 Order delivered!'
        };

        const notification = {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          orderStatus: status,
          status: status,
          customerEmail: order.customerEmail,
          message: statusMessages[status] || `Order is now ${status}`,
          timestamp: new Date()
        };

        io.to(`user-${order.customerEmail}`).emit('order-status-updated', notification);
        io.to(`order-${order._id}`).emit('order-status-updated', notification);
        
        console.log(`✅ Status update notification sent: ${status}`);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket notification failed:', socketError);
    }

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

// GET SELLER ORDERS
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
        totalOrders,
        ordersPerPage: parseInt(limit)
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

// GET SINGLE ORDER
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

// GET ORDER STATS
router.get('/stats/summary', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller._id || req.seller.id;

    const [
      totalOrders,
      pendingOrders,
      activeOrders,
      completedOrders,
      todayOrders,
      todayRevenue
    ] = await Promise.all([
      Order.countDocuments({ seller: sellerId }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'pending_seller' }),
      Order.countDocuments({ 
        seller: sellerId, 
        orderStatus: { $in: ['seller_accepted', 'preparing', 'ready', 'out_for_delivery'] } 
      }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'delivered' }),
      Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Order.aggregate([
        {
          $match: {
            seller: sellerId,
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            paymentStatus: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('❌ Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
});

export default router;