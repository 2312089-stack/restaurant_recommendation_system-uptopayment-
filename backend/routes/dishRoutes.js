// routes/dishRoutes.js - Complete dish details route with restaurant info
import express from 'express';
import Dish from '../models/Dish.js';
import Seller from '../models/Seller.js';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/dishes/:id - Get individual dish with complete restaurant details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching dish details for ID:', id);

    // Validate dish ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    // Fetch dish with seller details
    const dish = await Dish.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true // Only show active dishes
    }).lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found or not available'
      });
    }

    // Fetch complete restaurant/seller information
    const seller = await Seller.findById(dish.seller).lean();
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Combine dish and restaurant information
    const dishWithRestaurantDetails = {
      ...dish,
      
      // Restaurant basic info
      restaurant: seller.businessName || 'Restaurant',
      restaurantName: seller.businessName || 'Restaurant',
      
      // Restaurant details for your requirements
      restaurantLogo: seller.businessDetails?.documents?.logo || null,
      restaurantCoverImage: seller.businessDetails?.documents?.bannerImage || null,
      businessType: seller.businessType || 'Restaurant',
      ownerName: seller.businessDetails?.ownerName || 'Restaurant Owner',
      ownerPhone: seller.phone || null,
      
      // Restaurant address
      restaurantAddress: seller.address ? {
        street: seller.address.street || '',
        city: seller.address.city || '',
        state: seller.address.state || '',
        zipCode: seller.address.zipCode || '',
        fullAddress: [
          seller.address.street,
          seller.address.city,
          seller.address.state,
          seller.address.zipCode
        ].filter(Boolean).join(', '),
        coordinates: seller.address.coordinates || null
      } : null,
      
      // Restaurant services and details
      cuisines: seller.businessDetails?.cuisine || [],
      servicesOffered: seller.businessDetails?.servicesOffered || [],
      priceRange: seller.businessDetails?.priceRange || 'mid-range',
      
      // Operating hours
      operatingHours: seller.businessDetails?.openingHours || null,
      
      // Current operating status
      isOpenNow: checkIfRestaurantIsOpen(seller.businessDetails?.openingHours),
      
      // Restaurant metrics
      restaurantRating: seller.metrics?.averageRating || 0,
      restaurantTotalOrders: seller.metrics?.totalOrders || 0,
      restaurantTotalReviews: seller.metrics?.totalReviews || 0,
      
      // Seating and capacity
      seatingCapacity: seller.businessDetails?.seatingCapacity || null,
      
      // Contact information
      restaurantEmail: seller.email || null,
      
      // Verification status
      isVerified: seller.isVerified || false,
      
      // Distance calculation (you can implement this based on user location)
      distance: dish.distance || calculateDistance(seller.address?.coordinates),
      
      // Delivery time estimation
      deliveryTime: dish.deliveryTime || estimateDeliveryTime(seller.address?.coordinates),
      
      // Additional dish details for better display
      ingredients: dish.ingredients || null,
      nutritionalInfo: dish.nutritionalInfo || null,
      allergens: dish.allergens || null,
      spiceLevel: dish.spiceLevel || null,
      
      // Formatting helpers
      formattedPrice: `₹${dish.price}`,
      currentPrice: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date() 
        ? `₹${Math.round(dish.price - (dish.price * dish.offer.discountPercentage / 100))}`
        : `₹${dish.price}`,
      
      // Display rating
      ratingDisplay: dish.rating?.average > 0 ? dish.rating.average.toFixed(1) : 'New',
      
      // Offer information
      offerText: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date()
        ? `${dish.offer.discountPercentage}% OFF`
        : null
    };

    // Increment view count for analytics
    await Dish.findByIdAndUpdate(id, { 
      $inc: { viewCount: 1 }
    });

    console.log('Dish details fetched successfully:', dish.name);

    res.json({
      success: true,
      dish: dishWithRestaurantDetails,
      message: 'Dish details retrieved successfully'
    });

  } catch (error) {
    console.error('Get dish details error:', error);
    
    // Handle different error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch dish details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to check if restaurant is currently open
function checkIfRestaurantIsOpen(openingHours) {
  if (!openingHours) return null;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todayHours = openingHours[currentDay];
  
  if (!todayHours || todayHours.closed) return false;
  
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

// Helper function to calculate distance (implement based on your needs)
function calculateDistance(restaurantCoordinates) {
  // Placeholder - implement actual distance calculation based on user location
  // For now, return a random distance between 0.5 and 5 km
  return `${(Math.random() * 4.5 + 0.5).toFixed(1)} km`;
}

// Helper function to estimate delivery time
function estimateDeliveryTime(restaurantCoordinates) {
  // Placeholder - implement actual delivery time estimation
  // For now, return a time between 20-45 minutes
  const minTime = Math.floor(Math.random() * 10) + 20;
  const maxTime = minTime + Math.floor(Math.random() * 15) + 5;
  return `${minTime}-${maxTime} min`;
}

// GET /api/dishes/restaurant/:restaurantId - Get all dishes from a specific restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const type = req.query.type;

    // Validate restaurant ID
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format'
      });
    }

    // Build query
    const query = {
      seller: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
      availability: true
    };

    if (category) query.category = category;
    if (type) query.type = type;

    // Fetch dishes with pagination
    const [dishes, total, restaurant] = await Promise.all([
      Dish.find(query)
        .sort({ orderCount: -1, 'rating.average': -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Dish.countDocuments(query),
      Seller.findById(restaurantId).lean()
    ]);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      dishes,
      restaurant: {
        id: restaurant._id,
        name: restaurant.businessName,
        logo: restaurant.businessDetails?.documents?.logo,
        bannerImage: restaurant.businessDetails?.documents?.bannerImage,
        address: restaurant.address,
        rating: restaurant.metrics?.averageRating || 0,
        totalOrders: restaurant.metrics?.totalOrders || 0
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDishes: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get restaurant dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant dishes'
    });
  }
});

// GET /api/dishes/search - Search dishes with filters
router.get('/search', async (req, res) => {
  try {
    const {
      q: searchQuery,
      category,
      type,
      city,
      minPrice,
      maxPrice,
      rating,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Build search query
    const query = {
      isActive: true,
      availability: true
    };

    // Text search
    if (searchQuery) {
      query.$text = { $search: searchQuery };
    }

    // Apply filters
    if (category) query.category = category;
    if (type) query.type = type;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (rating) {
      query['rating.average'] = { $gte: parseFloat(rating) };
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions = { price: 1 };
        break;
      case 'price_high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'popular':
        sortOptions = { orderCount: -1, viewCount: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        if (searchQuery) {
          sortOptions = { score: { $meta: 'textScore' }, orderCount: -1 };
        } else {
          sortOptions = { orderCount: -1, 'rating.average': -1 };
        }
    }

    // Execute search
    const [dishes, total] = await Promise.all([
      Dish.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Dish.countDocuments(query)
    ]);

    res.json({
      success: true,
      results: dishes,
      searchInfo: {
        query: searchQuery,
        filters: { category, type, city, minPrice, maxPrice, rating },
        sortBy,
        totalResults: total
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Search dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search dishes'
    });
  }
});

export default router;