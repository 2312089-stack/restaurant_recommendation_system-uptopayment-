// scripts/fixOrderHistory.js - Run this ONCE to fix existing data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import OrderHistory from '../models/OrderHistory.js';

dotenv.config();

async function fixOrderHistory() {
  try {
    console.log('🔧 Starting order history migration...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    // 1. Find all orders without order history
    const ordersWithoutHistory = await Order.find({}).lean();
    console.log(`📦 Found ${ordersWithoutHistory.length} total orders\n`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const order of ordersWithoutHistory) {
      try {
        // Check if history already exists
        const existingHistory = await OrderHistory.findOne({ 
          orderMongoId: order._id 
        });

        if (existingHistory) {
          // Update existing history to be permanent
          existingHistory.isTemporary = false;
          await existingHistory.save();
          updated++;
          console.log(`✅ Updated history for order: ${order.orderId}`);
        } else {
          // Create new order history
          const newHistory = new OrderHistory({
            orderId: order.orderId,
            customerId: order.customerId,
            orderMongoId: order._id,
            isTemporary: false, // Make it permanent
            snapshot: {
              dishId: order.dish,
              dishName: order.item?.name,
              dishImage: order.item?.image,
              restaurantId: order.seller,
              restaurantName: order.item?.restaurant,
              totalAmount: order.totalAmount,
              deliveryAddress: order.deliveryAddress,
              paymentMethod: order.paymentMethod,
              customerPhone: order.customerPhone,
              orderBreakdown: order.orderBreakdown
            },
            statusHistory: order.orderTimeline || [{
              status: order.orderStatus,
              timestamp: order.createdAt,
              actor: 'system',
              note: 'Order created'
            }],
            currentStatus: order.orderStatus
          });

          // Add cancellation info if cancelled
          if (['cancelled', 'seller_rejected'].includes(order.orderStatus)) {
            newHistory.cancellationInfo = {
              cancelledBy: order.cancelledBy || 'system',
              reason: order.cancellationReason || 'No reason provided',
              timestamp: order.cancelledAt || order.updatedAt,
              refundStatus: order.paymentStatus === 'completed' ? 'pending' : 'none'
            };
          }

          // Add delivery info if delivered
          if (order.orderStatus === 'delivered') {
            newHistory.deliveryInfo = {
              actualDeliveryTime: order.actualDeliveryTime || order.updatedAt,
              estimatedTime: order.estimatedDelivery
            };
          }

          // Add rating if exists
          if (order.rating) {
            newHistory.rating = {
              score: order.rating,
              review: order.review || '',
              ratedAt: order.ratedAt || order.updatedAt
            };
          }

          await newHistory.save();
          created++;
          console.log(`✅ Created history for order: ${order.orderId}`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error processing order ${order.orderId}:`, err.message);
      }
    }

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${ordersWithoutHistory.length}`);
    console.log('========================================\n');

    // 2. Set all temporary orders to permanent
    const tempOrders = await OrderHistory.updateMany(
      { isTemporary: true },
      { $set: { isTemporary: false } }
    );
    
    console.log(`✅ Converted ${tempOrders.modifiedCount} temporary orders to permanent\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
fixOrderHistory();