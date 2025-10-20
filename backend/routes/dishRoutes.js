// routes/discoveryRoutes.js - FIXED ROUTE ORDER
import express from 'express';
import { 
  getActiveRestaurants, 
  getRestaurantById
} from '../controllers/discoveryController.js';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';
import { authenticateSellerToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== RESTAURANT ROUTES ====================
// ⚠️ SPECIFIC ROUTES FIRST!

// Get all active restaurants
router.get('/restaurants', getActiveRestaurants);

// Get single restaurant by ID with dishes
router.get('/restaurant/:id', getRestaurantById);

// Get real-time restaurant status
router.get('/restaurant/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format'
      });
    }
    
    const seller = await Seller.findById(id)
      .select('isOnline dashboardStatus lastActive isActive')
      .lean();

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      status: {
        isOnline: seller.isOnline || false,
        dashboardStatus: seller.dashboardStatus || 'offline',
        isSellerOnline: seller.isOnline || false,
        isActive: seller.isActive || false,
        lastActive: seller.lastActive
      }
    });
  } catch (error) {
    console.error('❌ Get restaurant status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant status'
    });
  }
});

// ==================== DISH ROUTES ====================
// ⚠️ SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES!

// Get popular dishes - MUST BE BEFORE /:dishId
router.get('/dishes/popular', async (req, res) => {
  try {
    const { limit = 20, page = 1, city, category, type } = req.query;
    
    console.log('🔍 Fetching popular dishes with filters:', { limit, page, city, category, type });

    const query = {
      isActive: true,
      availability: true
    };

    // City filter
    if (city) {
      const sellers = await Seller.find({
        'address.city': { $regex: city, $options: 'i' },
        isActive: true
      }).select('_id');
      
      const sellerIds = sellers.map(s => s._id);
      query.$or = [
        { seller: { $in: sellerIds } },
        { restaurantId: { $in: sellerIds.map(id => id.toString()) } }
      ];
    }

    // Category filter
    if (category && category !== 'All Categories') {
      query.category = { $regex: category, $options: 'i' };
    }

    // Type filter (veg/non-veg)
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const dishes = await Dish.find(query)
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Found ${dishes.length} dishes`);

    // Get seller info for dishes
    const sellerIds = [...new Set(
      dishes
        .map(d => d.seller || d.restaurantId)
        .filter(Boolean)
    )];

    const sellers = await Seller.find({
      $or: [
        { _id: { $in: sellerIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { _id: { $in: sellerIds.map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        }).filter(Boolean) } }
      ]
    }).select('_id businessName address isOnline dashboardStatus isActive businessDetails').lean();

    const sellerMap = {};
    sellers.forEach(seller => {
      const sellerId = seller._id.toString();
      sellerMap[sellerId] = seller;
    });

    // Format dishes
    const formattedDishes = dishes.map(dish => {
      const sellerId = (dish.seller || dish.restaurantId)?.toString();
      const seller = sellerMap[sellerId];

      return {
        id: dish._id.toString(),
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        description: dish.description,
        category: dish.category,
        type: dish.type,
        image: dish.image,
        rating: dish.rating?.average?.toFixed(1) || '4.2',
        preparationTime: dish.preparationTime || 20,
        
        restaurantId: sellerId,
        restaurant: seller?.businessName || 'Unknown Restaurant',
        restaurantName: seller?.businessName || 'Unknown Restaurant',
        restaurantLogo: seller?.businessDetails?.documents?.logo,
        
        location: {
          city: seller?.address?.city || '',
          state: seller?.address?.state || ''
        },
        
        isSellerOnline: seller?.isOnline || false,
        sellerDashboardStatus: seller?.dashboardStatus || 'offline',
        isActive: dish.isActive && (seller?.isActive || false),
        availability: dish.availability
      };
    });

    res.json({
      success: true,
      dishes: formattedDishes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedDishes.length
      }
    });

  } catch (error) {
    console.error('❌ Get popular dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dishes',
      details: error.message
    });
  }
});

// Search dishes - MUST BE BEFORE /:dishId
router.get('/search', async (req, res) => {
  try {
    const { q, city, category, type, limit = 20, page = 1 } = req.query;
    
    console.log('🔍 Searching dishes:', { q, city, category, type });

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const query = {
      isActive: true,
      availability: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    };

    // Filters
    if (city) {
      const sellers = await Seller.find({
        'address.city': { $regex: city, $options: 'i' },
        isActive: true
      }).select('_id');
      
      const sellerIds = sellers.map(s => s._id);
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { seller: { $in: sellerIds } },
            { restaurantId: { $in: sellerIds.map(id => id.toString()) } }
          ]
        }
      ];
      delete query.$or;
    }

    if (category && category !== 'All Categories') {
      query.category = { $regex: category, $options: 'i' };
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const dishes = await Dish.find(query)
      .sort({ 'rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Found ${dishes.length} matching dishes`);

    // Get seller info
    const sellerIds = [...new Set(
      dishes
        .map(d => d.seller || d.restaurantId)
        .filter(Boolean)
    )];

    const sellers = await Seller.find({
      $or: [
        { _id: { $in: sellerIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { _id: { $in: sellerIds.map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        }).filter(Boolean) } }
      ]
    }).select('_id businessName address isOnline dashboardStatus isActive businessDetails').lean();

    const sellerMap = {};
    sellers.forEach(seller => {
      const sellerId = seller._id.toString();
      sellerMap[sellerId] = seller;
    });

    // Format results
    const results = dishes.map(dish => {
      const sellerId = (dish.seller || dish.restaurantId)?.toString();
      const seller = sellerMap[sellerId];

      return {
        id: dish._id.toString(),
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        description: dish.description,
        category: dish.category,
        type: dish.type,
        image: dish.image,
        rating: dish.rating?.average?.toFixed(1) || '4.2',
        preparationTime: dish.preparationTime || 20,
        
        restaurantId: sellerId,
        restaurant: seller?.businessName || 'Unknown Restaurant',
        restaurantName: seller?.businessName || 'Unknown Restaurant',
        restaurantLogo: seller?.businessDetails?.documents?.logo,
        
        location: {
          city: seller?.address?.city || '',
          state: seller?.address?.state || ''
        },
        
        isSellerOnline: seller?.isOnline || false,
        sellerDashboardStatus: seller?.dashboardStatus || 'offline',
        isActive: dish.isActive && (seller?.isActive || false),
        availability: dish.availability
      };
    });

    res.json({
      success: true,
      results,
      query: q,
      count: results.length
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
});

// Get dish by ID (alternative endpoint) - MUST BE BEFORE /:dishId
router.get('/dish/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    const dish = await Dish.findById(id).lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    // Get seller info
    const sellerId = dish.seller || dish.restaurantId;
    let seller = null;

    if (sellerId) {
      seller = await Seller.findById(sellerId)
        .select('businessName address isOnline dashboardStatus isActive businessDetails')
        .lean();
    }

    const formattedDish = {
      id: dish._id.toString(),
      _id: dish._id.toString(),
      name: dish.name,
      price: dish.price,
      description: dish.description,
      category: dish.category,
      type: dish.type,
      image: dish.image,
      ingredients: dish.ingredients,
      nutritionalInfo: dish.nutritionalInfo,
      preparationTime: dish.preparationTime,
      rating: dish.rating || { average: 4.2, count: 0 },
      ratingDisplay: dish.rating?.average?.toFixed(1) || '4.2',
      
      seller: seller ? {
        _id: seller._id,
        businessName: seller.businessName,
        address: seller.address,
        isOnline: seller.isOnline || false,
        dashboardStatus: seller.dashboardStatus || 'offline',
        isActive: seller.isActive || false
      } : null,
      
      restaurantId: sellerId?.toString(),
      restaurant: seller?.businessName || 'Unknown Restaurant',
      restaurantName: seller?.businessName || 'Unknown Restaurant',
      restaurantLogo: seller?.businessDetails?.documents?.logo,
      
      location: seller ? {
        city: seller.address?.city || '',
        state: seller.address?.state || ''
      } : null,
      
      isSellerOnline: seller?.isOnline || false,
      sellerDashboardStatus: seller?.dashboardStatus || 'offline',
      isActive: dish.isActive && (seller?.isActive || false),
      availability: dish.availability,
      
      businessType: seller?.businessType,
      priceRange: seller?.businessDetails?.priceRange,
      operatingHours: seller?.businessDetails?.operatingHours
    };

    res.json({
      success: true,
      dish: formattedDish
    });

  } catch (error) {
    console.error('❌ Get dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish'
    });
  }
});

