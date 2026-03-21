import React from 'react';
import LocationIllustration from './illustrations/LocationIllustration';
import DiningIllustration from './illustrations/DiningIllustration';
import ChefIllustration from './illustrations/ChefIllustration';

const OnboardingScreen = ({
  screen,
  currentIndex,
  totalScreens,
  onNext,
  onSkip
}) => {
  const renderIllustration = () => {
    switch (screen.illustration) {
      case 'location':
        return <LocationIllustration />;
      case 'dining':
        return <DiningIllustration />;
      case 'chef':
        return <ChefIllustration />;
      default:
        return (
          <div className="w-80 h-60 bg-gray-200 rounded-3xl flex items-center justify-center">
            <span className="text-gray-500">Image placeholder</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      {/* Skip button */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={onSkip}
          className="bg-gray-200 hover:bg-gray-300 text-sm font-medium px-5 py-2 rounded-full transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="mb-10">{renderIllustration()}</div>

        <h1 className="text-3xl md:text-4xl font-semibold text-center mb-4 leading-tight text-orange-600">
          {screen.title.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < screen.title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h1>

        <p className="text-center text-base text-gray-600 mb-10 max-w-md leading-relaxed">
          {screen.description.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < screen.description.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>

        {/* Next button */}
        <button
          onClick={onNext}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-3 rounded-full text-lg transition-colors shadow-md"
        >
          {screen.buttonText} <span className="ml-2 text-xl">→</span>
        </button>

        {/* Dots indicator */}
        <div className="flex gap-2 mt-8">
          {Array.from({ length: totalScreens }).map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentIndex ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
