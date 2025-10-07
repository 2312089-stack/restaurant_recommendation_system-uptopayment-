// backend/controllers/sellerOrderController.js
import Order from '../models/Order.js';
import { emitOrderStatusUpdate, emitOrderCancellation } from '../config/socket.js';

// Get all orders for seller
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;
    const { status } = req.query;

    console.log('📦 Fetching orders for seller:', sellerId, 'status filter:', status);

    const query = { seller: sellerId };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('dish', 'name image price category')
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${orders.length} orders for seller`);

    res.json({
      success: true,
      orders,
      count: orders.length
    });

  } catch (error) {
    console.error('❌ Get seller orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// Accept order (pending_seller -> seller_accepted)
// controllers/sellerOrderController.js - Update acceptOrder
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

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
        error: `Cannot accept order in ${order.orderStatus} state`
      });
    }

    // Update order
    order.orderStatus = 'seller_accepted';
    order.sellerResponse = order.sellerResponse || {};
    order.sellerResponse.acceptedAt = new Date();
    
    order.orderTimeline = order.orderTimeline || [];
    order.orderTimeline.push({
      status: 'seller_accepted',
      timestamp: new Date(),
      actor: 'seller',
      message: 'Restaurant confirmed your order'
    });

    await order.save();

    // ✅ EMIT SOCKET EVENT TO CUSTOMER
    try {
      const io = req.app.get('io');
      if (io && order.customerEmail) {
        const statusUpdate = {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          _id: order._id.toString(),
          orderStatus: 'seller_accepted',
          status: 'seller_accepted',
          customerEmail: order.customerEmail,
          message: '🎉 Restaurant accepted your order! Proceed to payment.',
          timestamp: new Date()
        };

        // Emit to multiple channels
        io.to(`user-${order.customerEmail}`).emit('seller-accepted-order', statusUpdate);
        io.to(`user-${order.customerEmail}`).emit('order-status-updated', statusUpdate);
        io.to(`order-${order._id}`).emit('seller-accepted-order', statusUpdate);
        
        console.log(`✅ Emitted seller-accepted event to ${order.customerEmail}`);
      }
    } catch (socketError) {
      console.error('⚠️ Socket emission failed:', socketError);
    }

    res.json({
      success: true,
      message: 'Order accepted successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        customerEmail: order.customerEmail
      }
    });

  } catch (error) {
    console.error('❌ Accept order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept order'
    });
  }
};

// Reject order
export const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

    console.log('❌ Rejecting order:', orderId, 'Reason:', cancellationReason);

    if (!cancellationReason || cancellationReason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
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

    // Update order to rejected state
    order.orderStatus = 'seller_rejected';
    order.cancellationReason = cancellationReason;
    order.cancelledBy = 'seller';
    order.cancelledAt = new Date();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'seller_rejected',
      timestamp: new Date(),
      note: cancellationReason
    });

    await order.save();

    console.log('❌ ORDER REJECTED:', {
      orderId: order.orderId,
      _id: order._id,
      reason: cancellationReason
    });

    // Emit cancellation to customer
    emitOrderCancellation(
      order.customerEmail,
      order,
      cancellationReason
    );

    res.json({
      success: true,
      message: 'Order rejected successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        cancellationReason: order.cancellationReason
      }
    });

  } catch (error) {
    console.error('❌ Reject order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject order'
    });
  }
};

// Update order status (preparing, ready, delivered, etc.)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, cancellationReason } = req.body;
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

    console.log('📝 Updating order status:', orderId, 'to:', status);

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

    const validStatuses = [
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'seller_rejected'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: ${status}`
      });
    }

    // Update status
    order.orderStatus = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      note: cancellationReason || `Order ${status}`
    });

    // Handle cancellation
    if (status === 'cancelled' || status === 'seller_rejected') {
      order.cancellationReason = cancellationReason || 'Cancelled by seller';
      order.cancelledBy = 'seller';
      order.cancelledAt = new Date();
    }

    // Handle delivery
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    console.log('✅ Order status updated:', {
      orderId: order.orderId,
      newStatus: order.orderStatus
    });

    // Emit update to customer
    if (status === 'cancelled' || status === 'seller_rejected') {
      emitOrderCancellation(
        order.customerEmail,
        order,
        cancellationReason || 'Order cancelled by restaurant'
      );
    } else {
      emitOrderStatusUpdate({
        _id: order._id,
        orderId: order.orderId,
        orderStatus: status,
        customerEmail: order.customerEmail,
        seller: order.seller
      });
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
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

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

    order.orderStatus = 'cancelled';
    order.cancellationReason = cancellationReason || 'Cancelled by seller';
    order.cancelledBy = 'seller';
    order.cancelledAt = new Date();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: cancellationReason || 'Cancelled by seller'
    });

    await order.save();

    emitOrderCancellation(
      order.customerEmail,
      order,
      cancellationReason || 'Order cancelled by restaurant'
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

// Get specific order details
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    })
      .populate('dish', 'name image price category type')
      .populate('seller', 'businessName email');

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
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller.sellerId || req.seller._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStats, todayStats] = await Promise.all([
      Order.aggregate([
        { $match: { seller: sellerId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            pendingOrders: {
              $sum: { 
                $cond: [{ $eq: ['$orderStatus', 'pending_seller'] }, 1, 0] 
              }
            },
            activeOrders: {
              $sum: {
                $cond: [
                  { 
                    $in: ['$orderStatus', [
                      'seller_accepted',
                      'confirmed',
                      'preparing',
                      'ready',
                      'out_for_delivery'
                    ]] 
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      Order.aggregate([
        { 
          $match: { 
            seller: sellerId,
            createdAt: { $gte: today }
          } 
        },
        {
          $group: {
            _id: null,
            todayOrders: { $sum: 1 },
            todayRevenue: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const stats = {
      totalOrders: totalStats[0]?.totalOrders || 0,
      totalRevenue: totalStats[0]?.totalRevenue || 0,
      pendingOrders: totalStats[0]?.pendingOrders || 0,
      activeOrders: totalStats[0]?.activeOrders || 0,
      todayOrders: todayStats[0]?.todayOrders || 0,
      todayRevenue: todayStats[0]?.todayRevenue || 0
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
};

export default {
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderDetails,
  getOrderStats
};