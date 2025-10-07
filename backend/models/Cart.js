// models/Cart.js - FIXED VERSION
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  dishId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true
  },
  dishName: {
    type: String,
    required: true
  },
  dishImage: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  // FIXED: Changed ref to match your Dish model's seller field
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller', // Make sure this matches your Seller model name
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true // Add index for faster lookups
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  itemCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// FIXED: More robust total calculation
cartSchema.pre('save', function(next) {
  try {
    this.itemCount = this.items.reduce((total, item) => {
      const qty = Number(item.quantity) || 0;
      return total + qty;
    }, 0);
    
    this.totalAmount = this.items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return total + (price * qty);
    }, 0);
    
    this.lastUpdated = new Date();
    next();
  } catch (error) {
    console.error('Error in cart pre-save hook:', error);
    next(error);
  }
});

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  try {
    console.log('🛒 getOrCreateCart called for userId:', userId);
    
    let cart = await this.findOne({ userId });
    if (!cart) {
      console.log('🛒 Creating new cart for user:', userId);
      cart = await this.create({ 
        userId, 
        items: [],
        totalAmount: 0,
        itemCount: 0
      });
      console.log('✅ New cart created:', cart._id);
    } else {
      console.log('✅ Existing cart found:', cart._id);
    }
    return cart;
  } catch (error) {
    console.error('❌ Error in getOrCreateCart:', error);
    throw error;
  }
};

// FIXED: Better error handling and validation
cartSchema.methods.addItem = async function(itemData) {
  try {
    console.log('➕ Adding item to cart:', itemData.dishName);
    
    // Validate required fields
    if (!itemData.dishId || !itemData.restaurantId) {
      throw new Error('Missing required fields: dishId and restaurantId');
    }
    
    const existingItem = this.items.find(item => 
      item.dishId.toString() === itemData.dishId.toString()
    );
    
    if (existingItem) {
      console.log('📝 Updating existing item quantity');
      existingItem.quantity += Number(itemData.quantity) || 1;
      existingItem.price = Number(itemData.price);
      existingItem.dishName = itemData.dishName;
      existingItem.dishImage = itemData.dishImage || '';
      existingItem.specialInstructions = itemData.specialInstructions || '';
      existingItem.addedAt = new Date();
    } else {
      console.log('➕ Adding new item to cart');
      this.items.push({
        dishId: itemData.dishId,
        dishName: itemData.dishName,
        dishImage: itemData.dishImage || '',
        price: Number(itemData.price),
        quantity: Number(itemData.quantity) || 1,
        restaurantId: itemData.restaurantId,
        restaurantName: itemData.restaurantName,
        specialInstructions: itemData.specialInstructions || '',
        addedAt: new Date()
      });
    }
    
    return await this.save();
  } catch (error) {
    console.error('❌ Error in addItem:', error);
    throw error;
  }
};

// FIXED: Better validation
cartSchema.methods.updateQuantity = async function(dishId, quantity) {
  try {
    console.log('🔄 Updating quantity for dish:', dishId, 'to:', quantity);
    
    const parsedQty = Number(quantity);
    
    if (isNaN(parsedQty)) {
      throw new Error('Invalid quantity value');
    }
    
    const item = this.items.find(item => 
      item.dishId.toString() === dishId.toString()
    );
    
    if (item) {
      if (parsedQty <= 0) {
        console.log('❌ Removing item (quantity <= 0)');
        this.items = this.items.filter(item => 
          item.dishId.toString() !== dishId.toString()
        );
      } else {
        console.log('✅ Updating quantity to:', parsedQty);
        item.quantity = parsedQty;
      }
    } else {
      throw new Error('Item not found in cart');
    }
    
    return await this.save();
  } catch (error) {
    console.error('❌ Error in updateQuantity:', error);
    throw error;
  }
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = async function(dishId) {
  try {
    console.log('❌ Removing item from cart:', dishId);
    
    const initialLength = this.items.length;
    this.items = this.items.filter(item => 
      item.dishId.toString() !== dishId.toString()
    );
    
    if (this.items.length === initialLength) {
      throw new Error('Item not found in cart');
    }
    
    return await this.save();
  } catch (error) {
    console.error('❌ Error in removeItem:', error);
    throw error;
  }
};

// Instance method to clear cart
cartSchema.methods.clearCart = async function() {
  try {
    console.log('🗑️ Clearing entire cart');
    this.items = [];
    return await this.save();
  } catch (error) {
    console.error('❌ Error in clearCart:', error);
    throw error;
  }
};

// Instance method to check if cart has items from multiple restaurants
cartSchema.methods.hasMultipleRestaurants = function() {
  if (this.items.length === 0) return false;
  
  const firstRestaurantId = this.items[0].restaurantId.toString();
  return this.items.some(item => 
    item.restaurantId.toString() !== firstRestaurantId
  );
};

// Instance method to get restaurant info
cartSchema.methods.getRestaurantInfo = function() {
  if (this.items.length === 0) return null;
  
  return {
    restaurantId: this.items[0].restaurantId,
    restaurantName: this.items[0].restaurantName
  };
};

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;