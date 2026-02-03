import React, { useState, useEffect, useCallback } from 'react';
import MapComponent from '../components/MapComponent';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Home = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [currentLocation, setCurrentLocation] = useState(null);
    const [pickup, setPickup] = useState(null);
    const [drop, setDrop] = useState(null);
    const [mode, setMode] = useState('pickup'); // 'pickup' or 'drop'
    const [distance, setDistance] = useState(0);
    const [fare, setFare] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, finding_driver, driver_found, riding

    useEffect(() => {
        // Get Users Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const loc = { lat: latitude, lng: longitude };
                    setCurrentLocation(loc);
                    setPickup(loc); // Default pickup to current location
                },
                (error) => {
                    console.error("Error getting location", error);
                }
            );
        }

        // Socket listeners
        socket.on('ride_accepted', (data) => {
            console.log('Ride accepted:', data);
            setStatus('driver_found');
            alert(`Driver found! Driver ID: ${data.driverId}`);
        });

        socket.on('no_drivers_found', () => {
             setStatus('idle');
             alert('No drivers available nearby. Please try again later.');
        });

        return () => {
            socket.off('ride_accepted');
            socket.off('no_drivers_found');
        }
    }, []);

    const calculateFare = useCallback((p, d) => {
        const R = 6371; // km
        const dLat = (d.lat - p.lat) * Math.PI / 180;
        const dLon = (d.lng - p.lng) * Math.PI / 180;
        const lat1 = p.lat * Math.PI / 180;
        const lat2 = d.lat * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const dist = R * c;
        
        const baseFare = 40;
        const ratePerKm = 12;
        const totalFare = Math.max(baseFare, baseFare + (dist * ratePerKm));

        setDistance(dist.toFixed(2));
        setFare(Math.round(totalFare));
    }, []);

    const resetPickupToCurrent = () => {
        if (currentLocation) {
            setPickup(currentLocation);
            // If drop exists, recalculate
            if (drop) {
                calculateFare(currentLocation, drop);
            }
        } else {
            alert('Fetching your location... Please wait.');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                         const { latitude, longitude } = position.coords;
                         const loc = { lat: latitude, lng: longitude };
                         setCurrentLocation(loc);
                         setPickup(loc);
                         alert('Location updated!');
                    },
                    (err) => {
                        console.error(err);
                        alert('Could not get location. Ensure GPS is on.');
                    }
                );
            }
        }
    };

    const handleLocationSelect = useCallback((latlng) => {
        console.log('Selected Location:', latlng, 'Mode:', mode);
        if (mode === 'pickup') {
            setPickup({ lat: latlng.lat, lng: latlng.lng });
        } else {
            setDrop({ lat: latlng.lat, lng: latlng.lng });
            if (pickup) {
                calculateFare(pickup, { lat: latlng.lat, lng: latlng.lng });
            }
        }
    }, [mode, pickup, calculateFare]);

    const requestRide = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!pickup || !drop) {
            alert('Please select pickup and drop locations');
            return;
        }

        setStatus('finding_driver');
        socket.emit('request_ride', {
            riderId: user.id,
            pickup: { ...pickup, address: 'Map Location' },
            drop: { ...drop, address: 'Map Location' },
            fare: fare,
            distance: distance
        });
    };

    return (
        <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapComponent 
                    currentLocation={currentLocation} 
                    pickup={pickup} 
                    drop={drop}
                    onSelectLocation={handleLocationSelect}
                    mode={mode}
                />
            </div>

            {/* Top Bar - Mobile Friendly */}
            <div className="absolute top-0 left-0 right-0 z-10 pt-safe-top px-4 pb-2 flex justify-between items-start pointer-events-none mt-2">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg pointer-events-auto">
                    <h1 className="text-xl font-bold text-black">PanVel</h1>
                </div>
                {user ? (
                    <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg pointer-events-auto flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs overflow-hidden">
                           {user.email[0].toUpperCase()}
                        </div>
                        <button onClick={signOut} className="text-xs text-red-500 font-bold px-2">Out</button>
                    </div>
                ) : (
                    <button onClick={() => navigate('/login')} className="bg-black text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold pointer-events-auto">
                        Log In
                    </button>
                )}
            </div>

            {/* Bottom Control Panel - Mobile Sheet Style */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] p-6 pb-safe-bottom transition-all duration-300 pointer-events-auto max-h-[45vh] overflow-y-auto">
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

                {status === 'idle' ? (
                     <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1 flex flex-col gap-2">
                                <button 
                                    onClick={() => setMode('pickup')} 
                                    className={`w-full py-3 rounded-xl font-medium text-sm border-2 transition-colors ${mode === 'pickup' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-transparent'}`}
                                >
                                    <span className="block text-xs opacity-70">Step 1</span>
                                    Set Pickup
                                </button>
                                {mode === 'pickup' && (
                                    <button onClick={resetPickupToCurrent} className="text-xs text-blue-600 font-bold flex items-center justify-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Use Current Location
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => setMode('drop')} 
                                className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-colors ${mode === 'drop' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-transparent'} h-fit`}
                            >
                                <span className="block text-xs opacity-70">Step 2</span>
                                Set Drop
                            </button>
                        </div>

                        {distance > 0 && (
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Est. Distance</p>
                                    <p className="text-2xl font-black text-gray-800">{distance} <span className="text-sm font-normal text-gray-500">km</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total Fare</p>
                                    <p className="text-3xl font-black text-green-600">₹{fare}</p>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={requestRide}
                            className="w-full py-4 bg-black text-white rounded-xl text-lg font-bold shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            Confirm Ride 
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>
                ) : status === 'finding_driver' ? (
                    <div className="text-center py-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold mb-1">Finding Driver...</h3>
                        <p className="text-gray-500 text-sm">Connecting you with nearby partners.</p>
                        <button onClick={() => setStatus('idle')} className="mt-6 text-red-500 font-medium text-sm bg-red-50 px-4 py-2 rounded-lg">Cancel Request</button>
                    </div>
                ) : (
                     <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Ride Confirmed!</h3>
                        <p className="text-gray-500 text-sm">Your driver is on the way.</p>
                        <button onClick={() => setStatus('idle')} className="mt-6 text-sm text-gray-500 underline">Start New Ride</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
