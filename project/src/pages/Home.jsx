// src/pages/Home.jsx - UPDATED VERSION
import React, { useState } from 'react';
import HeroSection from "../customer/HeroSection";
import ReorderFavorites from "../customer/ReorderFavorites";
import PopularNearYou from "../customer/PopularNearYou";
import RecommendedForYou from "../customer/RecommendedForYou";
import TrendingInCity from "../customer/TrendingInCity";
import RecentlyViewed from "../customer/RecentlyViewed";
import MostViewed from "../customer/MostViewed";
import SpecialOffers from "../customer/SpecialOffers";
import Footer from "../customer/Footer";
import DiscoveryWrapper from "../customer/DiscoveryWrapper";

const Home = ({ 
  onNavigateToLogin,
  onNavigateToOrderHistory,
  onNavigateToCart,
  onOpenDiscovery
}) => {
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Scroll handlers for footer links
  const handleScrollToPopularNearYou = () => {
    document.getElementById('popular-near-you-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleScrollToPersonalizedForYou = () => {
    document.getElementById('personalized-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleOpenDiscovery = () => {
    if (onOpenDiscovery) {
      onOpenDiscovery();
    } else {
      setShowDiscovery(true);
    }
  };

  // If discovery is open, show the wrapper which handles navigation
  if (showDiscovery) {
    return (
      <DiscoveryWrapper 
        onBack={() => setShowDiscovery(false)}
      />
    );
  }

  // Normal home page with dark mode support
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <HeroSection onOpenDiscovery={handleOpenDiscovery} />
      
      <ReorderFavorites 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToDiscovery={handleOpenDiscovery}
        onNavigateToOrderHistory={onNavigateToOrderHistory}
      />
      
      {/* Popular Near You Section with ID */}
      <div id="popular-near-you-section">
        <PopularNearYou />
      </div>
      
      {/* Personalized For You Section with ID */}
      <div id="personalized-section">
        <RecommendedForYou onNavigateToCart={onNavigateToCart} />
      </div>
      
      {/* Trending Section with ID */}
      <div id="trending-section">
        <TrendingInCity />
      </div>
      
      <RecentlyViewed />
      <MostViewed />
      <SpecialOffers />
      
      <Footer 
        onNavigateToDiscovery={handleOpenDiscovery}
        onScrollToPopularNearYou={handleScrollToPopularNearYou}
        onScrollToPersonalizedForYou={handleScrollToPersonalizedForYou}
      />
    </div>
  );
};

export default Home;