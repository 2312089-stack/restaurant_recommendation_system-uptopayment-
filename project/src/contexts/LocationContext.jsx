// src/contexts/LocationContext.jsx - ACCURATE VERSION
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    country: '',
    fullAddress: 'Detecting location...',
    postalCode: '',
    locality: '',
    accuracy: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Multi-service reverse geocoding with accuracy
  const reverseGeocode = async (latitude, longitude) => {
    const services = [
      // Service 1: BigDataCloud (Best for accuracy)
      async () => {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (!response.ok) throw new Error('BigDataCloud failed');
        const data = await response.json();
        
        return {
          city: data.city || data.locality || data.principalSubdivision || 'Unknown',
          state: data.principalSubdivision || '',
          country: data.countryName || 'India',
          postalCode: data.postcode || '',
          locality: data.locality || '',
          fullAddress: `${data.locality || data.city}, ${data.principalSubdivision}`,
          confidence: data.confidence || 'high'
        };
      },
      // Service 2: Nominatim (OpenStreetMap)
      async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'TasteSphere-App' } }
        );
        if (!response.ok) throw new Error('Nominatim failed');
        const data = await response.json();
        const addr = data.address || {};
        
        return {
          city: addr.city || addr.town || addr.village || addr.county || 'Unknown',
          state: addr.state || addr.region || '',
          country: addr.country || 'India',
          postalCode: addr.postcode || '',
          locality: addr.suburb || addr.neighbourhood || addr.hamlet || '',
          fullAddress: data.display_name?.split(',').slice(0, 3).join(',') || 'Location detected',
          confidence: 'medium'
        };
      },
      // Service 3: LocationIQ (Backup)
      async () => {
        const response = await fetch(
          `https://us1.locationiq.com/v1/reverse.php?key=pk.0f147952a41c555c5b70614039fd148b&lat=${latitude}&lon=${longitude}&format=json`
        );
        if (!response.ok) throw new Error('LocationIQ failed');
        const data = await response.json();
        const addr = data.address || {};
        
        return {
          city: addr.city || addr.town || addr.village || 'Unknown',
          state: addr.state || '',
          country: addr.country || 'India',
          postalCode: addr.postcode || '',
          locality: addr.suburb || addr.neighbourhood || '',
          fullAddress: data.display_name?.split(',').slice(0, 3).join(',') || 'Location detected',
          confidence: 'low'
        };
      }
    ];

    // Try services in order until one succeeds
    for (const service of services) {
      try {
        console.log('🌍 Attempting geocoding service...');
        const result = await service();
        console.log('✅ Geocoding successful:', result);
        return result;
      } catch (error) {
        console.warn('⚠️ Geocoding service failed, trying next...', error.message);
        continue;
      }
    }

    throw new Error('All geocoding services failed');
  };

  // Main location detection with high accuracy
  const detectLocation = useCallback(async (enableWatch = false) => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      const errorMsg = "Geolocation not supported";
      setError(errorMsg);
      setLocation(prev => ({ ...prev, fullAddress: errorMsg, city: "Unknown" }));
      setIsLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0 // Always get fresh location
    };

    const successCallback = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      console.log(`📍 Raw GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`);
      
      try {
        const locationDetails = await reverseGeocode(latitude, longitude);
        
        const newLocation = {
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          ...locationDetails,
          timestamp: new Date().toISOString()
        };
        
        setLocation(newLocation);
        setIsLoading(false);
        
        // Save to localStorage
        localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
        
        console.log('✅ Location updated:', newLocation);
      } catch (err) {
        console.error('❌ Geocoding error:', err);
        setError("Unable to determine location details");
        setLocation({
          latitude,
          longitude,
          accuracy,
          city: 'Unknown',
          state: '',
          country: 'India',
          fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          postalCode: '',
          locality: ''
        });
        setIsLoading(false);
      }
    };

    const errorCallback = (err) => {
      console.error('❌ Geolocation error:', err);
      let errorMsg = "Location access denied";
      
      switch(err.code) {
        case err.PERMISSION_DENIED:
          errorMsg = "Please enable location access";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMsg = "Location unavailable";
          break;
        case err.TIMEOUT:
          errorMsg = "Location request timed out";
          break;
        default:
          errorMsg = "Unknown error";
      }
      
      setError(errorMsg);
      
      // Try to load last known location
      const lastKnown = localStorage.getItem('lastKnownLocation');
      if (lastKnown) {
        try {
          const savedLocation = JSON.parse(lastKnown);
          setLocation(savedLocation);
          console.log('📍 Using cached location:', savedLocation);
        } catch (e) {
          setLocation(prev => ({ ...prev, fullAddress: errorMsg, city: "Unknown" }));
        }
      } else {
        setLocation(prev => ({ ...prev, fullAddress: errorMsg, city: "Unknown" }));
      }
      
      setIsLoading(false);
    };

    // Get current position
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

    // Watch position if enabled
    if (enableWatch) {
      const id = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
      setWatchId(id);
      console.log('👁️ Started watching location');
    }
  }, []);

  // Manual location update
  const updateLocation = useCallback((newLocation) => {
    setLocation(prev => ({ 
      ...prev, 
      ...newLocation,
      timestamp: new Date().toISOString()
    }));
    localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
    console.log('📍 Location manually updated:', newLocation);
  }, []);

  // Stop watching
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      console.log('👁️ Stopped watching location');
    }
  }, [watchId]);

  // Initialize on mount
  useEffect(() => {
    detectLocation(false);
    
    // Refresh location every 5 minutes
    const refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing location...');
      detectLocation(false);
    }, 300000);
    
    return () => {
      stopWatching();
      clearInterval(refreshInterval);
    };
  }, []);

  const value = {
    location,
    isLoading,
    error,
    detectLocation,
    updateLocation,
    stopWatching
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};