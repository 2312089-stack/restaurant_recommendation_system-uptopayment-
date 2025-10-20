import express from 'express';
import Seller from '../models/Seller.js';

const router = express.Router();

// GET /api/seller-status/:sellerId - Get single seller status
router.get('/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const seller = await Seller.findById(sellerId)
      .select('isOnline dashboardStatus lastActive')
      .lean();

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    res.json({
      success: true,
      status: {
        isOnline: seller.isOnline,
        dashboardStatus: seller.dashboardStatus,
        lastActive: seller.lastActive
      }
    });

  } catch (error) {
    console.error('Get seller status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller status'
    });
  }
});

// POST /api/seller-status/bulk - Get multiple seller statuses
router.post('/bulk', async (req, res) => {
  try {
    const { sellerIds } = req.body;

    if (!Array.isArray(sellerIds) || sellerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Seller IDs array is required'
      });
    }

    const sellers = await Seller.find({
      _id: { $in: sellerIds }
    })
    .select('isOnline dashboardStatus lastActive')
    .lean();

    const statusMap = {};
    sellers.forEach(seller => {
      statusMap[seller._id.toString()] = {
        isOnline: seller.isOnline,
        dashboardStatus: seller.dashboardStatus,
        lastActive: seller.lastActive
      };
    });

    res.json({
      success: true,
      statuses: statusMap
    });

  } catch (error) {
    console.error('Get bulk seller status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller statuses'
    });
  }
});

export default router;