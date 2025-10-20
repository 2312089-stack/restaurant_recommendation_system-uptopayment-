import React, { useState } from 'react';
import DiscoveryPage from './DiscoveryPage';
import RestaurantMenuPage from './RestaurantMenuPage';
import DishDetailsPage from './DishDetailsPage';

const DiscoveryWrapper = ({ onBack }) => {
  const [currentView, setCurrentView] = useState('discovery');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [selectedDishId, setSelectedDishId] = useState(null);
  const [previousView, setPreviousView] = useState(null); // Track previous view

  console.log('🎯 DiscoveryWrapper State:', {
    currentView,
    selectedRestaurantId,
    selectedDishId,
    previousView
  });

  const handleShowRestaurantMenu = (restaurantId) => {
    console.log('📍 Opening restaurant menu:', restaurantId);
    setSelectedRestaurantId(restaurantId);
    setSelectedDishId(null);
    setPreviousView('discovery');
    setCurrentView('restaurant');
  };

  const handleShowDishDetails = (dishId) => {
    console.log('🍽️ Opening dish details:', dishId);
    setSelectedDishId(dishId);
    
    // Remember which view we came from
    if (currentView === 'restaurant') {
      setPreviousView('restaurant');
    } else {
      setPreviousView('discovery');
    }
    
    setCurrentView('dish');
  };

  const handleBackToDiscovery = () => {
    console.log('⬅️ Back to discovery');
    setCurrentView('discovery');
    setSelectedRestaurantId(null);
    setSelectedDishId(null);
    setPreviousView(null);
  };

  const handleBackToRestaurant = () => {
    console.log('⬅️ Back to restaurant menu');
    setCurrentView('restaurant');
    setSelectedDishId(null);
    setPreviousView('discovery');
  };

  const handleBackFromDish = () => {
    console.log('⬅️ Back from dish details, previous view:', previousView);
    
    // Go back to the view we came from
    if (previousView === 'restaurant' && selectedRestaurantId) {
      setCurrentView('restaurant');
      setSelectedDishId(null);
    } else {
      handleBackToDiscovery();
    }
  };

  // Render Dish Details Page
  if (currentView === 'dish' && selectedDishId) {
    console.log('✅ Rendering DishDetailsPage with dishId:', selectedDishId);
    return (
      <DishDetailsPage
        dishId={selectedDishId}
        onBack={handleBackFromDish}
      />
    );
  }

  // Render Restaurant Menu Page
  if (currentView === 'restaurant' && selectedRestaurantId) {
    console.log('✅ Rendering RestaurantMenuPage with restaurantId:', selectedRestaurantId);
    return (
      <RestaurantMenuPage
        restaurantId={selectedRestaurantId}
        onBack={handleBackToDiscovery}
        onShowDishDetails={handleShowDishDetails}
      />
    );
  }

  // Render Discovery Page
  console.log('✅ Rendering DiscoveryPage');
  return (
    <DiscoveryPage
      onBack={onBack}
      onShowRestaurantMenu={handleShowRestaurantMenu}
      onShowDishDetails={handleShowDishDetails}
    />
  );
};

export default DiscoveryWrapper;