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
  onNavigateToCart
}) => {
  const [showDiscovery, setShowDiscovery] = useState(false);

  // If discovery is open, show the wrapper which handles navigation
  if (showDiscovery) {
    return (
      <DiscoveryWrapper 
        onBack={() => setShowDiscovery(false)}
      />
    );
  }

  // Normal home page
  return (
    <>
      <HeroSection onOpenDiscovery={() => setShowDiscovery(true)} />
      <ReorderFavorites 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToDiscovery={() => setShowDiscovery(true)}
        onNavigateToOrderHistory={onNavigateToOrderHistory}
      />
      <PopularNearYou />
      <RecommendedForYou onNavigateToCart={onNavigateToCart} />
      <TrendingInCity />
      <RecentlyViewed />
      <MostViewed />
<SpecialOffers />  {/* ← Add this line */}
      <Footer />
    </>
  );
};
// Temporary debug component
const TestMostViewed = () => {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    fetch('http://localhost:5000/api/view-history/most-viewed?limit=4')
      .then(r => r.json())
      .then(d => {
        console.log('✅ Test fetch result:', d);
        setData(d);
      })
      .catch(e => console.error('❌ Test fetch error:', e));
  }, []);
  
  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400">
      <h3>Debug: Most Viewed API Test</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

// Then render it in Home:
<TestMostViewed />
export default Home;