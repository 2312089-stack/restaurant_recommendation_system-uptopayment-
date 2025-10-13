// routes/orderHistoryRoutes.js - COMPLETE VERSION
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import OrderHistory from '../models/OrderHistory.js';
import Order from '../models/Order.js';

const router = express.Router();

// ✅ GET ALL ORDER HISTORY
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { status } = req.query;
    
    console.log('📦 Fetching order history for user:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in token'
      });
    }

    const query = { customerId: userId };
    
    if (status && status !== 'all') {
      query.currentStatus = status;
    }

    const orderHistory = await OrderHistory.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'orderMongoId',
        populate: {
          path: 'dish',
          select: 'name image category type price description'
        }
      })
      .lean();
    
    console.log(`✅ Found ${orderHistory.length} orders for user`);

    // Get summary
    const summary = await OrderHistory.aggregate([
      { $match: { customerId: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] }
          },
          pending: {
            $sum: { 
              $cond: [
                { 
                  $in: ['$currentStatus', ['pending_seller', 'seller_accepted', 'preparing', 'out_for_delivery']] 
                }, 
                1, 
                0
              ] 
            }
          },
          cancelled: {
            $sum: { 
              $cond: [
                { 
                  $in: ['$currentStatus', ['seller_rejected', 'cancelled']] 
                }, 
                1, 
                0
              ] 
            }
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$currentStatus', 'delivered'] },
                '$snapshot.totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      orders: orderHistory,
      count: orderHistory.length,
      summary: summary[0] || {
        totalOrders: 0,
        delivered: 0,
        pending: 0,
        cancelled: 0,
        totalSpent: 0
      }
    });
  } catch (error) {
    console.error('❌ Get order history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET SINGLE ORDER BY ORDERID
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { orderId } = req.params;
    
    console.log('📦 Fetching order:', orderId, 'for user:', userId);
    
    const history = await OrderHistory.findOne({
      $or: [
        { orderId: orderId },
        { orderMongoId: orderId }
      ],
      customerId: userId
    }).populate('orderMongoId').lean();
    
    if (!history) {
      console.log('❌ Order history not found');
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = await Order.findById(history.orderMongoId)
      .populate('dish', 'name image category type price')
      .populate('seller', 'businessName')
      .lean();
    
    if (!order) {
      console.log('⚠️ Order document not found, using history only');
      return res.json({
        success: true,
        history,
        order: null
      });
    }
    
    console.log('✅ Order found:', orderId);
    
    res.json({
      success: true,
      history,
      order: {
        ...order,
        currentStatus: history.currentStatus,
        rating: history.rating?.score,
        review: history.rating?.review
      }
    });
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ CANCEL ORDER
router.post('/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;
    
    console.log('❌ Cancelling order:', orderId);
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }

    const history = await OrderHistory.findOne({
      orderId: orderId,
      customerId: userId
    });
    
    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const cancellableStatuses = ['pending_seller'];
    if (!cancellableStatuses.includes(history.currentStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled at this stage'
      });
    }

    history.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      actor: 'customer',
      note: reason
    });
    history.currentStatus = 'cancelled';
    history.cancellationInfo = {
      cancelledBy: 'customer',
      reason: reason,
      timestamp: new Date(),
      refundStatus: 'pending'
    };
    history.isTemporary = false;
    await history.save();
    
    const order = await Order.findById(history.orderMongoId);
    if (order) {
      order.orderStatus = 'cancelled';
      order.cancelledBy = 'customer';
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      order.orderTimeline.push({
        status: 'cancelled',
        timestamp: new Date(),
        actor: 'customer',
        message: `Order cancelled: ${reason}`
      });
      await order.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`seller-${order.seller}`).emit('order-cancelled', {
          orderId: order.orderId,
          customerName: order.customerName,
          reason: reason,
          timestamp: new Date()
        });
      }
    }
    
    console.log('✅ Order cancelled successfully');
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ RATE ORDER
router.post('/:orderId/rate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { orderId } = req.params;
    const { score, review } = req.body;
    
    console.log('⭐ Rating order:', orderId, 'Score:', score);
    
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const history = await OrderHistory.findOne({
      orderId: orderId,
      customerId: userId,
      currentStatus: 'delivered'
    });
    
    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or not eligible for rating'
      });
    }

    if (history.rating && history.rating.score) {
      return res.status(400).json({
        success: false,
        error: 'Order already rated'
      });
    }

    history.rating = {
      score: score,
      review: review || '',
      ratedAt: new Date()
    };
    await history.save();
    
    const order = await Order.findById(history.orderMongoId);
    if (order) {
      order.rating = score;
      order.review = review || '';
      order.ratedAt = new Date();
      await order.save();
    }
    
    console.log('✅ Order rated successfully');
    
    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: history.rating
    });
  } catch (error) {
    console.error('❌ Rate order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ GET ORDER SUMMARY
router.get('/summary/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const summary = await OrderHistory.getCustomerSummary(userId);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('❌ Get summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;