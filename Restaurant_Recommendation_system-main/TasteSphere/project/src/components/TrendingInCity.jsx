import React from 'react';
import { TrendingUp, Flame, Plus, Star } from 'lucide-react';
const TrendingInCity = () => {
  const trendingDishes = [{
    id: 1,
    name: "Jigarthanda",
    restaurant: "Madurai Famous",
    image: "https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹89",
    ordersThisWeek: "14.2k",
    rating: 4.8,
    trendRank: 1,
    description: "Traditional South Indian cold beverage"
  }, {
    id: 2,
    name: "Hyderabadi Biryani",
    restaurant: "Bawarchi Biryani",
    image: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹299",
    ordersThisWeek: "12.8k",
    rating: 4.6,
    trendRank: 2,
    description: "Aromatic basmati rice with tender mutton"
  }, {
    id: 3,
    name: "Vada Pav",
    restaurant: "Mumbai Street Food",
    image: "https://images.pexels.com/photos/4449068/pexels-photo-4449068.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹25",
    ordersThisWeek: "11.5k",
    rating: 4.4,
    trendRank: 3,
    description: "Mumbai's favorite street food"
  }, {
    id: 4,
    name: "Butter Chicken",
    restaurant: "Delhi Darbar",
    image: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹249",
    ordersThisWeek: "10.9k",
    rating: 4.5,
    trendRank: 4,
    description: "Creamy tomato-based chicken curry"
  }, {
    id: 5,
    name: "Masala Chai",
    restaurant: "Chai Wala",
    image: "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
    price: "₹15",
    ordersThisWeek: "9.7k",
    rating: 4.7,
    trendRank: 5,
    description: "Spiced tea blend, perfectly brewed"
  }];
  const getRankColor = rank => {
    switch (rank) {
      case 1:
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900';
      case 2:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
      case 3:
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900';
      default:
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900';
    }
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "py-8 bg-gray-50 dark:bg-gray-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1"
  }, /*#__PURE__*/React.createElement(Flame, {
    className: "w-6 h-6 text-red-500"
  }), /*#__PURE__*/React.createElement(TrendingUp, {
    className: "w-6 h-6 text-green-500"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-900 dark:text-white"
  }, "Trending in Mumbai")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 dark:text-gray-400 mt-1"
  }, "Most popular dishes this week")), /*#__PURE__*/React.createElement("button", {
    className: "text-orange-600 hover:text-orange-700 font-semibold transition-colors"
  }, "View Full Rankings")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
  }, trendingDishes.map(dish => /*#__PURE__*/React.createElement("div", {
    key: dish.id,
    className: "bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 group relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: `absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankColor(dish.trendRank)}`
  }, "#", dish.trendRank), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: dish.image,
    alt: dish.name,
    className: "w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center"
  }, /*#__PURE__*/React.createElement(TrendingUp, {
    className: "w-3 h-3 mr-1"
  }), "Hot"), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold"
  }, dish.ordersThisWeek, " orders")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1"
  }, dish.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 dark:text-gray-400 mb-2"
  }, dish.restaurant), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2"
  }, dish.description), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900 dark:text-white"
  }, dish.price), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 bg-green-100 dark:bg-green-900 px-2 py-1 rounded"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 text-green-600 dark:text-green-400 fill-current"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-green-600 dark:text-green-400"
  }, dish.rating))), /*#__PURE__*/React.createElement("button", {
    className: "w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:-translate-y-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", null, "Try Trending")))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-900 dark:text-white mb-4"
  }, "This Week's Food Trends"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-orange-500"
  }, "58k+"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500 dark:text-gray-400"
  }, "Total Orders")), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-green-500"
  }, "15%"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500 dark:text-gray-400"
  }, "Growth")), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-blue-500"
  }, "247"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500 dark:text-gray-400"
  }, "Trending Items")), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-bold text-purple-500"
  }, "4.6\u2605"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500 dark:text-gray-400"
  }, "Avg Rating"))))));
};
export default TrendingInCity;