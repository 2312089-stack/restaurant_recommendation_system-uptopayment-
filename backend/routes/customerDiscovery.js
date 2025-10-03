// routes/customerDiscovery.js - FIXED with real-time seller status
import express from 'express';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import sellerStatusManager from '../utils/sellerStatusManager.js';

const router = express.Router();

// ✅ Helper function to enrich dishes with real-time seller status
const enrichDishesWithSellerStatus = async (dishes) => {
  return await Promise.all(
    dishes.map(async (dish) => {
      const sellerId = dish.seller?._id?.toString() || dish.seller?.toString();
      
      // Get real-time status from sellerStatusManager
      const sellerStatus = await sellerStatusManager.getSellerStatus(sellerId);
      
      return {
        ...dish,
        isSellerOnline: sellerStatus.isOnline,
        sellerDashboardStatus: sellerStatus.dashboardStatus,
        sellerLastActive: sellerStatus.lastActive,
        sellerSocketConnected: !!sellerStatus.socketId
      };
    })
  );
};

// GET popular dishes for PopularNearYou component - FIXED
router.get('/dishes/popular', async (req, res) => {
  try {
    console.log('Getting popular dishes for discovery');
    
    const { city, limit = 20 } = req.query;
    
    let query = {
      availability: true,
      isActive: true
    };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    console.log('Discovery query:', query);

    const dishes = await Dish.find(query)
      .populate({
        path: 'seller',
        select: 'businessName businessType address businessDetails isOnline dashboardStatus lastActive'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} dishes for discovery`);

    // ✅ Enrich with real-time seller status
    const enrichedDishes = await enrichDishesWithSellerStatus(dishes);

    const transformedDishes = enrichedDishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      // ✅ Real-time status from sellerStatusManager
      isSellerOnline: dish.isSellerOnline,
      sellerDashboardStatus: dish.sellerDashboardStatus,
      sellerLastActive: dish.sellerLastActive,
      sellerSocketConnected: dish.sellerSocketConnected,
      currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
        Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
      rating: dish.rating?.average || 4.2,
      category: dish.category,
      type: dish.type,
      deliveryTime: `${dish.preparationTime || 25}-${(dish.preparationTime || 25) + 10} min`,
      distance: "1.2 km",
      offer: dish.offer?.hasOffer ? `${dish.offer.discountPercentage}% OFF` : "Free Delivery",
      isPromoted: dish.isFeatured || false,
      tags: dish.tags || [],
      restaurantLogo: dish.seller?.businessDetails?.documents?.logo,
      sellerId: dish.seller?._id,
      sellerName: dish.sellerName,
      location: dish.location
    }));

    console.log('Transformed dishes with seller status:', transformedDishes.slice(0, 2));

    res.json({
      success: true,
      message: `Found ${transformedDishes.length} popular dishes`,
      dishes: transformedDishes,
      totalFound: transformedDishes.length
    });

  } catch (error) {
    console.error('Get popular dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dishes',
      details: error.message
    });
  }
});

// GET recommended dishes - FIXED
router.get('/dishes/recommended', async (req, res) => {
  try {
    console.log('Getting recommended dishes');
    
    const { limit = 20, userId } = req.query;
    
    const query = {
      availability: true,
      isActive: true
    };

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType address businessDetails.documents')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} recommended dishes`);

    // ✅ Enrich with real-time seller status
    const enrichedDishes = await enrichDishesWithSellerStatus(dishes);

    const reasons = {
      'Main Course': 'Because you love hearty meals',
      'Desserts': 'Perfect sweet treat for you',
      'Starters': 'Great to start your meal',
      'Beverages': 'Refreshing choice for you',
      'Chinese': 'Based on your Asian food preference',
      'Indian': 'Because you love Indian cuisine',
      'Continental': 'Perfect fusion for your taste'
    };

    const transformedDishes = enrichedDishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      // ✅ Real-time seller status
      isSellerOnline: dish.isSellerOnline,
      sellerDashboardStatus: dish.sellerDashboardStatus,
      currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
        Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
      rating: dish.rating?.average || 4.2,
      reason: reasons[dish.category] || 'Highly recommended for you',
      category: dish.category,
      type: dish.type,
      tags: dish.tags || [dish.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian', dish.category],
      isWishlisted: false,
      restaurantLogo: dish.seller?.businessDetails?.documents?.logo
    }));

    res.json({
      success: true,
      message: `Found ${transformedDishes.length} recommended dishes`,
      dishes: transformedDishes
    });

  } catch (error) {
    console.error('Get recommended dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recommended dishes',
      details: error.message
    });
  }
});

