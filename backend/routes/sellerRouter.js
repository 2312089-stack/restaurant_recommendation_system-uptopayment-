// routes/sellerRouter.js - Seller portal API (auth, business setup, menu, orders)
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import Order from '../models/Order.js';
import { getJwtSecret } from '../config/env.js';
import { authenticateSeller } from '../middleware/sellerAuthMiddleware.js';

const router = express.Router();

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const publicSellerShape = (seller) => ({
  id: seller._id,
  email: seller.email,
  businessName: seller.businessName,
  businessType: seller.businessType,
  phone: seller.phone,
  isVerified: seller.isVerified,
  onboardingCompleted: seller.onboardingCompleted,
  isOnline: seller.isOnline,
  dashboardStatus: seller.dashboardStatus,
  isActive: seller.isActive
});

// ---------------------------------------------------------------------------
// OTP - returns the OTP to the client (demo-friendly, mirrors existing flow)
// ---------------------------------------------------------------------------

router.post('/otp/send', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const otp = generateOtp();

    let seller = await Seller.findOne({ email: String(email).toLowerCase().trim() });
    if (seller) {
      seller.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), isUsed: false };
      await seller.save();
    }

    return res.json({ success: true, otp });
  } catch (error) {
    console.error('Seller OTP send error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Seller.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await Seller.create({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      businessName: normalizedEmail.split('@')[0],
      businessType: 'Restaurant',
      phone: '0000000000'
    });

    return res.status(201).json({ success: true, seller: { id: seller._id, email: seller.email } });
  } catch (error) {
    console.error('Seller register error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to create seller account' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const seller = await Seller.findOne({ email: String(email).toLowerCase().trim() });
    if (!seller || !seller.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const matches = await seller.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: seller._id, email: seller.email, role: 'seller' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    seller.lastLogin = new Date();
    seller.lastActive = new Date();
    await seller.save();

    return res.json({ success: true, token, seller: publicSellerShape(seller) });
  } catch (error) {
    console.error('Seller login error:', error.message);
    return res.status(500).json({ success: false, error: 'Seller login failed' });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const seller = await Seller.findOne({ email: String(email).toLowerCase().trim() });
    if (!seller) {
      return res.status(404).json({ success: false, error: 'No seller account found with this email' });
    }

    const token = jwt.sign({ id: seller._id, role: 'seller', purpose: 'password-reset' }, getJwtSecret(), { expiresIn: '15m' });
    seller.passwordResetToken = token;
    seller.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await seller.save();

    return res.json({
      success: true,
      message: `Password reset instructions sent to ${seller.email}`,
      resetToken: token
    });
  } catch (error) {
    console.error('Seller forgot password error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to process password reset' });
  }
});

// ---------------------------------------------------------------------------
// Business setup & profile
// ---------------------------------------------------------------------------

router.put('/:sellerId/business-setup', authenticateSeller, async (req, res) => {
  try {
    if (String(req.params.sellerId) !== String(req.seller._id)) {
      return res.status(403).json({ success: false, error: 'Not allowed to modify this account' });
    }

    const {
      businessName,
      ownerName,
      phone,
      businessType,
      businessAddress,
      businessDescription,
      cuisineTypes,
      serviceTypes,
      businessLicense,
      operatingHours
    } = req.body || {};

    const seller = req.seller;

    if (businessName) seller.businessName = String(businessName).trim();
    if (phone) seller.phone = String(phone).trim();

    const typeMap = {
      restaurant: 'Restaurant',
      hotel: 'Restaurant',
      both: 'Restaurant'
    };
    if (businessType) seller.businessType = typeMap[businessType] || 'Restaurant';

    if (businessAddress) seller.address.street = String(businessAddress).trim();
    if (ownerName) seller.businessDetails.ownerName = String(ownerName).trim();
    if (businessDescription) seller.businessDetails.description = String(businessDescription).trim();
    if (Array.isArray(cuisineTypes) && cuisineTypes.length > 0) seller.businessDetails.cuisine = cuisineTypes;
    if (Array.isArray(serviceTypes) && serviceTypes.length > 0) {
      seller.businessDetails.servicesOffered = serviceTypes.filter((s) =>
        ['Dine-in', 'Takeaway', 'Delivery', 'Catering', 'Online Ordering'].includes(s)
      );
    }
    if (businessLicense) seller.businessDetails.documents.businessLicense = String(businessLicense).trim();

    if (operatingHours && typeof operatingHours === 'object') {
      const dayMap = {
        monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday',
        friday: 'friday', saturday: 'saturday', sunday: 'sunday'
      };
      Object.keys(dayMap).forEach((day) => {
        const entry = operatingHours[day];
        if (!entry) return;
        seller.businessDetails.openingHours[dayMap[day]] = {
          open: entry.open || '09:00',
          close: entry.close || '22:00',
          closed: Boolean(entry.isClosed)
        };
      });
    }

    seller.onboardingCompleted = true;
    await seller.save();

    return res.json({ success: true, seller: publicSellerShape(seller) });
  } catch (error) {
    console.error('Seller business setup error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save business info' });
  }
});

