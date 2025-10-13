// backend/controllers/sellerAnalyticsController.js - COMPLETE PRODUCTION VERSION
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

class SellerAnalyticsController {
  
  // ==================== MAIN ANALYTICS ENDPOINT ====================
  getAnalytics = async (req, res) => {
    try {
      const sellerId = req.seller.id || req.seller._id;
      const { range = 'week' } = req.query;

      console.log('📊 Fetching analytics for seller:', sellerId, 'Range:', range);

      // Validate seller ID
      if (!mongoose.Types.ObjectId.isValid(sellerId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid seller ID'
        });
      }

      // Calculate date range
      const { startDate, endDate } = this.getDateRange(range);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());

      // Fetch all data in parallel for performance
      const [
        overview,
        revenueData,
        ordersData,
        dishesData,
        customersData,
        performanceData,
        trendsData
      ] = await Promise.all([
        this.getOverview(sellerId, startDate, endDate),
        this.getRevenueAnalytics(sellerId, startDate, endDate),
        this.getOrdersAnalytics(sellerId, startDate, endDate),
        this.getDishAnalytics(sellerId, startDate, endDate),
        this.getCustomerAnalytics(sellerId, startDate, endDate),
        this.getPerformanceMetrics(sellerId, startDate, endDate),
        this.getTrends(sellerId, startDate, endDate)
      ]);

      console.log('✅ Analytics data compiled successfully');

