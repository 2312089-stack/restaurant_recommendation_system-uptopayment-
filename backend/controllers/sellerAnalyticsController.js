// backend/controllers/sellerAnalyticsController.js - COMPLETE FIXED VERSION
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
      console.error('Stack:', error.stack);
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

    // ✅ TEMPORARY: Use all-time for testing
    if (range === 'all') {
      startDate = new Date('2020-01-01');
    } else {
      switch (range) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // ==================== OVERVIEW METRICS ====================
  async getOverview(sellerId, startDate, endDate) {
    try {
      const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

      console.log('📊 Getting overview for seller:', sellerId);

      // Get completed orders for revenue calculation
      const orders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'completed'
      }).lean();

      console.log(`📊 Found ${orders.length} completed payment orders`);

      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      console.log(`💰 Total Revenue: ₹${totalRevenue.toFixed(2)}`);
      console.log(`📦 Total Orders: ${totalOrders}`);

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

      console.log('💰 Calculating revenue analytics...');

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
      const completedPaymentOrders = orders.filter(o => o.paymentStatus === 'completed');
      const paymentData = this.calculatePaymentDistribution(completedPaymentOrders);

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

      console.log('🍽️  Calculating dish analytics...');

      // Get all active dishes
      const dishes = await Dish.find({
        $or: [
          { seller: sellerObjectId },
          { restaurantId: sellerObjectId }
        ],
        isActive: true
      }).lean();

      console.log(`🍽️  Found ${dishes.length} active dishes`);

      if (dishes.length === 0) {
        return { topDishes: [], totalDishes: 0 };
      }

      // Get ALL completed payment orders
      const allCompletedOrders = await Order.find({
        seller: sellerObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'completed'
      }).lean();

      console.log(`📦 Found ${allCompletedOrders.length} completed orders to analyze`);

      // Calculate stats for each dish
      const dishStats = dishes.map((dish) => {
        const dishIdStr = dish._id.toString();
        const dishName = dish.name;

        // Match orders by dishId AND name
        const matchingOrders = allCompletedOrders.filter(order => {
          const itemDishId = order.item?.dishId?.toString();
          const itemName = order.item?.name;
          const directDishId = order.dish?.toString();

          return (
            itemDishId === dishIdStr ||
            directDishId === dishIdStr ||
            itemName === dishName
          );
        });

        const orderCount = matchingOrders.length;
        const revenue = matchingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        if (orderCount > 0) {
          console.log(`  🍽️  ${dishName}: ${orderCount} orders, ₹${revenue.toFixed(2)}`);
        }

        return {
          _id: dish._id,
          name: dishName,
          orders: orderCount,
          revenue: Math.round(revenue * 100) / 100,
          rating: dish.rating?.average || 0,
          views: dish.viewCount || 0
        };
      });

      // Sort by orders, revenue, views
      const topDishes = dishStats
        .sort((a, b) => {
          if (b.orders !== a.orders) return b.orders - a.orders;
          if (b.revenue !== a.revenue) return b.revenue - a.revenue;
          return b.views - a.views;
        })
        .slice(0, 5);

      console.log(`✅ Top ${topDishes.length} dishes calculated`);

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

      const customerEmails = new Set(orders.map(o => o.customerEmail));
      const total = customerEmails.size;

      const allOrders = await Order.find({
        seller: sellerObjectId
      }).lean();

      const customerOrderCounts = {};
      allOrders.forEach(order => {
        const email = order.customerEmail;
        customerOrderCounts[email] = (customerOrderCounts[email] || 0) + 1;
      });

      const newCustomers = orders.filter(order => {
        const previousOrders = allOrders.filter(o => 
          o.customerEmail === order.customerEmail && 
          o.createdAt < startDate
        );
        return previousOrders.length === 0;
      });

      const newCustomerCount = new Set(newCustomers.map(o => o.customerEmail)).size;

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
      return { total: 0, new: 0, repeat: 0, repeatRate: 0 };
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

      const acceptedStatuses = ['seller_accepted', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const acceptedOrders = orders.filter(o => acceptedStatuses.includes(o.orderStatus)).length;
      const acceptanceRate = totalOrders > 0 ? (acceptedOrders / totalOrders) * 100 : 100;

      const cancelledStatuses = ['cancelled', 'seller_rejected'];
      const cancelledOrders = orders.filter(o => cancelledStatuses.includes(o.orderStatus)).length;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      const deliveredOrders = orders.filter(o => o.actualDeliveryTime && o.createdAt);
      const avgPrepTime = deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, o) => {
            const prepTime = (new Date(o.actualDeliveryTime) - new Date(o.createdAt)) / 60000;
            return sum + Math.min(prepTime, 120);
          }, 0) / deliveredOrders.length
        : 25;

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

      const hourCounts = Array(24).fill(0);
      orders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourCounts[hour]++;
      });

      const maxOrders = Math.max(...hourCounts);
      const peakHour = hourCounts.indexOf(maxOrders);
      const peakEndHour = (peakHour + 2) % 24;
      const peakHours = `${peakHour}:00 - ${peakEndHour}:00`;

      const dishes = await Dish.find({
        seller: sellerObjectId,
        isActive: true
      }).lean();

      const categoryCounts = {};
      dishes.forEach(dish => {
        categoryCounts[dish.category] = (categoryCounts[dish.category] || 0) + 1;
      });

      const topCategory = Object.keys(categoryCounts).length > 0
        ? Object.keys(categoryCounts).reduce((a, b) => 
            categoryCounts[a] > categoryCounts[b] ? a : b
          )
        : 'Main Course';

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

  aggregateByDate(orders, field, startDate, endDate) {
    const dateMap = new Map();
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    orders.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, dateMap.get(dateKey) + (order[field] || 0));
      }
    });

    return Array.from(dateMap.entries()).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(value * 100) / 100
    }));
  }

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

const analyticsController = new SellerAnalyticsController();
export default analyticsController;
export const { getAnalytics } = analyticsController;
