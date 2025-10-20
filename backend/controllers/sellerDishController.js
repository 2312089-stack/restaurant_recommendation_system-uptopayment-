// controllers/sellerDishController.js - FIXED VERSION (Controllers Only)
import Dish from '../models/Dish.js';
import Seller from '../models/Seller.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for dish images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sellerId = req.seller.id;
    const sellerUploadsDir = path.join(__dirname, '../uploads/sellers', sellerId, 'dishes');
    
    if (!fs.existsSync(sellerUploadsDir)) {
      fs.mkdirSync(sellerUploadsDir, { recursive: true });
    }
    cb(null, sellerUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `dish_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
  }
};

export const uploadDishImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
}).single('dishImages');

// Add new dish
export const addDish = async (req, res) => {
  try {
    console.log('Adding new dish for seller:', req.seller.id);

    const { name, description, price, category, type, availability, preparationTime } = req.body;
    
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, price, and category are required'
      });
    }

    if (!req.seller.id || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller ID'
      });
    }

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `uploads/sellers/${req.seller.id}/dishes/${req.file.filename}`;
    }

    const dishData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      type: type || 'veg',
      availability: availability !== 'false' && availability !== false,
      preparationTime: preparationTime || 30,
      image: imagePath,
      seller: new mongoose.Types.ObjectId(req.seller.id),
      sellerName: seller.businessDetails?.ownerName || seller.email,
      restaurantName: seller.businessName || 'Restaurant',
      location: {
        street: seller.address?.street || '',
        city: seller.address?.city || '',
        state: seller.address?.state || '',
        zipCode: seller.address?.zipCode || '',
        coordinates: seller.address?.coordinates || null
      },
      isActive: true,
      isFeatured: false,
      rating: { average: 0, count: 0 },
      orderCount: 0,
      viewCount: 0
    };

    const dish = new Dish(dishData);
    await dish.save();

    console.log('Dish created successfully:', dish._id);

    res.status(201).json({
      success: true,
      message: 'Dish added successfully',
      dish: dish.toJSON()
    });

  } catch (error) {
    console.error('Add dish error:', error);
    
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/sellers', req.seller.id, 'dishes', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add dish',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all dishes for a seller
export const getSellerDishes = async (req, res) => {
  try {
    console.log('Fetching dishes for seller:', req.seller.id);

    if (!req.seller.id || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller ID'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { category, type, availability, search } = req.query;

    const query = { 
      seller: new mongoose.Types.ObjectId(req.seller.id)
    };
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (availability !== undefined) query.availability = availability === 'true';
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const [dishes, total] = await Promise.all([
      Dish.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dish.countDocuments(query)
    ]);

    console.log(`Found ${dishes.length} dishes for seller`);

    res.json({
      success: true,
      dishes: dishes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDishes: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get seller dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dishes'
    });
  }
};

// Update dish
export const updateDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const updates = req.body;
    
    console.log('Updating dish:', dishId);

    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }

    const dish = await Dish.findOne({
      _id: new mongoose.Types.ObjectId(dishId),
      seller: new mongoose.Types.ObjectId(req.seller.id)
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    if (req.file) {
      if (dish.image) {
        const oldImagePath = path.join(__dirname, '..', dish.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updates.image = `uploads/sellers/${req.seller.id}/dishes/${req.file.filename}`;
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && updates[key] !== '') {
        if (key === 'availability') {
          dish[key] = updates[key] !== 'false' && updates[key] !== false;
        } else if (key === 'price') {
          dish[key] = parseFloat(updates[key]);
        } else {
          dish[key] = updates[key];
        }
      }
    });

    await dish.save();

    console.log('Dish updated successfully');

    res.json({
      success: true,
      message: 'Dish updated successfully',
      dish: dish.toJSON()
    });

  } catch (error) {
    console.error('Update dish error:', error);
    
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/sellers', req.seller.id, 'dishes', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update dish'
    });
  }
};

// Toggle dish availability
export const toggleAvailability = async (req, res) => {
  try {
    const { dishId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }
    
    const dish = await Dish.findOne({
      _id: new mongoose.Types.ObjectId(dishId),
      seller: new mongoose.Types.ObjectId(req.seller.id)
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    dish.availability = !dish.availability;
    dish.isActive = true;
    await dish.save();

    console.log(`Dish availability toggled to: ${dish.availability}`);

    res.json({
      success: true,
      message: `Dish ${dish.availability ? 'enabled' : 'disabled'} successfully`,
      dish: {
        id: dish._id,
        name: dish.name,
        availability: dish.availability,
        isActive: dish.isActive
      }
    });

  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle dish availability'
    });
  }
};

// Get single dish
export const getDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }
    
    const dish = await Dish.findOne({
      _id: new mongoose.Types.ObjectId(dishId),
      seller: new mongoose.Types.ObjectId(req.seller.id)
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    res.json({
      success: true,
      dish: dish.toJSON()
    });

  } catch (error) {
    console.error('Get dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish'
    });
  }
};

// Delete dish
export const deleteDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    
    console.log('Deleting dish:', dishId);

    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }

    const dish = await Dish.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(dishId),
      seller: new mongoose.Types.ObjectId(req.seller.id)
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    if (dish.image) {
      const imagePath = path.join(__dirname, '..', dish.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted dish image file');
      }
    }

    console.log('Dish deleted successfully');

    res.json({
      success: true,
      message: 'Dish deleted successfully'
    });

  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dish'
    });
  }
};

// Get dish analytics
export const getDishAnalytics = async (req, res) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(req.seller.id);
    
    const analytics = await Dish.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: null,
          totalDishes: { $sum: 1 },
          activeDishes: {
            $sum: { $cond: [{ $eq: ['$availability', true] }, 1, 0] }
          },
          totalOrders: { $sum: '$orderCount' },
          totalViews: { $sum: '$viewCount' },
          averageRating: { $avg: '$rating.average' }
        }
      }
    ]);

    const categoryStats = await Dish.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalOrders: { $sum: '$orderCount' },
          avgRating: { $avg: '$rating.average' }
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    const result = {
      overview: analytics[0] || {
        totalDishes: 0,
        activeDishes: 0,
        totalOrders: 0,
        totalViews: 0,
        averageRating: 0
      },
      categoryBreakdown: categoryStats
    };

    res.json({
      success: true,
      analytics: result
    });

  } catch (error) {
    console.error('Get dish analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish analytics'
    });
  }
};

// In backend/controllers/sellerDishController.js
// Replace the updateDishOffer function with this:

export const updateDishOffer = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { hasOffer, discountPercentage, validUntil } = req.body;
    const sellerId = req.seller.id || req.seller._id;

    console.log('\n🎁 ========== UPDATE DISH OFFER ==========');
    console.log('Dish ID:', dishId);
    console.log('Seller ID:', sellerId);
    console.log('Offer Data:', { hasOffer, discountPercentage, validUntil });

    // Validate dish ID
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    // Find dish and verify ownership
    const dish = await Dish.findOne({
      _id: dishId,
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ]
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found or you do not have permission to update it'
      });
    }

    console.log('✅ Dish found:', dish.name);

    // Validate offer data if enabling offer
    if (hasOffer) {
      if (!discountPercentage || discountPercentage < 5 || discountPercentage > 70) {
        return res.status(400).json({
          success: false,
          error: 'Discount percentage must be between 5% and 70%'
        });
      }

      if (!validUntil) {
        return res.status(400).json({
          success: false,
          error: 'Valid until date is required for offers'
        });
      }

      const offerEndDate = new Date(validUntil);
      if (offerEndDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Offer end date must be in the future'
        });
      }
    }

    // Update offer
    dish.offer = {
      hasOffer: hasOffer || false,
      discountPercentage: hasOffer ? discountPercentage : 0,
      validUntil: hasOffer && validUntil ? new Date(validUntil) : null
    };

    await dish.save();

    console.log('✅ Offer updated successfully');
    console.log('New Offer:', dish.offer);
    console.log('🎁 ========== UPDATE COMPLETE ==========\n');

    res.json({
      success: true,
      message: hasOffer ? 'Offer activated successfully' : 'Offer removed successfully',
      dish: {
        _id: dish._id,
        name: dish.name,
        price: dish.price,
        offer: dish.offer,
        discountedPrice: dish.hasActiveOffer ? dish.discountedPrice : dish.price,
        hasActiveOffer: dish.hasActiveOffer
      }
    });

  } catch (error) {
    console.error('❌ Update dish offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dish offer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};