// src/contexts/LocationContext.jsx - DEBUGGED VERSION
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
  // 🎯 DEFAULT LOCATION - Kovilpatti
  const DEFAULT_LOCATION = {
    latitude: 9.1714,
    longitude: 77.8717,
    city: 'Kovilpatti',
    state: 'Tamil Nadu',
    country: 'India',
    fullAddress: 'Kovilpatti, Tamil Nadu',
    postalCode: '628502',
    locality: 'Kovilpatti',
    accuracy: null,
    timestamp: new Date().toISOString()
  };

  // Initialize with Kovilpatti immediately
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Save default location immediately
  useEffect(() => {
    localStorage.setItem('lastKnownLocation', JSON.stringify(DEFAULT_LOCATION));
  }, []);

  // Reverse geocoding with proper fallbacks
  const reverseGeocode = async (latitude, longitude) => {
    console.log(`🌍 Geocoding: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    
    // Try Nominatim first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
        { 
          headers: { 
            'User-Agent': 'TasteSphere-FoodDelivery/1.0',
            'Accept-Language': 'en'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data.error) {
          const addr = data.address || {};
          
          const city = addr.city || 
                       addr.town || 
                       addr.village || 
                       addr.municipality ||
                       addr.county || 
                       addr.state_district || 
                       'Unknown City';
          
          const state = addr.state || 'Tamil Nadu';
          const country = addr.country || 'India';
          
          const addressParts = [];
          if (addr.road) addressParts.push(addr.road);
          if (addr.suburb) addressParts.push(addr.suburb);
          if (city !== 'Unknown City') addressParts.push(city);
          
          const fullAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : data.display_name?.split(',').slice(0, 3).join(', ') || 'Location detected';
          
          console.log('✅ Nominatim succeeded');
          return {
            city,
            state,
            country,
            postalCode: addr.postcode || '',
            locality: addr.suburb || addr.neighbourhood || '',
            fullAddress
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Nominatim failed:', error.message);
    }

    // Try BigDataCloud as backup
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('✅ BigDataCloud succeeded');
        return {
          city: data.city || data.locality || 'Unknown City',
          state: data.principalSubdivision || 'Tamil Nadu',
          country: data.countryName || 'India',
          postalCode: data.postcode || '',
          locality: data.locality || '',
          fullAddress: `${data.locality || data.city || 'Your location'}, ${data.principalSubdivision || ''}`.trim()
        };
      }
    } catch (error) {
      console.warn('⚠️ BigDataCloud failed:', error.message);
    }

    // Fallback: Use coordinates only
    console.warn('⚠️ All geocoding failed, using coordinates');
    return {
      city: 'Unknown City',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '',
      locality: '',
      fullAddress: `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`
    };
  };

  // Main location detection
  const detectLocation = useCallback(async (enableWatch = false) => {
    console.log('📍 Detecting location...');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setError("Your browser doesn't support location detection");
      setLocation(DEFAULT_LOCATION);
      localStorage.setItem('lastKnownLocation', JSON.stringify(DEFAULT_LOCATION));
      return;
    }

    setIsLoading(true);
    setError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds - reasonable timeout
      maximumAge: 30000 // Accept cached location up to 30 seconds old
    };

    const successCallback = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      console.log(`✅ GPS Success: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`);
      
      try {
        // Get address details
        const locationDetails = await reverseGeocode(latitude, longitude);
        
        const newLocation = {
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          ...locationDetails,
          timestamp: new Date().toISOString()
        };
        
        setLocation(newLocation);
        setError(null);
        localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
        
        console.log('✅ Location updated:', newLocation.city);
        
      } catch (err) {
        console.error('❌ Geocoding error:', err);
        
        // Save coordinates even if geocoding fails
        const fallbackLocation = {
          latitude,
          longitude,
          accuracy,
          city: 'Kovilpatti',
          state: 'Tamil Nadu',
          country: 'India',
          fullAddress: `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`,
          postalCode: '',
          locality: '',
          timestamp: new Date().toISOString()
        };
        
        setLocation(fallbackLocation);
        setError("Location detected but address unavailable");
        localStorage.setItem('lastKnownLocation', JSON.stringify(fallbackLocation));
      } finally {
        setIsLoading(false);
      }
    };

    const errorCallback = (err) => {
      console.error('❌ Geolocation error:', err.code, err.message);
      
      let errorMsg = "Unable to get your location";
      
      switch(err.code) {
        case 1: // PERMISSION_DENIED
          errorMsg = "Location access denied. Please enable location in your browser settings.";
          console.error('❌ Permission denied - check browser settings');
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMsg = "Location unavailable. Check GPS/internet connection.";
          console.error('❌ Position unavailable - GPS issue');
          break;
        case 3: // TIMEOUT
          errorMsg = "Location request timed out. Using default location.";
          console.error('❌ Timeout - GPS took too long');
          break;
        default:
          errorMsg = "Location error occurred";
      }
      
      setError(errorMsg);
      
      // Use cached location if available and recent
      try {
        const cached = localStorage.getItem('lastKnownLocation');
        if (cached) {
          const savedLocation = JSON.parse(cached);
          const age = Date.now() - new Date(savedLocation.timestamp).getTime();
          
          if (age < 3600000) { // 1 hour
            console.log('📍 Using cached location (age: ' + Math.round(age/60000) + ' min)');
            setLocation({
              ...savedLocation,
              fullAddress: `${savedLocation.city} (Cached)`
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse cached location');
      }
      
      // Use default location
      console.log('📍 Using default location: Kovilpatti');
      setLocation(DEFAULT_LOCATION);
      localStorage.setItem('lastKnownLocation', JSON.stringify(DEFAULT_LOCATION));
      setIsLoading(false);
    };

    // Get position
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

    // Watch position if requested
    if (enableWatch && !watchId) {
      const id = navigator.geolocation.watchPosition(successCallback, errorCallback, {
        ...options,
        maximumAge: 0
      });
      setWatchId(id);
      console.log('👁️ Watching location changes');
    }
  }, [watchId]);

  // Manual location update
  const updateLocation = useCallback(async (newLocation) => {
    console.log('📝 Manually updating location');
    
    if (newLocation.latitude && newLocation.longitude && !newLocation.city) {
      setIsLoading(true);
      try {
        const geocoded = await reverseGeocode(newLocation.latitude, newLocation.longitude);
        newLocation = { ...newLocation, ...geocoded };
      } catch (err) {
        console.warn('⚠️ Manual geocoding failed:', err);
      }
      setIsLoading(false);
    }
    
    const updatedLocation = {
      ...location,
      ...newLocation,
      timestamp: new Date().toISOString()
    };
    
    setLocation(updatedLocation);
    localStorage.setItem('lastKnownLocation', JSON.stringify(updatedLocation));
  }, [location]);

  // Stop watching
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      console.log('👁️ Stopped watching location');
    }
  }, [watchId]);

  // Refresh location
  const refreshLocation = useCallback(() => {
    console.log('🔄 Refreshing location...');
    detectLocation(false);
  }, [detectLocation]);

  // Initialize on mount
  useEffect(() => {
    console.log('🚀 LocationProvider initialized with Kovilpatti');
    
    // Optional: Uncomment to auto-detect actual location
    // const timer = setTimeout(() => {
    //   detectLocation(false);
    // }, 2000);
    
    // return () => {
    //   clearTimeout(timer);
    //   stopWatching();
    // };
  }, []);

  const value = {
    location,
    isLoading,
    error,
    detectLocation,
    updateLocation,
    stopWatching,
    refreshLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};