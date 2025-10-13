// routes/trendingRoutes.js - Trending dishes API endpoints
import express from 'express';
import {
  getTrendingInCity,
  getTrendingStats,
  getTrendingByCategory
} from '../controllers/trendingController.js';

const router = express.Router();

/**
 * @route   GET /api/trending/city
 * @desc    Get trending dishes in user's city based on reviews and orders
 * @access  Public
 * @query   {string} city - City name (optional, defaults to all cities)
 * @query   {number} limit - Number of results (default: 10)
 * @query   {number} days - Trending period in days (default: 7)
 * @query   {number} minOrders - Minimum orders to qualify as trending (default: 5)
 */
router.get('/city', getTrendingInCity);

/**
 * @route   GET /api/trending/stats
 * @desc    Get trending statistics for a city
 * @access  Public
 * @query   {string} city - City name (optional)
 * @query   {number} days - Period in days (default: 7)
 */
router.get('/stats', getTrendingStats);

/**
 * @route   GET /api/trending/category/:category
 * @desc    Get trending dishes by category
 * @access  Public
 * @param   {string} category - Dish category
 * @query   {string} city - City name (optional)
 * @query   {number} limit - Number of results (default: 5)
 * @query   {number} days - Trending period in days (default: 7)
 */
router.get('/category/:category', getTrendingByCategory);

export default router;