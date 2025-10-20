// src/components/seller/SellerSupport.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, HelpCircle, MessageCircle, Phone, Mail, Clock,
  Search, Plus, Loader2, CheckCircle, AlertCircle, Send,
  ChevronDown, ChevronUp, FileText, ExternalLink
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const SellerSupport = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('faq');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // FAQ state
  const [faqs, setFaqs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // Ticket state
  const [tickets, setTickets] = useState([]);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'order_issues',
    subject: '',
    description: '',
    priority: 'medium'
  });

  const getAuthToken = () => localStorage.getItem('sellerToken');

  useEffect(() => {
    if (activeTab === 'faq') {
      loadFAQs();
    } else if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/seller/support/faqs`);
      const data = await response.json();
      
      if (response.ok) {
        setFaqs(data.faqs || []);
      } else {
        setError(data.error || 'Failed to load FAQs');
      }
    } catch (err) {
      console.error('Load FAQs error:', err);
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/seller/support/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    
    if (!ticketForm.subject || !ticketForm.description) {
      setError('Subject and description are required');
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/seller/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Ticket created successfully! Ticket ID: ${data.ticket.ticketId}`);
        setTicketForm({
          category: 'order_issues',
          subject: '',
          description: '',
          priority: 'medium'
        });
        setShowCreateTicket(false);
        loadTickets();
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Create ticket error:', err);
      setError('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = {
    'order_issues': { label: 'Order Issues', color: 'bg-blue-100 text-blue-800' },
    'payment_settlement': { label: 'Payment & Settlement', color: 'bg-green-100 text-green-800' },
    'menu_dish_issues': { label: 'Menu & Dish Issues', color: 'bg-purple-100 text-purple-800' },
    'technical_problems': { label: 'Technical Problems', color: 'bg-red-100 text-red-800' },
    'analytics_reports': { label: 'Analytics & Reports', color: 'bg-yellow-100 text-yellow-800' },
    'general_inquiry': { label: 'General Inquiry', color: 'bg-gray-100 text-gray-800' }
  };

  const statusColors = {
    'open': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800'
  };

  const renderFAQ = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* FAQs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                      {faq.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                </div>
                {expandedFAQ === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {expandedFAQ === faq.id && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No FAQs found matching your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTickets = () => (
    <div className="space-y-6">
      {/* Create Ticket Button */}
      {!showCreateTicket && (
        <button
          onClick={() => setShowCreateTicket(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Ticket</span>
        </button>
      )}

      {/* Create Ticket Form */}
      {showCreateTicket && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Support Ticket</h3>
            <button
              onClick={() => setShowCreateTicket(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={createTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={ticketForm.category}
                onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                required
              >
                {Object.entries(categories).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Provide detailed information about your issue..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateTicket(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{loading ? 'Creating...' : 'Create Ticket'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      {loading && !showCreateTicket ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono">
                      {ticket.ticketId}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${categories[ticket.category]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {categories[ticket.category]?.label || ticket.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[ticket.status]}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{ticket.subject}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                {ticket.responses?.length > 0 && (
                  <span className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{ticket.responses.length} response(s)</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {tickets.length === 0 && !showCreateTicket && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No support tickets yet</p>
              <button
                onClick={() => setShowCreateTicket(true)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Phone Support */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
          <p className="text-sm text-gray-600 mb-4">Mon-Sat: 9 AM - 9 PM</p>
          <a
            href="tel:+911234567890"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Call +91 123 456 7890
          </a>
        </div>

        {/* Email Support */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-600 mb-4">Mon-Sat: 9 AM - 9 PM</p>
          <a
            href="mailto:seller-support@tastesphere.com"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Email Us
          </a>
        </div>

        {/* Help Center */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Help Center</h3>
          <p className="text-sm text-gray-600 mb-4">Browse articles & guides</p>
          <button className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            <span>Visit Help Center</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Office Hours */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Support Hours</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>Monday - Friday: 9:00 AM - 9:00 PM</li>
              <li>Saturday: 10:00 AM - 6:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'faq', label: 'FAQs', icon: HelpCircle },
    { id: 'tickets', label: 'My Tickets', icon: FileText },
    { id: 'contact', label: 'Contact Us', icon: Phone }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Help & Support</h2>
            <p className="text-sm text-gray-600">Get help with your account and orders</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'faq' && renderFAQ()}
        {activeTab === 'tickets' && renderTickets()}
        {activeTab === 'contact' && renderContact()}
      </div>
    </div>
  );
};

export default SellerSupport;