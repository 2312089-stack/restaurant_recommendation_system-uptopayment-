import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Clock, ArrowRight } from 'lucide-react';
const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [{
    id: 1,
    title: "Today's Special Offers",
    subtitle: "Up to 60% off on your favorite dishes",
    image: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    cta: "Order Now",
    badge: "Limited Time"
  }, {
    id: 2,
    title: "Trending This Week",
    subtitle: "Discover the most loved dishes in your city",
    image: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    cta: "Explore",
    badge: "Popular"
  }, {
    id: 3,
    title: "New Restaurants",
    subtitle: "Fresh flavors from newly opened kitchens",
    image: "https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    cta: "Discover",
    badge: "New"
  }];
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);
  const goToSlide = index => {
    setCurrentSlide(index);
  };
  const goToPrevious = () => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };
  const goToNext = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "relative h-80 md:h-96 overflow-hidden bg-gray-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative h-full"
  }, slides.map((slide, index) => /*#__PURE__*/React.createElement("div", {
    key: slide.id,
    className: `absolute inset-0 transition-opacity duration-500 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black bg-opacity-40 z-10"
  }), /*#__PURE__*/React.createElement("img", {
    src: slide.image,
    alt: slide.title,
    className: "w-full h-full object-cover"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-20 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center text-white max-w-2xl px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center px-3 py-1 bg-orange-500 text-white text-sm font-semibold rounded-full mb-4"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 mr-1"
  }), slide.badge), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-5xl font-bold mb-4"
  }, slide.title), /*#__PURE__*/React.createElement("p", {
    className: "text-lg md:text-xl mb-8 opacity-90"
  }, slide.subtitle), /*#__PURE__*/React.createElement("button", {
    className: "inline-flex items-center px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
  }, slide.cta, /*#__PURE__*/React.createElement(ArrowRight, {
    className: "w-4 h-4 ml-2"
  }))))))), /*#__PURE__*/React.createElement("button", {
    onClick: goToPrevious,
    className: "absolute left-4 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200"
  }, /*#__PURE__*/React.createElement(ChevronLeft, {
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: goToNext,
    className: "absolute right-4 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2"
  }, slides.map((_, index) => /*#__PURE__*/React.createElement("button", {
    key: index,
    onClick: () => goToSlide(index),
    className: `w-2 h-2 rounded-full transition-all duration-200 ${index === currentSlide ? 'bg-white scale-125' : 'bg-white bg-opacity-50 hover:bg-opacity-75'}`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-4 right-4 z-30 flex space-x-4 text-white text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 bg-black bg-opacity-30 px-3 py-1 rounded-full backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-3 h-3"
  }), /*#__PURE__*/React.createElement("span", null, "25 min avg delivery")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-1 bg-black bg-opacity-30 px-3 py-1 rounded-full backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement(Star, {
    className: "w-3 h-3 text-yellow-400"
  }), /*#__PURE__*/React.createElement("span", null, "4.8 rating"))));
};
export default HeroSection;