router.get('/profile', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id);
    return res.json({ success: true, seller: publicSellerShape(seller), full: seller });
  } catch (error) {
    console.error('Seller profile error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

router.put('/profile', authenticateSeller, async (req, res) => {
  try {
    const { businessName, phone, ownerName, description, cuisine, priceRange } = req.body || {};
    const seller = req.seller;

    if (businessName) seller.businessName = String(businessName).trim();
    if (phone) seller.phone = String(phone).trim();
    if (ownerName) seller.businessDetails.ownerName = String(ownerName).trim();
    if (description) seller.businessDetails.description = String(description).trim();
    if (Array.isArray(cuisine)) seller.businessDetails.cuisine = cuisine;
    if (priceRange && ['budget', 'mid-range', 'premium'].includes(priceRange)) {
      seller.businessDetails.priceRange = priceRange;
    }

    await seller.save();
    return res.json({ success: true, seller: publicSellerShape(seller) });
  } catch (error) {
    console.error('Seller profile update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

router.put('/status', authenticateSeller, async (req, res) => {
  try {
    const { isOnline, dashboardStatus } = req.body || {};
    const seller = req.seller;

    if (typeof isOnline === 'boolean') seller.isOnline = isOnline;
    if (dashboardStatus && ['online', 'offline', 'busy'].includes(dashboardStatus)) {
      seller.dashboardStatus = dashboardStatus;
    } else {
      seller.dashboardStatus = seller.isOnline ? 'online' : 'offline';
    }
    seller.lastActive = new Date();

    await seller.save();
    return res.json({ success: true, seller: publicSellerShape(seller) });
  } catch (error) {
    console.error('Seller status error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

router.get('/dashboard', authenticateSeller, async (req, res) => {
  try {
    const seller = req.seller;
    const sellerId = seller._id;

    const [dishCount, orderCountAgg, activeOrders, dishStats] = await Promise.all([
      Dish.countDocuments({ $or: [{ seller: sellerId }, { restaurantId: sellerId }] }),
      Order.aggregate([
        { $match: { 'item.restaurant': seller.businessName } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ 'item.restaurant': seller.businessName, orderStatus: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] } }),
      Dish.aggregate([
        { $match: { $or: [{ seller: sellerId }, { restaurantId: sellerId }] } },
        { $group: { _id: null, avgOrderCount: { $sum: '$orderCount' } } }
      ])
    ]);

    const recentOrders = await Order.find({ 'item.restaurant': seller.businessName })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      stats: {
        dishes: dishCount,
        orders: orderCountAgg[0]?.count || 0,
        revenue: orderCountAgg[0]?.revenue || 0,
        activeOrders,
        totalDishOrders: dishStats[0]?.avgOrderCount || 0
      },
      recentOrders
    });
  } catch (error) {
    console.error('Seller dashboard error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// ---------------------------------------------------------------------------
// Menu / dishes
// ---------------------------------------------------------------------------

router.get('/menu/dishes', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const dishes = await Dish.find({ $or: [{ seller: sellerId }, { restaurantId: sellerId }] })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, dishes });
  } catch (error) {
    console.error('Seller dishes error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load menu' });
  }
});

router.post('/menu/dish', authenticateSeller, async (req, res) => {
  try {
    const seller = req.seller;
    const { name, description, price, category, type, preparationTime, availability, image } = req.body || {};

    if (!name || !price || !category || !type) {
      return res.status(400).json({ success: false, error: 'Name, price, category and type are required' });
    }

    const dish = await Dish.create({
      name,
      description: description || '',
      price: Number(price),
      category,
      type,
      preparationTime: preparationTime || 30,
      availability: availability !== false,
      image: image || null,
      seller: seller._id,
      restaurantId: seller._id,
      sellerName: seller.businessName,
      restaurantName: seller.businessName
    });

    return res.status(201).json({ success: true, dish });
  } catch (error) {
    console.error('Seller create dish error:', error.message);
    return res.status(500).json({ success: false, error: error.message.includes('valid category')
      ? 'Please choose a valid category/type'
      : 'Failed to add dish' });
  }
});

router.put('/menu/dish/:dishId', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { name, description, price, category, type, preparationTime, availability, image } = req.body || {};

    const dish = await Dish.findOne({
      _id: req.params.dishId,
      $or: [{ seller: sellerId }, { restaurantId: sellerId }]
    });

    if (!dish) {
      return res.status(404).json({ success: false, error: 'Dish not found' });
    }

    dish.name = name || dish.name;
    dish.description = description !== undefined && description !== null ? description : dish.description;
    dish.price = price !== undefined && price !== null ? Number(price) : dish.price;
    dish.category = category || dish.category;
    dish.type = type || dish.type;
    dish.preparationTime = preparationTime || dish.preparationTime;
    dish.availability = availability !== undefined ? availability : dish.availability;
    dish.image = image !== undefined ? image : dish.image;

    await dish.save();
    return res.json({ success: true, dish });
  } catch (error) {
    console.error('Seller update dish error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update dish' });
  }
});

router.delete('/menu/dish/:dishId', authenticateSeller, async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const dish = await Dish.findOneAndDelete({
      _id: req.params.dishId,
      $or: [{ seller: sellerId }, { restaurantId: sellerId }]
    });

    if (!dish) {
      return res.status(404).json({ success: false, error: 'Dish not found' });
    }

    return res.json({ success: true, message: 'Dish deleted' });
  } catch (error) {
    console.error('Seller delete dish error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete dish' });
  }
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

router.get('/orders', authenticateSeller, async (req, res) => {
  try {
    const seller = req.seller;
    const { status } = req.query;

    const query = { 'item.restaurant': seller.businessName };
    if (status && status !== 'all') query.orderStatus = status;

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, orders });
  } catch (error) {
    console.error('Seller orders error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
});

router.patch('/orders/:orderId/status', authenticateSeller, async (req, res) => {
  try {
    const seller = req.seller;
    const { orderStatus } = req.body || {};

    const valid = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!valid.includes(orderStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid order status' });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      'item.restaurant': seller.businessName
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await order.updateStatus(orderStatus);
    return res.json({ success: true, order });
  } catch (error) {
    console.error('Seller order status error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

export default router;