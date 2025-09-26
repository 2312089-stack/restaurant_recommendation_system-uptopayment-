// routes/sellerProfile.js - FIXED VERSION - Path Format Fix
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Seller from '../models/Seller.js';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sellerId = req.seller.id;
    const uploadPath = path.join(__dirname, '../uploads/sellers', sellerId);
    
    // Create seller-specific directory
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow any type of image file
  if (file.mimetype.startsWith('image/')) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Upload fields configuration
const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 },
  { name: 'fssaiLicense', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'ownerIdProof', maxCount: 1 }
]);

// GET seller profile
router.get('/', authenticateSellerToken, async (req, res) => {
  try {
    console.log('Getting seller profile for:', req.seller.email);

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      seller: seller.toJSON(),
      onboardingProgress: seller.getCompletionPercentage()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

// UPDATE seller profile (comprehensive) - FIXED PATH ISSUE
router.patch('/', authenticateSellerToken, uploadFields, async (req, res) => {
  try {
    console.log('Updating seller profile for:', req.seller.email);

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    const {
      // Basic business info
      businessName,
      businessType,
      phone,
      
      // Owner details
      ownerName,
      
      // Business details
      description,
      cuisine,
      priceRange,
      seatingCapacity,
      servicesOffered,
      
      // Address
      street,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      
      // Operating hours
      openingHours
    } = req.body;

    // Update basic fields
    if (businessName) seller.businessName = businessName.trim();
    if (businessType) seller.businessType = businessType;
    if (phone) seller.phone = phone.trim();

    // Initialize businessDetails if not exists
    if (!seller.businessDetails) seller.businessDetails = {};

    // Update business details
    if (ownerName) seller.businessDetails.ownerName = ownerName.trim();
    if (description) seller.businessDetails.description = description.trim();
    if (priceRange) seller.businessDetails.priceRange = priceRange;
    if (seatingCapacity) seller.businessDetails.seatingCapacity = parseInt(seatingCapacity);

    // Handle cuisine array
    if (cuisine) {
      seller.businessDetails.cuisine = Array.isArray(cuisine) 
        ? cuisine.map(c => c.trim())
        : cuisine.split(',').map(c => c.trim()).filter(c => c);
    }

    // Handle services offered
    if (servicesOffered) {
      seller.businessDetails.servicesOffered = Array.isArray(servicesOffered)
        ? servicesOffered
        : servicesOffered.split(',').map(s => s.trim()).filter(s => s);
    }

    // Update address
    if (!seller.address) seller.address = {};
    if (street) seller.address.street = street.trim();
    if (city) seller.address.city = city.trim();
    if (state) seller.address.state = state.trim();
    if (zipCode) seller.address.zipCode = zipCode.trim();
    
    // Update coordinates
    if (latitude && longitude) {
      seller.address.coordinates = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
    }

    // Update opening hours
    if (openingHours) {
      try {
        const hours = typeof openingHours === 'string' 
          ? JSON.parse(openingHours) 
          : openingHours;
        seller.businessDetails.openingHours = hours;
      } catch (error) {
        console.error('Error parsing opening hours:', error);
      }
    }

    // Handle file uploads - FIXED: Remove leading slash from paths
    if (!seller.businessDetails.documents) {
      seller.businessDetails.documents = {};
    }

    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        if (req.files[fieldName] && req.files[fieldName].length > 0) {
          const file = req.files[fieldName][0];
          // CRITICAL FIX: Store path without leading slash
          seller.businessDetails.documents[fieldName] = 
            `uploads/sellers/${req.seller.id}/${file.filename}`;
        }
      });
    }

    // Mark onboarding as completed if basic info is filled
    const hasBasicInfo = seller.businessName && 
                        seller.phone && 
                        seller.address?.city && 
                        seller.businessDetails?.ownerName;
    
    if (hasBasicInfo && !seller.onboardingCompleted) {
      seller.onboardingCompleted = true;
      console.log('Onboarding completed for:', seller.email);
    }

    await seller.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      seller: seller.toJSON(),
      onboardingProgress: seller.getCompletionPercentage()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// UPDATE operating hours specifically
router.patch('/hours', authenticateSellerToken, async (req, res) => {
  try {
    const { openingHours } = req.body;
    
    if (!openingHours) {
      return res.status(400).json({
        success: false,
        error: 'Opening hours data is required'
      });
    }

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    if (!seller.businessDetails) seller.businessDetails = {};
    seller.businessDetails.openingHours = openingHours;

    await seller.save();

    res.json({
      success: true,
      message: 'Operating hours updated successfully',
      openingHours: seller.businessDetails.openingHours
    });

  } catch (error) {
    console.error('Update hours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update operating hours'
    });
  }
});

// UPLOAD document
router.post('/upload-document', authenticateSellerToken, upload.single('document'), async (req, res) => {
  try {
    const { documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!['businessLicense', 'fssaiLicense', 'gstCertificate', 'ownerIdProof'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    if (!seller.businessDetails) seller.businessDetails = {};
    if (!seller.businessDetails.documents) seller.businessDetails.documents = {};

    // FIXED: Store path without leading slash
    seller.businessDetails.documents[documentType] = 
      `uploads/sellers/${req.seller.id}/${req.file.filename}`;

    await seller.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      documentUrl: seller.businessDetails.documents[documentType]
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
});

// TOGGLE restaurant status (open/closed)
router.patch('/status', authenticateSellerToken, async (req, res) => {
  try {
    const { isActive, closureReason } = req.body;

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    seller.isActive = isActive !== false;
    
    if (!seller.businessDetails) seller.businessDetails = {};
    seller.businessDetails.closureReason = closureReason || '';

    await seller.save();

    res.json({
      success: true,
      message: `Restaurant ${seller.isActive ? 'opened' : 'closed'} successfully`,
      isActive: seller.isActive
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant status'
    });
  }
});

// GET business analytics
router.get('/analytics', authenticateSellerToken, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Get dish analytics
    const Dish = (await import('../models/Dish.js')).default;
    const dishStats = await Dish.aggregate([
      { $match: { seller: seller._id } },
      {
        $group: {
          _id: null,
          totalDishes: { $sum: 1 },
          activeDishes: { $sum: { $cond: ['$availability', 1, 0] } },
          totalViews: { $sum: '$viewCount' },
          totalOrders: { $sum: '$orderCount' },
          avgRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const analytics = {
      profile: {
        completionPercentage: seller.getCompletionPercentage(),
        isVerified: seller.isVerified,
        isActive: seller.isActive,
        onboardingCompleted: seller.onboardingCompleted
      },
      menu: dishStats[0] || {
        totalDishes: 0,
        activeDishes: 0,
        totalViews: 0,
        totalOrders: 0,
        avgRating: 0
      },
      business: {
        joinedDate: seller.createdAt,
        lastLogin: seller.lastLogin,
        businessType: seller.businessType,
        servicesOffered: seller.businessDetails?.servicesOffered || []
      }
    };

    res.json({
      success: true,
      message: 'Analytics retrieved successfully',
      analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics'
    });
  }
});

export default router;