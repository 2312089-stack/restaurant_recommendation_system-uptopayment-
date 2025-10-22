// backend/controllers/adminOrderController.js
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';

// ==================== ORDER ANALYTICS ====================

export const getOrderAnalytics = async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    const dateFilter = getDateFilter(period, startDate, endDate);

    // Total orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Orders trend over time
    const ordersTrend = await Order.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Peak ordering hours
    const peakHours = await Order.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { 'orderCount': -1 } }
    ]);

    // Average order value
    const avgOrderValue = await Order.aggregate([
      { 
        $match: { 
          createdAt: dateFilter,
          paymentStatus: 'completed'
        } 
      },
      {
        $group: {
          _id: null,
          avgValue: { $avg: '$totalAmount' },
          minValue: { $min: '$totalAmount' },
          maxValue: { $max: '$totalAmount' }
        }
      }
    ]);

    // Order completion rate
    const completionStats = await Order.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Top customers by order count
    const topCustomers = await Order.aggregate([
      { 
        $match: { 
          createdAt: dateFilter,
          paymentStatus: 'completed'
        } 
      },
      {
        $group: {
          _id: '$customerEmail',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'emailId',
          as: 'customer'
        }
      },
      { $unwind: '$customer' }
    ]);

    res.json({
      success: true,
      analytics: {
        ordersByStatus,
        ordersTrend,
        peakHours,
        avgOrderValue: avgOrderValue[0] || { avgValue: 0, minValue: 0, maxValue: 0 },
        completionRate: completionStats[0] ? {
          total: completionStats[0].total,
          completed: completionStats[0].completed,
          cancelled: completionStats[0].cancelled,
          completionPercentage: (completionStats[0].completed / completionStats[0].total * 100).toFixed(2)
        } : null,
        topCustomers: topCustomers.map(c => ({
          name: c.customer.name,
          email: c._id,
          orderCount: c.orderCount,
          totalSpent: c.totalSpent
        }))
      }
    });

  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order analytics'
    });
  }
};

// ==================== DETAILED ORDER MANAGEMENT ====================

export const getAllOrdersDetailed = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '',
      paymentStatus = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('seller', 'businessName email phoneNumber')
        .populate('dish', 'name image price')
        .lean(),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('seller', 'businessName email phoneNumber address')
      .populate('dish', 'name image price description')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get customer details
    const customer = await User.findOne({ emailId: order.customerEmail })
      .select('name emailId phoneNumber')
      .lean();

    res.json({
      success: true,
      order: {
        ...order,
        customer
      }
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details'
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        orderStatus: status,
        adminNotes: notes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('seller', 'businessName');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        orderStatus: 'cancelled',
        cancellationReason: reason,
        cancelledBy: 'admin',
        cancelledAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

export const refundOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { refundAmount, reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        error: 'Order already refunded'
      });
    }

    order.paymentStatus = 'refunded';
    order.refundAmount = refundAmount || order.totalAmount;
    order.refundReason = reason;
    order.refundedAt = new Date();
    order.refundedBy = 'admin';

    await order.save();

    res.json({
      success: true,
      message: 'Order refunded successfully',
      order
    });

  } catch (error) {
    console.error('Refund order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refund order'
    });
  }
};

// Helper function
function getDateFilter(period, startDate, endDate) {
  const now = new Date();
  let filter = {};

  if (startDate && endDate) {
    filter = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else {
    switch (period) {
      case 'today':
        filter = {
          $gte: new Date(now.setHours(0, 0, 0, 0))
        };
        break;
      case 'week':
        filter = {
          $gte: new Date(now.setDate(now.getDate() - 7))
        };
        break;
      case 'month':
        filter = {
          $gte: new Date(now.setMonth(now.getMonth() - 1))
        };
        break;
      case 'year':
        filter = {
          $gte: new Date(now.setFullYear(now.getFullYear() - 1))
        };
        break;
      default:
        filter = {
          $gte: new Date(now.setDate(now.getDate() - 7))
        };
    }
  }

  return filter;
}

export default {
  getOrderAnalytics,
  getAllOrdersDetailed,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder,
  refundOrder
};