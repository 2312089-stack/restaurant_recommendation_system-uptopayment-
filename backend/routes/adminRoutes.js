// routes/adminRoutes.js - Platform admin API consumed by the admin panel
import express from 'express';
import jwt from 'jsonwebtoken';

import Admin from '../models/Admin.js';
import Dish from '../models/Dish.js';
import Order from '../models/Order.js';
import Seller from '../models/Seller.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import { getJwtSecret } from '../config/env.js';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

const VALID_ORDER_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const startOfPeriod = (period) => {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'month':
    default:
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return start;
};

const hasBankDetails = (seller) => Boolean(
  seller &&
  seller.bankDetails &&
  (seller.bankDetails.accountNumber || seller.bankDetails.bankName)
);

const shapeBankSeller = (seller) => ({
  id: seller._id,
  businessName: seller.businessName || 'Unnamed restaurant',
  email: seller.email || '',
  ownerName: (seller.businessDetails && seller.businessDetails.ownerName) || '',
  phone: seller.phone || '',
  registeredAt: seller.createdAt,
  bankDetails: hasBankDetails(seller)
    ? {
        bankName: seller.bankDetails.bankName || '',
        accountNumber: seller.bankDetails.accountNumber || '',
        ifscCode: seller.bankDetails.ifscCode || '',
        accountHolderName: seller.bankDetails.accountHolderName || '',
        branchName: seller.bankDetails.branchName || '',
        isVerified: Boolean(seller.bankDetails.isVerified),
        verifiedAt: seller.bankDetails.verifiedAt || null,
        verificationNotes: seller.bankDetails.verificationNotes || ''
      }
    : null
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const admin = await Admin.findByEmailWithPassword(email);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const matches = await admin.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const secret = process.env.ADMIN_JWT_SECRET || getJwtSecret();
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      secret,
      { expiresIn: '7d' }
    );

    admin.lastLogin = new Date();
    await admin.save();

    return res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    return res.status(500).json({ success: false, error: 'Admin login failed' });
  }
});

router.get('/test', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin authenticated',
    admin: { id: req.admin._id, name: req.admin.name, email: req.admin.email }
  });
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

router.get('/analytics/system-stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalUsers, totalRestaurants, totalOrders, activeOrders, totalDishes] = await Promise.all([
      User.countDocuments(),
      Seller.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: { $nin: ['delivered', 'cancelled'] } }),
      Dish.countDocuments()
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalRestaurants, totalOrders, activeOrders, totalDishes }
    });
  } catch (error) {
    console.error('system-stats error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load system stats' });
  }
});

router.get('/analytics/:type', authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const period = req.query.period || 'month';
    const from = startOfPeriod(period);
    const match = { createdAt: { $gte: from } };

    if (type === 'revenue') {
      const [summary] = await Order.aggregate([
        { $match: { ...match, paymentStatus: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 } } }
      ]);

      const dailyRevenue = await Order.aggregate([
        { $match: { ...match, paymentStatus: 'completed' } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      return res.json({
        success: true,
        analytics: {
          period,
          summary: {
            totalRevenue: summary?.totalRevenue || 0,
            totalOrders: summary?.totalOrders || 0
          },
          dailyRevenue
        }
      });
    }

    if (type === 'users') {
      const [totalUsers, newUsers, activeUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments(match),
        User.countDocuments({ ...match, isActive: true })
      ]);

      return res.json({
        success: true,
        analytics: {
          period,
          totalUsers,
          newUsers,
          activeUsers: { activeUserCount: activeUsers }
        }
      });
    }

    if (type === 'orders') {
      const [summary] = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } }
          }
        }
      ]);

      const byStatus = await Order.aggregate([
        { $match: match },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return res.json({
        success: true,
        analytics: {
          period,
          summary: {
            totalOrders: summary?.totalOrders || 0,
            totalRevenue: summary?.totalRevenue || 0,
            delivered: summary?.delivered || 0,
            cancelled: summary?.cancelled || 0
          },
          byStatus
        }
      });
    }

    if (type === 'restaurants') {
      const [totalRestaurants, verified, active] = await Promise.all([
        Seller.countDocuments(),
        Seller.countDocuments({ isVerified: true }),
        Seller.countDocuments({ isActive: true })
      ]);

      return res.json({
        success: true,
        analytics: {
          period,
          totalRestaurants,
          verified,
          pending: Math.max(totalRestaurants - verified, 0),
          active
        }
      });
    }

    return res.status(400).json({ success: false, error: `Unknown analytics type: ${type}` });
  } catch (error) {
    console.error('analytics error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load analytics' });
  }
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();

    const spend = await Order.aggregate([
      { $match: { customerEmail: { $nin: [null, ''] } } },
      {
        $group: {
          _id: { $toLower: '$customerEmail' },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      }
    ]);

    const spendByEmail = new Map(spend.map((entry) => [entry._id, entry]));

    const shaped = users.map((user) => {
      const entry = spendByEmail.get(String(user.emailId || '').toLowerCase());
      return {
        _id: user._id,
        name: user.name || 'Unnamed user',
        emailId: user.emailId,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        orderCount: entry?.orderCount || 0,
        totalSpent: entry?.totalSpent || 0
      };
    });

    res.json({ success: true, users: shaped });
  } catch (error) {
    console.error('admin users error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load users' });
  }
});

