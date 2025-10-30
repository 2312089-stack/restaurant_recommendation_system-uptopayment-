// backend/routes/adminBankRoutes.js
import express from 'express';
import { authenticateAdmin } from '../middleware/adminSecurity.js';
import {
  getAllSellerBankDetails,
  getSellerBankDetails,
  verifyBankDetails,
  updateSellerBankDetails,
  getBankDetailsStats
} from '../controllers/adminBankController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get statistics
router.get('/stats', getBankDetailsStats);

// Get all sellers with bank details (with filters)
router.get('/', getAllSellerBankDetails);

// Get specific seller's bank details
router.get('/:sellerId', getSellerBankDetails);

// Verify bank details
router.post('/:sellerId/verify', verifyBankDetails);

// Update bank details (admin override)
router.put('/:sellerId', updateSellerBankDetails);

export default router;