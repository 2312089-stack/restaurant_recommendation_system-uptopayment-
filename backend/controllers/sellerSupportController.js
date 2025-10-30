// backend/controllers/sellerSupportController.js
import SupportTicket from '../models/SupportTicket.js';
import sendEmail from '../utils/sendEmail.js';

// Get all FAQs
export const getFAQs = async (req, res) => {
  try {
    const faqs = [
      {
        id: 1,
        category: 'Orders',
        question: 'How do I accept or reject orders?',
        answer: 'Go to Order Management → Click Accept or Reject on pending orders. You can also set auto-accept in Settings.'
      },
      {
        id: 2,
        category: 'Payments',
        question: 'When will I receive my settlement?',
        answer: 'Settlements are processed weekly on Fridays. Check Payments & Settlements page for details.'
      },
      {
        id: 3,
        category: 'Menu',
        question: 'How do I add/edit dishes?',
        answer: 'Go to Menu Management → Click "Add New Dish" or "Edit" on existing dishes.'
      },
      {
        id: 4,
        category: 'Technical',
        question: 'My dashboard is not loading. What should I do?',
        answer: 'Try clearing your browser cache or contact support. Check your internet connection.'
      },
      {
        id: 5,
        category: 'Account',
        question: 'How do I change my restaurant details?',
        answer: 'Go to Restaurant Profile → Update your details → Save changes.'
      },
{
        id: 6,
        category: 'Reviews',
        question: 'How do I respond to customer reviews?',
        answer: 'Go to Reviews & Ratings → Click on a review → Add your response.'
      }
    ];

    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('❌ Get FAQs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs'
    });
  }
};
// Create support ticket
export const createTicket = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { category, subject, description, priority = 'medium', metadata = {} } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Category, subject, and description are required'
      });
    }

    // ✅ GENERATE TICKET ID MANUALLY
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const ticketId = `TKT${timestamp}${randomNum}`;

    console.log('🎫 Creating ticket with ID:', ticketId);

    const ticket = new SupportTicket({
      seller: sellerId,
      ticketId, // ✅ Set ticketId explicitly
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    await ticket.save();

    console.log('✅ Ticket created successfully:', ticket.ticketId);

    // Send confirmation email
    try {
      await sendEmail({
        to: req.seller.email,
        subject: `Support Ticket Created - ${ticket.ticketId}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Support Ticket Created</h2>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Status:</strong> Open</p>
            <p>We'll respond to your ticket within 24 hours.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.warn('⚠️ Email notification failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketId: ticket.ticketId,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Create ticket error:', error);
    
    // Handle duplicate ticketId (very rare but possible)
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create unique ticket ID. Please try again.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create support ticket'
    });
  }
};

// Get seller's tickets
export const getTickets = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { status, limit = 20, page = 1 } = req.query;

    const query = { seller: sellerId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      SupportTicket.countDocuments(query)
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTickets: total
      }
    });
  } catch (error) {
    console.error('❌ Get tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets'
    });
  }
};

// Get single ticket
export const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const sellerId = req.seller.id;

    const ticket = await SupportTicket.findOne({
      ticketId,
      seller: sellerId
    }).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('❌ Get ticket details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket details'
    });
  }
};

// Add response to ticket
export const addTicketResponse = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const sellerId = req.seller.id;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const ticket = await SupportTicket.findOne({
      ticketId,
      seller: sellerId
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    ticket.responses.push({
      respondedBy: 'seller',
      message: message.trim(),
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      response: ticket.responses[ticket.responses.length - 1]
    });
  } catch (error) {
    console.error('❌ Add ticket response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
};