import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import io from 'socket.io-client';

const AdminDashboard = () => {
    const [rides, setRides] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdminLoggedIn) fetchData();
        
        // Socket.io Real-time Updates
        const socket = io(import.meta.env.VITE_API_URL, { path: '/socket.io' });
        
        socket.on('connect', () => {
            console.log("Connected to socket, joining admin room");
            socket.emit('join_admin');
        });

        socket.on('ride_updated', (updatedRide) => {
            console.log("Admin: Ride Updated", updatedRide);
            setRides(prev => {
                const index = prev.findIndex(r => r.id === updatedRide.id);
                if (index >= 0) {
                    const newRides = [...prev];
                    newRides[index] = updatedRide;
                    return newRides.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                } else {
                    return [updatedRide, ...prev];
                }
            });
        });

        socket.on('driver_updated', (updatedDriver) => {
             setDrivers(prev => {
                 const index = prev.findIndex(d => d.id === updatedDriver.id);
                 if (index >= 0) {
                     const newDrivers = [...prev];
                     newDrivers[index] = { ...newDrivers[index], ...updatedDriver };
                     return newDrivers;
                 }
                 return prev;
             });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Fallback: Poll every 5 seconds to ensure data consistency
    useEffect(() => {
        const interval = setInterval(() => {
             fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Critical Config Error: Received HTML instead of JSON. \nYour 'VITE_API_URL' is likely pointing to the Frontend URL instead of the Backend URL.");
            }

            const data = await response.json();
            
            if (data.rides) setRides(data.rides);
            if (data.drivers) setDrivers(data.drivers);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const cancelRide = async (rideId) => {
        if (!window.confirm('Are you sure you want to cancel this ride?')) return;
        const { error } = await supabase
            .from('rides')
            .update({ status: 'cancelled' })
            .eq('id', rideId);
        
        if (error) alert('Error cancelling ride');
        else fetchData();
    };

    // Placeholder for reassignment logic - requires more complex UI to select active driver
    const reassignRide = (rideId) => {
        alert('Reassign feature would open a modal to select from: ' + drivers.map(d => d.email).join(', '));
    };

    const [newPartner, setNewPartner] = useState({ mobile: '', fullName: '', password: '', vehicleModel: '', vehiclePlate: '' });
    const [createdPartnerId, setCreatedPartnerId] = useState(null);

    const handleCreatePartner = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/create-partner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: newPartner.mobile,
                    password: newPartner.password,
                    fullName: newPartner.fullName,
                    vehicleDetails: { model: newPartner.vehicleModel, plate: newPartner.vehiclePlate }
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            
            setCreatedPartnerId(data.partnerId);
            setNewPartner({ mobile: '', fullName: '', password: '', vehicleModel: '', vehiclePlate: '' });
            alert(`Partner Created! ID: ${data.partnerId}`);
            fetchData();
        } catch (error) {
            alert(error.message);
        }
    };

    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (adminUser === 'jijahaiadmin' && adminPass === 'jijajiKeShamneKoeBolSaktaHaiKya') {
            setIsAdminLoggedIn(true);
            fetchData(); // Fetch only after login
        } else {
            alert("Galat password! Jijaji naraz ho jayenge!");
        }
    };

    if (!isAdminLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                    <h1 className="text-2xl font-black mb-6 text-center">Admin Access</h1>
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Admin ID" 
                            className="w-full p-3 border rounded-lg"
                            value={adminUser}
                            onChange={e => setAdminUser(e.target.value)}
                        />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full p-3 border rounded-lg"
                            value={adminPass}
                            onChange={e => setAdminPass(e.target.value)}
                        />
                        <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold">
                            Enter Secret Chamber
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold mb-8">PanVel Admin</h1>

            {/* Create Partner Form */}
            <div className="bg-white p-6 rounded-xl shadow mb-8">
                <h2 className="text-xl font-bold mb-4">Create New Partner</h2>
                {createdPartnerId && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <strong className="font-bold">Success! </strong>
                        <span className="block sm:inline">Partner Created. Give them this 12-digit ID to login:</span>
                        <div className="text-3xl font-mono font-black mt-2 select-all">{createdPartnerId}</div>
                    </div>
                )}
                <form onSubmit={handleCreatePartner} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" placeholder="Full Name" className="p-2 border rounded" required value={newPartner.fullName} onChange={e => setNewPartner({...newPartner, fullName: e.target.value})} />
                    <input type="tel" placeholder="Mobile Number" className="p-2 border rounded" required value={newPartner.mobile} onChange={e => setNewPartner({...newPartner, mobile: e.target.value})} />
                    <input type="password" placeholder="Password" className="p-2 border rounded" required value={newPartner.password} onChange={e => setNewPartner({...newPartner, password: e.target.value})} />
                    <input type="text" placeholder="Vehicle Model (e.g. Swift)" className="p-2 border rounded" required value={newPartner.vehicleModel} onChange={e => setNewPartner({...newPartner, vehicleModel: e.target.value})} />
                    <input type="text" placeholder="Vehicle Plate (MH 01 AB 1234)" className="p-2 border rounded" required value={newPartner.vehiclePlate} onChange={e => setNewPartner({...newPartner, vehiclePlate: e.target.value})} />
                    <button type="submit" className="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800">Create Partner</button>
                </form>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong className="font-bold">Error Loading Data: </strong>
                    <span className="block sm:inline">{error}</span>
                    <p className="text-xs mt-1">Check Render "Backend" Service Logs or CORS settings.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Active Rides */}
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-bold mb-4">Rides</h2>
                    {loading ? <p>Loading...</p> : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {rides.map(ride => (
                                <div key={ride.id} className={`border p-4 rounded-lg flex justify-between items-center ${ride.status === 'cancelled' ? 'bg-gray-200 opacity-75' : 'bg-white'}`}>
                                    <div>
                                        <p className="font-bold">{ride.pickup_address || 'Map Loc'} ➔ {ride.drop_address || 'Map Loc'}</p>
                                        <p className="text-sm text-gray-500">Status: <span className={`font-bold ${
                                            ride.status === 'completed' ? 'text-green-600' :
                                            ride.status === 'cancelled' ? 'text-red-600' :
                                            'text-blue-600'
                                        }`}>{ride.status === 'cancelled' ? 'Canceled by User' : ride.status}</span></p>
                                        <p className="text-xs text-gray-400">ID: {ride.id.slice(0, 8)}...</p>
                                        <p className="text-sm">Fare: ₹{ride.fare}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {['requested', 'accepted', 'ongoing'].includes(ride.status) && (
                                            <button 
                                                onClick={() => cancelRide(ride.id)}
                                                className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {rides.length === 0 && <p className="text-gray-500">No rides found.</p>}
                        </div>
                    )}
                </div>

                {/* Driver Data */}
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-bold mb-4">Partners ({drivers.length})</h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {drivers.map(driver => (
                            <div key={driver.id} className="flex justify-between items-center border-b pb-2">
                                <div>
                                    <p className="font-medium">{driver.full_name || driver.email || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">Mobile: {driver.mobile}</p>
                                    <p className="text-xs font-mono bg-gray-100 inline p-1 rounded">ID: {driver.partner_unique_id || 'N/A'}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs ${driver.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {driver.is_online ? 'Online' : 'Offline'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
