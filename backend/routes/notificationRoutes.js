// backend/routes/notificationRoutes.js
import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const count = await Notification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read'
    });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// Clear all notifications
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    await Notification.deleteMany({ userId });

    res.json({
      success: true,
      message: 'All notifications cleared'
    });

  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications'
    });
  }
});
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    console.log('🧪 Creating test notification for user:', userId);
    
    const notification = await Notification.create({
      userId,
      type: 'general',
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system works!',
      data: {
        test: true,
        timestamp: new Date(),
        actionUrl: '/discovery',
        priority: 'high'
      },
      priority: 'high'
    });

    // Emit via socket
    if (global.io) {
      global.io.to(userId.toString()).emit('new-notification', {
        notification: notification.toJSON()
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent!',
      notification
    });
  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});
export default router;