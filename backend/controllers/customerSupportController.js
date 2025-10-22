import ContactForm from '../models/ContactForm.js';
import CustomerFAQ from '../models/CustomerFAQ.js';
import CustomerSupportTicket from '../models/CustomerSupportTicket.js';
import { sendContactFormEmails, sendTicketCreatedEmail } from '../utils/emailService.js';

// ===================== CONTACT FORM =====================

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const contactForm = new ContactForm({
      name,
      email,
      phone,
      subject,
      message,
      userId: req.user ? req.user.id : null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await contactForm.save();

    // Send emails asynchronously (don't wait for completion)
    sendContactFormEmails({ name, email, phone, subject, message })
      .then(() => console.log('✅ Contact form emails sent'))
      .catch(err => console.error('❌ Email sending failed:', err));

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you within 2-3 minutes. Check your email for confirmation.',
      data: {
        id: contactForm._id,
        submittedAt: contactForm.createdAt
      }
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again.'
    });
  }
};

// ===================== FAQs =====================

export const getFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } }
      ];
    }

    const faqs = await CustomerFAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs'
    });
  }
};

export const markFAQHelpful = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { helpful } = req.body;

    const faq = await CustomerFAQ.findById(faqId);
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    if (helpful) {
      faq.helpful += 1;
    } else {
      faq.notHelpful += 1;
    }

    await faq.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Mark FAQ helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
};

export const incrementFAQView = async (req, res) => {
  try {
    const { faqId } = req.params;

    await CustomerFAQ.findByIdAndUpdate(
      faqId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Increment FAQ view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update view count'
    });
  }
};

// ===================== SUPPORT TICKETS =====================

export const createSupportTicket = async (req, res) => {
  try {
    const { name, email, subject, category, priority, message, orderId } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const ticket = new CustomerSupportTicket({
      userId: req.user ? req.user.id : null,
      name,
      email,
      subject,
      category: category || 'other',
      priority: priority || 'medium',
      messages: [{
        sender: 'customer',
        message,
        timestamp: new Date()
      }],
      orderId: orderId || null
    });

    await ticket.save();

    // Send ticket creation email
    sendTicketCreatedEmail({
      name,
      email,
      subject,
      category: ticket.category,
      priority: ticket.priority,
      ticketNumber: ticket.ticketNumber
    })
      .then(() => console.log('✅ Ticket creation email sent'))
      .catch(err => console.error('❌ Email sending failed:', err));

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully. Check your email for confirmation.',
      data: {
        ticketNumber: ticket.ticketNumber,
        id: ticket._id,
        status: ticket.status
      }
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
};

export const getUserSupportTickets = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const tickets = await CustomerSupportTicket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get user support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets'
    });
  }
};

export const getSupportTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await CustomerSupportTicket.findById(ticketId)
      .populate('orderId', 'orderNumber totalAmount')
      .select('-__v');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user owns this ticket (if authenticated)
    if (req.user && ticket.userId && ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket'
    });
  }
};

export const addTicketMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await CustomerSupportTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    ticket.messages.push({
      sender: 'customer',
      message,
      timestamp: new Date()
    });

    ticket.status = 'waiting-response';
    ticket.updatedAt = new Date();

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Add ticket message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message'
    });
  }
};

// ===================== NEWSLETTER =====================

export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // TODO: Add to newsletter service (Mailchimp, SendGrid, etc.)

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter'
    });
  }
};

// ===================== SEARCH =====================

export const searchSupport = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const faqs = await CustomerFAQ.find({
      isActive: true,
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } }
      ]
    })
    .limit(10)
    .select('question answer category');

    res.status(200).json({
      success: true,
      data: {
        faqs
      }
    });
  } catch (error) {
    console.error('Search support error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search support content'
    });
  }
};