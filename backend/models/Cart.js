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
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
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
    unique: true
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

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.itemCount = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  this.lastUpdated = new Date();
  next();
});

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  try {
    let cart = await this.findOne({ userId });
    if (!cart) {
      cart = await this.create({ userId, items: [] });
    }
    return cart;
  } catch (error) {
    console.error('Error in getOrCreateCart:', error);
    throw error;
  }
};

// Instance method to add item to cart
cartSchema.methods.addItem = function(itemData) {
  const existingItem = this.items.find(item => 
    item.dishId.toString() === itemData.dishId.toString()
  );
  
  if (existingItem) {
    // Update existing item
    existingItem.quantity += itemData.quantity || 1;
    existingItem.price = itemData.price;
    existingItem.dishName = itemData.dishName;
    existingItem.dishImage = itemData.dishImage || '';
    existingItem.specialInstructions = itemData.specialInstructions || '';
    existingItem.addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      ...itemData,
      addedAt: new Date()
    });
  }
    
  return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateQuantity = function(dishId, quantity) {
  const item = this.items.find(item => 
    item.dishId.toString() === dishId.toString()
  );
  
  if (item) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      this.items = this.items.filter(item => 
        item.dishId.toString() !== dishId.toString()
      );
    } else {
      item.quantity = quantity;
    }
  }
    
  return this.save();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function(dishId) {
  this.items = this.items.filter(item => 
    item.dishId.toString() !== dishId.toString()
  );
  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
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