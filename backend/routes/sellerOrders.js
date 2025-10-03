// routes/sellerOrders.js - Complete with Real-time Socket.IO Updates
import express from 'express';
import Order from '../models/Order.js';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import { getIO } from '../config/socket.js';

const router = express.Router();

// GET /api/seller/orders - Get all orders for seller
router.get('/', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { status } = req.query;
    
    console.log('=== FETCHING SELLER ORDERS ===');
    console.log('Seller ID:', sellerId);
    console.log('Filter status:', status);
    
    const query = { seller: sellerId };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      if (status === 'new') {
        query.orderStatus = { $in: ['confirmed', 'pending'] };
      } else if (status === 'active') {
        query.orderStatus = { $in: ['preparing', 'ready', 'out_for_delivery'] };
      } else {
        query.orderStatus = status;
      }
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    console.log(`Found ${orders.length} orders for seller ${sellerId}`);
    console.log('Order statuses:', orders.map(o => ({ 
      orderId: o.orderId, 
      status: o.orderStatus,
      customer: o.customerName 
    })));
    
    res.json({
      success: true,
      orders,
      total: orders.length
    });
  } catch (error) {
    console.error('GET SELLER ORDERS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      details: error.message
    });
  }
});

// PATCH /api/seller/orders/:orderId/status - Update order status with Socket.IO
router.patch('/:orderId/status', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // Receives 'status' from frontend
    const sellerId = req.seller.id;
    
    console.log('=== UPDATING ORDER STATUS ===');
    console.log('Order ID:', orderId);
    console.log('New status:', status);
    console.log('Seller ID:', sellerId);
    console.log('Request body:', req.body);
    
    // Validate status
    const validStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Find order
    const order = await Order.findOne({ _id: orderId, seller: sellerId });
    
    if (!order) {
      console.error('Order not found or seller mismatch');
      return res.status(404).json({
        success: false,
        error: 'Order not found or you do not have permission to update this order'
      });
    }
    
    // Store old status for logging
    const oldStatus = order.orderStatus;
    
    // Update status
    order.orderStatus = status;
    
    // Update delivery time if delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }
    
    // Save order
    await order.save();
    
    console.log(`Order ${orderId} status updated: ${oldStatus} → ${status}`);
    
    // EMIT SOCKET EVENT TO CUSTOMER
    try {
      const io = getIO();
      
      if (io) {
        // Create update data
        const updateData = {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          _id: order._id.toString(),
          status: status,
          oldStatus: oldStatus,
          timestamp: new Date(),
          estimatedDelivery: order.estimatedDelivery || '25-30 minutes',
          message: getStatusMessage(status),
          customerEmail: order.customerEmail,
          customerName: order.customerName
        };
        
        // Emit to customer's email room
        const customerRoom = `user-${order.customerEmail}`;
        io.to(customerRoom).emit('order-status-updated', updateData);
        console.log(`Emitted to customer room: ${customerRoom}`);
        
        // Emit to order-specific room
        const orderRoom = `order-${order._id}`;
        io.to(orderRoom).emit('order-status-updated', updateData);
        console.log(`Emitted to order room: ${orderRoom}`);
        
        // Also emit with alternative event name (backup)
        io.to(customerRoom).emit('status-update', updateData);
        
        console.log('Socket emission successful');
      } else {
        console.warn('Socket.IO not initialized');
      }
      
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError.message);
      // Don't fail the request if socket fails
    }
    
    // Return success response
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        estimatedDelivery: order.estimatedDelivery,
        updatedAt: order.updatedAt
      }
    });
    
  } catch (error) {
    console.error('UPDATE ORDER STATUS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    });
  }
});

// GET /api/seller/orders/stats - Seller order statistics
router.get('/stats', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    
    console.log('Fetching order stats for seller:', sellerId);
    
    const [newOrders, preparing, ready, delivered, total] = await Promise.all([
      Order.countDocuments({ seller: sellerId, orderStatus: { $in: ['confirmed', 'pending'] } }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'preparing' }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'ready' }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'delivered' }),
      Order.countDocuments({ seller: sellerId })
    ]);
    
    console.log('Order stats:', { newOrders, preparing, ready, delivered, total });
    
    res.json({
      success: true,
      stats: {
        new: newOrders,
        preparing,
        ready,
        delivered,
        total
      }
    });
  } catch (error) {
    console.error('GET SELLER ORDER STATS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
});

// GET /api/seller/orders/:orderId - Get single order details
router.get('/:orderId', authenticateSellerToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller.id;
    
    const order = await Order.findOne({ _id: orderId, seller: sellerId }).lean();
    
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
    console.error('GET ORDER DETAILS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
});

// Helper function to get user-friendly status messages
function getStatusMessage(status) {
  const messages = {
    'pending': 'Your order has been received',
    'confirmed': 'Your order has been confirmed by the restaurant',
    'preparing': 'The restaurant is preparing your delicious food',
    'ready': 'Your order is ready for pickup',
    'out_for_delivery': 'Your order is on its way to you',
    'delivered': 'Your order has been delivered. Enjoy your meal!',
    'cancelled': 'Your order has been cancelled'
  };
  return messages[status] || 'Order status updated';
}

export default router;