import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const DriverDashboard = () => {
    const { user, signOut } = useAuth();
    const [isOnline, setIsOnline] = useState(false);
    const [location, setLocation] = useState(null);
    const [incomingRide, setIncomingRide] = useState(null); // { rideId, pickup, drop, fare }
    const [activeRide, setActiveRide] = useState(null);
    
    // Watch location ID
    const watchId = useRef(null);

    useEffect(() => {
        if (user) {
            socket.emit('join_room', user.id);
        }

        socket.on('new_ride_request', (data) => {
            console.log('New ride request:', data);
            setIncomingRide(data);
            // Play sound?
        });

        socket.on('ride_unavailable', () => {
            alert('Ride was taken by another driver or cancelled.');
            setIncomingRide(null);
        });

        return () => {
            socket.off('new_ride_request');
            socket.off('ride_unavailable');
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [user]);

    const goOnline = () => {
        if (!user) return;
        setIsOnline(true);
        
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const loc = { lat: latitude, lng: longitude };
                    setLocation(loc);

                    // Emit to server
                    socket.emit('driver_online', { driverId: user.id, location: loc });
                    socket.emit('update_location', { driverId: user.id, location: loc });
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
        }
    };

    const goOffline = () => {
        setIsOnline(false);
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        // Emit offline event if needed
    };

    const acceptRide = () => {
        if (!incomingRide || !user) return;
        
        socket.emit('accept_ride', { driverId: user.id, rideId: incomingRide.rideId });
        setActiveRide(incomingRide);
        setIncomingRide(null);
    };

    const rejectRide = () => {
        setIncomingRide(null);
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="p-4 bg-black text-white flex justify-between items-center">
                <h1 className="text-xl font-bold">PanVel Partner</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <button onClick={isOnline ? goOffline : goOnline} className="bg-white text-black px-3 py-1 rounded text-sm font-bold">
                        {isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                    <button onClick={signOut} className="text-red-300 ml-4">Logout</button>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative z-0">
                <MapComponent 
                    currentLocation={location} 
                    pickup={activeRide?.pickup} 
                    drop={activeRide?.drop}
                    mode="view"
                />

                {/* Incoming Request Popup */}
                {incomingRide && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white p-6 rounded-xl shadow-2xl z-[1000] border-2 border-black animate-bounce-in">
                        <h2 className="text-xl font-bold mb-2">New Ride Request!</h2>
                        <div className="flex justify-between mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Distance</p>
                                <p className="font-bold">{incomingRide.distance_km || '5.2'} km</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Earnings</p>
                                <p className="text-2xl font-bold text-green-600">₹{incomingRide.fare}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={rejectRide} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold">Skip</button>
                            <button onClick={acceptRide} className="flex-1 py-3 bg-black text-white rounded-lg font-bold">Accept Ride</button>
                        </div>
                    </div>
                )}

                {/* Active Ride Info */}
                {activeRide && !incomingRide && (
                    <div className="absolute top-4 left-4 right-4 bg-white p-4 rounded-xl shadow-lg z-[1000]">
                        <h3 className="font-bold text-lg">Current Ride</h3>
                        <p>Navigating to Pickup...</p>
                        <button onClick={() => setActiveRide(null)} className="mt-2 text-sm text-red-500">Cancel Ride (Debug)</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;
