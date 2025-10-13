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

export default router;