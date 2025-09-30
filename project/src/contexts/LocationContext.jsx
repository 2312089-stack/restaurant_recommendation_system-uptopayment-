import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    city: '',
    state: '',
    fullAddress: 'Detecting location...'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const detectLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLocation(prev => ({ ...prev, fullAddress: "Location not supported", city: "" }));
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          const city = data.locality || data.city || 'Unknown';
          const state = data.principalSubdivision || '';
          
          const newLocation = {
            latitude,
            longitude,
            city,
            state,
            fullAddress: `${city}${state ? ', ' + state : ''}`
          };
          
          setLocation(newLocation);
          setIsLoading(false);
        } catch (err) {
          console.error('Error fetching location:', err);
          setError("Location unavailable");
          setLocation({
            latitude,
            longitude,
            city: '',
            state: '',
            fullAddress: "Location unavailable"
          });
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError("Enable location access");
        setLocation(prev => ({ ...prev, fullAddress: "Enable location access", city: "" }));
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const updateLocation = (newLocation) => {
    setLocation(newLocation);
  };

  return (
    <LocationContext.Provider value={{ 
      location, 
      isLoading, 
      error, 
      detectLocation,
      updateLocation 
    }}>
      {children}
    </LocationContext.Provider>
  );
};