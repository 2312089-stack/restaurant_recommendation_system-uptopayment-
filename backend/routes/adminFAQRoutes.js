// routes/adminFAQRoutes.js
import express from 'express';
import CustomerFAQ from '../models/CustomerFAQ.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Simple admin check (you can enhance this later)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

// Get all FAQs (admin view)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const faqs = await CustomerFAQ.find().sort({ category: 1, order: 1 });
    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
});

// Create FAQ
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { question, answer, category, order, isActive } = req.body;
    
    const faq = new CustomerFAQ({
      question,
      answer,
      category,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await faq.save();
    
    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
});

// Update FAQ
router.put('/:faqId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const faq = await CustomerFAQ.findByIdAndUpdate(
      req.params.faqId,
      req.body,
      { new: true }
    );
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ'
    });
  }
});

// Delete FAQ
router.delete('/:faqId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const faq = await CustomerFAQ.findByIdAndDelete(req.params.faqId);
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ'
    });
  }
});

export default router;