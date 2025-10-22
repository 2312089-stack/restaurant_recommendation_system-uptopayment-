import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Phone, Mail, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const categories = [
    { id: 'all', name: 'All Questions', icon: '📚', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { id: 'ordering', name: 'Orders', icon: '🛒', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
    { id: 'payment', name: 'Payments', icon: '💳', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { id: 'delivery', name: 'Delivery', icon: '🚚', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
    { id: 'account', name: 'Account', icon: '👤', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
    { id: 'general', name: 'General', icon: '⭐', color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' }
  ];

  useEffect(() => {
    loadFAQs();
  }, [selectedCategory]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const categoryParam = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      console.log(`Fetching FAQs from: ${API_BASE}/support/faqs${categoryParam}`);
      
      const response = await fetch(`${API_BASE}/support/faqs${categoryParam}`);
      const data = await response.json();
      
      console.log('FAQ Response:', data);
      
      if (response.ok && data.success) {
        setFaqs(data.data || []);
      } else {
        setError(data.message || 'Failed to load FAQs');
        console.error('Failed to load FAQs:', data);
      }
    } catch (err) {
      setError('Unable to connect to support service. Please try again later.');
      console.error('Error loading FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFAQClick = async (faqId) => {
    const isOpening = expandedFaq !== faqId;
    setExpandedFaq(isOpening ? faqId : null);
    
    if (isOpening) {
      try {
        await fetch(`${API_BASE}/support/faqs/${faqId}/view`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error tracking FAQ view:', error);
      }
    }
  };

  const handleFeedback = async (faqId, helpful) => {
    if (feedbackGiven[faqId]) return;

    try {
      const response = await fetch(`${API_BASE}/support/faqs/${faqId}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful })
      });

      if (response.ok) {
        setFeedbackGiven(prev => ({ ...prev, [faqId]: helpful }));
        setFaqs(prevFaqs => 
          prevFaqs.map(faq => 
            faq._id === faqId 
              ? { 
                  ...faq, 
                  helpful: helpful ? (faq.helpful || 0) + 1 : faq.helpful,
                  notHelpful: !helpful ? (faq.notHelpful || 0) + 1 : faq.notHelpful
                }
              : faq
          )
        );
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (catId) => {
    return categories.find(c => c.id === catId)?.icon || '❓';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section - Swiggy Style */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Help & Support</h1>
            <button 
              onClick={() => window.location.href = '/contact-us'}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-gradient-to-b from-orange-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
            How can we help you?
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Find answers to common questions or search for specific topics
          </p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help (e.g., 'How to place an order')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none text-gray-800 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills - Swiggy Style */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 whitespace-nowrap transition-all ${
                selectedCategory === cat.id 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                  : `${cat.color} text-gray-700 border-transparent`
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="font-medium text-sm">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
            <p className="text-gray-600">Loading questions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load FAQs</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadFAQs}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No questions found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No results for "${searchQuery}". Try different keywords.`
                : 'No questions available in this category.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              View All Questions
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'}
              </p>
            </div>
            
            {filteredFaqs.map((faq) => (
              <div 
                key={faq._id} 
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-orange-300 hover:shadow-sm transition-all"
              >
                <button
                  onClick={() => handleFAQClick(faq._id)}
                  className="w-full px-6 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{getCategoryIcon(faq.category)}</span>
                    <span className="font-medium text-gray-800 pr-4">
                      {faq.question}
                    </span>
                  </div>
                  {expandedFaq === faq._id ? (
                    <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                </button>
                
                {expandedFaq === faq._id && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pl-8 pt-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                        {faq.answer}
                      </p>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(faq._id, true)}
                            disabled={feedbackGiven[faq._id]}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                              feedbackGiven[faq._id] === true
                                ? 'bg-green-100 text-green-700'
                                : feedbackGiven[faq._id]
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            {feedbackGiven[faq._id] === true ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <ThumbsUp className="w-4 h-4" />
                            )}
                            <span className="font-medium">Yes</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(faq._id, false)}
                            disabled={feedbackGiven[faq._id]}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                              feedbackGiven[faq._id] === false
                                ? 'bg-red-100 text-red-700'
                                : feedbackGiven[faq._id]
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span className="font-medium">No</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section - Swiggy Style */}
      <div className="bg-gray-50 border-t py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-2 text-gray-800">
            Still need help?
          </h3>
          <p className="text-center text-gray-600 mb-8">
            We're here 24/7 to assist you
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <a
              href="https://wa.me/918428817940"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Chat with us</h4>
              <p className="text-sm text-gray-600">WhatsApp support</p>
            </a>

            <a
              href="tel:+918428817940"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Call us</h4>
              <p className="text-sm text-gray-600">+91 84288 17940</p>
            </a>

            <a
              href="mailto:support@tastesphere.com"
              className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">Email us</h4>
              <p className="text-sm text-gray-600">support@tastesphere.com</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;