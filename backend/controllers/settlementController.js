// controllers/settlementController.js - FIXED VERSION
// Calculates payments and settlements from Order data
import Order from '../models/Order.js';

class SettlementController {
  
  // Get settlement dashboard data
  getSettlementDashboard = async (req, res) => {
    try {
      // ✅ FIX: Use req.seller instead of req.user
      const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'Seller authentication required'
        });
      }
      
      console.log('📊 Fetching settlement data for seller:', sellerId);

      // Get date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // ✅ FIX: Query using both possible seller field names
      const query = {
        $or: [
          { seller: sellerId },
          { restaurantId: sellerId }
        ],
        orderStatus: { $in: ['delivered', 'completed'] },
        paymentStatus: 'completed'
      };

      // Fetch all completed orders for this seller
      const completedOrders = await Order.find(query).sort({ createdAt: -1 });

      console.log(`✅ Found ${completedOrders.length} completed orders`);

      // Calculate totals by payment method
      const razorpayOrders = completedOrders.filter(o => o.paymentMethod === 'razorpay');
      const codOrders = completedOrders.filter(o => o.paymentMethod === 'cod');

      const razorpayTotal = razorpayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const codTotal = codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Current week settlement
      const weekOrders = completedOrders.filter(o => new Date(o.createdAt) >= weekStart);
      const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Platform fees (5% of revenue)
      const platformFeeRate = 0.05;
      const serviceFees = weekRevenue * platformFeeRate;
      
      // TCS (Tax Collected at Source) - 1% 
      const tcsRate = 0.01;
      const tcs = weekRevenue * tcsRate;
      
      // TDS (Tax Deducted at Source) - 2%
      const tdsRate = 0.02;
      const tds = weekRevenue * tdsRate;
      
      // TDS Deductions
      const tdsDeductions = tds;
      
      // Net settlement = Revenue - Platform Fee - TCS - TDS
      const netSettlement = weekRevenue - serviceFees - tcs - tds;

      // Past settlements (group by week)
      const pastSettlements = this.calculatePastSettlements(completedOrders);

      res.json({
        success: true,
        data: {
          // Summary cards
          summary: {
            totalOrdersCount: completedOrders.length,
            razorpayOrdersCount: razorpayOrders.length,
            codOrdersCount: codOrders.length,
            razorpayAmount: Math.round(razorpayTotal * 100) / 100,
            codAmount: Math.round(codTotal * 100) / 100
          },
          
          // Current week settlement
          currentWeek: {
            totalRevenue: Math.round(weekRevenue * 100) / 100,
            serviceFees: Math.round(serviceFees * 100) / 100,
            tcs: Math.round(tcs * 100) / 100,
            tds: Math.round(tds * 100) / 100,
            tdsDeductions: Math.round(tdsDeductions * 100) / 100,
            netSettlement: Math.round(netSettlement * 100) / 100,
            orderCount: weekOrders.length
          },
          
          // Past settlements
          pastSettlements: pastSettlements,
          
          // Raw order data for detailed view
          recentOrders: weekOrders.slice(0, 10).map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            amount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            status: order.orderStatus
          }))
        }
      });

    } catch (error) {
      console.error('❌ Settlement dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settlement data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

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

    // Convert to array and sort by date (most recent first)
    return Object.values(settlements).sort((a, b) => 
      new Date(b.weekStart) - new Date(a.weekStart)
    );
  }

  // Helper to get week key (YYYY-WW format)
  getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  }

  // Get week number
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Get start of week (Monday)
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Get end of week (Sunday)
  getWeekEnd(date) {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  // Download settlement report
  downloadSettlementReport = async (req, res) => {
    try {
      // ✅ FIX: Use req.seller instead of req.user
      const sellerId = req.seller.id || req.seller._id || req.seller.sellerId;
      
      if (!sellerId) {
        return res.status(401).json({
          success: false,
          error: 'Seller authentication required'
        });
      }

      const { startDate, endDate } = req.query;

      const query = {
        $or: [
          { seller: sellerId },
          { restaurantId: sellerId }
        ],
        orderStatus: { $in: ['delivered', 'completed'] },
        paymentStatus: 'completed'
      };

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });

      // Calculate totals
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const platformFees = totalRevenue * 0.05;
      const tcs = totalRevenue * 0.01;
      const tds = totalRevenue * 0.02;
      const netAmount = totalRevenue - platformFees - tcs - tds;

      // Generate CSV
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

  // Generate CSV for report
  generateCSV(orders, totals) {
    let csv = 'Order ID,Date,Customer,Amount,Payment Method,Status\n';
    
    orders.forEach(order => {
      csv += `${order.orderId},${new Date(order.createdAt).toLocaleString()},${order.customerName},₹${order.totalAmount},${order.paymentMethod},${order.orderStatus}\n`;
    });

    csv += '\n\nSummary\n';
    csv += `Total Revenue,₹${totals.totalRevenue.toFixed(2)}\n`;
    csv += `Platform Fees (5%),₹${totals.platformFees.toFixed(2)}\n`;
    csv += `TCS (1%),₹${totals.tcs.toFixed(2)}\n`;
    csv += `TDS (2%),₹${totals.tds.toFixed(2)}\n`;
    csv += `Net Settlement,₹${totals.netAmount.toFixed(2)}\n`;

    return csv;
  }
}

const settlementController = new SettlementController();

export default settlementController;
export const getSettlementDashboard = settlementController.getSettlementDashboard;
export const downloadSettlementReport = settlementController.downloadSettlementReport;