// backend/routes/customerOrderRoutes.js - FIXED WITH BETTER EMAIL MATCHING
import express from 'express';
import Order from '../models/Order.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== GET ORDER HISTORY ====================
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // ✅ Try multiple email field variations
    const customerEmail = req.user?.email || req.user?.emailId || req.user?.userEmail;
    
    console.log('🔍 DEBUG - Auth user object:', JSON.stringify(req.user, null, 2));
    console.log('📧 Fetching order history for email:', customerEmail);

    if (!customerEmail) {
      console.error('❌ No email found in token. User object:', req.user);
      return res.status(400).json({
        success: false,
        error: 'Customer email not found in authentication token',
        debug: {
          userObject: req.user,
          availableFields: Object.keys(req.user || {})
        }
      });
    }

    // ✅ Query using case-insensitive email match
    const orders = await Order.find({ 
      customerEmail: { $regex: new RegExp(`^${customerEmail}$`, 'i') }
    })
      .populate({
        path: 'dish',
        select: 'name image category type price description'
      })
      .populate({
        path: 'seller',
        select: 'businessName businessDetails.logo address'
      })
      .sort('-createdAt')
      .lean();

    console.log(`✅ Found ${orders.length} orders for ${customerEmail}`);
    
    if (orders.length === 0) {
      // Additional debug: check if ANY orders exist for similar email
      const allOrderEmails = await Order.distinct('customerEmail');
      console.log('📊 All customer emails in database:', allOrderEmails);
      
      const similarEmails = allOrderEmails.filter(email => 
        email?.toLowerCase().includes(customerEmail.toLowerCase().split('@')[0])
      );
      
      if (similarEmails.length > 0) {
        console.log('⚠️ Found similar emails:', similarEmails);
        console.log('⚠️ Email mismatch detected! Token email:', customerEmail);
      }
    }

    // Transform orders for frontend
    const transformedOrders = orders.map(order => ({
      _id: order._id.toString(),
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      
      totalAmount: order.totalAmount,
      
      item: {
        name: order.item?.name || order.dish?.name || 'Food Item',
        quantity: order.item?.quantity || 1,
        price: order.item?.price || order.dish?.price || order.totalAmount,
        image: order.item?.image || order.dish?.image,
        restaurant: order.seller?.businessName || order.item?.restaurant || 'Restaurant',
        category: order.item?.category || order.dish?.category,
        type: order.item?.type || order.dish?.type
      },
      
      deliveryAddress: order.deliveryAddress,
      estimatedDelivery: order.estimatedDelivery,
      actualDeliveryTime: order.actualDeliveryTime,
      
      // Cancellation info
      cancellationReason: order.cancellationReason,
      cancelledBy: order.cancelledBy,
      cancelledAt: order.cancelledAt,
      
      // Refund info
      refundStatus: order.refundStatus,
      refundAmount: order.refundAmount,
      
      orderBreakdown: order.orderBreakdown,
      orderTimeline: order.orderTimeline || [],
      
      rating: order.rating,
      review: order.review,
      ratedAt: order.ratedAt,
      
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json({
      success: true,
      orders: transformedOrders,
      debug: {
        queriedEmail: customerEmail,
        totalFound: orders.length
      }
    });

  } catch (error) {
    console.error('❌ Get order history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order history',
      details: error.message
    });
  }
});

// ==================== DEBUG ENDPOINT - Check database directly ====================
router.get('/debug/all-orders', authenticateToken, async (req, res) => {
  try {
    const allOrders = await Order.find({}).limit(10).lean();
    const orderEmails = await Order.distinct('customerEmail');
    
    res.json({
      success: true,
      debug: {
        tokenEmail: req.user?.email || req.user?.emailId,
        tokenUser: req.user,
        totalOrdersInDB: await Order.countDocuments({}),
        allCustomerEmails: orderEmails,
        sampleOrders: allOrders.map(o => ({
          orderId: o.orderId,
          customerEmail: o.customerEmail,
          customerName: o.customerName,
          status: o.orderStatus,
          createdAt: o.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET ORDER STATISTICS ====================
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const customerEmail = req.user?.email || req.user?.emailId;

    const [total, completed, active, cancelled, totalSpent] = await Promise.all([
      Order.countDocuments({ customerEmail }),
      Order.countDocuments({ customerEmail, orderStatus: 'delivered' }),
      Order.countDocuments({
        customerEmail,
        orderStatus: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] }
      }),
      Order.countDocuments({ customerEmail, orderStatus: 'cancelled' }),
      Order.aggregate([
        { $match: { customerEmail, orderStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total,
        completed,
        active,
        cancelled,
        totalSpent: totalSpent[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// ==================== GET SINGLE ORDER ====================
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerEmail = req.user?.email || req.user?.emailId;

    const order = await Order.findOne({
      $or: [
        { orderId: orderId },
        { _id: orderId }
      ],
      customerEmail: customerEmail
    })
      .populate('dish', 'name image category type price description')
      .populate('seller', 'businessName businessDetails address')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const transformedOrder = {
      ...order,
      _id: order._id.toString(),
      status: order.orderStatus,
      item: {
        ...order.item,
        image: order.item?.image || order.dish?.image,
        restaurant: order.seller?.businessName || order.item?.restaurant
      }
    };

    res.json({
      success: true,
      order: transformedOrder
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// ==================== RATE ORDER ====================
router.post('/:orderId/rate', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, review } = req.body;
    const customerEmail = req.user?.email || req.user?.emailId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const order = await Order.findOne({
      $or: [{ orderId }, { _id: orderId }],
      customerEmail
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Can only rate delivered orders'
      });
    }

    if (order.rating) {
      return res.status(400).json({
        success: false,
        error: 'Order already rated'
      });
    }

    order.rating = rating;
    order.review = review || '';
    order.ratedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      order: {
        orderId: order.orderId,
        rating: order.rating,
        review: order.review
      }
    });

  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    });
  }
});

// ==================== REORDER ====================
router.post('/:orderId/reorder', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerEmail = req.user?.email || req.user?.emailId;

    const order = await Order.findOne({
      orderId: orderId,
      customerEmail: customerEmail
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

    if (!order.dish.availability) {
      return res.status(400).json({
        success: false,
        error: 'This dish is currently unavailable'
      });
    }

    res.json({
      success: true,
      items: [{
        id: order.dish._id,
        name: order.item.name,
        image: order.item.image,
        price: order.dish.price,
        restaurant: order.item.restaurant,
        description: order.dish.description,
        category: order.dish.category,
        type: order.dish.type
      }]
    });

  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process reorder'
    });
  }
});

// ==================== CANCEL ORDER ====================
router.patch('/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const customerEmail = req.user?.email || req.user?.emailId;

    const order = await Order.findOne({
      $or: [{ orderId }, { _id: orderId }],
      customerEmail
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (!['confirmed', 'pending', 'preparing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order with status: ${order.orderStatus}`
      });
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = 'customer';
    order.cancellationReason = reason || 'Cancelled by customer';
    
    order.orderTimeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      actor: 'customer',
      message: order.cancellationReason
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        cancellationReason: order.cancellationReason
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});
// Add to customerOrderRoutes.js temporarily
router.get('/debug/check-emails', async (req, res) => {
  const allEmails = await Order.distinct('customerEmail');
  const token = req.headers.authorization?.split(' ')[1];
  let tokenEmail = 'No token';
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenEmail = payload.email || payload.emailId;
    } catch (e) {}
  }
  
  res.json({
    tokenEmail,
    allOrderEmails: allEmails,
    totalOrders: await Order.countDocuments({})
  });
});
export default router;