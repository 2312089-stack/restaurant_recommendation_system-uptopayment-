// routes/discoveryRoutes.js - WORKING VERSION
import express from 'express';
import { 
  getActiveRestaurants, 
  getRestaurantById
} from '../controllers/discoveryController.js';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';

const router = express.Router();

// ==================== RESTAURANT ROUTES ====================

// Get all active restaurants
router.get('/restaurants', getActiveRestaurants);

// Get single restaurant by ID with dishes
router.get('/restaurant/:id', getRestaurantById);

// ✅ Get real-time restaurant status
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

    console.log('📊 Status check for', id, ':', {
      isOnline: seller.isOnline,
      dashboardStatus: seller.dashboardStatus,
      isActive: seller.isActive
    });

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

// Get popular dishes
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

    // Fetch dishes with seller info
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
        
        // Restaurant info
        restaurantId: sellerId,
        restaurant: seller?.businessName || 'Unknown Restaurant',
        restaurantName: seller?.businessName || 'Unknown Restaurant',
        restaurantLogo: seller?.businessDetails?.documents?.logo,
        
        // Location
        location: {
          city: seller?.address?.city || '',
          state: seller?.address?.state || ''
        },
        
        // ✅ STATUS FIELDS - Critical for offline detection
        isSellerOnline: seller?.isOnline || false,
        sellerDashboardStatus: seller?.dashboardStatus || 'offline',
        isActive: dish.isActive && (seller?.isActive || false),
        availability: dish.availability
      };
    });

    console.log('📊 Sample dish status:', formattedDishes[0] ? {
      name: formattedDishes[0].name,
      isSellerOnline: formattedDishes[0].isSellerOnline,
      sellerDashboardStatus: formattedDishes[0].sellerDashboardStatus
    } : 'No dishes');

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

// Search dishes
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
        
        // ✅ STATUS FIELDS
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
// routes/discoveryRoutes.js - ENHANCED OFFERS ENDPOINT

// Replace the existing /dishes/offers route with this enhanced version:

