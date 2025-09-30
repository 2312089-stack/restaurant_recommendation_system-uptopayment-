// controllers/recommendationController.js
import User from '../models/User.js';
import Dish from '../models/Dish.js';
import Review from '../models/Review.js';

// Helper function to calculate similarity between users based on preferences
const calculateUserSimilarity = (user1Prefs, user2Prefs) => {
  let similarity = 0;
  let totalFactors = 0;

  // Compare cuisines
  if (user1Prefs.cuisines && user2Prefs.cuisines) {
    const common = user1Prefs.cuisines.filter(c => user2Prefs.cuisines.includes(c));
    similarity += common.length / Math.max(user1Prefs.cuisines.length, user2Prefs.cuisines.length);
    totalFactors++;
  }

  // Compare dietary preferences
  if (user1Prefs.dietary === user2Prefs.dietary) {
    similarity += 1;
  }
  totalFactors++;

  // Compare spice levels
  if (user1Prefs.spiceLevel === user2Prefs.spiceLevel) {
    similarity += 0.5;
  }
  totalFactors++;

  return totalFactors > 0 ? similarity / totalFactors : 0;
};

// Get personalized recommendations
export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    console.log('Getting personalized recommendations for user:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for personalized recommendations'
      });
    }

    const user = await User.findById(userId).populate('wishlist');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let recommendations = [];

    // Strategy 1: Content-based filtering (preferences)
    if (user.preferences && Object.keys(user.preferences).length > 0) {
      const contentBasedRecs = await getContentBasedRecommendations(user, limit / 2);
      recommendations.push(...contentBasedRecs);
    }

    // Strategy 2: Collaborative filtering (similar users)
    const collaborativeRecs = await getCollaborativeRecommendations(user, limit / 2);
    recommendations.push(...collaborativeRecs);

    // Strategy 3: Popularity-based fallback
    if (recommendations.length < limit) {
      const popularRecs = await getPopularityBasedRecommendations(limit - recommendations.length);
      recommendations.push(...popularRecs);
    }

    // Remove duplicates and dishes already in wishlist
    const wishlistIds = new Set(user.wishlist.map(dish => dish._id.toString()));
    const uniqueRecs = recommendations
      .filter((dish, index, self) => 
        index === self.findIndex(d => d._id.toString() === dish._id.toString()) &&
        !wishlistIds.has(dish._id.toString())
      )
      .slice(0, limit);

    res.json({
      success: true,
      recommendations: uniqueRecs,
      totalCount: uniqueRecs.length,
      strategies: {
        contentBased: recommendations.filter(r => r.recommendationReason?.includes('preference')).length,
        collaborative: recommendations.filter(r => r.recommendationReason?.includes('similar')).length,
        popularity: recommendations.filter(r => r.recommendationReason?.includes('Popular')).length
      }
    });

  } catch (error) {
    console.error('Get personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
};

// Content-based recommendations based on user preferences
const getContentBasedRecommendations = async (user, limit) => {
  try {
    const preferences = user.preferences;
    const query = { availability: true };

    // Filter by preferred cuisines
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      query.category = { $in: preferences.cuisines };
    }

    // Filter by dietary preferences
    if (preferences.dietary) {
      if (preferences.dietary.toLowerCase() === 'vegetarian') {
        query.type = 'veg';
      } else if (preferences.dietary.toLowerCase() === 'vegan') {
        query.type = 'veg';
        query.isVegan = true;
      }
    }

    const dishes = await Dish.find(query)
      .sort({ 'rating.average': -1, popularity: -1 })
      .limit(limit)
      .populate('seller', 'businessName')
      .lean();

    return dishes.map(dish => ({
      ...dish,
      recommendationReason: generateContentBasedReason(dish, preferences),
      recommendationScore: calculateContentBasedScore(dish, preferences)
    }));

  } catch (error) {
    console.error('Content-based recommendations error:', error);
    return [];
  }
};

