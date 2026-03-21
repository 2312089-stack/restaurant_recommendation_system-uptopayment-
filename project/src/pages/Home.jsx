// src/pages/Home.tsx
import React from 'react';
import HeroSection from "../components/HeroSection";
import ReorderFavorites from "../components/ReorderFavorites";
import PopularNearYou from "../components/PopularNearYou";
import RecommendedForYou from "../components/RecommendedForYou";
import TrendingInCity from "../components/TrendingInCity";
import SpecialOffers from "../components/SpecialOffers";
import Footer from "../components/Footer";
const Home = () => {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(HeroSection, null), /*#__PURE__*/React.createElement(ReorderFavorites, null), /*#__PURE__*/React.createElement(PopularNearYou, null), /*#__PURE__*/React.createElement(RecommendedForYou, null), /*#__PURE__*/React.createElement(TrendingInCity, null), /*#__PURE__*/React.createElement(SpecialOffers, null), /*#__PURE__*/React.createElement(Footer, null));
};
export default Home;