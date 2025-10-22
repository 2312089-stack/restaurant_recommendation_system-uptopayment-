import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle, AlertCircle, Loader2, ExternalLink, Clock } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const contactInfo = {
    phone: '+91 84288 17940',
    phoneLink: 'tel:+918428817940',
    email: 'support@tastesphere.com',
    emailLink: 'mailto:support@tastesphere.com',
    location: 'Tirunelveli, Tamil Nadu, India',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126385.23456789!2d77.6870!3d8.7139!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b0411625235bb9b%3A0x8f3e3f3f3f3f3f3f!2sTirunelveli%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1234567890'
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a valid email address'
      });
      return;
    }

    if (formData.phone && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(formData.phone.replace(/\s/g, ''))) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a valid phone number'
      });
      return;
    }

    try {
      setLoading(true);
      setSubmitStatus(null);

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/support/contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus({
          type: 'success',
          message: '✅ Thank you! Your message has been sent. We\'ll respond within 2-3 minutes via email.'
        });
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        
        setTimeout(() => {
          setSubmitStatus(null);
        }, 10000);
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.message || 'Failed to submit form. Please try again.'
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (submitStatus?.type === 'error') {
      setSubmitStatus(null);
    }
  };

  const handleLiveChat = () => {
    window.open(`https://wa.me/918428817940?text=Hi, I need help with TasteSphere`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-orange-50 mb-2">We're here to help you 24/7</p>
          <p className="text-lg text-orange-100">Questions? Feedback? We'd love to hear from you!</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <a 
            href={contactInfo.phoneLink}
            className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 text-center group transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-gray-800">Call Us Now</h3>
            <p className="text-2xl font-bold text-green-600 mb-2">{contactInfo.phone}</p>
            <p className="text-sm text-gray-600 mb-3">Available 24/7 for Support</p>
            <div className="flex items-center justify-center space-x-2 text-green-600 font-medium">
              <span>Tap to Call</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </a>

          <a 
            href={contactInfo.emailLink}
            className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 text-center group transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-gray-800">Email Us</h3>
            <p className="text-lg font-semibold text-blue-600 mb-2">{contactInfo.email}</p>
            <p className="text-sm text-gray-600 mb-3">Response in 2-3 minutes</p>
            <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
              <span>Send Email</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </a>

          <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 text-center group transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2 text-gray-800">Visit Us</h3>
            <p className="text-lg font-semibold text-orange-600 mb-2">{contactInfo.location}</p>
            <p className="text-sm text-gray-600 mb-3">Mon-Sat: 10AM-6PM</p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-orange-600 font-medium"
            >
              <span>View on Map</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-3 text-gray-800">Send us a Message</h2>
              <p className="text-gray-600">Fill out the form and we'll get back to you within 2-3 minutes</p>
            </div>
            
            {submitStatus && (
              <div className={`mb-6 p-4 rounded-xl flex items-start space-x-3 ${
                submitStatus.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {submitStatus.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium">{submitStatus.message}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="+91 98765 43210"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="How can we help you?"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  placeholder="Tell us more about your inquiry..."
                  disabled={loading}
                ></textarea>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="h-80">
                <iframe
                  src={contactInfo.mapEmbed}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="TasteSphere Location"
                ></iframe>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <span>Our Location</span>
                </h3>
                <p className="text-gray-600 mb-3">{contactInfo.location}</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center space-x-1"
                >
                  <span>Get Directions</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-2xl shadow-xl p-8 text-white">
              <MessageCircle className="w-14 h-14 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Need Instant Help?</h3>
              <p className="mb-6 text-orange-50 text-lg">Chat with our support team for immediate assistance</p>
              <button 
                onClick={handleLiveChat}
                className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Live Chat
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="font-bold text-xl mb-6 flex items-center space-x-2">
                <Clock className="w-6 h-6 text-orange-500" />
                <span>Office Hours</span>
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">Customer Support</span>
                  <span className="text-green-600 font-bold">24/7 Available</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">Office Visits</span>
                  <span className="text-gray-600">Mon-Sat: 10AM-6PM</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold text-gray-700">Sunday</span>
                  <span className="text-red-600">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-orange-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4 text-gray-800">Still Have Questions?</h3>
          <p className="text-lg text-gray-600 mb-8">
            Check out our Help Center for instant answers or reach out to our support team
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="/help-center" 
              className="px-8 py-4 bg-white text-orange-600 hover:text-orange-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-orange-200 hover:border-orange-300"
            >
              Visit Help Center
            </a>
            <a 
              href={contactInfo.emailLink}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              Email Support Team
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;