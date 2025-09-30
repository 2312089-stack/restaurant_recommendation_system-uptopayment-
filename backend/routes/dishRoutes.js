// routes/dishRoutes.js - Updated with controller integration
import express from 'express';
import { getDishDetails, getSimilarDishes, getRestaurantDishes } from '../controllers/dishController.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/dishes/:id - Get individual dish with complete restaurant details
router.get('/:id', getDishDetails);

// GET /api/dishes/similar/:id - Get similar dishes
router.get('/similar/:id', getSimilarDishes);

// GET /api/dishes/restaurant/:restaurantId - Get all dishes from a specific restaurant
router.get('/restaurant/:restaurantId', getRestaurantDishes);

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