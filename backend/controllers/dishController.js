// controllers/dishController.js - Complete dish controller
import Dish from '../models/Dish.js';
import Seller from '../models/Seller.js';
import mongoose from 'mongoose';

// Helper function to check if restaurant is currently open
const checkIfRestaurantIsOpen = (openingHours) => {
  if (!openingHours) return null;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todayHours = openingHours[currentDay];
  
  if (!todayHours || todayHours.closed) return false;
  
  const currentTime = now.toTimeString().slice(0, 5);
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Helper function to calculate distance (placeholder)
const calculateDistance = (restaurantCoordinates) => {
  return `${(Math.random() * 4.5 + 0.5).toFixed(1)} km`;
};

// Helper function to estimate delivery time
const estimateDeliveryTime = (restaurantCoordinates) => {
  const minTime = Math.floor(Math.random() * 10) + 20;
  const maxTime = minTime + Math.floor(Math.random() * 15) + 5;
  return `${minTime}-${maxTime} min`;
};

// GET /api/dishes/:id - Get individual dish with complete details
export const getDishDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Fetching dish details for ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    const dish = await Dish.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isActive: true
    }).lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found or not available'
      });
    }

    const seller = await Seller.findById(dish.seller).lean();
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    const dishWithDetails = {
      ...dish,
      restaurant: seller.businessName || 'Restaurant',
      restaurantName: seller.businessName || 'Restaurant',
      restaurantLogo: seller.businessDetails?.documents?.logo || null,
      restaurantCoverImage: seller.businessDetails?.documents?.bannerImage || null,
      businessType: seller.businessType || 'Restaurant',
      ownerName: seller.businessDetails?.ownerName || 'Restaurant Owner',
      ownerPhone: seller.phone || null,
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
      cuisines: seller.businessDetails?.cuisine || [],
      servicesOffered: seller.businessDetails?.servicesOffered || [],
      priceRange: seller.businessDetails?.priceRange || 'mid-range',
      operatingHours: seller.businessDetails?.openingHours || null,
      isOpenNow: checkIfRestaurantIsOpen(seller.businessDetails?.openingHours),
      restaurantRating: seller.metrics?.averageRating || 0,
      restaurantTotalOrders: seller.metrics?.totalOrders || 0,
      restaurantTotalReviews: seller.metrics?.totalReviews || 0,
      seatingCapacity: seller.businessDetails?.seatingCapacity || null,
      restaurantEmail: seller.email || null,
      isVerified: seller.isVerified || false,
      distance: calculateDistance(seller.address?.coordinates),
      deliveryTime: estimateDeliveryTime(seller.address?.coordinates),
      ingredients: dish.ingredients || null,
      nutritionalInfo: dish.nutritionalInfo || null,
      allergens: dish.allergens || null,
      spiceLevel: dish.spiceLevel || null,
      formattedPrice: `₹${dish.price}`,
      currentPrice: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date() 
        ? `₹${Math.round(dish.price - (dish.price * dish.offer.discountPercentage / 100))}`
        : `₹${dish.price}`,
      ratingDisplay: dish.rating?.average > 0 ? dish.rating.average.toFixed(1) : 'New',
      offerText: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date()
        ? `${dish.offer.discountPercentage}% OFF`
        : null
    };

    await Dish.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    console.log('✅ Dish details fetched:', dish.name);

    res.json({
      success: true,
      dish: dishWithDetails,
      message: 'Dish details retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Get dish details error:', error);
    
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
};

// GET /api/dishes/similar/:id - Get similar dishes
export const getSimilarDishes = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 6;

    console.log('🔍 Fetching similar dishes for:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    const dish = await Dish.findById(id);

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    // Find similar dishes based on category, type, and seller
    const similarDishes = await Dish.find({
      _id: { $ne: id },
      isActive: true,
      availability: true,
      $or: [
        { category: dish.category },
        { type: dish.type },
        { seller: dish.seller }
      ]
    })
    .sort({ orderCount: -1, 'rating.average': -1 })
    .limit(limit)
    .lean();

    console.log(`✅ Found ${similarDishes.length} similar dishes`);

    res.json({
      success: true,
      dishes: similarDishes,
      count: similarDishes.length
    });

  } catch (error) {
    console.error('❌ Get similar dishes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch similar dishes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/dishes/restaurant/:restaurantId - Get restaurant dishes
export const getRestaurantDishes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const type = req.query.type;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid restaurant ID format'
      });
    }

    const query = {
      seller: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
      availability: true
    };

    if (category) query.category = category;
    if (type) query.type = type;

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
};