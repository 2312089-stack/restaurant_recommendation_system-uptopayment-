// controllers/settlementController.js - COMPLETE FIXED VERSION
import Order from '../models/Order.js';

class SettlementController {
  
  // Get settlement dashboard data with ALL completed payments (Razorpay + COD)
  getSettlementDashboard = async (req, res) => {
    try {
      const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'Seller authentication required'
        });
      }
      
      console.log('\n📊 ========== SETTLEMENT DASHBOARD ==========');
      console.log('Seller ID:', sellerId);

      // Get date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // ✅ CORRECT QUERY: Use $and to combine multiple $or conditions
      const query = {
        $and: [
          // Seller match
          {
            $or: [
              { seller: sellerId },
              { restaurantId: sellerId }
            ]
          },
          // Payment completion match
          {
            $or: [
              // Online payments that are completed
              { 
                paymentMethod: 'razorpay',
                paymentStatus: 'completed'
              },
              // COD orders that are delivered (payment collected on delivery)
              { 
                paymentMethod: 'cod',
                orderStatus: { $in: ['delivered', 'completed'] }
              }
            ]
          }
        ]
      };

      console.log('\n🔍 Settlement Query:', JSON.stringify(query, null, 2));

      // Fetch all completed orders (including delivered COD)
      const completedOrders = await Order.find(query).sort({ createdAt: -1 });

      console.log('\n📊 Query Results:');
      console.log(`   ✅ Total Orders Found: ${completedOrders.length}`);

      if (completedOrders.length === 0) {
        console.log('   ⚠️ No completed orders found for this seller');
        
        // Debug: Check if seller has any orders at all
        const anyOrders = await Order.countDocuments({
          $or: [
            { seller: sellerId },
            { restaurantId: sellerId }
          ]
        });
        console.log(`   📦 Total seller orders (any status): ${anyOrders}`);
      }

      // Calculate totals by payment method
      const razorpayOrders = completedOrders.filter(o => o.paymentMethod === 'razorpay');
      const codOrders = completedOrders.filter(o => o.paymentMethod === 'cod');

      console.log(`   💳 Razorpay Orders: ${razorpayOrders.length}`);
      console.log(`   💵 COD Orders: ${codOrders.length}`);

      const razorpayTotal = razorpayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const codTotal = codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      console.log(`   💳 Razorpay Total: ₹${razorpayTotal.toFixed(2)}`);
      console.log(`   💵 COD Total: ₹${codTotal.toFixed(2)}`);
      console.log('========================================\n');

      // Current week settlement (last 7 days)
     const weekOrders = completedOrders; // Show all completed orders
const weekRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Tax calculations
      const platformFeeRate = 0.05; // 5%
      const tcsRate = 0.01; // 1%
      const tdsRate = 0.02; // 2%
      
      const serviceFees = weekRevenue * platformFeeRate;
      const tcs = weekRevenue * tcsRate;
      const tds = weekRevenue * tdsRate;
      const netSettlement = weekRevenue - serviceFees - tcs - tds;

      // Past settlements (group by week)
      const pastSettlements = this.calculatePastSettlements(completedOrders);

      // Daily settlements for current month
      const dailySettlements = this.calculateDailySettlements(completedOrders, monthStart);

      res.json({
        success: true,
        data: {
          summary: {
            totalOrdersCount: completedOrders.length,
            razorpayOrdersCount: razorpayOrders.length,
            codOrdersCount: codOrders.length,
            razorpayAmount: Math.round(razorpayTotal * 100) / 100,
            codAmount: Math.round(codTotal * 100) / 100
          },
          
          currentWeek: {
            totalRevenue: Math.round(weekRevenue * 100) / 100,
            serviceFees: Math.round(serviceFees * 100) / 100,
            tcs: Math.round(tcs * 100) / 100,
            tds: Math.round(tds * 100) / 100,
            tdsDeductions: Math.round(tds * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
            orderCount: weekOrders.length
          },
          
          pastSettlements: pastSettlements,
          dailySettlements: dailySettlements,
          
          recentOrders: weekOrders.slice(0, 10).map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            amount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            status: order.orderStatus,
            customerName: order.customerName
          }))
        }
      });

    } catch (error) {
      console.error('\n❌ ========== SETTLEMENT ERROR ==========');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('========================================\n');
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settlement data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Calculate daily settlements with order details (INCLUDING COD)
  calculateDailySettlements(orders, startDate) {
    const dailyData = {};
    const platformFeeRate = 0.05;
    const tcsRate = 0.01;
    const tdsRate = 0.02;

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= startDate) {
        const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = {
            date: dateKey,
            revenue: 0,
            serviceFees: 0,
            tcs: 0,
            tds: 0,
            netSettlement: 0,
            orderCount: 0,
            razorpayCount: 0,
            codCount: 0,
            orders: []
          };
        }
        
        const revenue = order.totalAmount || 0;
        dailyData[dateKey].revenue += revenue;
        dailyData[dateKey].serviceFees += revenue * platformFeeRate;
        dailyData[dateKey].tcs += revenue * tcsRate;
        dailyData[dateKey].tds += revenue * tdsRate;
        dailyData[dateKey].orderCount += 1;
        
        if (order.paymentMethod === 'razorpay') {
          dailyData[dateKey].razorpayCount += 1;
        } else if (order.paymentMethod === 'cod') {
          dailyData[dateKey].codCount += 1;
        }
        
        dailyData[dateKey].orders.push({
          orderId: order.orderId,
          customerName: order.customerName,
          amount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          time: order.createdAt
        });
      }
    });

    // Calculate net settlement for each day
    Object.keys(dailyData).forEach(key => {
      const day = dailyData[key];
      day.netSettlement = day.revenue - day.serviceFees - day.tcs - day.tds;
      
      // Round to 2 decimals
      day.revenue = Math.round(day.revenue * 100) / 100;
      day.serviceFees = Math.round(day.serviceFees * 100) / 100;
      day.tcs = Math.round(day.tcs * 100) / 100;
      day.tds = Math.round(day.tds * 100) / 100;
      day.netSettlement = Math.round(day.netSettlement * 100) / 100;
    });

    // Convert to array and sort by date (most recent first)
    return Object.values(dailyData).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }

  // Calculate past settlements grouped by week
  calculatePastSettlements(orders) {
    const settlements = {};
    const platformFeeRate = 0.05;
    const tcsRate = 0.01;
    const tdsRate = 0.02;

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const weekKey = this.getWeekKey(orderDate);
      
      if (!settlements[weekKey]) {
        settlements[weekKey] = {
          weekStart: this.getWeekStart(orderDate),
          weekEnd: this.getWeekEnd(orderDate),
          revenue: 0,
          serviceFees: 0,
          tcs: 0,
          tds: 0,
          netSettlement: 0,
          orderCount: 0
        };
      }
      
      const revenue = order.totalAmount || 0;
      settlements[weekKey].revenue += revenue;
      settlements[weekKey].serviceFees += revenue * platformFeeRate;
      settlements[weekKey].tcs += revenue * tcsRate;
      settlements[weekKey].tds += revenue * tdsRate;
      settlements[weekKey].orderCount += 1;
    });

    // Calculate net settlement for each week
    Object.keys(settlements).forEach(key => {
      const s = settlements[key];
      s.netSettlement = s.revenue - s.serviceFees - s.tcs - s.tds;
      
      // Round to 2 decimals
      s.revenue = Math.round(s.revenue * 100) / 100;
      s.serviceFees = Math.round(s.serviceFees * 100) / 100;
      s.tcs = Math.round(s.tcs * 100) / 100;
      s.tds = Math.round(s.tds * 100) / 100;
      s.netSettlement = Math.round(s.netSettlement * 100) / 100;
    });

    return Object.values(settlements).sort((a, b) => 
      new Date(b.weekStart) - new Date(a.weekStart)
    );
  }

  // Download daily settlement report (INCLUDING COD)
  downloadDailyReport = async (req, res) => {
    try {
      const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'Seller authentication required'
        });
      }

      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date parameter is required (format: YYYY-MM-DD)'
        });
      }

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // ✅ FIXED: Include both Razorpay and COD with proper structure
      const query = {
        $and: [
          {
            $or: [
              { seller: sellerId },
              { restaurantId: sellerId }
            ]
          },
          {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          },
          {
            $or: [
              { paymentMethod: 'razorpay', paymentStatus: 'completed' },
              { paymentMethod: 'cod', orderStatus: { $in: ['delivered', 'completed'] } }
            ]
          }
        ]
      };

      const orders = await Order.find(query).sort({ createdAt: 1 });

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No orders found for this date'
        });
      }

      // Calculate totals
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const platformFees = totalRevenue * 0.05;
      const tcs = totalRevenue * 0.01;
      const tds = totalRevenue * 0.02;
      const netAmount = totalRevenue - platformFees - tcs - tds;

      // Generate CSV
      const csvData = this.generateDailyCSV(orders, {
        date,
        totalRevenue,
        platformFees,
        tcs,
        tds,
        netAmount
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=settlement-${date}.csv`);
      res.send(csvData);

    } catch (error) {
      console.error('❌ Download daily report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Download settlement report (date range) - INCLUDING COD
  downloadSettlementReport = async (req, res) => {
    try {
      const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'Seller authentication required'
        });
      }

      const { startDate, endDate } = req.query;

      // ✅ FIXED: Proper query structure
      const query = {
        $and: [
          {
            $or: [
              { seller: sellerId },
              { restaurantId: sellerId }
            ]
          },
          {
            $or: [
              { paymentMethod: 'razorpay', paymentStatus: 'completed' },
              { paymentMethod: 'cod', orderStatus: { $in: ['delivered', 'completed'] } }
            ]
          }
        ]
      };

      if (startDate && endDate) {
        query.$and.push({
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        });
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });

      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const platformFees = totalRevenue * 0.05;
      const tcs = totalRevenue * 0.01;
      const tds = totalRevenue * 0.02;
      const netAmount = totalRevenue - platformFees - tcs - tds;

      const csvData = this.generateCSV(orders, {
        totalRevenue,
        platformFees,
        tcs,
        tds,
        netAmount
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=settlement-report-${Date.now()}.csv`);
      res.send(csvData);

    } catch (error) {
      console.error('❌ Download report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Generate daily CSV
  generateDailyCSV(orders, totals) {
    let csv = `Daily Settlement Report - ${totals.date}\n\n`;
    csv += 'Time,Order ID,Customer,Item,Amount (₹),Payment Method,Status\n';
    
    orders.forEach(order => {
      const time = new Date(order.createdAt).toLocaleTimeString();
      const itemName = order.item?.name || order.dish?.name || 'N/A';
      const paymentMethod = order.paymentMethod === 'razorpay' ? 'Online' : 'COD';
      csv += `${time},${order.orderId},${order.customerName || 'N/A'},${itemName},${order.totalAmount},${paymentMethod},${order.orderStatus}\n`;
    });

    csv += '\n\nDaily Summary\n';
    csv += `Date,${totals.date}\n`;
    csv += `Total Orders,${orders.length}\n`;
    csv += `Razorpay Orders,${orders.filter(o => o.paymentMethod === 'razorpay').length}\n`;
    csv += `COD Orders,${orders.filter(o => o.paymentMethod === 'cod').length}\n`;
    csv += `Total Revenue,₹${totals.totalRevenue.toFixed(2)}\n`;
    csv += `Platform Fees (5%),₹${totals.platformFees.toFixed(2)}\n`;
    csv += `TCS (1%),₹${totals.tcs.toFixed(2)}\n`;
    csv += `TDS (2%),₹${totals.tds.toFixed(2)}\n`;
    csv += `Net Settlement,₹${totals.netAmount.toFixed(2)}\n`;

    return csv;
  }

  // Generate CSV for report
  generateCSV(orders, totals) {
    let csv = 'Settlement Report\n\n';
    csv += 'Order ID,Date,Customer,Amount (₹),Payment Method,Status\n';
    
    orders.forEach(order => {
      const paymentMethod = order.paymentMethod === 'razorpay' ? 'Online' : 'COD';
      csv += `${order.orderId},${new Date(order.createdAt).toLocaleString()},${order.customerName},₹${order.totalAmount},${paymentMethod},${order.orderStatus}\n`;
    });

    csv += '\n\nSummary\n';
    csv += `Total Orders,${orders.length}\n`;
    csv += `Razorpay Orders,${orders.filter(o => o.paymentMethod === 'razorpay').length}\n`;
    csv += `COD Orders,${orders.filter(o => o.paymentMethod === 'cod').length}\n`;
    csv += `Total Revenue,₹${totals.totalRevenue.toFixed(2)}\n`;
    csv += `Platform Fees (5%),₹${totals.platformFees.toFixed(2)}\n`;
    csv += `TCS (1%),₹${totals.tcs.toFixed(2)}\n`;
    csv += `TDS (2%),₹${totals.tds.toFixed(2)}\n`;
    csv += `Net Settlement,₹${totals.netAmount.toFixed(2)}\n`;

    return csv;
  }

  // Helper functions
  getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  getWeekEnd(date) {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }
}

const settlementController = new SettlementController();

export default settlementController;
export const getSettlementDashboard = settlementController.getSettlementDashboard;
export const downloadSettlementReport = settlementController.downloadSettlementReport;
export const downloadDailyReport = settlementController.downloadDailyReport;