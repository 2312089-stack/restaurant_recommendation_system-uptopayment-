// src/components/admin/AdminSupportView.jsx
import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Search, Filter, Clock, CheckCircle, AlertCircle,
  Loader2, Send, User, Calendar, Tag, TrendingUp, XCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const AdminSupportView = ({ authToken }) => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: ''
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [filters]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...filters,
        limit: 50
      });

      const response = await fetch(`${API_BASE_URL}/admin/support/tickets?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setTickets(data.tickets || []);
      } else {
        setError(data.error || 'Failed to load tickets');
      }
    } catch (err) {
      console.error('Load tickets error:', err);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const loadTicketDetails = async (ticketId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setSelectedTicket(data.ticket);
      } else {
        setError(data.error || 'Failed to load ticket details');
      }
    } catch (err) {
      console.error('Load ticket details error:', err);
      setError('Failed to load ticket details');
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/admin/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
        loadTickets();
        if (selectedTicket?.ticketId === ticketId) {
          loadTicketDetails(ticketId);
        }
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Update status error:', err);
      setError('Failed to update ticket status');
    } finally {
      setSubmitting(false);
    }
  };

  const sendResponse = async (e) => {
    e.preventDefault();
    
    if (!responseMessage.trim() || !selectedTicket) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/admin/support/tickets/${selectedTicket.ticketId}/response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: responseMessage })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Response sent successfully');
        setResponseMessage('');
        loadTicketDetails(selectedTicket.ticketId);
      } else {
        setError(data.error || 'Failed to send response');
      }
    } catch (err) {
      console.error('Send response error:', err);
      setError('Failed to send response');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const categories = {
    order_issues: 'Order Issues',
    payment_settlement: 'Payment & Settlement',
    menu_dish_issues: 'Menu & Dish Issues',
    technical_problems: 'Technical Problems',
    analytics_reports: 'Analytics & Reports',
    general_inquiry: 'General Inquiry',
    account_verification: 'Account Verification',
    delivery_issues: 'Delivery Issues',
    customer_complaints: 'Customer Complaints'
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.openTickets}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgressTickets}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgResponseTime}h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search tickets..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List and Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
          </div>

          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => loadTicketDetails(ticket.ticketId)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTicket?.ticketId === ticket.ticketId ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">{ticket.ticketId}</span>
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[ticket.status]}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${priorityColors[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h4>
                        <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>{ticket.seller?.businessName || 'Unknown'}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1">Ticket #{selectedTicket.ticketId}</p>
                  </div>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateStatus(selectedTicket.ticketId, e.target.value)}
                    disabled={submitting}
                    className={`px-3 py-1 text-sm rounded-lg border ${statusColors[selectedTicket.status]} cursor-pointer`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[400px]">
                {/* Seller Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Seller Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Business:</strong> {selectedTicket.seller?.businessName}</p>
                    <p><strong>Email:</strong> {selectedTicket.seller?.email}</p>
                    <p><strong>Phone:</strong> {selectedTicket.seller?.phone}</p>
                  </div>
                </div>

                {/* Ticket Details */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${priorityColors[selectedTicket.priority]}`}>
                    Priority: {selectedTicket.priority}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                    {categories[selectedTicket.category]}
                  </span>
                </div>

                {/* Responses */}
                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Conversation</h4>
                    {selectedTicket.responses.map((response, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          response.respondedBy === 'seller'
                            ? 'bg-gray-50 border-l-4 border-gray-300'
                            : 'bg-blue-50 border-l-4 border-blue-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          {response.respondedBy === 'seller' ? (
                            <User className="w-4 h-4 text-gray-600" />
                          ) : (
                            <MessageCircle className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="text-xs font-semibold text-gray-700">
                            {response.respondedBy === 'seller' ? 'Seller' : 'Support Team'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(response.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Response Form */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={sendResponse} className="space-y-3">
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !responseMessage.trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportView;