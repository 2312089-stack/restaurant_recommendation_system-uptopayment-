import React from 'react';
import { Tag, Clock, Star, ArrowRight, Zap, Gift } from 'lucide-react';
const SpecialOffers = () => {
  const offers = [{
    id: 1,
    title: "Domino's Pizza Mania",
    description: "Get 50% OFF on all pizzas",
    image: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    discount: "50% OFF",
    minOrder: "₹299",
    validUntil: "Today",
    restaurant: "Domino's Pizza",
    rating: 4.4,
    type: "percentage",
    isFlashDeal: true,
    timeLeft: "2h 30m left"
  }, {
    id: 2,
    title: "Free Delivery Weekend",
    description: "Free delivery on all Biryani orders",
    image: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    discount: "Free Delivery",
    minOrder: "₹199",
    validUntil: "Weekend",
    restaurant: "Biryani House",
    rating: 4.6,
    type: "delivery",
    isFlashDeal: false,
    timeLeft: ""
  }, {
    id: 3,
    title: "Buy 1 Get 1 Burgers",
    description: "Double the taste, same price",
    image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    discount: "BOGO",
    minOrder: "₹149",
    validUntil: "3 days",
    restaurant: "Burger King",
    rating: 4.3,
    type: "bogo",
    isFlashDeal: false,
    timeLeft: ""
  }, {
    id: 4,
    title: "Dessert Bonanza",
    description: "Flat ₹100 OFF on dessert combos",
    image: "https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    discount: "₹100 OFF",
    minOrder: "₹249",
    validUntil: "5 days",
    restaurant: "Sweet Dreams",
    rating: 4.7,
    type: "flat",
    isFlashDeal: true,
    timeLeft: "6h 45m left"
  }];
  const getDiscountColor = type => {
    switch (type) {
      case 'percentage':
        return 'bg-red-500';
      case 'delivery':
        return 'bg-green-500';
      case 'bogo':
        return 'bg-purple-500';
      case 'flat':
        return 'bg-blue-500';
      default:
        return 'bg-orange-500';
    }
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "py-8 bg-white dark:bg-gray-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement(Gift, {
    className: "w-6 h-6 text-orange-500"
  }), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-900 dark:text-white"
  }, "Special Offers & Deals")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 dark:text-gray-400 mt-1"
  }, "Save more on your favorite meals")), /*#__PURE__*/React.createElement("button", {
    className: "flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
  }, /*#__PURE__*/React.createElement("span", null, "View All Offers"), /*#__PURE__*/React.createElement(ArrowRight, {
    className: "w-4 h-4"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  }, offers.map(offer => /*#__PURE__*/React.createElement("div", {
    key: offer.id,
    className: "bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: offer.image,
    alt: offer.title,
    className: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: `absolute top-3 left-3 ${getDiscountColor(offer.type)} text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg`
  }, offer.discount), offer.isFlashDeal && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 right-3 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center shadow-lg animate-pulse"
  }, /*#__PURE__*/React.createElement(Zap, {
    className: "w-3 h-3 mr-1"
  }), "Flash Deal"), offer.isFlashDeal && offer.timeLeft && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold flex items-center"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-3 h-3 mr-1 text-red-400"
  }), offer.timeLeft), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded flex items-center space-x-1"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 text-green-600 fill-current"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-900"
  }, offer.rating))), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 mb-2"
  }, /*#__PURE__*/React.createElement(Tag, {
    className: "w-4 h-4 text-orange-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-orange-600 dark:text-orange-400"
  }, offer.restaurant)), /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-lg text-gray-900 dark:text-white mb-2"
  }, offer.title), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 dark:text-gray-400 mb-3"
  }, offer.description), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 dark:text-gray-400"
  }, "Min Order:"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-900 dark:text-white"
  }, offer.minOrder)), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 dark:text-gray-400"
  }, "Valid Until:"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-900 dark:text-white"
  }, offer.validUntil))), /*#__PURE__*/React.createElement("button", {
    className: "w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:-translate-y-1 shadow-md hover:shadow-lg"
  }, "Grab Deal Now"))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold mb-2"
  }, "Have a Promo Code?"), /*#__PURE__*/React.createElement("p", {
    className: "opacity-90"
  }, "Enter your code and save even more!")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Enter promo code",
    className: "px-4 py-2 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("button", {
    className: "bg-white text-orange-600 font-semibold px-6 py-2 rounded-lg hover:bg-orange-50 transition-colors"
  }, "Apply"))))));
};
export default SpecialOffers;