router.post('/users/:userId/block', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User blocked', user: { _id: user._id, isActive: user.isActive } });
  } catch (error) {
    console.error('block user error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
});

router.post('/users/:userId/unblock', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User unblocked', user: { _id: user._id, isActive: user.isActive } });
  } catch (error) {
    console.error('unblock user error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
});

// ---------------------------------------------------------------------------
// Restaurants / sellers
// ---------------------------------------------------------------------------

router.get('/restaurants', authenticateAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find()
      .select('businessName email phone isVerified isActive metrics createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const orderStats = await Order.aggregate([
      { $match: { 'item.restaurant': { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$item.restaurant',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const statsByName = new Map(orderStats.map((entry) => [String(entry._id).toLowerCase(), entry]));

    const restaurants = sellers.map((seller) => {
      const live = statsByName.get(String(seller.businessName || '').toLowerCase());
      return {
        _id: seller._id,
        businessName: seller.businessName || 'Unnamed restaurant',
        email: seller.email || '',
        phone: seller.phone || '',
        isVerified: Boolean(seller.isVerified),
        isActive: seller.isActive !== false,
        createdAt: seller.createdAt,
        stats: {
          orderCount: live?.orderCount ?? seller.metrics?.totalOrders ?? 0,
          totalRevenue: live?.totalRevenue ?? seller.metrics?.totalRevenue ?? 0
        }
      };
    });

    res.json({ success: true, restaurants });
  } catch (error) {
    console.error('admin restaurants error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load restaurants' });
  }
});

router.post('/restaurants/:sellerId/approve', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.sellerId,
      { isVerified: true, isActive: true },
      { new: true }
    ).select('businessName email isVerified isActive');

    if (!seller) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    res.json({ success: true, message: 'Restaurant approved', restaurant: seller });
  } catch (error) {
    console.error('approve restaurant error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to approve restaurant' });
  }
});

router.post('/restaurants/:sellerId/reject', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.sellerId,
      { isVerified: false },
      { new: true }
    ).select('businessName email isVerified isActive');

    if (!seller) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    res.json({ success: true, message: 'Restaurant rejected', restaurant: seller });
  } catch (error) {
    console.error('reject restaurant error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to reject restaurant' });
  }
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(500).lean();

    const sellers = await Seller.find().select('businessName').lean();
    const sellerByName = new Map(
      sellers.map((seller) => [String(seller.businessName || '').toLowerCase(), seller])
    );

    const shaped = orders.map((order) => {
      const seller = order.item?.restaurant
        ? sellerByName.get(String(order.item.restaurant).toLowerCase())
        : null;

      return {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        item: order.item,
        seller: seller ? { _id: seller._id, businessName: seller.businessName } : null,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt
      };
    });

    res.json({ success: true, orders: shaped });
  } catch (error) {
    console.error('admin orders error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
});

// ---------------------------------------------------------------------------
// Bank details
// ---------------------------------------------------------------------------

