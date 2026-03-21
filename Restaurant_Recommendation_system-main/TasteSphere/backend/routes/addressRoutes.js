// backend/routes/addressRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import addressController from '../controllers/addressController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation rules for address creation/update
const addressValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
    
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s-()]{10,15}$/)
    .withMessage('Invalid phone number format'),
    
  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s-()]{10,15}$/)
    .withMessage('Invalid alternate phone number format'),
    
  body('pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required')
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be 6 digits'),
    
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
    
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
    
  body('houseNo')
    .trim()
    .notEmpty()
    .withMessage('House/Building number is required')
    .isLength({ max: 200 })
    .withMessage('House number is too long'),
    
  body('roadArea')
    .trim()
    .notEmpty()
    .withMessage('Road/Area is required')
    .isLength({ max: 200 })
    .withMessage('Road/Area is too long'),
    
  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Landmark is too long'),
    
  body('type')
    .optional()
    .isIn(['home', 'work', 'other'])
    .withMessage('Address type must be home, work, or other'),
    
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value')
];

// ID validation for route parameters
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid address ID format')
];

// Apply authentication middleware to all routes
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