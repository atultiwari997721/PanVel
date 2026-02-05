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

const MapComponent = ({ currentLocation, pickup, drop, onSelectLocation, mode, recenterTrigger }) => {
  // ... existing refs ...

  // ... existing init effect ...

  // Update Center when location changes OR when triggered explicitly
  useEffect(() => {
      if (mapInstanceRef.current && currentLocation) {
           mapInstanceRef.current.flyTo([currentLocation.lat, currentLocation.lng], 18); // Close zoom for recenter (18 is closer)
      }
  }, [currentLocation, recenterTrigger]); // Add trigger dependency

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
