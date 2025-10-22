import React, { useState } from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, Smartphone } from 'lucide-react';

const Footer = ({ onNavigateToDiscovery, onScrollToPopularNearYou, onScrollToPersonalizedForYou }) => {
  const [email, setEmail] = useState('');
  
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    console.log('Newsletter signup:', email);
    setEmail('');
  };

  const handleDiscoverClick = (e) => {
    e.preventDefault();
    if (onNavigateToDiscovery) {
      onNavigateToDiscovery();
    }
  };

  const handlePopularNearYouClick = (e) => {
    e.preventDefault();
    if (onScrollToPopularNearYou) {
      onScrollToPopularNearYou();
    }
  };

  const handlePersonalizedClick = (e) => {
    e.preventDefault();
    if (onScrollToPersonalizedForYou) {
      onScrollToPersonalizedForYou();
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <div className="text-white font-bold text-sm">TS</div>
              </div>
              <span className="text-xl font-bold">TasteSphere</span>
            </div>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Discover. Relish. Repeat.
            </p>
            <p className="text-sm text-gray-500">
              Bringing the best flavors from around your city directly to your doorstep. Experience food like never before.
            </p>
          </div>

          {/* Explore Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#discover-restaurants"
                  onClick={handleDiscoverClick}
                  className="text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Discover Restaurants
                </a>
              </li>
              <li>
                <a 
                  href="#popular-near-you"
                  onClick={handlePopularNearYouClick}
                  className="text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Popular Near You
                </a>
              </li>
              <li>
                <a 
                  href="#personalized-for-you"
                  onClick={handlePersonalizedClick}
                  className="text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Personalized For You
                </a>
              </li>
              <li>
                <a 
                  href="#trending"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('trending-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  Trending in Your City
                </a>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="/help-center" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a 
                  href="/contact-us" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a 
                  href="/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="/terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="/refund-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Stay Connected Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Stay Connected</h3>
            
            {/* Newsletter Form */}
            <div className="mb-6">
              <div className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-700"
                  required
                />
                <button
                  onClick={handleNewsletterSubmit}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-r-lg transition-colors border border-orange-500"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Get weekly food updates and exclusive offers
              </p>
            </div>

            {/* Social Media */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Follow Us</p>
              <div className="flex space-x-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* App Download Buttons */}
            <div>
              <p className="text-sm font-medium mb-3">Download Our App</p>
              <div className="flex flex-col space-y-2">
                <button className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
                  <Smartphone className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs text-gray-400">Get it on</div>
                    <div className="text-sm font-medium">Google Play</div>
                  </div>
                </button>
                <button className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
                  <Smartphone className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs text-gray-400">Download on</div>
                    <div className="text-sm font-medium">App Store</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Bar */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Phone className="w-4 h-4" />
                <span>+91 8428817940</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Mail className="w-4 h-4" />
                <span>support@tastesphere.com</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Tirunelveli,Tamilnadu,India</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>24/7 Customer Support</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
            <p className="text-sm text-gray-500">
              © 2025 TasteSphere • Made in India 🇮🇳
            </p>
            <div className="flex items-center justify-center md:justify-end space-x-4 mt-2 md:mt-0">
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
              >
                Privacy
              </a>
              <span className="text-gray-700">•</span>
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
              >
                Terms
              </a>
              <span className="text-gray-700">•</span>
              <a
                href="#"
                className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
              >
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;