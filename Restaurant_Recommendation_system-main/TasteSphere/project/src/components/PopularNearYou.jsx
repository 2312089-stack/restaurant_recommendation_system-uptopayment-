import React from 'react';
import { MapPin, Star, Clock, Truck, ArrowRight } from 'lucide-react';
const PopularNearYou = () => {
  const restaurants = [{
    id: 1,
    name: "Pizza Palace",
    cuisine: "Italian, Fast Food",
    image: "https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    rating: 4.5,
    deliveryTime: "25-30 min",
    distance: "0.8 km",
    offer: "50% OFF up to ₹100",
    isPromoted: true
  }, {
    id: 2,
    name: "Spice Garden",
    cuisine: "Indian, North Indian",
    image: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    rating: 4.3,
    deliveryTime: "20-25 min",
    distance: "1.2 km",
    offer: "Free Delivery",
    isPromoted: false
  }, {
    id: 3,
    name: "Burger Junction",
    cuisine: "American, Burgers",
    image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    rating: 4.4,
    deliveryTime: "15-20 min",
    distance: "0.5 km",
    offer: "Buy 1 Get 1",
    isPromoted: true
  }, {
    id: 4,
    name: "Sushi Express",
    cuisine: "Japanese, Asian",
    image: "https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=1",
    rating: 4.6,
    deliveryTime: "30-35 min",
    distance: "1.5 km",
    offer: "20% OFF",
    isPromoted: false
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "py-8 bg-gray-50 dark:bg-gray-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-900 dark:text-white"
  }, "Popular Near You"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center text-gray-600 dark:text-gray-400 mt-1"
  }, /*#__PURE__*/React.createElement(MapPin, {
    className: "w-4 h-4 mr-1"
  }), /*#__PURE__*/React.createElement("span", null, "Based on your location"))), /*#__PURE__*/React.createElement("button", {
    className: "flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold transition-colors"
  }, /*#__PURE__*/React.createElement("span", null, "See on Map"), /*#__PURE__*/React.createElement(ArrowRight, {
    className: "w-4 h-4"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  }, restaurants.map(restaurant => /*#__PURE__*/React.createElement("div", {
    key: restaurant.id,
    className: "bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group cursor-pointer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: restaurant.image,
    alt: restaurant.name,
    className: "w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
  }), restaurant.isPromoted && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold"
  }, "Promoted"), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-2 left-2 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-orange-600"
  }, restaurant.offer)), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-lg text-gray-900 dark:text-white mb-1"
  }, restaurant.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 dark:text-gray-400 mb-3"
  }, restaurant.cuisine), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 text-green-600 dark:text-green-400 fill-current"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-green-600 dark:text-green-400"
  }, restaurant.rating))), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-500 dark:text-gray-400"
  }, restaurant.distance)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 text-gray-500 dark:text-gray-400"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, restaurant.deliveryTime)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 text-green-600 dark:text-green-400"
  }, /*#__PURE__*/React.createElement(Truck, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, "Free Delivery")))))))));
};
export default PopularNearYou;