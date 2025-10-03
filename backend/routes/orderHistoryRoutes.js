// routes/orderHistoryRoutes.js - FIXED FOR CUSTOMER ORDER HISTORY
import express from 'express';
import Order from '../models/Order.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';

const router = express.Router();

// ==================== CUSTOMER ORDER HISTORY ====================

// GET /api/order-history - Get customer's completed/cancelled/active orders
router.get('/', authenticateToken, async (req, res) => {
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
    console.log('Full user object from JWT:', user);

    // ✅ FIX: Build query with correct field names from JWT
    const orConditions = [];
    
    if (user.email) orConditions.push({ customerEmail: user.email });
    if (user.emailId) orConditions.push({ customerEmail: user.emailId });

    const phoneCandidate = user.phone || user.phoneNumber;
    if (phoneCandidate) {
      const cleanPhone = phoneCandidate.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        orConditions.push({ customerPhone: cleanPhone });
      }
    }

    if (orConditions.length === 0) {
      console.error('❌ No valid user identification found in JWT');
      return res.status(400).json({
        success: false,
        error: 'User identification not found',
        debug: {
          userFields: Object.keys(user),
          hasEmail: !!user.email,
          hasEmailId: !!user.emailId,
          hasPhone: !!user.phone || !!user.phoneNumber
        }
      });
    }

    // Build query
    const query = { $or: orConditions };

    // Filter by status
    if (status !== 'all') {
      if (status === 'completed') query.orderStatus = 'delivered';
      else if (status === 'cancelled') query.orderStatus = 'cancelled';
      else if (status === 'active') {
        query.orderStatus = { 
          $in: ['confirmed', 'pending', 'preparing', 'ready', 'out_for_delivery'] 
        };
      } else {
        query.orderStatus = status;
      }
    }

    console.log('📋 MongoDB Query:', JSON.stringify(query, null, 2));

    // Count total documents
    const total = await Order.countDocuments(query);

    // Fetch orders with pagination
    const orders = await Order.find(query)
      .populate('dish', 'name image category type price')
      .populate('seller', 'businessName email phone')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log(`✅ Found ${orders.length} orders (total: ${total})`);

    // Transform orders
    const transformedOrders = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      restaurantName: order.item?.restaurant || order.seller?.businessName || 'Restaurant',
      
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
      
      items: [{
        dishId: order.dish?._id || order.item?.dishId,
        dishName: order.item?.name || 'Food Item',
        quantity: order.item?.quantity || 1,
        price: order.item?.price || 0,
        dishImage: order.item?.image || order.dish?.image,
        category: order.item?.category || order.dish?.category,
        type: order.item?.type || order.dish?.type
      }],
      
      total: order.totalAmount,
      subtotal: order.orderBreakdown?.itemPrice || order.item?.price || 0,
      deliveryFee: order.orderBreakdown?.deliveryFee || 25,
      taxes: order.orderBreakdown?.gst || 0,
      
      deliveryAddress: {
        address: order.deliveryAddress,
        phoneNumber: order.customerPhone
      },
      
      rating: order.rating,
      review: order.review,
      ratedAt: order.ratedAt
    }));

    res.json({
      success: true,
      orders: transformedOrders,
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

// GET /api/order-history/stats - Get customer order statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const orConditions = [];
    
    if (user.email) orConditions.push({ customerEmail: user.email });
    if (user.emailId) orConditions.push({ customerEmail: user.emailId });

    const phoneCandidate = user.phone || user.phoneNumber;
    if (phoneCandidate) {
      const cleanPhone = phoneCandidate.replace(/\D/g, '');
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

    const [
      totalOrders,
      completedOrders,
      activeOrders,
      cancelledOrders,
      totalSpent
    ] = await Promise.all([
      Order.countDocuments(query),
      Order.countDocuments({ ...query, orderStatus: 'delivered' }),
      Order.countDocuments({ ...query, orderStatus: { $in: ['confirmed', 'pending', 'preparing', 'ready', 'out_for_delivery'] } }),
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
        totalSpent: totalSpent[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('❌ ORDER STATS ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// POST /api/order-history/:orderId/reorder - Reorder from history
router.post('/:orderId/reorder', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    const orConditions = [];
    if (user.email) orConditions.push({ customerEmail: user.email });
    if (user.emailId) orConditions.push({ customerEmail: user.emailId });

    const phoneCandidate = user.phone || user.phoneNumber;
    if (phoneCandidate) {
      const cleanPhone = phoneCandidate.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        orConditions.push({ customerPhone: cleanPhone });
      }
    }

    const order = await Order.findOne({
      $and: [
        { $or: [{ orderId }, { _id: orderId }] },
        { $or: orConditions }
      ]
    }).populate('dish');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Order items ready for reorder',
      items: [{
        dishId: order.dish?._id,
        dishName: order.item?.name,
        price: order.item?.price,
        quantity: order.item?.quantity || 1,
        image: order.item?.image,
        restaurantName: order.item?.restaurant
      }]
    });

  } catch (error) {
    console.error('❌ REORDER ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder' });
  }
});

// ==================== SELLER ORDER HISTORY ====================

// GET /api/order-history/seller - Get seller's order history
router.get('/seller', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { status = 'delivered', page = 1, limit = 20, startDate, endDate } = req.query;

    const query = { 
      seller: sellerId,
      orderStatus: status === 'all' ? { $in: ['delivered', 'cancelled'] } : status
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ SELLER ORDER HISTORY ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order history' });
  }
});

export default router;
