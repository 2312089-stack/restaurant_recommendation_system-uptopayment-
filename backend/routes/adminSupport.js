// backend/routes/adminSupport.js
import express from 'express';
import { authenticateAdmin } from '../middleware/adminSecurity.js'; // ✅ Changed from adminAuth.js
import {
  getAllTickets,
  getTicketDetailsAdmin,
  updateTicketStatus,
  addAdminResponse,
  getSupportStats
} from '../controllers/adminSupportController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get support statistics
router.get('/stats', getSupportStats);

// Get all tickets
router.get('/tickets', getAllTickets);

// Get specific ticket
router.get('/tickets/:ticketId', getTicketDetailsAdmin);

// Update ticket status
router.patch('/tickets/:ticketId/status', updateTicketStatus);

// Add admin response
router.post('/tickets/:ticketId/response', addAdminResponse);

export default router;