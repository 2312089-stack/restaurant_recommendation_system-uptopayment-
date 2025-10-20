// backend/controllers/sellerOrderController.js - FULLY FIXED VERSION
import Order from '../models/Order.js';
import OrderHistory from '../models/OrderHistory.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import notificationService from '../services/notificationService.js';
import { getIO } from '../config/socket.js';

// ==================== EMAIL SERVICE ====================
let emailTransporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim(),
    },
  });
  console.log('✅ Email service initialized');
}

// ==================== HELPER: SEND CUSTOMER NOTIFICATION ====================
async function sendCustomerNotification(order, status, additionalData = {}) {
  try {
    // ✅ CRITICAL FIX: Use customerId first, fallback to email
    let user = null;
    
    if (order.customerId) {
      user = await User.findById(order.customerId);
      console.log('✅ User found by customerId:', order.customerId);
    } else if (order.customerEmail) {
      user = await User.findOne({ emailId: order.customerEmail });
      console.log('✅ User found by email:', order.customerEmail);
    }

    if (!user) {
      console.warn('⚠️ User not found for order:', order.orderId);
      return false;
    }

    // Send notification to database
    await notificationService.sendOrderStatusNotification(
      order._id,
      status,
      user._id
    );
    console.log(`✅ Database notification sent: ${status}`);

    // Send socket notification
    const io = getIO();
    if (io) {
      const notification = {
        orderId: order.orderId,
        orderMongoId: order._id.toString(),
        _id: order._id.toString(),
        orderStatus: status,
        status: status,
        customerEmail: order.customerEmail,
        message: getStatusMessage(status, order),
        timestamp: new Date(),
        ...additionalData
      };

      // Emit to multiple rooms for redundancy
      io.to(`user-${order.customerEmail}`).emit('order-status-updated', notification);
      io.to(`order-${order._id}`).emit('order-status-updated', notification);
      io.to(user._id.toString()).emit('order-status-updated', notification);
      
      // Special events for accept/reject
      if (status === 'seller_accepted') {
        io.to(`user-${order.customerEmail}`).emit('seller-accepted-order', notification);
        io.to(`user-${order.customerEmail}`).emit('order-confirmed', notification);
      } else if (status === 'seller_rejected') {
        io.to(`user-${order.customerEmail}`).emit('order-rejected', notification);
      }

      console.log(`✅ Socket notifications sent to user: ${user._id}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending customer notification:', error);
    return false;
  }
}

// ==================== HELPER: GET STATUS MESSAGE ====================
function getStatusMessage(status, order) {
  const messages = {
    'seller_accepted': '🎉 Restaurant accepted your order!',
    'seller_rejected': `❌ Restaurant declined your order${order.cancellationReason ? ': ' + order.cancellationReason : ''}`,
    'preparing': '👨‍🍳 Your food is being prepared',
    'ready': '✓ Your order is ready for pickup!',
    'out_for_delivery': '🚗 Your order is on the way!',
    'delivered': '🎊 Order delivered successfully!'
  };
  return messages[status] || `Order ${status.replace('_', ' ')}`;
}

// ==================== ACCEPT ORDER ====================
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller.id || req.seller._id;

    console.log('✅ Accepting order:', orderId, 'by seller:', sellerId);

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId,
      orderStatus: 'pending_seller'
    }).populate('dish');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already processed'
      });
    }

    // Update order status
    order.orderStatus = 'seller_accepted';
    order.sellerResponse = order.sellerResponse || {};
    order.sellerResponse.acceptedAt = new Date();
    order.acceptedAt = new Date();
    
    // Add timeline entry
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: 'seller_accepted',
      timestamp: new Date(),
      actor: 'seller',
      message: 'Restaurant accepted the order'
    });

    await order.save();
    console.log('✅ Order status updated to seller_accepted');

    // ✅ SEND CUSTOMER NOTIFICATION
    await sendCustomerNotification(order, 'seller_accepted');

    // ✅ UPDATE ORDER HISTORY
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: 'seller_accepted',
          timestamp: new Date(),
          actor: 'seller',
          note: 'Restaurant confirmed your order'
        });
        history.currentStatus = 'seller_accepted';
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.warn('⚠️ Failed to update order history:', historyError.message);
    }

    // ✅ SEND EMAIL NOTIFICATION
    if (emailTransporter && order.customerEmail) {
      try {
        await emailTransporter.sendMail({
          from: `"TasteSphere" <${process.env.EMAIL_USER}>`,
          to: order.customerEmail,
          subject: `✅ Order Accepted - #${order.orderId}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .order-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; border-radius: 4px; }
                .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Order Accepted!</h1>
                </div>
                <div class="content">
                  <h2>Hi ${order.customerName}!</h2>
                  <p>Great news! The restaurant has accepted your order and it's being prepared now.</p>
                  
                  <div class="order-box">
                    <h3>📋 Order Details</h3>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Item:</strong> ${order.item?.name || order.dish?.name || 'N/A'}</p>
                    <p><strong>Total:</strong> ₹${order.totalAmount}</p>
                    <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery || '25-30 minutes'}</p>
                  </div>

                  ${order.paymentStatus === 'pending' ? `
                  <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>⚠️ Payment Required:</strong></p>
                    <p style="margin: 5px 0 0 0;">Please complete your payment to continue.</p>
                  </div>
                  ` : ''}

                  <p>We'll notify you when your order is ready for delivery!</p>

                  <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-tracking/${order.orderId}" class="button">
                      Track Your Order
                    </a>
                  </center>

                  <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                    Thank you for choosing TasteSphere!
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log('✅ Customer email sent');
      } catch (emailError) {
        console.warn('⚠️ Email failed:', emailError.message);
      }
    }
console.log('\n========== ACCEPT ORDER DEBUG ==========');
console.log('Order ID:', orderId);
console.log('Seller ID:', sellerId);
console.log('Order found:', !!order);
console.log('Order customerId:', order?.customerId);
console.log('Order customerEmail:', order?.customerEmail);
    res.json({
      success: true,
      message: 'Order accepted successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('❌ Accept order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== REJECT ORDER ====================
export const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const sellerId = req.seller.id || req.seller._id;

    console.log('❌ Rejecting order:', orderId, 'Reason:', reason);

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId,
      orderStatus: 'pending_seller'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already processed'
      });
    }

    // Update order
    order.orderStatus = 'seller_rejected';
    order.rejectedAt = new Date();
    order.rejectionReason = reason.trim();
    order.sellerResponse = order.sellerResponse || {};
    order.sellerResponse.rejectedAt = new Date();
    order.sellerResponse.rejectionReason = reason.trim();
    order.cancelledBy = 'seller';
    order.cancelledAt = new Date();
    order.cancellationReason = reason.trim();
    
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: 'seller_rejected',
      timestamp: new Date(),
      actor: 'seller',
      message: `Restaurant rejected: ${reason}`
    });

    await order.save();
    console.log('✅ Order rejected');

    // ✅ SEND CUSTOMER NOTIFICATION
    await sendCustomerNotification(order, 'seller_rejected', {
      cancellationReason: reason
    });

    // Update order history
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: 'seller_rejected',
          timestamp: new Date(),
          actor: 'seller',
          note: reason
        });
        history.currentStatus = 'seller_rejected';
        history.cancellationInfo = {
          cancelledBy: 'seller',
          reason: reason,
          timestamp: new Date(),
          refundStatus: order.paymentStatus === 'completed' ? 'pending' : 'none'
        };
        history.isTemporary = false;
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.warn('⚠️ Failed to update order history:', historyError.message);
    }

    // Send email
    if (emailTransporter && order.customerEmail) {
      try {
        await emailTransporter.sendMail({
          from: `"TasteSphere" <${process.env.EMAIL_USER}>`,
          to: order.customerEmail,
          subject: `❌ Order Cancelled - #${order.orderId}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>❌ Order Cancelled</h1>
                </div>
                <div class="content">
                  <h2>Hi ${order.customerName},</h2>
                  <p>We're sorry to inform you that your order has been cancelled by the restaurant.</p>
                  
                  <div class="reason-box">
                    <h3>🔍 Reason:</h3>
                    <p><strong>${reason}</strong></p>
                  </div>

                  ${order.paymentStatus === 'completed' ? `
                  <div style="background: #fef3c7; border: 1px solid #fde047; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p><strong>💰 Refund Information:</strong></p>
                    <p>Your payment of ₹${order.totalAmount} will be refunded within 5-7 business days.</p>
                  </div>
                  ` : ''}

                  <p>We apologize for the inconvenience. Please explore other restaurants on TasteSphere.</p>
                  
                  <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                    If you have questions, contact support@tastesphere.com
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log('✅ Rejection email sent');
      } catch (emailError) {
        console.warn('⚠️ Email failed:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Order rejected successfully',
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        cancellationReason: reason
      }
    });

  } catch (error) {
    console.error('❌ Reject order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== UPDATE ORDER STATUS ====================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.seller.id || req.seller._id;

    console.log('🔄 Updating order status:', orderId, 'to:', status);

    const validStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order
    order.orderStatus = status;
    if (!order.orderTimeline) {
      order.orderTimeline = [];
    }
    order.orderTimeline.push({
      status: status,
      timestamp: new Date(),
      actor: 'seller',
      message: `Order ${status.replace('_', ' ')}`
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
      
      // Auto-complete COD payment on delivery
      if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
        order.paymentStatus = 'completed';
        console.log('✅ COD payment auto-completed on delivery');
      }
    }

    await order.save();
    console.log('✅ Order status updated');

    // ✅ SEND CUSTOMER NOTIFICATION WITH CORRECT STATUS
    await sendCustomerNotification(order, status);

    // Update order history
    try {
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.statusHistory.push({
          status: status,
          timestamp: new Date(),
          actor: 'seller',
          note: `Order is now ${status.replace('_', ' ')}`
        });
        history.currentStatus = status;
        
        if (status === 'delivered') {
          history.deliveryInfo = {
            actualDeliveryTime: new Date(),
            estimatedTime: order.estimatedDelivery
          };
          history.isTemporary = false;
        }
        
        await history.save();
        console.log('✅ Order history updated');
      }
    } catch (historyError) {
      console.error('⚠️ Failed to update order history:', historyError);
    }

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      }
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
};

// ==================== GET ALL ORDERS ====================
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller._id;
    const { status = 'all', page = 1, limit = 50 } = req.query;

    console.log('📦 Getting orders for seller:', sellerId, 'Status:', status);

    const query = { seller: sellerId };
    
    if (status !== 'all') {
      if (status === 'pending_seller') {
        query.orderStatus = 'pending_seller';
      } else if (status === 'active') {
        query.orderStatus = { 
          $in: ['confirmed', 'seller_accepted', 'preparing', 'ready', 'out_for_delivery'] 
        };
      } else if (status === 'completed') {
        query.orderStatus = { $in: ['delivered', 'completed'] };
      } else if (status === 'cancelled') {
        query.orderStatus = { $in: ['cancelled', 'rejected', 'seller_rejected'] };
      } else {
        query.orderStatus = status;
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('dish', 'name image category type price')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    console.log(`✅ Found ${orders.length} orders`);

    res.json({
      success: true,
      orders,
      count: orders.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    });

  } catch (error) {
    console.error('❌ Get seller orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== GET ORDER DETAILS ====================
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller.id || req.seller._id;

    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).populate('dish', 'name image category type price').lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
};

// ==================== GET ORDER STATS ====================
export const getOrderStats = async (req, res) => {
  try {
    const sellerId = req.seller.id || req.seller._id;

    const [
      totalOrders,
      pendingOrders,
      activeOrders,
      completedOrders,
      todayOrders,
      todayRevenue
    ] = await Promise.all([
      Order.countDocuments({ seller: sellerId }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'pending_seller' }),
      Order.countDocuments({
        seller: sellerId,
        orderStatus: { $in: ['seller_accepted', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] }
      }),
      Order.countDocuments({ seller: sellerId, orderStatus: 'delivered' }),
      Order.countDocuments({
        seller: sellerId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Order.aggregate([
        {
          $match: {
            seller: new mongoose.Types.ObjectId(sellerId),
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            paymentStatus: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('❌ Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics'
    });
  }
};