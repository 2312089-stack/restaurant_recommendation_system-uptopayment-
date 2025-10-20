// controllers/discoveryController.js - COMPLETE FIXED VERSION
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';

// ✅ GET Single Restaurant by ID WITH DISHES - FIXED
export const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching restaurant by ID:', id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format'
      });
    }

    // ✅ Fetch restaurant details
    const restaurant = await Seller.findById(id)
      .select('-passwordHash -otp -passwordResetToken')
      .lean();

    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    console.log('✅ Restaurant found:', restaurant.businessName);

    // ✅ CRITICAL FIX: Fetch dishes using BOTH seller and restaurantId fields
    const dishes = await Dish.find({
      $or: [
        { seller: id },           // Match by seller field (ObjectId)
        { restaurantId: id },     // Match by restaurantId field (string)
        { restaurantId: id.toString() } // Match string version
      ],
      isActive: true,
      availability: true
    })
    .select('name price category type image description rating preparationTime seller restaurantId isActive availability')
    .lean();

    console.log(`📋 Found ${dishes.length} active dishes for restaurant`);
    console.log('🔍 Sample dish fields:', dishes[0] ? {
      name: dishes[0].name,
      seller: dishes[0].seller,
      restaurantId: dishes[0].restaurantId
    } : 'No dishes');

    // Format dishes with proper image paths and status
    const formattedDishes = dishes.map(dish => ({
      ...dish,
      id: dish._id.toString(),
      _id: dish._id.toString(),
      restaurantId: id,
      restaurant: restaurant.businessName,
      restaurantName: restaurant.businessName,
      image: dish.image || null,
      formattedPrice: `₹${dish.price}`,
      ratingDisplay: dish.rating?.average > 0 ? dish.rating.average.toFixed(1) : 'New',
      
      // ✅ STATUS FIELDS - CRITICAL for offline detection
      isSellerOnline: restaurant.isOnline || false,
      sellerDashboardStatus: restaurant.dashboardStatus || 'offline',
      isActive: dish.isActive && (restaurant.isActive || false),
      availability: dish.availability
    }));

    // ✅ Format restaurant response
    const formattedRestaurant = {
      id: restaurant._id.toString(),
      _id: restaurant._id.toString(),
      name: restaurant.businessName,
      type: restaurant.businessType,
      rating: restaurant.metrics?.averageRating?.toFixed(1) || '0.0',
      totalOrders: restaurant.metrics?.totalOrders || 0,
      totalReviews: restaurant.metrics?.totalReviews || 0,
      address: restaurant.address,
      cuisine: restaurant.businessDetails?.cuisine || [],
      priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
      description: restaurant.businessDetails?.description || '',
      logo: restaurant.businessDetails?.documents?.logo,
      bannerImage: restaurant.businessDetails?.documents?.bannerImage,
      phone: restaurant.phone,
      
      // ✅ CORRECT STATUS FIELDS - These are what the frontend checks
      isOnline: restaurant.isOnline || false,
      dashboardStatus: restaurant.dashboardStatus || 'offline',
      isSellerOnline: restaurant.isOnline || false,
      isActive: restaurant.isActive || false,
      lastActive: restaurant.lastActive,
      
      openingHours: restaurant.businessDetails?.openingHours,
      dishes: formattedDishes,
      dishCount: formattedDishes.length
    };

    console.log('✅ Returning restaurant with', formattedDishes.length, 'dishes');
    console.log('📊 Restaurant status:', {
      isOnline: formattedRestaurant.isOnline,
      dashboardStatus: formattedRestaurant.dashboardStatus,
      isSellerOnline: formattedRestaurant.isSellerOnline,
      isActive: formattedRestaurant.isActive
    });

    res.json({
      success: true,
      restaurant: formattedRestaurant
    });

  } catch (error) {
    console.error('❌ Get restaurant by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant',
      details: error.message
    });
  }
};

