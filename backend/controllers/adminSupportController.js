// backend/controllers/adminSupportController.js
import SupportTicket from '../models/SupportTicket.js';
import Seller from '../models/Seller.js';
import sendEmail from '../utils/sendEmail.js';

// Get all support tickets (Admin)
export const getAllTickets = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      category, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;

    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total, stats] = await Promise.all([
      SupportTicket.find(query)
        .populate('seller', 'businessName email phone')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      SupportTicket.countDocuments(query),
      SupportTicket.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format stats
    const statusStats = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTickets: total,
        limit: parseInt(limit)
      },
      stats: statusStats
    });
  } catch (error) {
    console.error('❌ Get all tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support tickets'
    });
  }
};

// Get ticket details (Admin)
export const getTicketDetailsAdmin = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({ ticketId })
      .populate('seller', 'businessName email phone address businessType')
      .lean();

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

// Update ticket status (Admin)
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assignedTo } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const ticket = await SupportTicket.findOne({ ticketId })
      .populate('seller', 'email businessName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    
    if (assignedTo) {
      ticket.assignedTo = assignedTo;
    }

    if (status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (status === 'closed' && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    // Send email notification to seller
    if (oldStatus !== status) {
      try {
        await sendEmail({
          to: ticket.seller.email,
          subject: `Support Ticket ${ticket.ticketId} - Status Updated`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #f97316;">Ticket Status Updated</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Previous Status:</strong> <span style="text-transform: capitalize;">${oldStatus.replace('_', ' ')}</span></p>
                <p><strong>New Status:</strong> <span style="text-transform: capitalize; color: #10b981; font-weight: bold;">${status.replace('_', ' ')}</span></p>
              </div>
              ${status === 'resolved' ? `
                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #065f46;">✅ Your issue has been resolved! If you need further assistance, please reply to this ticket.</p>
                </div>
              ` : ''}
              <p style="margin-top: 20px;">You can view your ticket details in your seller dashboard under Help & Support.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message from TasteSphere Support.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.warn('⚠️ Email notification failed:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Update ticket status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket status'
    });
  }
};

// Add admin response to ticket
export const addAdminResponse = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const ticket = await SupportTicket.findOne({ ticketId })
      .populate('seller', 'email businessName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    ticket.responses.push({
      respondedBy: 'support',
      message: message.trim(),
      timestamp: new Date()
    });

    // Auto-update status to in_progress if it was open
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Send email notification to seller
    try {
      await sendEmail({
        to: ticket.seller.email,
        subject: `New Response on Ticket ${ticket.ticketId}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #f97316;">New Response from Support</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
            </div>
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <p style="color: #6b7280; font-size: 12px; margin-bottom: 10px;">Support Team Response:</p>
              <p style="color: #111827; line-height: 1.6;">${message}</p>
            </div>
            <p style="margin-top: 20px;">View and respond to this ticket in your seller dashboard under Help & Support.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message from TasteSphere Support.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.warn('⚠️ Email notification failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Response added successfully',
      response: ticket.responses[ticket.responses.length - 1]
    });
  } catch (error) {
    console.error('❌ Add admin response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
};

// Get support statistics (Admin Dashboard)
export const getSupportStats = async (req, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedToday,
      avgResponseTime,
      ticketsByCategory,
      recentTickets
    ] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      SupportTicket.aggregate([
        {
          $match: {
            resolvedAt: { $exists: true },
            responses: { $exists: true, $ne: [] }
          }
        },
        {
          $project: {
            responseTime: {
              $subtract: [
                { $arrayElemAt: ['$responses.timestamp', 0] },
                '$createdAt'
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$responseTime' }
          }
        }
      ]),
      SupportTicket.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),
      SupportTicket.find()
        .populate('seller', 'businessName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const avgResponseHours = avgResponseTime[0]?.avgTime 
      ? Math.round(avgResponseTime[0].avgTime / (1000 * 60 * 60) * 10) / 10 
      : 0;

    res.json({
      success: true,
      stats: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedToday,
        avgResponseTime: avgResponseHours,
        ticketsByCategory,
        recentTickets
      }
    });
  } catch (error) {
    console.error('❌ Get support stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support statistics'
    });
  }
};