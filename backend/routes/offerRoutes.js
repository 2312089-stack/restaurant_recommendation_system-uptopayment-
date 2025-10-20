import express from 'express';
import { 
  createOffer, 
  getSellerOffers, 
  updateOffer, 
  deleteOffer, 
  getOfferById 
} from '../controllers/offerController.js';

// ✅ FIXED: Use default import (most common pattern)
// If it exports 'sellerAuth'
import { authenticateSeller } from '../middleware/authMiddleware.js';

// If it exports 'verifySellerToken'  
const router = express.Router();

// All routes require seller authentication
router.use(authenticateSeller);

router.post('/', createOffer);
router.get('/', getSellerOffers);
router.get('/:id', getOfferById);
router.patch('/:id', updateOffer);
router.delete('/:id', deleteOffer);

export default router;