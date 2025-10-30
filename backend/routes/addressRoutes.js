// backend/routes/addressRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import addressController from '../controllers/addressController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation rules
const addressValidation = [
  body('fullName').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('phoneNumber').trim().notEmpty().matches(/^[+]?[\d\s-()]{10,15}$/),
  body('alternatePhone').optional().trim().matches(/^[+]?[\d\s-()]{10,15}$/),
  body('pincode').trim().notEmpty().matches(/^[0-9]{6}$/),
  body('state').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('city').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('houseNo').trim().notEmpty().isLength({ max: 200 }),
  body('roadArea').trim().notEmpty().isLength({ max: 200 }),
  body('landmark').optional().trim().isLength({ max: 200 }),
  body('type').optional().isIn(['home', 'work', 'other']),
  body('isDefault').optional().isBoolean()
];

const idValidation = [param('id').isMongoId()];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/', addressController.getAllAddresses);
router.get('/default', addressController.getDefaultAddress);
router.get('/:id', idValidation, addressController.getAddressById);
router.post('/', addressValidation, addressController.createAddress);
router.put('/:id', [...idValidation, ...addressValidation], addressController.updateAddress);
router.put('/:id/set-default', idValidation, addressController.setDefaultAddress);
router.delete('/:id', idValidation, addressController.deleteAddress);

export default router;