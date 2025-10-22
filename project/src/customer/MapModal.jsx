import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Star, Clock, Truck, MapPin, Loader2 } from 'lucide-react';

const MapModal = ({ isOpen, onClose, userLocation, dishes }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';

    script.onload = () => {
      initializeMap();
    };

    document.body.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (link.parentNode) {
        document.head.removeChild(link);
      }
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen]);

  const initializeMap = () => {
    if (!window.L || !mapRef.current) return;

    const L = window.L;

    // Clear existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Initialize map
    const map = L.map(mapRef.current).setView(
      [userLocation.latitude || 9.9252, userLocation.longitude || 78.1198],
      13
    );

    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // User location marker
    const userMarkerHtml = `
      <div style="
        background: #3b82f6;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: userMarkerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([userLocation.latitude || 9.9252, userLocation.longitude || 78.1198], {
      icon: userIcon
    })
      .addTo(map)
      .bindPopup(`<b>Your Location</b><br>${userLocation.city || 'Current Location'}`);

    // Restaurant markers
    const bounds = [];
    bounds.push([userLocation.latitude || 9.9252, userLocation.longitude || 78.1198]);

    dishes.forEach((dish, index) => {
      // Generate random coordinates near user (in real app, fetch from backend)
      const lat = (userLocation.latitude || 9.9252) + (Math.random() - 0.5) * 0.02;
      const lng = (userLocation.longitude || 78.1198) + (Math.random() - 0.5) * 0.02;

      bounds.push([lat, lng]);

      const restaurantMarkerHtml = `
        <div style="
          background: #f97316;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-size: 16px;
            font-weight: bold;
          ">🍽️</span>
        </div>
      `;

      const restaurantIcon = L.divIcon({
        className: 'custom-restaurant-marker',
        html: restaurantMarkerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([lat, lng], { icon: restaurantIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedDish({ ...dish, lat, lng });
        });

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${dish.restaurant}</h3>
          <p style="margin: 4px 0; font-size: 14px; color: #666;">${dish.name}</p>
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 8px;">
            <span style="color: #10b981; font-weight: bold;">★ ${dish.rating}</span>
            <span style="color: #999;">•</span>
            <span style="color: #666;">${dish.deliveryTime}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setMapLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Popular Restaurants Near You
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userLocation.city || 'Your Location'} • {dishes.length} restaurants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          {/* Selected Dish Card */}
          {selectedDish && (
            <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md">
              <div className="flex items-start space-x-3">
                <img
                  src={selectedDish.image ? `http://localhost:5000${selectedDish.image}` : 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=100'}
                  alt={selectedDish.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {selectedDish.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedDish.restaurant}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDish(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-2 text-sm">
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{selectedDish.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{selectedDish.deliveryTime}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Truck className="w-4 h-4" />
                      <span>{selectedDish.distance}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedDish.currentPrice}
                    </span>
                    <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">Your Location</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white"></div>
              <span className="text-gray-600 dark:text-gray-400">Restaurant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;