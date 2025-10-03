// routes/sellerStatus.js - API endpoints for seller status

import express from 'express';
import sellerStatusManager from '../utils/sellerStatusManager.js';

const router = express.Router();

// GET /api/seller-status/:sellerId - Get single seller status
router.get('/:sellerId', (req, res) => {
  try {
    const { sellerId } = req.params;
    const status = sellerStatusManager.getSellerStatus(sellerId);
    res.json({
      success: true,
      sellerId,
      ...status
    });
  } catch (error) {
    console.error('Get seller status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get seller status' });
  }
});

// POST /api/seller-status/bulk - Get multiple seller statuses
router.post('/bulk', (req, res) => {
  try {
    const { sellerIds } = req.body;
    if (!Array.isArray(sellerIds)) {
      return res.status(400).json({
        success: false,
        error: 'sellerIds must be an array'
      });
    }

    const statuses = sellerStatusManager.getMultipleSellerStatuses(sellerIds);

    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('Get bulk seller statuses error:', error);
    res.status(500).json({ success: false, error: 'Failed to get seller statuses' });
  }
});

// GET /api/seller-status/online/all - Get all online sellers
router.get('/online/all', (req, res) => {
  try {
    const onlineSellers = sellerStatusManager.getOnlineSellers();
    res.json({
      success: true,
      count: onlineSellers.length,
      sellers: onlineSellers
    });
  } catch (error) {
    console.error('Get online sellers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get online sellers' });
  }
});

export default router;
