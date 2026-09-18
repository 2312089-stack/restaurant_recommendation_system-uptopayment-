// middleware/sellerAuthMiddleware.js - Guards /api/seller routes
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';
import Seller from '../models/Seller.js';

export const authenticateSeller = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Seller authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Seller token missing' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    if (decoded.role !== 'seller') {
      return res.status(403).json({ success: false, error: 'Seller access required' });
    }

    const seller = await Seller.findById(decoded.id || decoded.sellerId);
    if (!seller || !seller.isActive) {
      return res.status(401).json({ success: false, error: 'Seller account not found' });
    }

    req.seller = seller;
    next();
  } catch (error) {
    console.error('Seller Auth Middleware Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Seller session expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid seller token' });
  }
};

export default authenticateSeller;