// GET featured dishes - FIXED
router.get('/dishes/featured', async (req, res) => {
  try {
    console.log('Getting featured dishes');
    
    const { limit = 12 } = req.query;
    
    const query = {
      availability: true,
      isActive: true,
      isFeatured: true
    };

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType address businessDetails.documents')
      .sort({ 'rating.average': -1 })
      .limit(parseInt(limit))
      .lean();

    // ✅ Enrich with real-time seller status
    const enrichedDishes = await enrichDishesWithSellerStatus(dishes);

    const transformedDishes = enrichedDishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      // ✅ Real-time seller status
      isSellerOnline: dish.isSellerOnline,
      sellerDashboardStatus: dish.sellerDashboardStatus,
      rating: dish.rating?.average || 4.2,
      category: dish.category,
      type: dish.type,
      description: dish.description,
      tags: dish.tags || [],
      restaurantLogo: dish.seller?.businessDetails?.documents?.logo
    }));

    res.json({
      success: true,
      message: `Found ${transformedDishes.length} featured dishes`,
      dishes: transformedDishes
    });

  } catch (error) {
    console.error('Get featured dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve featured dishes'
    });
  }
});

// FIXED: Search dishes with real-time status
router.get('/search', async (req, res) => {
  try {
    const { q, city, category, type, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log('Searching dishes with query:', q);

    let query = {
      availability: true,
      isActive: true,
      $or: [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { restaurantName: new RegExp(q, 'i') }
      ]
    };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} dishes matching search`);

    // ✅ Enrich with real-time seller status
    const enrichedDishes = await enrichDishesWithSellerStatus(dishes);

    const results = enrichedDishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      // ✅ Real-time seller status
      isSellerOnline: dish.isSellerOnline,
      sellerDashboardStatus: dish.sellerDashboardStatus,
      currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
        Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
      rating: dish.rating?.average || 4.2,
      category: dish.category,
      type: dish.type,
      tags: dish.tags || []
    }));

    res.json({
      success: true,
      message: `Found ${results.length} dishes for "${q}"`,
      results: results,
      query: q,
      totalFound: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
});

// GET single restaurant details with menu - FIXED
router.get('/restaurant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting restaurant details for:', id);

    const restaurant = await Seller.findOne({
      _id: id,
      isVerified: true,
      isActive: true,
      onboardingCompleted: true
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or not available'
      });
    }

    // ✅ Get real-time seller status
    const sellerStatus = await sellerStatusManager.getSellerStatus(id);

    // Get restaurant's dishes
    const dishes = await Dish.find({
      seller: id,
      availability: true,
      isActive: true
    }).sort({ category: 1, createdAt: -1 });

    // Group dishes by category
    const menu = dishes.reduce((acc, dish) => {
      if (!acc[dish.category]) {
        acc[dish.category] = [];
      }
      acc[dish.category].push({
        id: dish._id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
          Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
        image: dish.image,
        type: dish.type,
        rating: dish.rating?.average || 4.2,
        ratingCount: dish.rating?.count || 0,
        preparationTime: dish.preparationTime,
        tags: dish.tags || [],
        offer: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? {
          hasOffer: true,
          discountPercentage: dish.offer.discountPercentage,
          text: `${dish.offer.discountPercentage}% OFF`
        } : null
      });
      return acc;
    }, {});

    const totalDishes = dishes.length;
    const avgRating = dishes.length > 0 
      ? dishes.reduce((sum, dish) => sum + (dish.rating?.average || 0), 0) / dishes.length 
      : 4.2;

    const restaurantData = {
      id: restaurant._id,
      name: restaurant.businessName,
      type: restaurant.businessType,
      email: restaurant.email,
      phone: restaurant.phone,
      cuisine: restaurant.businessDetails?.cuisine || [],
      description: restaurant.businessDetails?.description || '',
      priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
      // ✅ Real-time seller status
      isOnline: sellerStatus.isOnline,
      dashboardStatus: sellerStatus.dashboardStatus,
      lastActive: sellerStatus.lastActive,
      canAcceptOrders: sellerStatus.isOnline && sellerStatus.dashboardStatus !== 'offline',
      address: {
        full: restaurant.fullAddress,
        street: restaurant.address?.street || '',
        city: restaurant.address?.city || '',
        state: restaurant.address?.state || '',
        zipCode: restaurant.address?.zipCode || '',
        coordinates: restaurant.address?.coordinates
      },
      images: {
        logo: restaurant.businessDetails?.documents?.logo || null,
        banner: restaurant.businessDetails?.documents?.bannerImage || null
      },
      openingHours: restaurant.businessDetails?.openingHours || {},
      features: restaurant.businessDetails?.features || [],
      menu: menu,
      totalDishes: totalDishes,
      owner: restaurant.businessDetails?.ownerName || '',
      rating: {
        average: avgRating,
        count: dishes.reduce((sum, dish) => sum + (dish.rating?.count || 0), 0)
      },
      deliveryInfo: {
        time: '25-30 mins',
        fee: 25,
        minOrder: 200
      },
      createdAt: restaurant.createdAt
    };

    res.json({
      success: true,
      message: 'Restaurant details retrieved successfully',
      restaurant: restaurantData
    });

  } catch (error) {
    console.error('Get restaurant details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve restaurant details'
    });
  }
});

// GET restaurant menu by ID - FIXED
router.get('/restaurant/:id/menu', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

    // ✅ Get real-time seller status
    const sellerStatus = await sellerStatusManager.getSellerStatus(id);

    let query = {
      seller: id,
      availability: true,
      isActive: true
    };

    if (category) {
      query.category = category;
    }

    const dishes = await Dish.find(query)
      .sort({ category: 1, createdAt: -1 })
      .lean();

    // Group by category
    const menu = dishes.reduce((acc, dish) => {
      if (!acc[dish.category]) {
        acc[dish.category] = [];
      }
      acc[dish.category].push({
        id: dish._id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
          Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
        image: dish.image,
        type: dish.type,
        rating: dish.rating?.average || 4.2,
        preparationTime: dish.preparationTime,
        offer: dish.offer
      });
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'Menu retrieved successfully',
      menu: menu,
      categories: Object.keys(menu),
      // ✅ Include seller status with menu
      sellerStatus: {
        isOnline: sellerStatus.isOnline,
        dashboardStatus: sellerStatus.dashboardStatus,
        canAcceptOrders: sellerStatus.isOnline && sellerStatus.dashboardStatus !== 'offline'
      }
    });

  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu'
    });
  }
});

// GET restaurants (enhanced) - FIXED
router.get('/restaurants', async (req, res) => {
  try {
    console.log('Customer discovery - Getting restaurants');

    const {
      search,
      cuisine,
      priceRange,
      location,
      page = 1,
      limit = 12,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    const query = {
      isVerified: true,
      isActive: true,
      onboardingCompleted: true
    };

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'businessDetails.description': { $regex: search, $options: 'i' } },
        { 'businessDetails.cuisine': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (cuisine && cuisine !== 'all') {
      query['businessDetails.cuisine'] = { $in: [new RegExp(cuisine, 'i')] };
    }

    if (priceRange && priceRange !== 'all') {
      query['businessDetails.priceRange'] = priceRange;
    }

    if (location) {
      query.$or = [
        { 'address.zipCode': location },
        { 'address.city': { $regex: location, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurants = await Seller.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'dishes',
          localField: '_id',
          foreignField: 'seller',
          as: 'dishes'
        }
      },
      {
        $addFields: {
          dishCount: { $size: '$dishes' },
          avgRating: { $avg: '$dishes.rating.average' },
          totalOrders: { $sum: '$dishes.orderCount' }
        }
      },
      { $match: { dishCount: { $gt: 0 } } },
      {
        $sort: sortBy === 'rating' ? 
          { avgRating: sortOrder === 'desc' ? -1 : 1 } :
          { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
      },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // ✅ Enrich with real-time seller status
    const transformedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        const sellerStatus = await sellerStatusManager.getSellerStatus(restaurant._id.toString());
        
        return {
          id: restaurant._id,
          name: restaurant.businessName,
          type: restaurant.businessType,
          cuisine: restaurant.businessDetails?.cuisine || [],
          description: restaurant.businessDetails?.description || '',
          priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
          // ✅ Real-time seller status
          isOnline: sellerStatus.isOnline,
          dashboardStatus: sellerStatus.dashboardStatus,
          canAcceptOrders: sellerStatus.isOnline && sellerStatus.dashboardStatus !== 'offline',
          lastActive: sellerStatus.lastActive,
          address: {
            street: restaurant.address?.street || '',
            city: restaurant.address?.city || '',
            state: restaurant.address?.state || '',
            zipCode: restaurant.address?.zipCode || '',
            coordinates: restaurant.address?.coordinates
          },
          logo: restaurant.businessDetails?.documents?.logo || null,
          bannerImage: restaurant.businessDetails?.documents?.bannerImage || null,
          openingHours: restaurant.businessDetails?.openingHours || {},
          features: restaurant.businessDetails?.features || [],
          dishCount: restaurant.dishCount,
          rating: restaurant.avgRating || 4.2,
          totalOrders: restaurant.totalOrders || 0,
          deliveryTime: '25-30 mins',
          deliveryFee: 25,
          minOrder: 200,
          isNew: new Date() - new Date(restaurant.createdAt) < 30 * 24 * 60 * 60 * 1000
        };
      })
    );

    const totalCount = await Seller.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      message: 'Restaurants retrieved successfully',
      data: {
        restaurants: transformedRestaurants,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          search,
          cuisine,
          priceRange,
          location,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve restaurants',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;