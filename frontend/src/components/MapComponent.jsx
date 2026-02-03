import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapComponent = ({ currentLocation, pickup, drop, onSelectLocation, mode }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ current: null, pickup: null, drop: null });
  const onSelectLocationRef = useRef(onSelectLocation);

  // Keep ref updated with latest callback
  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialCenter = currentLocation ? [currentLocation.lat, currentLocation.lng] : [20.5937, 78.9629];
    
    const map = L.map(mapRef.current).setView(initialCenter, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Click Handler - Uses Ref to access latest closure
    map.on('click', (e) => {
        if (onSelectLocationRef.current) {
            onSelectLocationRef.current(e.latlng);
        }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Update Center when location changes
  useEffect(() => {
      if (mapInstanceRef.current && currentLocation) {
           mapInstanceRef.current.flyTo([currentLocation.lat, currentLocation.lng], 13);
      }
  }, [currentLocation]);

  // Handle Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Current Location Marker
    if (currentLocation) {
        if (markersRef.current.current) {
            markersRef.current.current.setLatLng([currentLocation.lat, currentLocation.lng]);
        } else {
            markersRef.current.current = L.marker([currentLocation.lat, currentLocation.lng])
                .addTo(map)
                .bindPopup('You')
                .openPopup();
        }
    } else if (markersRef.current.current) {
        markersRef.current.current.remove();
        markersRef.current.current = null;
    }

    // Pickup Marker
    if (pickup) {
        if (markersRef.current.pickup) {
            markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
        } else {
            markersRef.current.pickup = L.marker([pickup.lat, pickup.lng])
                .addTo(map)
                .bindPopup('Pickup');
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
            markersRef.current.drop = L.marker([drop.lat, drop.lng])
                .addTo(map)
                .bindPopup('Drop');
        }
    } else if (markersRef.current.drop) {
        markersRef.current.drop.remove();
        markersRef.current.drop = null;
    }

  }, [currentLocation, pickup, drop]);


  return <div ref={mapRef} className="h-full w-full z-0" />;
};

export default MapComponent;
