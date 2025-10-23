// routes/settlementRoutes.js - COMPLETE ENHANCED VERSION
import express from 'express';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import settlementController from '../controllers/settlementController.js';

const router = express.Router();

// ✅ Get settlement dashboard with daily/weekly data
router.get('/dashboard', authenticateSellerToken, settlementController.getSettlementDashboard);

// ✅ Download settlement report CSV (date range)
router.get('/report/download', authenticateSellerToken, settlementController.downloadSettlementReport);

// ✅ Download daily settlement report (specific date)
router.get('/report/daily', authenticateSellerToken, settlementController.downloadDailyReport);

// ✅ Get settlements by date range
router.get('/history', authenticateSellerToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Seller authentication required'
      });
    }

    const query = {
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ],
      orderStatus: { $in: ['delivered', 'completed'] },
      paymentStatus: 'completed'
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const Order = (await import('../models/Order.js')).default;
    const orders = await Order.find(query).sort({ createdAt: -1 });

    const settlements = settlementController.calculatePastSettlements(orders);

    res.json({
      success: true,
      settlements,
      totalOrders: orders.length
    });

  } catch (error) {
    console.error('❌ Get settlement history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settlement history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ Get today's settlement summary
router.get('/today', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Seller authentication required'
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const Order = (await import('../models/Order.js')).default;
    
    const todayOrders = await Order.find({
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ],
      orderStatus: { $in: ['delivered', 'completed'] },
      paymentStatus: 'completed',
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd
      }
    }).sort({ createdAt: -1 });

    const razorpayOrders = todayOrders.filter(o => o.paymentMethod === 'razorpay');
    const codOrders = todayOrders.filter(o => o.paymentMethod === 'cod');

    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const razorpayRevenue = razorpayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const codRevenue = codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const platformFees = totalRevenue * 0.05;
    const tcs = totalRevenue * 0.01;
    const tds = totalRevenue * 0.02;
    const netSettlement = totalRevenue - platformFees - tcs - tds;

    res.json({
      success: true,
      data: {
        date: todayStart.toISOString().split('T')[0],
        totalOrders: todayOrders.length,
        razorpayOrders: razorpayOrders.length,
        codOrders: codOrders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        razorpayRevenue: Math.round(razorpayRevenue * 100) / 100,
        codRevenue: Math.round(codRevenue * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        tcs: Math.round(tcs * 100) / 100,
        tds: Math.round(tds * 100) / 100,
        netSettlement: Math.round(netSettlement * 100) / 100,
        orders: todayOrders.map(order => ({
          orderId: order.orderId,
          customerName: order.customerName,
          itemName: order.item?.name,
          amount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          time: order.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get today settlement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s settlement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// In settlementRoutes.js - Add this for debugging
router.get('/debug-orders', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller._id;
    
    const Order = (await import('../models/Order.js')).default;
    
    const allOrders = await Order.find({ seller: sellerId });
    const deliveredOrders = await Order.find({ 
      seller: sellerId, 
      orderStatus: { $in: ['delivered', 'completed'] } 
    });
    const razorpayCompleted = await Order.find({ 
      seller: sellerId, 
      paymentMethod: 'razorpay',
      paymentStatus: 'completed'
    });
    
    res.json({
      sellerId,
      stats: {
        totalOrders: allOrders.length,
        deliveredOrders: deliveredOrders.length,
        razorpayCompleted: razorpayCompleted.length
      },
      sampleOrders: allOrders.slice(0, 3).map(o => ({
        orderId: o.orderId,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        totalAmount: o.totalAmount
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add this at the top of settlementRoutes.js, right after the /dashboard route

router.get('/debug', authenticateSellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
    
    console.log('\n🔍 ========== DEBUG SETTLEMENT ==========');
    console.log('Seller ID:', sellerId);
    
    const Order = (await import('../models/Order.js')).default;
    
    // Check total orders for this seller
    const totalOrders = await Order.countDocuments({
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ]
    });
    
    console.log('Total seller orders:', totalOrders);
    
    // Check delivered orders
    const deliveredOrders = await Order.find({
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ],
      orderStatus: { $in: ['delivered', 'completed'] }
    }).limit(5);
    
    console.log('Delivered orders:', deliveredOrders.length);
    
    // Check sample order structure
    if (deliveredOrders.length > 0) {
      const sample = deliveredOrders[0];
      console.log('\nSample order:', {
        orderId: sample.orderId,
        seller: sample.seller,
        restaurantId: sample.restaurantId,
        paymentMethod: sample.paymentMethod,
        paymentStatus: sample.paymentStatus,
        orderStatus: sample.orderStatus,
        totalAmount: sample.totalAmount
      });
    }
    
    // Test the exact query used in dashboard
    const dashboardQuery = {
      $and: [
        {
          $or: [
            { seller: sellerId },
            { restaurantId: sellerId }
          ]
        },
        {
          $or: [
            { paymentMethod: 'razorpay', paymentStatus: 'completed' },
            { paymentMethod: 'cod', orderStatus: { $in: ['delivered', 'completed'] } }
          ]
        }
      ]
    };
    
    console.log('\nTesting dashboard query...');
    const dashboardOrders = await Order.find(dashboardQuery);
    console.log('Dashboard query result:', dashboardOrders.length, 'orders');
    
    if (dashboardOrders.length > 0) {
      const razorpay = dashboardOrders.filter(o => o.paymentMethod === 'razorpay');
      const cod = dashboardOrders.filter(o => o.paymentMethod === 'cod');
      console.log('Razorpay:', razorpay.length);
      console.log('COD:', cod.length);
    }
    
    console.log('========================================\n');
    
    res.json({
      success: true,
      sellerId,
      totalOrders,
      deliveredOrders: deliveredOrders.length,
      dashboardQueryResult: dashboardOrders.length,
      sampleOrder: deliveredOrders.length > 0 ? {
        orderId: deliveredOrders[0].orderId,
        paymentMethod: deliveredOrders[0].paymentMethod,
        paymentStatus: deliveredOrders[0].paymentStatus,
        orderStatus: deliveredOrders[0].orderStatus,
        totalAmount: deliveredOrders[0].totalAmount
      } : null
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;