// src/pages/Home.jsx - JavaScript version with proper props
import React from 'react';
import HeroSection from "../customer/HeroSection";
import ReorderFavorites from "../customer/ReorderFavorites";
import PopularNearYou from "../customer/PopularNearYou";
import RecommendedForYou from "../customer/RecommendedForYou";
import TrendingInCity from "../customer/TrendingInCity";
import RecentlyViewed from "../customer/RecentlyViewed";
import MostViewed from "../customer/MostViewed";
import SpecialOffers from "../customer/SpecialOffers";
import Footer from "../customer/Footer";

const Home = ({ 
  onOpenDiscovery,
  onNavigateToLogin,
  onNavigateToOrderHistory,
  onNavigateToCart
}) => {
  console.log('🏠 Home component rendering');
  console.log('✅ RecentlyViewed and MostViewed should render');
  
  return (
    <>
      <HeroSection onOpenDiscovery={onOpenDiscovery} />
      <ReorderFavorites 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToDiscovery={onOpenDiscovery}
        onNavigateToOrderHistory={onNavigateToOrderHistory}
      />
      <PopularNearYou />
      <RecommendedForYou onNavigateToCart={onNavigateToCart} />
      <TrendingInCity />
      {/* ✅ View History Components - These should now render! */}
      <RecentlyViewed />
      <MostViewed />
      <SpecialOffers />
      <Footer />
    </>
  );
};

export default Home;