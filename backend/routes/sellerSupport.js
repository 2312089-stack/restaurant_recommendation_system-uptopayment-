// backend/routes/sellerSupport.js
import express from 'express';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import {
  getFAQs,
  createTicket,
  getTickets,
  getTicketDetails,
  addTicketResponse
} from '../controllers/sellerSupportController.js';

const router = express.Router();

// Get FAQs
router.get('/faqs', getFAQs);

// Ticket management
router.post('/tickets', authenticateSellerToken, createTicket);
router.get('/tickets', authenticateSellerToken, getTickets);
router.get('/tickets/:ticketId', authenticateSellerToken, getTicketDetails);
router.post('/tickets/:ticketId/response', authenticateSellerToken, addTicketResponse);

export default router;