// GET /api/discovery/dishes/offers - Get dishes with active offers
router.get('/dishes/offers', async (req, res) => {
  try {
    const { limit = 20, page = 1, category, type, city, sortBy = 'discount' } = req.query;

    console.log('🎁 Fetching special offers with filters:', {
      limit, page, category, type, city, sortBy
    });

    // Build query
    const query = {
      isActive: true,
      availability: true,
      'offer.hasOffer': true,
      'offer.validUntil': { $gt: new Date() }
    };

    // Filters
    if (category && category !== 'All Categories') {
      query.category = { $regex: category, $options: 'i' };
    }

    if (type) {
      query.type = type;
    }

    // City filter with seller lookup
    let sellerIds = [];
    if (city) {
      const sellers = await Seller.find({
        'address.city': { $regex: city, $options: 'i' },
        isActive: true
      }).select('_id');
      
      sellerIds = sellers.map(s => s._id);
      if (sellerIds.length > 0) {
        query.$or = [
          { seller: { $in: sellerIds } },
          { restaurantId: { $in: sellerIds } }
        ];
      } else {
        // No sellers found in that city
        return res.json({
          success: true,
          dishes: [],
          pagination: {
            page: 1,
            totalPages: 0,
            total: 0
          }
        });
      }
    }

    // Sorting
    let sortOption = {};
    switch (sortBy) {
      case 'discount':
        sortOption = { 'offer.discountPercentage': -1, 'rating.average': -1 };
        break;
      case 'rating':
        sortOption = { 'rating.average': -1, 'offer.discountPercentage': -1 };
        break;
      case 'popular':
        sortOption = { orderCount: -1, 'rating.average': -1 };
        break;
      case 'ending_soon':
        sortOption = { 'offer.validUntil': 1 };
        break;
      default:
        sortOption = { 'offer.discountPercentage': -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch dishes
    const [dishes, total] = await Promise.all([
      Dish.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Dish.countDocuments(query)
    ]);

    console.log(`✅ Found ${dishes.length} dishes with active offers`);

    // Get seller info
    const dishSellerIds = [...new Set(
      dishes
        .map(d => d.seller || d.restaurantId)
        .filter(Boolean)
    )];

    const sellers = await Seller.find({
      _id: { $in: dishSellerIds }
    }).select('_id businessName address businessDetails isOnline dashboardStatus isActive').lean();

    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller._id.toString()] = seller;
    });

    // Format dishes with offer calculations
    const formattedDishes = dishes.map(dish => {
      const sellerId = (dish.seller || dish.restaurantId)?.toString();
      const seller = sellerMap[sellerId];

      const discountedPrice = dish.price - (dish.price * dish.offer.discountPercentage / 100);
      const savings = dish.price - discountedPrice;

      // Calculate time remaining
      const timeLeft = new Date(dish.offer.validUntil) - new Date();
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return {
        _id: dish._id.toString(),
        id: dish._id.toString(),
        name: dish.name,
        description: dish.description,
        price: dish.price,
        discountedPrice: Math.round(discountedPrice),
        savings: Math.round(savings),
        category: dish.category,
        type: dish.type,
        image: dish.image,
        rating: dish.rating?.average?.toFixed(1) || '4.2',
        ratingCount: dish.rating?.count || 0,
        preparationTime: dish.preparationTime || 20,
        
        // Offer details
        offer: {
          hasOffer: true,
          discountPercentage: dish.offer.discountPercentage,
          validUntil: dish.offer.validUntil,
          daysLeft,
          hoursLeft,
          isFlashDeal: timeLeft < 24 * 60 * 60 * 1000,
          timeLeftText: daysLeft > 0 
            ? `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`
            : `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left`
        },
        
        // Restaurant info
        restaurantId: sellerId,
        restaurant: seller?.businessName || 'Unknown Restaurant',
        restaurantName: seller?.businessName || 'Unknown Restaurant',
        restaurantLogo: seller?.businessDetails?.documents?.logo,
        
        // Location
        location: {
          city: seller?.address?.city || '',
          state: seller?.address?.state || '',
          street: seller?.address?.street || ''
        },
        
        // Status
        isSellerOnline: seller?.isOnline || false,
        sellerDashboardStatus: seller?.dashboardStatus || 'offline',
        isActive: dish.isActive && (seller?.isActive || false),
        availability: dish.availability,
        
        // Analytics
        orderCount: dish.orderCount || 0,
        viewCount: dish.viewCount || 0
      };
    });

    // Calculate summary stats
    const summary = {
      totalOffers: total,
      averageDiscount: Math.round(
        formattedDishes.reduce((sum, d) => sum + d.offer.discountPercentage, 0) / 
        formattedDishes.length
      ),
      maxDiscount: Math.max(...formattedDishes.map(d => d.offer.discountPercentage)),
      totalSavings: Math.round(
        formattedDishes.reduce((sum, d) => sum + d.savings, 0)
      ),
      flashDeals: formattedDishes.filter(d => d.offer.isFlashDeal).length
    };

    console.log('📊 Offer Summary:', summary);

    res.json({
      success: true,
      dishes: formattedDishes,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('❌ Get offers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/discovery/offers/flash - Get flash deals (ending in 24 hours)
router.get('/offers/flash', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);

    const dishes = await Dish.find({
      isActive: true,
      availability: true,
      'offer.hasOffer': true,
      'offer.validUntil': { 
        $gt: new Date(),
        $lte: endTime 
      }
    })
    .sort({ 'offer.validUntil': 1 }) // Ending soonest first
    .limit(limit)
    .lean();

    // Get seller info
    const sellerIds = [...new Set(dishes.map(d => d.seller || d.restaurantId).filter(Boolean))];
    const sellers = await Seller.find({ _id: { $in: sellerIds } })
      .select('_id businessName address businessDetails isOnline')
      .lean();

    const sellerMap = {};
    sellers.forEach(s => sellerMap[s._id.toString()] = s);

    const formattedDishes = dishes.map(dish => {
      const seller = sellerMap[(dish.seller || dish.restaurantId)?.toString()];
      const timeLeft = new Date(dish.offer.validUntil) - new Date();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...dish,
        _id: dish._id.toString(),
        id: dish._id.toString(),
        restaurantName: seller?.businessName || 'Restaurant',
        restaurantLogo: seller?.businessDetails?.documents?.logo,
        location: seller?.address || {},
        isSellerOnline: seller?.isOnline || false,
        discountedPrice: Math.round(dish.price - (dish.price * dish.offer.discountPercentage / 100)),
        timeLeft: {
          hours: hoursLeft,
          minutes: minutesLeft,
          text: hoursLeft > 0 
            ? `${hoursLeft}h ${minutesLeft}m left` 
            : `${minutesLeft}m left`
        }
      };
    });

    res.json({
      success: true,
      flashDeals: formattedDishes,
      count: formattedDishes.length
    });

  } catch (error) {
    console.error('❌ Get flash deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flash deals'
    });
  }
});

// GET /api/discovery/offers/categories - Get offer categories
router.get('/offers/categories', async (req, res) => {
  try {
    const categories = await Dish.aggregate([
      {
        $match: {
          isActive: true,
          availability: true,
          'offer.hasOffer': true,
          'offer.validUntil': { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgDiscount: { $avg: '$offer.discountPercentage' },
          maxDiscount: { $max: '$offer.discountPercentage' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      categories: categories.map(cat => ({
        name: cat._id,
        offerCount: cat.count,
        avgDiscount: Math.round(cat.avgDiscount),
        maxDiscount: cat.maxDiscount
      }))
    });

  } catch (error) {
    console.error('❌ Get offer categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});
export default router;