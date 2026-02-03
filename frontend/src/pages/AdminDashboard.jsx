import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AdminDashboard = () => {
    const [rides, setRides] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        
        // Subscription for real-time updates
        const ridesSub = supabase
            .channel('public:rides')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(ridesSub);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Rides
        const { data: ridesData, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (ridesData) setRides(ridesData);

        // Fetch Drivers
        const { data: driversData, error: driversError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_type', 'partner');
        
        if (driversData) setDrivers(driversData);
        setLoading(false);
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

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold mb-8">PanVel Admin</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Active Rides & History */}
                <div className="bg-white p-6 rounded-xl shadow">
                    <h2 className="text-xl font-bold mb-4">Rides</h2>
                    {loading ? <p>Loading...</p> : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {rides.map(ride => (
                                <div key={ride.id} className="border p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{ride.pickup_address || 'Map Loc'} ➔ {ride.drop_address || 'Map Loc'}</p>
                                        <p className="text-sm text-gray-500">Status: <span className={`font-bold ${
                                            ride.status === 'completed' ? 'text-green-600' :
                                            ride.status === 'cancelled' ? 'text-red-600' :
                                            'text-blue-600'
                                        }`}>{ride.status}</span></p>
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
                                        {/* <button onClick={() => reassignRide(ride.id)} className="text-xs text-blue-500 underline">Reassign</button> */}
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
                    <div className="space-y-4">
                        {drivers.map(driver => (
                            <div key={driver.id} className="flex justify-between items-center border-b pb-2">
                                <div>
                                    <p className="font-medium">{driver.full_name || driver.email || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">ID: {driver.id.slice(0, 8)}...</p>
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
