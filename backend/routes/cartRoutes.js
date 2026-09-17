// routes/cartRoutes.js - COMPLETE VERSION WITH DEBUG
import express from 'express';
import mongoose from 'mongoose';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart,
  getCartSummary,
  getCartCount
} from '../controllers/cartController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Cart from '../models/Cart.js';
import Dish from '../models/Dish.js';
import Seller from '../models/Seller.js';

const router = express.Router();

// Debug middleware for all cart routes
router.use((req, res, next) => {
  console.log('🛒 CART ROUTE HIT:', {
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    query: req.query,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    },
    timestamp: new Date().toISOString()
  });
  next();
});

// Apply authentication to all cart routes
router.use(authenticateToken);

// Debug middleware after authentication
router.use((req, res, next) => {
  console.log('🔐 CART AUTH SUCCESS:', {
    userId: req.user?.id,
    userEmail: req.user?.email,
    path: req.path
  });
  next();
});

// ==================== DEBUG ROUTES ====================
// Add these FIRST before other routes

// DEBUG: Get detailed cart state
router.get('/debug', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 DEBUG: Checking cart for user:', userId);

    // Get raw cart without population
    const rawCart = await Cart.findOne({ userId });
    
    // Get cart with population
    let populatedCart;
    try {
      populatedCart = await Cart.findOne({ userId })
        .populate('items.dishId')
        .populate('items.restaurantId');
    } catch (popError) {
      console.error('Population error:', popError.message);
    }

    // Check each dish individually
    const dishChecks = [];
    if (rawCart && rawCart.items) {
      for (const item of rawCart.items) {
        try {
          const dish = await Dish.findById(item.dishId);
          const seller = await Seller.findById(item.restaurantId);
          
          dishChecks.push({
            itemId: item._id,
            dishId: item.dishId,
            dishFound: !!dish,
            dishName: dish?.name,
            dishAvailable: dish?.availability,
            dishSellerField: dish?.seller,
            dishRestaurantField: dish?.restaurant,
            dishRestaurantIdField: dish?.restaurantId,
            cartRestaurantId: item.restaurantId,
            sellerFound: !!seller,
            sellerName: seller?.businessName,
            match: dish && seller && (
              dish.seller?.toString() === seller._id.toString() ||
              dish.restaurant?.toString() === seller._id.toString() ||
              dish.restaurantId?.toString() === seller._id.toString()
            )
          });
        } catch (error) {
          dishChecks.push({
            itemId: item._id,
            error: error.message
          });
        }
      }
    }

    // Check Dish model schema
    const dishSchema = Dish.schema.obj;
    const sellerRelatedFields = Object.keys(dishSchema).filter(key => 
      key.toLowerCase().includes('seller') || 
      key.toLowerCase().includes('restaurant')
    );

    res.json({
      success: true,
      debug: {
        userId,
        rawCartExists: !!rawCart,
        rawItemCount: rawCart?.items?.length || 0,
        populatedCartExists: !!populatedCart,
        populatedItemCount: populatedCart?.items?.length || 0,
        dishSchema: {
          sellerRelatedFields,
          allFields: Object.keys(dishSchema)
        },
        items: dishChecks,
        rawCart: rawCart ? {
          id: rawCart._id,
          totalAmount: rawCart.totalAmount,
          itemCount: rawCart.itemCount,
          items: rawCart.items.map(i => ({
            dishId: i.dishId,
            restaurantId: i.restaurantId,
            dishName: i.dishName,
            restaurantName: i.restaurantName,
            price: i.price,
            quantity: i.quantity
          }))
        } : null
      }
    });

  } catch (error) {
    console.error('🚨 Debug route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DEBUG: Check Dish model structure
router.get('/check-dish-model', async (req, res) => {
  try {
    const sampleDish = await Dish.findOne().limit(1);
    
    res.json({
      success: true,
      dishModel: {
        schemaFields: Object.keys(Dish.schema.obj),
        schemaPaths: Object.keys(Dish.schema.paths),
        sampleDish: sampleDish ? {
          id: sampleDish._id,
          name: sampleDish.name,
          hasSellerField: 'seller' in sampleDish,
          hasRestaurantField: 'restaurant' in sampleDish,
          hasRestaurantIdField: 'restaurantId' in sampleDish,
          sellerValue: sampleDish.seller,
          restaurantValue: sampleDish.restaurant,
          restaurantIdValue: sampleDish.restaurantId,
          allFields: Object.keys(sampleDish.toObject())
        } : 'No dishes found in database'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEBUG: Test cart population
router.get('/test-populate', async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });
    
    if (!cart || cart.items.length === 0) {
      return res.json({
        success: true,
        message: 'Cart is empty, nothing to test'
      });
    }

    const firstItem = cart.items[0];
    
    // Test different population strategies
    const tests = [];
    
    // Test 1: Populate dishId
    try {
      const test1 = await Cart.findOne({ userId })
        .populate('items.dishId');
      tests.push({
        name: 'Populate dishId',
        success: true,
        result: test1.items[0].dishId ? 'Populated' : 'Not populated'
      });
    } catch (error) {
      tests.push({
        name: 'Populate dishId',
        success: false,
        error: error.message
      });
    }

    // Test 2: Populate restaurantId
    try {
      const test2 = await Cart.findOne({ userId })
        .populate('items.restaurantId');
      tests.push({
        name: 'Populate restaurantId',
        success: true,
        result: test2.items[0].restaurantId ? 'Populated' : 'Not populated'
      });
    } catch (error) {
      tests.push({
        name: 'Populate restaurantId',
        success: false,
        error: error.message
      });
    }

    // Test 3: Direct dish lookup
    try {
      const dish = await Dish.findById(firstItem.dishId);
      tests.push({
        name: 'Direct dish lookup',
        success: true,
        dishFound: !!dish,
        dishName: dish?.name
      });
    } catch (error) {
      tests.push({
        name: 'Direct dish lookup',
        success: false,
        error: error.message
      });
    }

    // Test 4: Direct seller lookup
    try {
      const seller = await Seller.findById(firstItem.restaurantId);
      tests.push({
        name: 'Direct seller lookup',
        success: true,
        sellerFound: !!seller,
        sellerName: seller?.businessName
      });
    } catch (error) {
      tests.push({
        name: 'Direct seller lookup',
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      tests,
      firstItemData: {
        dishId: firstItem.dishId,
        restaurantId: firstItem.restaurantId,
        dishName: firstItem.dishName,
        restaurantName: firstItem.restaurantName
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== REGULAR ROUTES ====================

// GET routes (specific routes first)
router.get('/count', (req, res, next) => {
  console.log('📊 GET /cart/count - Getting cart count');
  getCartCount(req, res, next);
});

router.get('/summary', (req, res, next) => {
  console.log('📋 GET /cart/summary - Getting cart summary');
  getCartSummary(req, res, next);
});

router.get('/', (req, res, next) => {
  console.log('🛒 GET /cart - Getting full cart');
  getCart(req, res, next);
});

// POST routes
router.post('/add', (req, res, next) => {
  console.log('➕ POST /cart/add - Adding to cart:', {
    dishId: req.body.dishId,
    quantity: req.body.quantity,
    specialInstructions: req.body.specialInstructions
  });
  addToCart(req, res, next);
});

// PUT routes
router.put('/item/:dishId', (req, res, next) => {
  console.log('🔄 PUT /cart/item/:dishId - Updating quantity:', {
    dishId: req.params.dishId,
    newQuantity: req.body.quantity
  });
  updateCartItem(req, res, next);
});

// DELETE routes
router.delete('/clear', (req, res, next) => {
  console.log('🗑️ DELETE /cart/clear - Clearing cart');
  clearCart(req, res, next);
});

router.delete('/item/:dishId', (req, res, next) => {
  console.log('❌ DELETE /cart/item/:dishId - Removing item:', {
    dishId: req.params.dishId
  });
  removeFromCart(req, res, next);
});

// Error handling middleware for cart routes
router.use((error, req, res, next) => {
  console.error('🚨 CART ROUTE ERROR:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  res.status(500).json({
    success: false,
    error: 'Cart operation failed',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;