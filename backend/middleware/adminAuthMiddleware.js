// middleware/adminAuthMiddleware.js - Guards /api/admin routes
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';
import Admin from '../models/Admin.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Admin token missing' });
    }

    const secret = process.env.ADMIN_JWT_SECRET || getJwtSecret();
    const decoded = jwt.verify(token, secret);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id || decoded.adminId).select('-passwordHash');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, error: 'Admin account not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Admin session expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }
};

export default authenticateAdmin;