// ✅ GET Active Restaurants - FIXED
export const getActiveRestaurants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      location = '',
      cuisine = '',
      priceRange = '',
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 Fetching restaurants with filters:', {
      page, limit, search, location, cuisine, priceRange, sortBy, sortOrder
    });

    // Query active restaurants
    const query = {
      isActive: true  // Only check if account is active
    };

    // Search filter
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'businessDetails.description': { $regex: search, $options: 'i' } },
        { 'businessDetails.cuisine': { $regex: search, $options: 'i' } }
      ];
    }

    // Location filter
    if (location) {
      query['address.city'] = { $regex: location, $options: 'i' };
    }

    // Cuisine filter
    if (cuisine) {
      query['businessDetails.cuisine'] = { $regex: cuisine, $options: 'i' };
    }

    // Price range filter
    if (priceRange) {
      query['businessDetails.priceRange'] = priceRange;
    }

    console.log('📋 Query:', JSON.stringify(query, null, 2));

    // Sorting
    const sortOptions = {};
    if (sortBy === 'rating') {
      sortOptions['metrics.averageRating'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'orders') {
      sortOptions['metrics.totalOrders'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'name') {
      sortOptions.businessName = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const restaurants = await Seller.find(query)
      .select('businessName businessType phone isOnline lastActive dashboardStatus address businessDetails metrics createdAt isActive')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Found ${restaurants.length} restaurants`);

    // Count total
    const total = await Seller.countDocuments(query);
    console.log(`📊 Total restaurants matching query: ${total}`);

    // Transform restaurants
    const formattedRestaurants = restaurants.map(restaurant => {
      const restaurantId = restaurant._id ? restaurant._id.toString() : null;
      
      if (!restaurantId) {
        console.error('⚠️ Restaurant missing _id:', restaurant);
        return null;
      }

      return {
        id: restaurantId,
        _id: restaurantId,
        name: restaurant.businessName || 'Unknown Restaurant',
        type: restaurant.businessType || 'Restaurant',
        rating: restaurant.metrics?.averageRating?.toFixed(1) || '0.0',
        totalOrders: restaurant.metrics?.totalOrders || 0,
        totalReviews: restaurant.metrics?.totalReviews || 0,
        address: {
          street: restaurant.address?.street || '',
          city: restaurant.address?.city || '',
          state: restaurant.address?.state || '',
          zipCode: restaurant.address?.zipCode || ''
        },
        cuisine: restaurant.businessDetails?.cuisine || [],
        priceRange: restaurant.businessDetails?.priceRange || 'mid-range',
        description: restaurant.businessDetails?.description || '',
        logo: restaurant.businessDetails?.documents?.logo || null,
        bannerImage: restaurant.businessDetails?.documents?.bannerImage || null,
        phone: restaurant.phone || '',
        
        // ✅ STATUS FIELDS - These determine if restaurant appears online/offline
        isOnline: restaurant.isOnline || false,
        dashboardStatus: restaurant.dashboardStatus || 'offline',
        isSellerOnline: restaurant.isOnline || false,
        isActive: restaurant.isActive || false,
        lastActive: restaurant.lastActive,
        
        deliveryTime: '25-30 min',
        deliveryFee: 25,
        isNew: isRestaurantNew(restaurant.createdAt)
      };
    }).filter(r => r !== null);

    // Get dish counts for each restaurant
    const restaurantIds = formattedRestaurants
      .map(r => r.id)
      .filter(id => id);

    if (restaurantIds.length > 0) {
      try {
        // ✅ Count dishes using both seller and restaurantId fields
        const dishCounts = await Dish.aggregate([
          {
            $match: {
              $or: [
                { seller: { $in: restaurantIds.map(id => new mongoose.Types.ObjectId(id)) } },
                { restaurantId: { $in: restaurantIds } }
              ],
              isActive: true,
              availability: true
            }
          },
          {
            $group: {
              _id: {
                $ifNull: [
                  { $toString: '$seller' },
                  '$restaurantId'
                ]
              },
              count: { $sum: 1 }
            }
          }
        ]);

        const dishCountMap = {};
        dishCounts.forEach(dc => {
          if (dc._id) {
            dishCountMap[dc._id] = dc.count;
          }
        });

        formattedRestaurants.forEach(restaurant => {
          restaurant.dishCount = dishCountMap[restaurant.id] || 0;
        });

        console.log('📊 Dish counts added to restaurants');
      } catch (err) {
        console.error('Error fetching dish counts:', err);
      }
    }

    console.log(`✅ Returning ${formattedRestaurants.length} formatted restaurants`);
    console.log('📊 Sample restaurant status:', formattedRestaurants[0] ? {
      name: formattedRestaurants[0].name,
      isOnline: formattedRestaurants[0].isOnline,
      dashboardStatus: formattedRestaurants[0].dashboardStatus
    } : 'No restaurants');

    res.json({
      success: true,
      data: {
        restaurants: formattedRestaurants,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRestaurants: total,
          hasNextPage: skip + formattedRestaurants.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
      details: error.message
    });
  }
};

// Helper: Check if restaurant is new
function isRestaurantNew(createdAt) {
  if (!createdAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(createdAt) > sevenDaysAgo;
}

export default {
  getRestaurantById,
  getActiveRestaurants
};