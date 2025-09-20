// routes/sellerProfile.js - Complete seller profile management
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Seller from '../models/Seller.js';
import { authenticateSellerToken } from '../middleware/sellerAuthMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/sellers');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and PDF files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload fields configuration
const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'ownerIdProof', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 },
  { name: 'dishImages', maxCount: 10 }
]);

// GET seller profile
router.get('/profile', authenticateSellerToken, async (req, res) => {
  try {
    console.log('🏪 Getting seller profile for:', req.seller.email);

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
      onboardingProgress: seller.getOnboardingProgress()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

// UPDATE seller profile (basic details)
router.patch('/profile', authenticateSellerToken, uploadFields, async (req, res) => {
  try {
    console.log('🏪 Updating seller profile for:', req.seller.email);
    console.log('📝 Update data:', req.body);
    console.log('📁 Files uploaded:', req.files ? Object.keys(req.files) : 'none');

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Update basic profile fields
    const {
      businessName,
      businessType,
      phone,
      ownerName,
      description,
      cuisine,
      priceRange,
      features,
      // Address fields
      street,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      // Operating hours
      openingHours
    } = req.body;

    // Update business details
    if (businessName) seller.businessName = businessName;
    if (businessType) seller.businessType = businessType;
    if (phone) seller.phone = phone;

    // Initialize businessDetails if not exists
    if (!seller.businessDetails) seller.businessDetails = {};

    if (ownerName) seller.businessDetails.ownerName = ownerName;
    if (description) seller.businessDetails.description = description;
    if (priceRange) seller.businessDetails.priceRange = priceRange;

    // Handle cuisine array
    if (cuisine) {
      seller.businessDetails.cuisine = Array.isArray(cuisine) 
        ? cuisine 
        : cuisine.split(',').map(c => c.trim());
    }

    // Handle features array
    if (features) {
      seller.businessDetails.features = Array.isArray(features) 
        ? features 
        : features.split(',').map(f => f.trim());
    }

    // Update address
    if (!seller.address) seller.address = {};
    if (street) seller.address.street = street;
    if (city) seller.address.city = city;
    if (state) seller.address.state = state;
    if (zipCode) seller.address.zipCode = zipCode;
    
    // Update coordinates
    if (latitude && longitude) {
      seller.address.coordinates = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
    }

    // Update opening hours if provided
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

    // Handle file uploads
    if (!seller.businessDetails.documents) {
      seller.businessDetails.documents = {};
    }

    if (req.files) {
      if (req.files.logo) {
        seller.businessDetails.documents.logo = `/uploads/sellers/${req.files.logo[0].filename}`;
      }
      if (req.files.bannerImage) {
        seller.businessDetails.documents.bannerImage = `/uploads/sellers/${req.files.bannerImage[0].filename}`;
      }
      if (req.files.ownerIdProof) {
        seller.businessDetails.documents.ownerIdProof = `/uploads/sellers/${req.files.ownerIdProof[0].filename}`;
      }
      if (req.files.businessProof) {
        seller.businessDetails.documents.businessProof = `/uploads/sellers/${req.files.businessProof[0].filename}`;
      }
    }

    await seller.save();

    console.log('✅ Seller profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      seller: seller.toJSON(),
      onboardingProgress: seller.getOnboardingProgress()
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

// ADD dish to menu
router.post('/menu/dish', authenticateSellerToken, uploadFields, async (req, res) => {
  try {
    console.log('🍽️ Adding dish to menu for:', req.seller.email);

    const { name, price, category, type, description, availability } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, price, and category are required'
      });
    }

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Initialize dishes array if not exists
    if (!seller.businessDetails) seller.businessDetails = {};
    if (!seller.businessDetails.dishes) seller.businessDetails.dishes = [];

    const newDish = {
      name: name.trim(),
      price: price.toString(),
      category,
      type: type || 'veg',
      description: description?.trim() || '',
      availability: availability !== 'false' // Default to true unless explicitly false
    };

    // Handle dish image
    if (req.files && req.files.dishImages) {
      newDish.image = `/uploads/sellers/${req.files.dishImages[0].filename}`;
    }

    seller.businessDetails.dishes.push(newDish);
    await seller.save();

    console.log('✅ Dish added successfully:', newDish.name);

    res.json({
      success: true,
      message: 'Dish added successfully',
      dish: newDish,
      totalDishes: seller.businessDetails.dishes.length
    });

  } catch (error) {
    console.error('Add dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add dish'
    });
  }
});

// GET all dishes
router.get('/menu/dishes', authenticateSellerToken, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    const dishes = seller.businessDetails?.dishes || [];
    const { category, search } = req.query;

    let filteredDishes = dishes;

    // Filter by category
    if (category && category !== 'all') {
      filteredDishes = filteredDishes.filter(dish => 
        dish.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search in dish names and descriptions
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredDishes = filteredDishes.filter(dish => 
        dish.name.toLowerCase().includes(searchTerm) ||
        dish.description?.toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      success: true,
      message: 'Dishes retrieved successfully',
      dishes: filteredDishes,
      totalDishes: dishes.length,
      filteredCount: filteredDishes.length
    });

  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dishes'
    });
  }
});

