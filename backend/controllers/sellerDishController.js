// controllers/sellerDishController.js - FIXED VERSION with correct paths
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
    
    // Create directory if it doesn't exist
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
}).single('dishImages');

// Add new dish
export const addDish = async (req, res) => {
  try {
    console.log('Adding new dish for seller:', req.seller.id);
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { name, description, price, category, type, availability, preparationTime } = req.body;
    
    // Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, price, and category are required'
      });
    }

    // Validate seller ID
    if (!req.seller.id || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller ID'
      });
    }

    // Get seller information
    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Handle image upload - FIXED: Store path without leading slash
    let imagePath = null;
    if (req.file) {
      imagePath = `uploads/sellers/${req.seller.id}/dishes/${req.file.filename}`;
    }

    // Create dish data
    const dishData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      type: type || 'veg',
      availability: availability !== 'false' && availability !== false,
      preparationTime: preparationTime || 30,
      image: imagePath,
      
      // Seller information
      seller: new mongoose.Types.ObjectId(req.seller.id),
      sellerName: seller.businessDetails?.ownerName || seller.email,
      restaurantName: seller.businessName || 'Restaurant',
      
      // Location from seller
      location: {
        street: seller.address?.street || '',
        city: seller.address?.city || '',
        state: seller.address?.state || '',
        zipCode: seller.address?.zipCode || '',
        coordinates: seller.address?.coordinates || null
      },
      
      // Set flags to ensure dish appears in discovery
      isActive: true,
      isFeatured: false,
      
      // Initialize rating and metrics
      rating: {
        average: 0,
        count: 0
      },
      orderCount: 0,
      viewCount: 0
    };

    console.log('Creating dish with data:', dishData);

    // Create dish
    const dish = new Dish(dishData);
    await dish.save();

    console.log('Dish created successfully:', dish._id);

    res.status(201).json({
      success: true,
      message: 'Dish added successfully and is now visible to customers',
      dish: dish.toJSON()
    });

  } catch (error) {
    console.error('Add dish error:', error);
    
    // Clean up uploaded file if dish creation fails
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

    // Validate seller ID
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

    // Build query - Show ALL dishes for seller (including inactive for management)
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

    // Execute query
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

// Update dish method
export const updateDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const updates = req.body;
    
    console.log('Updating dish:', dishId, 'with data:', updates);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }

    // Find dish
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

    // Handle image upload if new image provided
    if (req.file) {
      // Delete old image
      if (dish.image) {
        const oldImagePath = path.join(__dirname, '..', dish.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // FIXED: Store path without leading slash
      updates.image = `uploads/sellers/${req.seller.id}/dishes/${req.file.filename}`;
    }

    // Update dish - ensure availability is properly converted
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
    
    // Clean up uploaded file if update fails
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
    
    // Validate IDs
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
    dish.isActive = true; // Ensure dish stays active in discovery
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
    
    // Validate IDs
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

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(dishId) || !mongoose.Types.ObjectId.isValid(req.seller.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish or seller ID'
      });
    }

    // Find and delete dish
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

    // Delete image file
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

    // Get category-wise breakdown
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