// ⚠️ PARAMETERIZED ROUTE MUST BE LAST!
// This catches anything that doesn't match above routes
router.get('/:dishId', async (req, res) => {
  try {
    const { dishId } = req.params;
    
    console.log('🔍 Fetching dish details for ID:', dishId);

    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    const dish = await Dish.findById(dishId).lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    console.log('✅ Dish found:', dish.name);

    const sellerId = dish.seller || dish.restaurantId;
    let seller = null;

    if (sellerId) {
      try {
        const sellerObjectId = mongoose.Types.ObjectId.isValid(sellerId) 
          ? sellerId 
          : new mongoose.Types.ObjectId(sellerId);
        
        seller = await Seller.findById(sellerObjectId)
          .select('businessName email phone address businessDetails isOnline dashboardStatus isActive')
          .lean();
      } catch (err) {
        console.warn('⚠️ Could not fetch seller info:', err);
      }
    }

    const formattedDish = {
      id: dish._id.toString(),
      _id: dish._id.toString(),
      name: dish.name,
      price: dish.price,
      description: dish.description,
      category: dish.category,
      type: dish.type,
      image: dish.image,
      ingredients: dish.ingredients,
      nutritionalInfo: dish.nutritionalInfo,
      preparationTime: dish.preparationTime,
      
      rating: dish.rating || {
        average: 4.2,
        count: 0
      },
      ratingDisplay: dish.rating?.average?.toFixed(1) || '4.2',
      
      seller: seller ? {
        _id: seller._id,
        businessName: seller.businessName,
        email: seller.email,
        phone: seller.phone,
        address: seller.address,
        isOnline: seller.isOnline || false,
        dashboardStatus: seller.dashboardStatus || 'offline',
        isActive: seller.isActive || false
      } : null,
      
      restaurantId: sellerId?.toString(),
      restaurant: seller?.businessName || 'Unknown Restaurant',
      restaurantName: seller?.businessName || 'Unknown Restaurant',
      restaurantLogo: seller?.businessDetails?.documents?.logo,
      
      location: seller ? {
        city: seller.address?.city || '',
        state: seller.address?.state || '',
        zipCode: seller.address?.zipCode || ''
      } : null,
      
      isSellerOnline: seller?.isOnline || false,
      sellerDashboardStatus: seller?.dashboardStatus || 'offline',
      isActive: dish.isActive && (seller?.isActive || false),
      availability: dish.availability,
      
      businessType: seller?.businessType,
      priceRange: seller?.businessDetails?.priceRange,
      operatingHours: seller?.businessDetails?.operatingHours,
      
      createdAt: dish.createdAt,
      updatedAt: dish.updatedAt
    };

    console.log('📊 Dish status:', {
      isSellerOnline: formattedDish.isSellerOnline,
      dashboardStatus: formattedDish.sellerDashboardStatus,
      isActive: formattedDish.isActive
    });

    res.json({
      success: true,
      dish: formattedDish
    });

  } catch (error) {
    console.error('❌ Get dish by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish details',
      details: error.message
    });
  }
});
router.patch('/:id/offer', authenticateSellerToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { offer } = req.body;
    const sellerId = req.seller.id || req.seller._id;

    console.log('💰 Updating offer for dish:', id);

    const dish = await Dish.findOne({ 
      _id: id, 
      $or: [{ seller: sellerId }, { restaurantId: sellerId }]
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found or unauthorized'
      });
    }

    // Update offer
    dish.offer = {
      hasOffer: offer.hasOffer || false,
      discountPercentage: offer.hasOffer ? (offer.discountPercentage || 0) : 0,
      validUntil: offer.hasOffer && offer.validUntil ? new Date(offer.validUntil) : null
    };

    await dish.save();

    console.log('✅ Offer updated successfully');

    res.json({
      success: true,
      dish,
      message: 'Offer updated successfully'
    });

  } catch (error) {
    console.error('❌ Update offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update offer'
    });
  }
});
// Get dishes with active offers
router.get('/dishes/offers', async (req, res) => {
  try {
    const { limit = 20, category, type, city, sortBy = 'discount' } = req.query;
    
    const options = {
      limit: parseInt(limit),
      category,
      type,
      city
    };

    const dishes = await Dish.findActiveOffers(options);
    
    // Calculate additional offer metadata
    const dishesWithMetadata = dishes.map(dish => ({
      ...dish.toJSON(),
      discountedPrice: dish.discountedPrice,
      savings: dish.price - dish.discountedPrice,
      offerText: dish.offerText
    }));

    res.json({
      success: true,
      dishes: dishesWithMetadata,
      count: dishes.length
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offers'
    });
  }
});
export default router;