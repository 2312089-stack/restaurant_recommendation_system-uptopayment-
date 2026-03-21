import React, { useState } from 'react';
import OnboardingScreen from './OnboardingScreen';
const OnboardingFlow = ({
  onComplete
}) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const screens = [{
    id: 'find-restaurants',
    title: 'Find Nearby\nRestaurants',
    description: 'Discover restaurants near you with our\ninteractive map and location services.',
    illustration: 'location',
    buttonText: 'Next'
  }, {
    id: 'order-food',
    title: 'Order Your Favorite\nFood',
    description: 'Enjoy delicious meals at the restaurant\nor get them delivered to your doorstep.',
    illustration: 'dining',
    buttonText: 'Next',
    options: ['Dine-in', 'Delivery']
  }, {
    id: 'trending-dishes',
    title: 'Discover Trending\nDishes',
    description: 'Explore popular dishes and save your\nfavorites to your wishlist.',
    illustration: 'chef',
    buttonText: 'Get Started',
    options: ['Trending', 'Wish']
  }];
  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };
  const handleSkip = () => {
    onComplete();
  };
  return /*#__PURE__*/React.createElement(OnboardingScreen, {
    screen: screens[currentScreen],
    currentIndex: currentScreen,
    totalScreens: screens.length,
    onNext: handleNext,
    onSkip: handleSkip
  });
};
export default OnboardingFlow;