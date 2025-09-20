// routes/customerDiscovery.js - Restaurant discovery for customers
import express from 'express';
import Seller from '../models/Seller.js';

const router = express.Router();

// GET all restaurants for discovery page
router.get('/restaurants', async (req, res) => {
  try {
    console.log('🔍 Customer discovery - Getting restaurants');

    const {
      search,
      cuisine,
      priceRange,
      location,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
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

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('📊 Discovery query:', query);

    // Execute query
    const [restaurants, totalCount] = await Promise.all([
      Seller.find(query)
        .select('businessName businessType businessDetails address createdAt')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Seller.countDocuments(query)
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
      dishes: restaurant.businessDetails?.dishes?.length || 0,
      rating: 4.2, // Mock rating - replace with actual calculation
      deliveryTime: '25-30 mins', // Mock delivery time
      isNew: new Date() - restaurant.createdAt < 30 * 24 * 60 * 60 * 1000 // New if less than 30 days
    }));

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

// GET single restaurant details
router.get('/restaurant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🍽️ Getting restaurant details for:', id);

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

    // Transform restaurant data
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
      dishes: restaurant.businessDetails?.dishes || [],
      owner: restaurant.businessDetails?.ownerName || '',
      rating: {
        average: 4.2,
        count: 156,
        breakdown: { 5: 89, 4: 45, 3: 15, 2: 5, 1: 2 }
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

// GET featured restaurants
router.get('/featured', async (req, res) => {
  try {
    console.log('⭐ Getting featured restaurants');

    const featuredRestaurants = await Seller.find({
      isVerified: true,
      isActive: true,
      onboardingCompleted: true,
      'businessDetails.dishes.0': { $exists: true } // Has at least one dish
    })
    .select('businessName businessType businessDetails address createdAt')
    .sort({ createdAt: -1 })
    .limit(8);

    const transformedRestaurants = featuredRestaurants.map(restaurant => ({
      id: restaurant._id,
      name: restaurant.businessName,
      type: restaurant.businessType,
      cuisine: restaurant.businessDetails?.cuisine?.slice(0, 2) || [],
      priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
      city: restaurant.address?.city || '',
      logo: restaurant.businessDetails?.documents?.logo || null,
      bannerImage: restaurant.businessDetails?.documents?.bannerImage || null,
      rating: 4.3, // Mock rating
      deliveryTime: '20-25 mins',
      totalDishes: restaurant.businessDetails?.dishes?.length || 0,
      isNew: new Date() - restaurant.createdAt < 7 * 24 * 60 * 60 * 1000 // New if less than 7 days
    }));

    res.json({
      success: true,
      message: 'Featured restaurants retrieved successfully',
      restaurants: transformedRestaurants
    });

  } catch (error) {
    console.error('Get featured restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve featured restaurants'
    });
  }
});

export default router;