// UPDATE dish
router.patch('/menu/dish/:dishId', authenticateSellerToken, uploadFields, async (req, res) => {
  try {
    const { dishId } = req.params;
    const { name, price, category, type, description, availability } = req.body;

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    const dishes = seller.businessDetails?.dishes || [];
    const dishIndex = dishes.findIndex(dish => dish._id.toString() === dishId);

    if (dishIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    // Update dish fields
    if (name) dishes[dishIndex].name = name.trim();
    if (price) dishes[dishIndex].price = price.toString();
    if (category) dishes[dishIndex].category = category;
    if (type) dishes[dishIndex].type = type;
    if (description !== undefined) dishes[dishIndex].description = description.trim();
    if (availability !== undefined) dishes[dishIndex].availability = availability !== 'false';

    // Handle image update
    if (req.files && req.files.dishImages) {
      dishes[dishIndex].image = `/uploads/sellers/${req.files.dishImages[0].filename}`;
    }

    await seller.save();

    res.json({
      success: true,
      message: 'Dish updated successfully',
      dish: dishes[dishIndex]
    });

  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dish'
    });
  }
});

// DELETE dish
router.delete('/menu/dish/:dishId', authenticateSellerToken, async (req, res) => {
  try {
    const { dishId } = req.params;

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    const dishes = seller.businessDetails?.dishes || [];
    const dishIndex = dishes.findIndex(dish => dish._id.toString() === dishId);

    if (dishIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    const deletedDish = dishes[dishIndex];
    seller.businessDetails.dishes.splice(dishIndex, 1);
    await seller.save();

    res.json({
      success: true,
      message: 'Dish deleted successfully',
      deletedDish: deletedDish.name
    });

  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dish'
    });
  }
});

// TOGGLE restaurant closure status
router.patch('/closure-toggle', authenticateSellerToken, async (req, res) => {
  try {
    const { isClosed, reason } = req.body;

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    seller.isActive = !isClosed;
    
    // Add closure reason if provided
    if (!seller.businessDetails) seller.businessDetails = {};
    seller.businessDetails.closureReason = reason || '';

    await seller.save();

    console.log(`🏪 Restaurant ${isClosed ? 'closed' : 'opened'} for:`, seller.businessName);

    res.json({
      success: true,
      message: `Restaurant ${isClosed ? 'closed' : 'opened'} successfully`,
      isActive: seller.isActive
    });

  } catch (error) {
    console.error('Toggle closure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant status'
    });
  }
});

// GET seller stats for dashboard
router.get('/stats', authenticateSellerToken, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Mock stats - in production, you'd query actual orders
    const stats = {
      todayRevenue: 0,
      activeOrders: 0,
      totalReservations: 0,
      averageRating: 0.0,
      totalDishes: seller.businessDetails?.dishes?.length || 0,
      verificationStatus: seller.displayVerificationStatus,
      isActive: seller.isActive
    };

    res.json({
      success: true,
      message: 'Stats retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    });
  }
});

export default router;