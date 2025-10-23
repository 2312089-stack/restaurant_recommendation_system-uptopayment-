import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Order from './models/Order.js';
import Dish from './models/Dish.js';
import Seller from './models/Seller.js';

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get first seller
    const seller = await Seller.findOne();
    if (!seller) {
      console.log('❌ No sellers found in database');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════');
    console.log('📋 SELLER INFORMATION');
    console.log('═══════════════════════════════════════');
    console.log('Seller ID:', seller._id);
    console.log('Business Name:', seller.businessName);
    console.log('Email:', seller.email);

    // Check orders
    console.log('\n═══════════════════════════════════════');
    console.log('📦 ORDER STATISTICS');
    console.log('═══════════════════════════════════════');
    
    const totalOrders = await Order.countDocuments({ seller: seller._id });
    console.log('Total Orders:', totalOrders);

    const completedOrders = await Order.countDocuments({ 
      seller: seller._id, 
      paymentStatus: 'completed' 
    });
    console.log('Completed Orders:', completedOrders);

    if (completedOrders > 0) {
      const sampleOrder = await Order.findOne({ 
        seller: seller._id, 
        paymentStatus: 'completed' 
      });
      
      console.log('\n📋 Sample Completed Order:');
      console.log('  Order ID:', sampleOrder.orderId);
      console.log('  Customer:', sampleOrder.customerName);
      console.log('  Item Name:', sampleOrder.item?.name);
      console.log('  Item DishId:', sampleOrder.item?.dishId);
      console.log('  Amount:', '₹' + sampleOrder.totalAmount);
      console.log('  Payment:', sampleOrder.paymentMethod);
      console.log('  Status:', sampleOrder.orderStatus);
    }

    // Check dishes
    console.log('\n═══════════════════════════════════════');
    console.log('🍽️  DISH STATISTICS');
    console.log('═══════════════════════════════════════');
    
    const totalDishes = await Dish.countDocuments({
      $or: [{ seller: seller._id }, { restaurantId: seller._id }]
    });
    console.log('Total Dishes:', totalDishes);

    const activeDishes = await Dish.countDocuments({
      $or: [{ seller: seller._id }, { restaurantId: seller._id }],
      isActive: true,
      availability: true
    });
    console.log('Active Dishes:', activeDishes);

    if (totalDishes > 0) {
      const sampleDish = await Dish.findOne({
        $or: [{ seller: seller._id }, { restaurantId: seller._id }]
      });
      
      console.log('\n📋 Sample Dish:');
      console.log('  Dish ID:', sampleDish._id);
      console.log('  Name:', sampleDish.name);
      console.log('  Price:', '₹' + sampleDish.price);
      console.log('  Views:', sampleDish.viewCount || 0);
      console.log('  Order Count:', sampleDish.orderCount || 0);
    }

    // Check dish-order relationship
    console.log('\n═══════════════════════════════════════');
    console.log('🔗 DISH-ORDER RELATIONSHIP CHECK');
    console.log('═══════════════════════════════════════');

    if (completedOrders > 0 && totalDishes > 0) {
      const order = await Order.findOne({ 
        seller: seller._id, 
        paymentStatus: 'completed' 
      });
      
      const dish = await Dish.findOne({
        $or: [{ seller: seller._id }, { restaurantId: seller._id }]
      });

      console.log('Order item.dishId:', order.item?.dishId, `(${typeof order.item?.dishId})`);
      console.log('Dish _id:', dish._id.toString(), `(${typeof dish._id})`);
      console.log('Match (string):', order.item?.dishId === dish._id.toString());
      console.log('Match (ObjectId):', order.item?.dishId?.toString() === dish._id.toString());
      
      // Try to find orders for this specific dish
      const ordersForDish = await Order.countDocuments({
        seller: seller._id,
        'item.dishId': dish._id.toString(),
        paymentStatus: 'completed'
      });
      console.log('\nOrders found for dish (string match):', ordersForDish);

      const ordersForDish2 = await Order.countDocuments({
        seller: seller._id,
        'item.name': dish.name,
        paymentStatus: 'completed'
      });
      console.log('Orders found for dish (name match):', ordersForDish2);
    }

    // Calculate expected analytics
    console.log('\n═══════════════════════════════════════');
    console.log('📊 EXPECTED ANALYTICS');
    console.log('═══════════════════════════════════════');

    const allCompletedOrders = await Order.find({
      seller: seller._id,
      paymentStatus: 'completed'
    });

    const totalRevenue = allCompletedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = allCompletedOrders.length > 0 ? totalRevenue / allCompletedOrders.length : 0;

    console.log('Total Revenue:', '₹' + totalRevenue.toFixed(2));
    console.log('Total Orders:', allCompletedOrders.length);
    console.log('Average Order Value:', '₹' + avgOrderValue.toFixed(2));

    console.log('\n═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();