// Collaborative filtering based on similar users
const getCollaborativeRecommendations = async (user, limit) => {
  try {
    // Find users with similar preferences
    const similarUsers = await User.find({
      _id: { $ne: user._id },
      onboardingCompleted: true,
      preferences: { $exists: true, $ne: {} }
    }).limit(100);

    const userSimilarities = similarUsers.map(similarUser => ({
      user: similarUser,
      similarity: calculateUserSimilarity(user.preferences, similarUser.preferences)
    }))
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

    if (userSimilarities.length === 0) {
      return [];
    }

    // Get dishes liked by similar users (from their wishlists)
    const similarUserIds = userSimilarities.map(item => item.user._id);
    const similarUsersWithWishlists = await User.find({
      _id: { $in: similarUserIds }
    }).populate('wishlist');

    const recommendedDishIds = new Set();
    similarUsersWithWishlists.forEach(similarUser => {
      similarUser.wishlist.forEach(dish => {
        recommendedDishIds.add(dish._id.toString());
      });
    });

    // Exclude dishes already in current user's wishlist
    const userWishlistIds = new Set(user.wishlist.map(dish => dish._id.toString()));
    const filteredDishIds = Array.from(recommendedDishIds).filter(id => !userWishlistIds.has(id));

    const dishes = await Dish.find({
      _id: { $in: filteredDishIds }
    })
    .sort({ 'rating.average': -1 })
    .limit(limit)
    .populate('seller', 'businessName')
    .lean();

    return dishes.map(dish => ({
      ...dish,
      recommendationReason: 'Users with similar taste also liked this',
      recommendationScore: 0.8
    }));

  } catch (error) {
    console.error('Collaborative recommendations error:', error);
    return [];
  }
};

// Popularity-based recommendations as fallback
const getPopularityBasedRecommendations = async (limit) => {
  try {
    const dishes = await Dish.find({
      availability: true
    })
    .sort({ 
      'rating.average': -1, 
      'rating.count': -1,
      popularity: -1 
    })
    .limit(limit)
    .populate('seller', 'businessName')
    .lean();

    return dishes.map(dish => ({
      ...dish,
      recommendationReason: 'Popular choice among users',
      recommendationScore: 0.6
    }));

  } catch (error) {
    console.error('Popularity-based recommendations error:', error);
    return [];
  }
};

// Generate reason for content-based recommendations
const generateContentBasedReason = (dish, preferences) => {
  const reasons = [];

  if (preferences.cuisines?.includes(dish.category)) {
    reasons.push(`matches your ${dish.category} preference`);
  }

  if (preferences.dietary === 'Vegetarian' && dish.type === 'veg') {
    reasons.push('fits your vegetarian diet');
  }

  if (preferences.favoriteDishes?.some(fav => 
    dish.name.toLowerCase().includes(fav.toLowerCase())
  )) {
    reasons.push('similar to your favorite dishes');
  }

  return reasons.length > 0 
    ? `Recommended because it ${reasons.join(' and ')}`
    : 'Recommended based on your preferences';
};

// Calculate content-based score
const calculateContentBasedScore = (dish, preferences) => {
  let score = 0;

  if (preferences.cuisines?.includes(dish.category)) score += 0.4;
  if (preferences.dietary === 'Vegetarian' && dish.type === 'veg') score += 0.3;
  if (dish.rating?.average >= 4) score += 0.2;
  if (dish.popularity > 100) score += 0.1;

  return Math.min(score, 1.0);
};

// Update user behavior for better recommendations
export const updateUserBehavior = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { action, dishId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Log user behavior for future improvements
    console.log('User behavior update:', { userId, action, dishId });

    // Update dish popularity based on user actions
    if (dishId && ['view', 'add_to_cart', 'order'].includes(action)) {
      await Dish.findByIdAndUpdate(dishId, {
        $inc: { popularity: action === 'order' ? 5 : action === 'add_to_cart' ? 2 : 1 }
      });
    }

    res.json({
      success: true,
      message: 'User behavior updated successfully'
    });

  } catch (error) {
    console.error('Update user behavior error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user behavior'
    });
  }
};

// Get recommendation statistics for admin/analytics
export const getRecommendationStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ onboardingCompleted: true }),
      User.countDocuments({ 'preferences': { $exists: true, $ne: {} } }),
      Dish.countDocuments({ availability: true }),
      Review.countDocuments({ status: 'active' })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: stats[0],
        usersWithPreferences: stats[1],
        availableDishes: stats[2],
        totalReviews: stats[3],
        recommendationCoverage: stats[1] > 0 ? (stats[1] / stats[0] * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Get recommendation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation statistics'
    });
  }
};