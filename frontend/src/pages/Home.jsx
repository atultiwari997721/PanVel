import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapComponent from '../components/MapComponent';
import LocationSearch from '../components/LocationSearch';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL, { path: '/socket.io' });

const Home = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [currentLocation, setCurrentLocation] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [pickup, setPickup] = useState(null);
    const [drop, setDrop] = useState(null);
    const [mode, setMode] = useState('pickup'); // 'pickup' or 'drop'
    const [distance, setDistance] = useState(0);
    const [fare, setFare] = useState(0);
    const [driverDetails, setDriverDetails] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, finding_driver, driver_found, riding
    const [recenterTrigger, setRecenterTrigger] = useState(0);
    const [socketConnected, setSocketConnected] = useState(socket.connected);

    useEffect(() => {
        // Socket Debugging
        const onConnect = () => {
            console.log("Socket Connected:", socket.id);
            setSocketConnected(true);
        };
        const onDisconnect = () => {
             console.log("Socket Disconnected");
             setSocketConnected(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        
        socket.on('connect_error', (err) => {
            console.error("Socket Connection Error:", err);
            setSocketConnected(false);
        });

        // Join User Room for 1-on-1 updates
        if (user && user.id) {
            console.log("Joining Room:", user.id);
            socket.emit('join_room', user.id);
        }

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
                    const fallback = { lat: 19.0330, lng: 73.0297 }; 
                    setCurrentLocation(fallback);
                    setPickup(fallback);
                },
                { enableHighAccuracy: true }
            );
        }

        // Socket listeners
        socket.on('ride_accepted', (data) => {
            console.log('Ride accepted:', data);
            setStatus('driver_found');
            setDriverDetails(data); // Store driver info
        });
        
        socket.on('driver_location_update', (location) => {
             console.log("Live Driver Location:", location);
             setDriverLocation(location);
        });

        socket.on('no_drivers_found', () => {
             setStatus('idle');
             alert('No drivers nearby. Try again.'); 
        });

        socket.on('error', (err) => {
            console.error("Socket Error:", err);
            alert("Ride Request Failed: " + (err.message || "Unknown Error"));
            setStatus('idle');
        });

        socket.on('ride_cancelled', (data) => {
             console.log("Ride Cancelled:", data);
             alert(data.reason || "Ride was cancelled.");
             setStatus('idle');
             setDriverDetails(null);
             setDriverLocation(null);
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('ride_accepted');
            socket.off('driver_location_update');
            socket.off('no_drivers_found');
            socket.off('error');
        }
    }, [user]);

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
            setRecenterTrigger(prev => prev + 1);
            // If drop exists, recalculate
            if (drop) {
                calculateFare(currentLocation, drop);
            }
        } else {
             // Retry geolocation if needed
             if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                     const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                     setCurrentLocation(loc);
                     setPickup(loc);
                     setRecenterTrigger(prev => prev + 1);
                }, err => console.log(err));
             }
        }
    };

    const handleLocationSelect = useCallback((latlng) => {
        console.log('Selected Location:', latlng, 'Mode:', mode);
        if (mode === 'pickup') {
            setPickup({ lat: latlng.lat, lng: latlng.lng, address: latlng.address }); // Preserve address if from search
        } else {
            setDrop({ lat: latlng.lat, lng: latlng.lng, address: latlng.address });
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
            pickup: { ...pickup, address: pickup.address || 'Map Location' },
            drop: { ...drop, address: drop.address || 'Map Location' },
            fare: fare,
            distance: distance
        });
    };

    const resetRide = () => {
        setStatus('idle');
        setPickup(currentLocation);
        setDrop(null);
        setDistance(0);
        setFare(0);
        setMode('pickup');
        setRecenterTrigger(prev => prev + 1);
        setDriverDetails(null);
        setDriverLocation(null);
    };

    return (
        <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapComponent 
                    currentLocation={currentLocation} 
                    pickup={pickup} 
                    drop={drop}
                    driverLocation={driverLocation} 
                    onSelectLocation={handleLocationSelect}
                    mode={mode}
                    recenterTrigger={recenterTrigger}
                />
            </div>
            


            <div className="absolute top-0 left-0 right-0 z-10 pt-safe-top px-4 pb-2 flex justify-between items-start pointer-events-none mt-2">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg pointer-events-auto flex items-center gap-2">
                    <h1 className="text-xl font-bold text-black">PanVel</h1>
                    <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} title={socketConnected ? "Server Connected" : "Server Disconnected"}></div>
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
                
                {status === 'idle' && (
                    <LocationSearch 
                        placeholder={mode === 'pickup' ? "Search Pickup Location" : "Search Drop Location"} 
                        onLocationSelect={handleLocationSelect}
                    />
                )}
                
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
                     <div className="py-2">
                        {driverDetails ? (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                                        {driverDetails.driverName ? driverDetails.driverName[0] : 'D'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{driverDetails.driverName || 'Partner Driver'}</h3>
                                        <p className="text-sm text-gray-500">{driverDetails.vehicleModel || 'Sedan'} • {driverDetails.vehicleNumber || 'MH-04-AB-1234'}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                            <span className="text-xs font-bold text-gray-700">4.9</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <a href={`tel:${driverDetails.driverMobile}`} className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold text-center flex items-center justify-center gap-2 hover:bg-green-600 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        Call Driver
                                    </a>
                                     <button className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors">
                                        Message
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <div className="text-center py-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Ride Confirmed!</h3>
                                <p className="text-gray-500 text-sm">Your driver is coming.</p>
                            </div>
                        )}
                        
                        <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mb-6">
                            <div className="mt-1">
                                <div className="w-2 h-2 rounded-full bg-black mb-1"></div>
                                <div className="w-0.5 h-6 bg-gray-300 mx-auto"></div>
                                <div className="w-2 h-2 rounded-full bg-black"></div>
                            </div>
                            <div className="flex-1">
                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Pickup</p>
                                    <p className="text-sm font-semibold truncate">{pickup?.address || 'Current Location'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Drop</p>
                                    <p className="text-sm font-semibold truncate">{drop?.address || 'Drop Location'}</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={resetRide} className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                            Cancel Ride
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
