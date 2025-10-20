// backend/routes/sellerSettings.js
import express from 'express';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import {
  getSettings,
  updateNotificationSettings,
  changePassword,
  updateBankDetails,
  updateBusinessHours
} from '../controllers/sellerSettingsController.js';

const router = express.Router();

// Get settings
router.get('/', authenticateSellerToken, getSettings);

// Update notification settings
router.put('/notifications', authenticateSellerToken, updateNotificationSettings);

// Change password
router.post('/change-password', authenticateSellerToken, changePassword);

// Update bank details
router.put('/bank-details', authenticateSellerToken, updateBankDetails);

// Update business hours
router.put('/business-hours', authenticateSellerToken, updateBusinessHours);

export default router;