router.get('/bank-details/stats', authenticateAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find().select('bankDetails').lean();

    const totalSellers = sellers.length;
    const withDetails = sellers.filter(hasBankDetails);
    const verified = withDetails.filter((seller) => seller.bankDetails?.isVerified).length;

    res.json({
      success: true,
      stats: {
        totalSellers,
        totalWithBankDetails: withDetails.length,
        verified,
        pending: Math.max(withDetails.length - verified, 0)
      }
    });
  } catch (error) {
    console.error('bank stats error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load bank stats' });
  }
});

router.get('/bank-details', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const sellers = await Seller.find().sort({ createdAt: -1 }).lean();

    let shaped = sellers.map(shapeBankSeller);

    if (status === 'verified') {
      shaped = shaped.filter((seller) => seller.bankDetails?.isVerified);
    } else if (status === 'pending') {
      shaped = shaped.filter((seller) => seller.bankDetails && !seller.bankDetails.isVerified);
    }

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error('bank list error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load bank details' });
  }
});

router.get('/bank-details/:sellerId', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId).lean();
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, data: shapeBankSeller(seller) });
  } catch (error) {
    console.error('bank detail error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load bank details' });
  }
});

router.post('/bank-details/:sellerId/verify', authenticateAdmin, async (req, res) => {
  try {
    const { verified, notes } = req.body || {};
    const isVerified = Boolean(verified);

    const seller = await Seller.findByIdAndUpdate(
      req.params.sellerId,
      {
        $set: {
          'bankDetails.isVerified': isVerified,
          'bankDetails.verifiedAt': isVerified ? new Date() : null,
          'bankDetails.verificationNotes': notes || '',
          'bankDetails.updatedAt': new Date()
        }
      },
      { new: true }
    ).lean();

    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    res.json({ success: true, message: isVerified ? 'Bank details verified' : 'Bank details rejected', data: shapeBankSeller(seller) });
  } catch (error) {
    console.error('bank verify error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update bank details' });
  }
});

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

router.get('/support/stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalTickets, openTickets, inProgressTickets, ticketsWithResponses] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.find({ 'responses.0': { $exists: true } }).select('createdAt responses').lean()
    ]);

    let avgResponseTime = 0;
    if (ticketsWithResponses.length > 0) {
      const totalHours = ticketsWithResponses.reduce((sum, ticket) => {
        const first = ticket.responses?.[0];
        if (!first?.timestamp) return sum;
        const hours = (new Date(first.timestamp) - new Date(ticket.createdAt)) / (1000 * 60 * 60);
        return sum + Math.max(hours, 0);
      }, 0);
      avgResponseTime = Math.round((totalHours / ticketsWithResponses.length) * 10) / 10;
    }

    res.json({
      success: true,
      stats: { totalTickets, openTickets, inProgressTickets, avgResponseTime }
    });
  } catch (error) {
    console.error('support stats error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load support stats' });
  }
});

router.get('/support/tickets', authenticateAdmin, async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ subject: regex }, { description: regex }, { ticketId: regex }];
    }

    const tickets = await SupportTicket.find(filter)
      .populate('seller', 'businessName email phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, tickets, count: tickets.length });
  } catch (error) {
    console.error('support tickets error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load support tickets' });
  }
});

router.get('/support/tickets/:ticketId', authenticateAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const query = /^[0-9a-fA-F]{24}$/.test(ticketId)
      ? { $or: [{ ticketId }, { _id: ticketId }] }
      : { ticketId };

    const ticket = await SupportTicket.findOne(query)
      .populate('seller', 'businessName email phone')
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('support ticket error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load ticket' });
  }
});

router.patch('/support/tickets/:ticketId/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket status' });
    }

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId: req.params.ticketId },
      { status },
      { new: true }
    ).populate('seller', 'businessName email phone').lean();

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('support status error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update ticket status' });
  }
});

router.post('/support/tickets/:ticketId/response', authenticateAdmin, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Response message is required' });
    }

    const ticket = await SupportTicket.findOne({ ticketId: req.params.ticketId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    ticket.responses.push({
      respondedBy: 'admin',
      message: String(message).trim(),
      timestamp: new Date()
    });

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();
    await ticket.populate('seller', 'businessName email phone');

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('support response error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add response' });
  }
});

export default router;
