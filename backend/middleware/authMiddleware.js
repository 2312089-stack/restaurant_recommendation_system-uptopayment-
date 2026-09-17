import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token missing' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    
    // Find the user to ensure they still exist and attach to request
    const user = await User.findById(decoded.id || decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.headers['x-access-token'];

    if (token) {
      try {
        const decoded = jwt.verify(token.trim(), getJwtSecret());
        const userId = decoded.id || decoded.userId || decoded.user?.id || decoded._id;

        if (userId) {
          const user = await User.findById(userId).select('-passwordHash');
          if (user) {
            req.user = user;
          }
        }
      } catch (error) {
        // Invalid token, continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};
