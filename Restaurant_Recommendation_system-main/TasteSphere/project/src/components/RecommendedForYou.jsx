import React from 'react';
import { Heart, Plus, Star, Sparkles } from 'lucide-react';
const RecommendedForYou = () => {
  const recommendations = [{
    id: 1,
    name: "Paneer Butter Masala",
    restaurant: "Punjabi Dhaba",
    image: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹249",
    rating: 4.4,
    reason: "Because you love North Indian",
    tags: ["Vegetarian", "Creamy"],
    isWishlisted: false
  }, {
    id: 2,
    name: "Chicken Tikka Pizza",
    restaurant: "Pizza Corner",
    image: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹349",
    rating: 4.6,
    reason: "Perfect blend of your favorites",
    tags: ["Fusion", "Popular"],
    isWishlisted: true
  }, {
    id: 3,
    name: "Masala Dosa",
    restaurant: "South Indian Express",
    image: "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹149",
    rating: 4.5,
    reason: "Based on your recent orders",
    tags: ["South Indian", "Crispy"],
    isWishlisted: false
  }, {
    id: 4,
    name: "Chocolate Brownie",
    restaurant: "Sweet Treats",
    image: "https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹99",
    rating: 4.7,
    reason: "Perfect dessert for you",
    tags: ["Dessert", "Rich"],
    isWishlisted: false
  }];
  const toggleWishlist = id => {
    // Handle wishlist toggle
    console.log('Toggle wishlist for item:', id);
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "py-8 bg-white dark:bg-gray-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    className: "w-6 h-6 text-orange-500"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-900 dark:text-white"
  }, "Recommended for You")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 dark:text-gray-400 mt-1"
  }, "Curated based on your taste and preferences")), /*#__PURE__*/React.createElement("button", {
    className: "text-orange-600 hover:text-orange-700 font-semibold transition-colors"
  }, "Customize Preferences")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  }, recommendations.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: item.image,
    alt: item.name,
    className: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleWishlist(item.id),
    className: `absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${item.isWishlisted ? 'bg-red-500 text-white' : 'bg-white bg-opacity-80 text-gray-600 hover:bg-red-500 hover:text-white'}`
  }, /*#__PURE__*/React.createElement(Heart, {
    className: `w-4 h-4 ${item.isWishlisted ? 'fill-current' : ''}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    className: "w-3 h-3 mr-1"
  }), "AI Pick")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 dark:text-white mb-1"
  }, item.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 dark:text-gray-400 mb-2"
  }, item.restaurant), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 mb-3"
  }, item.tags.map(tag => /*#__PURE__*/React.createElement("span", {
    key: tag,
    className: "px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs rounded-full"
  }, tag))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900 dark:text-white"
  }, item.price), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 text-green-600 dark:text-green-400 fill-current"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-green-600 dark:text-green-400"
  }, item.rating))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-purple-600 dark:text-purple-400 font-medium mb-3 italic"
  }, item.reason), /*#__PURE__*/React.createElement("button", {
    className: "w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
  }, /*#__PURE__*/React.createElement(Plus, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "Add to Cart"))))))));
};
export default RecommendedForYou;