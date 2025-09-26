// cartController.js - FIXED VERSION with correct populate field
import Cart from '../models/Cart.js';
import Dish from '../models/Dish.js';
import User from '../models/User.js';

// Helper function to safely serialize cart data
const serializeCart = (cart) => {
  if (!cart) {
    return {
      items: [],
      totalAmount: 0,
      itemCount: 0
    };
  }

  return {
    id: cart._id?.toString(),
    items: (cart.items || []).map(item => ({
      dishId: item.dishId?._id?.toString() || item.dishId,
      dishName: item.dishName,
      dishImage: item.dishImage,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      restaurantId: item.restaurantId?._id?.toString() || item.restaurantId,
      restaurantName: item.restaurantName,
      specialInstructions: item.specialInstructions || '',
      addedAt: item.addedAt
    })),
    totalAmount: Number(cart.totalAmount) || 0,
    itemCount: Number(cart.itemCount) || 0,
    lastUpdated: cart.lastUpdated || cart.updatedAt
  };
};

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🛒 Getting cart for user:', userId);

    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.dishId',
        select: 'name price image category type availability',
        match: { availability: true } // Only populate available dishes
      })
      .populate({
        path: 'items.restaurantId',
        select: 'businessName address phone'
      });

    console.log('🛒 Raw cart from DB:', cart ? 'Found' : 'Not found');

    if (!cart) {
      console.log('🛒 No cart found, returning empty cart');
      return res.json({
        success: true,
        cart: {
          items: [],
          totalAmount: 0,
          itemCount: 0
        }
      });
    }

    // Filter out items where dish is no longer available or not found
    const validItems = cart.items.filter(item => {
      if (!item.dishId) {
        console.log('⚠️ Item has no dishId, removing:', item._id);
        return false;
      }
      if (!item.dishId.availability) {
        console.log('⚠️ Dish not available, removing:', item.dishName);
        return false;
      }
      return true;
    });

    console.log(`🛒 Filtered ${cart.items.length} items to ${validItems.length} valid items`);

    // Update cart if items were filtered
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
      console.log('🛒 Updated cart after filtering unavailable items');
    }

    const serializedCart = serializeCart(cart);
    console.log('🛒 Returning serialized cart:', {
      itemCount: serializedCart.itemCount,
      totalAmount: serializedCart.totalAmount
    });

    res.json({
      success: true,
      cart: serializedCart
    });

  } catch (error) {
    console.error('🚨 Get cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId, quantity = 1, specialInstructions = '' } = req.body;

    console.log('➕ Add to cart request:', { userId, dishId, quantity, specialInstructions });

    // Validate input
    if (!dishId) {
      console.log('❌ No dishId provided');
      return res.status(400).json({
        success: false,
        error: 'Dish ID is required'
      });
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 10) {
      console.log('❌ Invalid quantity:', quantity);
      return res.status(400).json({
        success: false,
        error: 'Quantity must be between 1 and 10'
      });
    }

    // Find the dish and populate seller info
    // FIXED: Changed from 'sellerId' to the correct field name
    // Try different possible field names based on your schema
    console.log('🔍 Looking up dish:', dishId);
    
    let dish;
    try {
      // Try with 'seller' field first (most common)
      dish = await Dish.findById(dishId).populate('seller', 'businessName address phone');
    } catch (error) {
      if (error.message.includes('Cannot populate path')) {
        try {
          // Try with 'restaurant' field
          dish = await Dish.findById(dishId).populate('restaurant', 'businessName address phone');
        } catch (error2) {
          if (error2.message.includes('Cannot populate path')) {
            try {
              // Try with 'restaurantId' field
              dish = await Dish.findById(dishId).populate('restaurantId', 'businessName address phone');
            } catch (error3) {
              if (error3.message.includes('Cannot populate path')) {
                // Fall back to no populate if field doesn't exist
                console.log('⚠️ No seller field found, fetching dish without populate');
                dish = await Dish.findById(dishId);
              } else {
                throw error3;
              }
            }
          } else {
            throw error2;
          }
        }
      } else {
        throw error;
      }
    }

    if (!dish) {
      console.log('❌ Dish not found:', dishId);
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    if (!dish.availability) {
      console.log('❌ Dish not available:', dish.name);
      return res.status(400).json({
        success: false,
        error: 'This dish is currently unavailable'
      });
    }

    console.log('✅ Dish found:', { name: dish.name, price: dish.price });

    // Get seller info - handle different field names
    let sellerInfo = dish.seller || dish.restaurant || dish.restaurantId;
    
    // If no populated seller info, create a fallback
    if (!sellerInfo || typeof sellerInfo === 'string') {
      console.log('⚠️ No seller info populated, using dish data');
      sellerInfo = {
        _id: dish.seller || dish.restaurant || dish.restaurantId || dish._id,
        businessName: dish.restaurantName || 'Restaurant'
      };
    }

    // Get or create cart
    console.log('🛒 Getting or creating cart for user:', userId);
    let cart = await Cart.getOrCreateCart(userId);
    console.log('🛒 Cart obtained:', cart ? 'Success' : 'Failed');

    // Check if adding from different restaurant
    if (cart.items.length > 0) {
      const existingRestaurantId = cart.items[0].restaurantId.toString();
      const newRestaurantId = sellerInfo._id.toString();
      
      console.log('🏪 Restaurant check:', { existing: existingRestaurantId, new: newRestaurantId });
      
      if (existingRestaurantId !== newRestaurantId) {
        console.log('❌ Different restaurant detected');
        return res.status(400).json({
          success: false,
          error: 'You can only order from one restaurant at a time. Clear your cart to order from a different restaurant.',
          action: 'clear_cart_required'
        });
      }
    }

    // Add item to cart
    const itemData = {
      dishId: dish._id,
      dishName: dish.name,
      dishImage: dish.image || '',
      price: dish.price,
      quantity: parsedQuantity,
      restaurantId: sellerInfo._id,
      restaurantName: sellerInfo.businessName,
      specialInstructions: String(specialInstructions || '').trim()
    };

    console.log('➕ Adding item to cart:', itemData);
    await cart.addItem(itemData);
    console.log('✅ Item added successfully');

    // Populate the updated cart for response
    const updatedCart = await Cart.findOne({ userId })
      .populate('items.dishId', 'name price image category type availability')
      .populate('items.restaurantId', 'businessName address phone');

    const serializedCart = serializeCart(updatedCart);
    console.log('📤 Sending response with cart:', {
      itemCount: serializedCart.itemCount,
      totalAmount: serializedCart.totalAmount
    });

    res.json({
      success: true,
      message: `${dish.name} added to cart`,
      cart: serializedCart
    });

  } catch (error) {
    console.error('🚨 Add to cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update item quantity in cart
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId } = req.params;
    const { quantity } = req.body;

    console.log('🔄 Update cart item:', { userId, dishId, quantity });

    // Validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > 10) {
      console.log('❌ Invalid quantity for update:', quantity);
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a number between 0 and 10'
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      console.log('❌ Cart not found for user:', userId);
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Check if item exists in cart
    const itemExists = cart.items.find(item => 
      item.dishId.toString() === dishId.toString()
    );

    if (!itemExists) {
      console.log('❌ Item not found in cart:', dishId);
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    console.log('🔄 Updating quantity from', itemExists.quantity, 'to', parsedQuantity);
    await cart.updateQuantity(dishId, parsedQuantity);

    const updatedCart = await Cart.findOne({ userId })
      .populate('items.dishId', 'name price image category type availability')
      .populate('items.restaurantId', 'businessName address phone');

    const serializedCart = serializeCart(updatedCart);

    res.json({
      success: true,
      message: parsedQuantity === 0 ? 'Item removed from cart' : 'Quantity updated',
      cart: serializedCart
    });

  } catch (error) {
    console.error('🚨 Update cart item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId } = req.params;

    console.log('❌ Remove from cart:', { userId, dishId });

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      console.log('❌ Cart not found for user:', userId);
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    // Check if item exists in cart
    const itemExists = cart.items.find(item => 
      item.dishId.toString() === dishId.toString()
    );

    if (!itemExists) {
      console.log('❌ Item not found in cart:', dishId);
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    console.log('❌ Removing item:', itemExists.dishName);
    await cart.removeItem(dishId);

    const updatedCart = await Cart.findOne({ userId })
      .populate('items.dishId', 'name price image category type availability')
      .populate('items.restaurantId', 'businessName address phone');

    const serializedCart = serializeCart(updatedCart);

    res.json({
      success: true,
      message: 'Item removed from cart',
      cart: serializedCart
    });

  } catch (error) {
    console.error('🚨 Remove from cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🗑️ Clear cart for user:', userId);

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      console.log('🗑️ Cart already empty');
      return res.json({
        success: true,
        message: 'Cart is already empty',
        cart: {
          items: [],
          totalAmount: 0,
          itemCount: 0
        }
      });
    }

    console.log('🗑️ Clearing', cart.items.length, 'items');
    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      cart: {
        id: cart._id,
        items: [],
        totalAmount: 0,
        itemCount: 0,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('🚨 Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get cart summary for checkout
export const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📋 Get cart summary for user:', userId);

    const cart = await Cart.findOne({ userId })
      .populate('items.dishId', 'name price image category type availability')
      .populate('items.restaurantId', 'businessName address phone');

    if (!cart || cart.items.length === 0) {
      console.log('❌ Cart is empty for summary');
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Calculate additional charges
    const subtotal = cart.totalAmount;
    const deliveryFee = 25; // Base delivery fee
    const platformFee = Math.round(subtotal * 0.02); // 2% platform fee
    const gst = Math.round((subtotal + deliveryFee + platformFee) * 0.05); // 5% GST
    const totalAmount = subtotal + deliveryFee + platformFee + gst;

    const summary = {
      restaurant: cart.items[0].restaurantId,
      items: cart.items,
      pricing: {
        subtotal,
        deliveryFee,
        platformFee,
        gst,
        totalAmount
      },
      itemCount: cart.itemCount
    };

    console.log('📋 Cart summary calculated:', {
      itemCount: summary.itemCount,
      subtotal,
      totalAmount
    });

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('🚨 Get cart summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get cart item count (for header badge)
export const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📊 Get cart count for user:', userId);

    const cart = await Cart.findOne({ userId });

    const count = cart ? cart.itemCount : 0;

    console.log('📊 Cart count:', count);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('🚨 Get cart count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart count',
      count: 0,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};