// routes/customerDiscovery.js - FIXED to properly show seller dishes
import express from 'express';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';

const router = express.Router();

// GET popular dishes for PopularNearYou component - FIXED query
router.get('/dishes/popular', async (req, res) => {
  try {
    console.log('Getting popular dishes for discovery');
    
    const { city, limit = 20 } = req.query;
    
    // FIXED: Proper query to get all available dishes
    let query = {
      availability: true,
      isActive: true
    };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    console.log('Discovery query:', query);

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType address businessDetails.documents')
      .sort({ createdAt: -1 }) // Show newest dishes first, then by order count
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} dishes for discovery`);

    const transformedDishes = dishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
        Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
      rating: dish.rating?.average || 4.2,
      category: dish.category,
      type: dish.type,
      deliveryTime: `${dish.preparationTime || 25}-${(dish.preparationTime || 25) + 10} min`,
      distance: "1.2 km", // Mock data - implement with geolocation
      offer: dish.offer?.hasOffer ? `${dish.offer.discountPercentage}% OFF` : "Free Delivery",
      isPromoted: dish.isFeatured || false,
      tags: dish.tags || [],
      restaurantLogo: dish.seller?.businessDetails?.documents?.logo,
      // Add seller info for debugging
      sellerId: dish.seller?._id,
      sellerName: dish.sellerName,
      location: dish.location
    }));

    console.log('Transformed dishes sample:', transformedDishes.slice(0, 2));

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
      error: 'Failed to retrieve popular dishes',
      details: error.message
    });
  }
});

// GET recommended dishes for RecommendedForYou component - FIXED
router.get('/dishes/recommended', async (req, res) => {
  try {
    console.log('Getting recommended dishes');
    
    const { limit = 20, userId } = req.query;
    
    // FIXED: Get dishes with good ratings
    const query = {
      availability: true,
      isActive: true
    };

    console.log('Recommended query:', query);

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType address businessDetails.documents')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} recommended dishes`);

    // Mock recommendation reasons based on dish categories
    const reasons = {
      'Main Course': 'Because you love hearty meals',
      'Desserts': 'Perfect sweet treat for you',
      'Starters': 'Great to start your meal',
      'Beverages': 'Refreshing choice for you',
      'Chinese': 'Based on your Asian food preference',
      'Indian': 'Because you love Indian cuisine',
      'Continental': 'Perfect fusion for your taste'
    };

    const transformedDishes = dishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
      currentPrice: dish.offer?.hasOffer && dish.offer.validUntil > new Date() ? 
        Math.round(dish.price * (1 - dish.offer.discountPercentage / 100)) : dish.price,
      rating: dish.rating?.average || 4.2,
      reason: reasons[dish.category] || 'Highly recommended for you',
      category: dish.category,
      type: dish.type,
      tags: dish.tags || [dish.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian', dish.category],
      isWishlisted: false, // Implement user wishlist later
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

    const transformedDishes = dishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
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

// FIXED: Search dishes across all restaurants
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

    console.log('Search query object:', query);

    const dishes = await Dish.find(query)
      .populate('seller', 'businessName businessType')
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${dishes.length} dishes matching search`);

    const results = dishes.map(dish => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      restaurant: dish.seller?.businessName || dish.restaurantName || 'Restaurant',
      restaurantId: dish.seller?._id,
      image: dish.image,
      price: dish.price,
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

// GET restaurants (enhanced implementation)
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

    // Build query for verified and active restaurants only
    const query = {
      isVerified: true,
      isActive: true,
      onboardingCompleted: true
    };

    // Text search in business name and description
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'businessDetails.description': { $regex: search, $options: 'i' } },
        { 'businessDetails.cuisine': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by cuisine type
    if (cuisine && cuisine !== 'all') {
      query['businessDetails.cuisine'] = { $in: [new RegExp(cuisine, 'i')] };
    }

    // Filter by price range
    if (priceRange && priceRange !== 'all') {
      query['businessDetails.priceRange'] = priceRange;
    }

    // Filter by location (zipCode or city)
    if (location) {
      query.$or = [
        { 'address.zipCode': location },
        { 'address.city': { $regex: location, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get restaurants with their dish counts and ratings
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
      { $match: { dishCount: { $gt: 0 } } }, // Only restaurants with dishes
      {
        $sort: sortBy === 'rating' ? 
          { avgRating: sortOrder === 'desc' ? -1 : 1 } :
          { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
      },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Transform data for frontend
    const transformedRestaurants = restaurants.map(restaurant => ({
      id: restaurant._id,
      name: restaurant.businessName,
      type: restaurant.businessType,
      cuisine: restaurant.businessDetails?.cuisine || [],
      description: restaurant.businessDetails?.description || '',
      priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
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
    }));

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

// GET single restaurant details with menu
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

    // Get restaurant's dishes - FIXED to show all available dishes
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

    // Calculate restaurant stats
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
      isOpen: true, // Implement opening hours logic
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

// GET restaurant menu by ID
router.get('/restaurant/:id/menu', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.query;

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
      categories: Object.keys(menu)
    });

  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu'
    });
  }
});

export default router;