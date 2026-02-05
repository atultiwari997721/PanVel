import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Use reliable CDN for icons
const fixIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = fixIcon;

const MapComponent = ({ currentLocation, pickup, drop, driverLocation, onSelectLocation, mode, recenterTrigger }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ current: null, pickup: null, drop: null });
  const onSelectLocationRef = useRef(onSelectLocation);

  // Keep ref sync with prop
  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  // Initialize Map
  useEffect(() => {
    if (mapInstanceRef.current) return; // Prevent double init
    if (!mapRef.current) return;

    console.log("Initializing Map...");

    // Default center (India)
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Map Click Handler
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        console.log("Map Clicked:", lat, lng);
        
        // Simple reverse geocoding for better UX
        let address = "Pinned Location";
        try {
            // Use Backend Proxy to avoid CORS
            const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
                address = data.display_name.split(',')[0]; // Short address
            }
        } catch (err) {
            console.error("Reverse geocoding failed", err);
        }

        if (onSelectLocationRef.current) {
            onSelectLocationRef.current({ lat, lng, address });
        }
    });

    mapInstanceRef.current = map;

    return () => {
        map.remove();
        mapInstanceRef.current = null;
    }
  }, []);

  // Update Center when location changes OR when triggered explicitly
  useEffect(() => {
      if (mapInstanceRef.current && currentLocation) {
           mapInstanceRef.current.flyTo([currentLocation.lat, currentLocation.lng], 18); 
      }
  }, [currentLocation, recenterTrigger]); 

    // Driver Marker
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (driverLocation) {
             if (markersRef.current.driver) {
                  markersRef.current.driver.setLatLng([driverLocation.lat, driverLocation.lng]);
             } else {
                  // Use a Car Icon preferably, defaulting to standard marker with different color/popup for now
                  markersRef.current.driver = L.marker([driverLocation.lat, driverLocation.lng], { icon: fixIcon })
                      .addTo(map)
                      .bindPopup('Driver is here')
                      .openPopup();
             }
        } else if (markersRef.current.driver) {
             markersRef.current.driver.remove();
             markersRef.current.driver = null;
        }
    }, [driverLocation]);

    // Handle Markers (Pickup/Drop/Current)
    useEffect(() => {
    // ... existing ...
    const map = mapInstanceRef.current;
    if (!map) return;

    // Current Location Marker
    if (currentLocation) {
        if (markersRef.current.current) {
            markersRef.current.current.setLatLng([currentLocation.lat, currentLocation.lng]);
        } else {
            markersRef.current.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: fixIcon })
                .addTo(map)
                .bindPopup('You are here')
                .openPopup();
        }
        // Only fly to current location if it's the very first load or explicitly requested
        // map.flyTo([currentLocation.lat, currentLocation.lng], 15);
    } 
    // ...
    // Pickup Marker
    if (pickup) {
        if (markersRef.current.pickup) {
            markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
        } else {
            markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon: fixIcon })
                .addTo(map)
                .bindPopup('Pickup Location');
        }
    } else if (markersRef.current.pickup) {
        markersRef.current.pickup.remove();
        markersRef.current.pickup = null;
    }

    // Drop Marker
    if (drop) {
        if (markersRef.current.drop) {
            markersRef.current.drop.setLatLng([drop.lat, drop.lng]);
        } else {
            markersRef.current.drop = L.marker([drop.lat, drop.lng], { icon: fixIcon })
                .addTo(map)
                .bindPopup('Drop Location');
        }
    } else if (markersRef.current.drop) {
        markersRef.current.drop.remove();
        markersRef.current.drop = null;
    }
  }, [currentLocation, pickup, drop]);


  return <div ref={mapRef} className="h-full w-full z-0 bg-gray-100" />
};

export default MapComponent;
