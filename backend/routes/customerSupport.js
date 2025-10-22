import express from 'express';
import {
  submitContactForm,
  getFAQs,
  markFAQHelpful,
  incrementFAQView,
  createSupportTicket,
  getUserSupportTickets,
  getSupportTicket,
  addTicketMessage,
  subscribeNewsletter,
  searchSupport
} from '../controllers/customerSupportController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/contact', optionalAuth, submitContactForm);
router.get('/faqs', getFAQs);
router.post('/faqs/:faqId/view', incrementFAQView);
router.post('/faqs/:faqId/helpful', markFAQHelpful);
router.get('/search', searchSupport);
router.post('/newsletter', subscribeNewsletter);

// Support ticket routes (can be used by guests or authenticated users)
router.post('/tickets', optionalAuth, createSupportTicket);
router.get('/tickets/:ticketId', optionalAuth, getSupportTicket);
router.post('/tickets/:ticketId/messages', optionalAuth, addTicketMessage);

// Protected routes (require authentication)
router.get('/my-tickets', protect, getUserSupportTickets);

export default router;