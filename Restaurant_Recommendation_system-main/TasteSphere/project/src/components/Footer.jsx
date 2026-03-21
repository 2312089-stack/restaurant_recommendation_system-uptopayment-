import React, { useState } from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, Smartphone } from 'lucide-react';
const Footer = () => {
  const [email, setEmail] = useState('');
  const handleNewsletterSubmit = e => {
    e.preventDefault();
    console.log('Newsletter signup:', email);
    setEmail('');
  };
  return /*#__PURE__*/React.createElement("footer", {
    className: "bg-gray-900 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-1 md:col-span-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-white font-bold text-sm"
  }, "TS")), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-bold"
  }, "TasteSphere")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 mb-4 leading-relaxed"
  }, "Discover. Relish. Repeat."), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Bringing the best flavors from around your city directly to your doorstep. Experience food like never before.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-4"
  }, "Explore"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Discover Restaurants")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Special Offers")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Top Rated Dishes")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "New Restaurants")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Trending Food")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-4"
  }, "Support"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Help Center")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Contact Us")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Privacy Policy")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Terms of Service")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-gray-400 hover:text-orange-500 transition-colors"
  }, "Refund Policy")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-4"
  }, "Stay Connected"), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleNewsletterSubmit,
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex"
  }, /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "Enter your email",
    className: "flex-1 px-4 py-2 bg-gray-800 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-700",
    required: true
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-r-lg transition-colors border border-orange-500"
  }, /*#__PURE__*/React.createElement(Mail, {
    className: "w-4 h-4"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2"
  }, "Get weekly food updates and exclusive offers")), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium mb-3"
  }, "Follow Us"), /*#__PURE__*/React.createElement("div", {
    className: "flex space-x-3"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
  }, /*#__PURE__*/React.createElement(Facebook, {
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
  }, /*#__PURE__*/React.createElement(Twitter, {
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
  }, /*#__PURE__*/React.createElement(Instagram, {
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "w-10 h-10 bg-gray-800 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
  }, /*#__PURE__*/React.createElement(Youtube, {
    className: "w-5 h-5"
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium mb-3"
  }, "Download Our App"), /*#__PURE__*/React.createElement("div", {
    className: "flex space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    className: "flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement(Smartphone, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-400"
  }, "Get it on"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-medium"
  }, "Google Play"))), /*#__PURE__*/React.createElement("button", {
    className: "flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement(Smartphone, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-400"
  }, "Download on"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-medium"
  }, "App Store")))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-800 border-t border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 text-sm text-gray-400"
  }, /*#__PURE__*/React.createElement(Phone, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "+91 98765 43210")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 text-sm text-gray-400"
  }, /*#__PURE__*/React.createElement(Mail, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "support@tastesphere.com")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 text-sm text-gray-400"
  }, /*#__PURE__*/React.createElement(MapPin, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "Mumbai, India"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-4 text-sm text-gray-400"
  }, /*#__PURE__*/React.createElement("span", null, "24/7 Customer Support"), /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-green-500 rounded-full animate-pulse"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-950 border-t border-gray-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "\xA9 2025 TasteSphere \u2022 Made in India \uD83C\uDDEE\uD83C\uDDF3"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center md:justify-end space-x-4 mt-2 md:mt-0"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-xs text-gray-500 hover:text-orange-500 transition-colors"
  }, "Privacy"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "\u2022"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-xs text-gray-500 hover:text-orange-500 transition-colors"
  }, "Terms"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, "\u2022"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "text-xs text-gray-500 hover:text-orange-500 transition-colors"
  }, "Cookies"))))));
};
export default Footer;