      res.json({
        success: true,
        analytics: {
          overview,
          revenue: revenueData,
          orders: ordersData,
          dishes: dishesData,
          customers: customersData,
          performance: performanceData,
          trends: trendsData
        }
      });

    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // ==================== DATE RANGE HELPER ====================
  getDateRange(range) {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Set to start of day for startDate, end of day for endDate
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // ==================== OVERVIEW METRICS ====================
  async getOverview(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      // Get completed orders for revenue calculation
      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'completed'
      }).lean();

      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get average rating from reviews
      const reviews = await Review.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'active'
      }).lean();

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averageRating: Math.round(averageRating * 10) / 10
      };
    } catch (error) {
      console.error('Overview error:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        averageRating: 0
      };
    }
  }

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueAnalytics(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      // Current period orders
      const currentOrders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'completed'
      }).sort({ createdAt: 1 }).lean();

      // Previous period for growth comparison
      const periodLength = endDate - startDate;
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = startDate;

      const prevOrders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: prevStartDate, $lt: prevEndDate },
        paymentStatus: 'completed'
      }).lean();

      // Calculate growth metrics
      const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // AOV Growth
      const currentAOV = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
      const prevAOV = prevOrders.length > 0 ? (prevRevenue / prevOrders.length) : 0;
      const aovGrowth = prevAOV > 0 ? ((currentAOV - prevAOV) / prevAOV) * 100 : 0;

      // Daily revenue data
      const dailyData = this.aggregateByDate(currentOrders, 'totalAmount', startDate, endDate);

      return {
        growth: Math.round(growth * 10) / 10,
        aovGrowth: Math.round(aovGrowth * 10) / 10,
        dailyData
      };
    } catch (error) {
      console.error('Revenue analytics error:', error);
      return {
        growth: 0,
        aovGrowth: 0,
        dailyData: []
      };
    }
  }

  // ==================== ORDERS ANALYTICS ====================
  async getOrdersAnalytics(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      // Previous period for growth
      const periodLength = endDate - startDate;
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = startDate;

      const prevOrders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: prevStartDate, $lt: prevEndDate }
      }).lean();

      const growth = prevOrders.length > 0 
        ? ((orders.length - prevOrders.length) / prevOrders.length) * 100 
        : 0;

      // Status distribution
      const statusCounts = {};
      orders.forEach(order => {
        const status = order.orderStatus || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusDistribution = Object.keys(statusCounts).map(status => ({
        name: this.formatStatusName(status),
        value: statusCounts[status]
      }));

      // Payment method distribution
      const paymentData = this.calculatePaymentDistribution(orders);

      // Hourly distribution
      const hourlyData = this.calculateHourlyDistribution(orders);

      return {
        growth: Math.round(growth * 10) / 10,
        statusDistribution,
        paymentDistribution: paymentData,
        hourlyData
      };
    } catch (error) {
      console.error('Orders analytics error:', error);
      return {
        growth: 0,
        statusDistribution: [],
        paymentDistribution: [],
        hourlyData: []
      };
    }
  }

  // ==================== DISH ANALYTICS ====================
  async getDishAnalytics(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      // Get all active dishes
      const dishes = await Dish.find({
        seller: sellerObjectId,
        isActive: true
      }).lean();

      // Calculate stats for each dish
      const dishStatsPromises = dishes.map(async (dish) => {
        // Count orders containing this dish
        const orderCount = await Order.countDocuments({
          seller: sellerObjectId,
          'item.dishId': dish._id.toString(),
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
        });

        // Calculate revenue from this dish
        const revenueResult = await Order.aggregate([
          {
            $match: {
              seller: sellerObjectId,
              'item.dishId': dish._id.toString(),
              createdAt: { $gte: startDate, $lte: endDate },
              paymentStatus: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);

        return {
          _id: dish._id,
          name: dish.name,
          orders: orderCount,
          revenue: revenueResult[0]?.total || 0,
          rating: dish.rating?.average || 0,
          views: dish.viewCount || 0
        };
      });

      const dishStats = await Promise.all(dishStatsPromises);

      // Sort by orders and get top 5
      const topDishes = dishStats
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      return {
        topDishes,
        totalDishes: dishes.length
      };
    } catch (error) {
      console.error('Dish analytics error:', error);
      return {
        topDishes: [],
        totalDishes: 0
      };
    }
  }

  // ==================== CUSTOMER ANALYTICS ====================
  async getCustomerAnalytics(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      // Unique customers by email
      const customerEmails = new Set(orders.map(o => o.customerEmail));
      const total = customerEmails.size;

      // Get all historical orders to determine new vs repeat
      const allOrders = await Order.find({
        seller: sellerObjectId
      }).lean();

      // Count orders per customer
      const customerOrderCounts = {};
      allOrders.forEach(order => {
        const email = order.customerEmail;
        customerOrderCounts[email] = (customerOrderCounts[email] || 0) + 1;
      });

      // New customers (first order in current period)
      const newCustomers = orders.filter(order => {
        const previousOrders = allOrders.filter(o => 
          o.customerEmail === order.customerEmail && 
          o.createdAt < startDate
        );
        return previousOrders.length === 0;
      });

      const newCustomerCount = new Set(newCustomers.map(o => o.customerEmail)).size;

      // Repeat customers (more than 1 order ever)
      const repeatCustomers = Array.from(customerEmails).filter(email => 
        customerOrderCounts[email] > 1
      ).length;

      const repeatRate = total > 0 ? (repeatCustomers / total) * 100 : 0;

      return {
        total,
        new: newCustomerCount,
        repeat: repeatCustomers,
        repeatRate: Math.round(repeatRate * 10) / 10
      };
    } catch (error) {
      console.error('Customer analytics error:', error);
      return {
        total: 0,
        new: 0,
        repeat: 0,
        repeatRate: 0
      };
    }
  }

  // ==================== PERFORMANCE METRICS ====================
  async getPerformanceMetrics(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const totalOrders = orders.length;

      // Acceptance rate
      const acceptedStatuses = ['seller_accepted', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const acceptedOrders = orders.filter(o => acceptedStatuses.includes(o.orderStatus)).length;
      const acceptanceRate = totalOrders > 0 ? (acceptedOrders / totalOrders) * 100 : 100;

      // Cancellation rate
      const cancelledStatuses = ['cancelled', 'seller_rejected'];
      const cancelledOrders = orders.filter(o => cancelledStatuses.includes(o.orderStatus)).length;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      // Average prep time (estimated from delivery data)
      const deliveredOrders = orders.filter(o => o.actualDeliveryTime && o.createdAt);
      const avgPrepTime = deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, o) => {
            const prepTime = (new Date(o.actualDeliveryTime) - new Date(o.createdAt)) / 60000; // minutes
            return sum + Math.min(prepTime, 120); // Cap at 120 minutes
          }, 0) / deliveredOrders.length
        : 25; // Default

      // Rating change (compare with previous period)
      const periodLength = endDate - startDate;
      const prevStartDate = new Date(startDate.getTime() - periodLength);

      const [currentReviews, prevReviews] = await Promise.all([
        Review.find({
          seller: sellerObjectId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'active'
        }).lean(),
        Review.find({
          seller: sellerObjectId,
          createdAt: { $gte: prevStartDate, $lt: startDate },
          status: 'active'
        }).lean()
      ]);

      const currentAvg = currentReviews.length > 0
        ? currentReviews.reduce((sum, r) => sum + r.rating, 0) / currentReviews.length
        : 0;

      const prevAvg = prevReviews.length > 0
        ? prevReviews.reduce((sum, r) => sum + r.rating, 0) / prevReviews.length
        : 0;

      const ratingChange = currentAvg - prevAvg;

      return {
        avgPrepTime: Math.round(avgPrepTime),
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        ratingChange: Math.round(ratingChange * 10) / 10
      };
    } catch (error) {
      console.error('Performance metrics error:', error);
      return {
        avgPrepTime: 25,
        acceptanceRate: 100,
        cancellationRate: 0,
        ratingChange: 0
      };
    }
  }

  // ==================== TRENDS ANALYSIS ====================
  async getTrends(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      // Peak hours analysis
      const hourCounts = Array(24).fill(0);
      orders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourCounts[hour]++;
      });

      const maxOrders = Math.max(...hourCounts);
      const peakHour = hourCounts.indexOf(maxOrders);
      const peakEndHour = (peakHour + 2) % 24;
      const peakHours = `${peakHour}:00 - ${peakEndHour}:00`;

      // Top category from dishes
      const dishes = await Dish.find({
        seller: sellerObjectId,
        isActive: true
      }).lean();

      const categoryCounts = {};
      dishes.forEach(dish => {
        categoryCounts[dish.category] = (categoryCounts[dish.category] || 0) + 1;
      });

      const topCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b
      , 'Main Course');

      // Growth rate (overall trend)
      const periodLength = endDate - startDate;
      const prevStartDate = new Date(startDate.getTime() - periodLength);

      const prevOrders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: prevStartDate, $lt: startDate },
        paymentStatus: 'completed'
      }).lean();

      const currentRevenue = orders
        .filter(o => o.paymentStatus === 'completed')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const growthRate = prevRevenue > 0 
        ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
        : 0;

      return {
        peakHours,
        topCategory,
        growthRate: Math.round(growthRate * 10) / 10
      };
    } catch (error) {
      console.error('Trends analysis error:', error);
      return {
        peakHours: '19:00 - 21:00',
        topCategory: 'Main Course',
        growthRate: 0
      };
    }
  }

  // ==================== HELPER METHODS ====================

  // Aggregate data by date
  aggregateByDate(orders, field, startDate, endDate) {
    const dateMap = new Map();
    
    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate orders by date
    orders.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, dateMap.get(dateKey) + (order[field] || 0));
      }
    });

    // Convert to array format
    return Array.from(dateMap.entries()).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(value * 100) / 100
    }));
  }

  // Calculate payment distribution
  calculatePaymentDistribution(orders) {
    const paymentCounts = { razorpay: 0, cod: 0 };
    const paymentTotals = { razorpay: 0, cod: 0 };

    orders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      if (method === 'razorpay' || method === 'cod') {
        paymentCounts[method]++;
        if (order.paymentStatus === 'completed') {
          paymentTotals[method] += order.totalAmount || 0;
        }
      }
    });

    return [
      { method: 'Online', count: paymentCounts.razorpay, amount: Math.round(paymentTotals.razorpay * 100) / 100 },
      { method: 'COD', count: paymentCounts.cod, amount: Math.round(paymentTotals.cod * 100) / 100 }
    ];
  }

  // Calculate hourly distribution
  calculateHourlyDistribution(orders) {
    const hourlyCounts = Array(24).fill(0);
    
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts.map((count, hour) => ({
      hour: `${hour}:00`,
      orders: count
    }));
  }

  // Format status name for display
  formatStatusName(status) {
    const statusMap = {
      'pending_seller': 'Pending',
      'seller_accepted': 'Accepted',
      'seller_rejected': 'Rejected',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };

    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Export controller instance
const analyticsController = new SellerAnalyticsController();
export default analyticsController;
export const { getAnalytics } = analyticsController;