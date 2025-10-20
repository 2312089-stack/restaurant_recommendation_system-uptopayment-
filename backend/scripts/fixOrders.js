import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';

async function fixOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Find all orders with issues
    const problematicOrders = await Order.find({
      $or: [
        { customerId: null },
        { customerId: { $exists: false } },
        { sellerId: null },
        { sellerId: { $exists: false } }
      ]
    }).lean();

    console.log(`Found ${problematicOrders.length} orders with issues\n`);

    let fixed = 0;
    let failed = 0;
    let deleted = 0;

    for (const order of problematicOrders) {
      try {
        // Try to find customer
        let customerId = order.customerId;
        if (!customerId && order.customerEmail) {
          const user = await User.findOne({ emailId: order.customerEmail });
          if (user) {
            customerId = user._id;
            console.log(`✅ Found customer for ${order.customerEmail}`);
          } else {
            console.warn(`⚠️  No user found for ${order.customerEmail}`);
          }
        }

        // Try to find seller
        let sellerId = order.sellerId || order.seller;
        if (!sellerId && order.items && order.items.length > 0) {
          // Try to get seller from first dish
          const dishId = order.items[0].dishId;
          if (dishId) {
            const Dish = mongoose.model('Dish');
            const dish = await Dish.findById(dishId).populate('seller');
            if (dish && dish.seller) {
              sellerId = dish.seller._id;
              console.log(`✅ Found seller from dish for order ${order.orderId}`);
            }
          }
        }

        // If we have both IDs, update the order
        if (customerId && sellerId) {
          // Fix invalid status values
          let status = order.status || order.orderStatus;
          const validStatuses = [
            'pending_seller', 'seller_accepted', 'seller_rejected',
            'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
          ];
          
          // Map old status values to new ones
          const statusMap = {
            'confirmed': 'seller_accepted',
            'pending': 'pending_seller',
            'accepted': 'seller_accepted',
            'rejected': 'seller_rejected',
            'completed': 'delivered'
          };

          if (!validStatuses.includes(status)) {
            status = statusMap[status] || 'pending_seller';
            console.log(`📝 Mapped status "${order.status}" to "${status}"`);
          }

          await Order.updateOne(
            { _id: order._id },
            {
              $set: {
                customerId: customerId,
                sellerId: sellerId,
                status: status
              },
              $unset: {
                seller: "",
                orderStatus: ""
              }
            }
          );

          fixed++;
          console.log(`✅ Fixed order ${order.orderId || order._id}`);
        } else {
          // Can't fix - missing critical data
          console.error(`❌ Cannot fix order ${order.orderId || order._id} - missing ${!customerId ? 'customer' : 'seller'}`);
          
          // Optionally delete orders that can't be fixed
          // await Order.deleteOne({ _id: order._id });
          // deleted++;
          // console.log(`🗑️  Deleted unfixable order`);
          
          failed++;
        }
      } catch (err) {
        console.error(`❌ Error processing order ${order.orderId || order._id}:`, err.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🗑️  Deleted: ${deleted}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

fixOrders();