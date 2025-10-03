// routes/customerOrderRoutes.js - COMPLETE ORDER MANAGEMENT
import express from 'express';
import Order from '../models/Order.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createOrder } from '../controllers/orderController.js';

const router = express.Router();

// ==================== CREATE ORDER ====================
router.post('/create', authenticateToken, createOrder);

// ==================== ORDER HISTORY ====================

// GET /api/orders/history - Get customer's order history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { 
      status = 'all', 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('=== FETCHING ORDER HISTORY ===');
    console.log('User:', { email: user.email, phone: user.phone });

    // Build query with email/phone matching
    const orConditions = [];
    
    if (user.email) {
      orConditions.push({ customerEmail: user.email });
    }
    
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        orConditions.push({ customerPhone: cleanPhone });
      }
    }

    if (orConditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No user identification found'
      });
    }

    const query = { $or: orConditions };

    // Apply status filter
    if (status !== 'all') {
      if (status === 'completed') {
        query.orderStatus = 'delivered';
      } else if (status === 'cancelled') {
        query.orderStatus = 'cancelled';
      } else if (status === 'active') {
        query.orderStatus = { 
          $in: ['confirmed', 'pending', 'preparing', 'ready', 'out_for_delivery'] 
        };
      } else {
        query.orderStatus = status;
      }
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    // Count total
    const total = await Order.countDocuments(query);
    console.log(`Total orders: ${total}`);

    // Fetch orders
    const orders = await Order.find(query)
      .populate('dish', 'name image category type price')
      .populate('seller', 'businessName email phone')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log(`Fetched ${orders.length} orders`);

    // Transform for frontend
    const transformedOrders = orders.map(order => {
      const itemPrice = order.item?.price || order.orderBreakdown?.itemPrice || 0;
      const deliveryFee = order.orderBreakdown?.deliveryFee || 25;
      const gst = order.orderBreakdown?.gst || Math.round(itemPrice * 0.05);
      
      return {
        _id: order._id,
        orderId: order.orderId,
        restaurantName: order.item?.restaurant || order.seller?.businessName || 'TasteSphere',
        
        // ✅ PRIMARY STATUS FIELD
        status: order.orderStatus,
        orderStatus: order.orderStatus,
        
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentId: order.razorpayPaymentId,
        
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveredAt: order.actualDeliveryTime,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        
        canReorder: order.orderStatus === 'delivered',
        canRate: order.orderStatus === 'delivered' && !order.rating,
        canCancel: ['confirmed', 'pending', 'preparing'].includes(order.orderStatus),
        
        items: [{
          dishId: order.dish?._id || order.item?.dishId,
          dishName: order.item?.name || 'Food Item',
          quantity: order.item?.quantity || 1,
          price: itemPrice,
          dishImage: order.item?.image || order.dish?.image,
          category: order.item?.category || order.dish?.category,
          type: order.item?.type || order.dish?.type
        }],
        
        total: order.totalAmount,
        subtotal: itemPrice,
        deliveryFee: deliveryFee,
        taxes: gst,
        discount: 0,
        
        deliveryAddress: {
          address: order.deliveryAddress || 'N/A',
          phoneNumber: order.customerPhone
        },
        
        estimatedDelivery: order.estimatedDelivery,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        
        rating: order.rating,
        review: order.review,
        ratedAt: order.ratedAt
      };
    });

    res.json({
      success: true,
      orders: transformedOrders,
      count: transformedOrders.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ ORDER HISTORY ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order history',
      details: error.message
    });
  }
});

// GET /api/orders/stats/summary - Get order statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const orConditions = [];
    if (user.email) orConditions.push({ customerEmail: user.email });
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        orConditions.push({ customerPhone: cleanPhone });
      }
    }

    if (orConditions.length === 0) {
      return res.json({
        success: true,
        stats: { total: 0, completed: 0, active: 0, cancelled: 0, totalSpent: 0 }
      });
    }

    const query = { $or: orConditions };
    
    const [totalOrders, completedOrders, activeOrders, cancelledOrders, totalSpentResult] = 
      await Promise.all([
        Order.countDocuments(query),
        Order.countDocuments({ ...query, orderStatus: 'delivered' }),
        Order.countDocuments({ 
          ...query, 
          orderStatus: { $in: ['confirmed', 'pending', 'preparing', 'ready', 'out_for_delivery'] }
        }),
        Order.countDocuments({ ...query, orderStatus: 'cancelled' }),
        Order.aggregate([
          { $match: { ...query, orderStatus: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);

    res.json({
      success: true,
      stats: {
        total: totalOrders,
        completed: completedOrders,
        active: activeOrders,
        cancelled: cancelledOrders,
        totalSpent: totalSpentResult[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('❌ STATS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/orders/:orderId - Get single order
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    const orderIdQuery = {
      $or: [
        { orderId: orderId },
        { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }
      ].filter(q => q._id !== null)
    };

    const userQuery = { $or: [] };
    if (user.email) userQuery.$or.push({ customerEmail: user.email });
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        userQuery.$or.push({ customerPhone: cleanPhone });
      }
    }

    if (userQuery.$or.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const order = await Order.findOne({
      $and: [orderIdQuery, userQuery]
    })
      .populate('dish', 'name image category type price')
      .populate('seller', 'businessName email phone')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({ success: true, order });

  } catch (error) {
    console.error('❌ GET ORDER ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// PATCH /api/orders/:orderId/cancel - Cancel order
router.patch('/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const orderIdQuery = {
      $or: [
        { orderId: orderId },
        { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }
      ].filter(q => q._id !== null)
    };

    const userQuery = { $or: [] };
    if (user.email) userQuery.$or.push({ customerEmail: user.email });
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        userQuery.$or.push({ customerPhone: cleanPhone });
      }
    }

    const order = await Order.findOne({
      $and: [orderIdQuery, userQuery]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    await order.cancelOrder(reason || 'Cancelled by customer', 'customer');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('❌ CANCEL ORDER ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order'
    });
  }
});

// POST /api/orders/:orderId/reorder - Reorder
router.post('/:orderId/reorder', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    const orderIdQuery = {
      $or: [
        { orderId: orderId },
        { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }
      ].filter(q => q._id !== null)
    };

    const userQuery = { $or: [] };
    if (user.email) userQuery.$or.push({ customerEmail: user.email });
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        userQuery.$or.push({ customerPhone: cleanPhone });
      }
    }

    const order = await Order.findOne({
      $and: [orderIdQuery, userQuery]
    }).populate('dish');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (!order.dish) {
      return res.status(404).json({
        success: false,
        error: 'This dish is no longer available'
      });
    }

    res.json({
      success: true,
      message: 'Order items ready for reorder',
      items: [{
        dishId: order.dish._id,
        dishName: order.item?.name || order.dish.name,
        price: order.item?.price || order.dish.price,
        quantity: order.item?.quantity || 1,
        image: order.item?.image || order.dish.image,
        restaurantName: order.item?.restaurant
      }]
    });

  } catch (error) {
    console.error('❌ REORDER ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder'
    });
  }
});

export default router;