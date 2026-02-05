const { createClient } = require('@supabase/supabase-js');

module.exports = (io, supabase) => {

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room based on user ID if provided
    socket.on('join_room', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    // Admin joins admin room
    socket.on('join_admin', () => {
        socket.join('admin');
        console.log(`Socket ${socket.id} joined admin room`);
    });

    // Driver goes online
    socket.on('driver_online', async ({ driverId, location }) => {
        try {
            await supabase.from('profiles').update({
                is_online: true,
                current_location: `POINT(${location.lng} ${location.lat})`
            }).eq('id', driverId);
            
            // Notify Admin of driver update
            io.to('admin').emit('driver_updated', { id: driverId, is_online: true, lat: location.lat, lng: location.lng });
        } catch (e) {
            console.error('Error going online:', e);
        }
    });

    // Driver location update (frequent)
    socket.on('update_location', async ({ driverId, location, riderId }) => {
        await supabase.from('profiles').update({
            current_location: `POINT(${location.lng} ${location.lat})`
        }).eq('id', driverId);

        // 2. Direct emit to Rider if in a ride
        if (riderId) {
            io.to(riderId).emit('driver_location_update', location);
        }
    });

    // User requests a ride
    socket.on('request_ride', async (rideData) => {
        console.log('Ride requested', rideData);
        try {
            // 0. SELF-HEALING: Ensure Rider Profile Exists (Fix Foreign Key Error)
            const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', rideData.riderId).single();
            
            if (!profileCheck) {
                console.log(`Self-Healing: Creating missing profile for ${rideData.riderId}`);
                await supabase.from('profiles').insert({
                    id: rideData.riderId,
                    email: `healed_${rideData.riderId.slice(0,4)}@panvel.app`,
                    mobile: '0000000000',
                    full_name: 'Recovered User',
                    user_type: 'user',
                    is_online: true
                });
            }

            // 1. Create Ride Record in DB
            const { data: ride, error } = await supabase.from('rides').insert({
                rider_id: rideData.riderId,
                pickup_lat: rideData.pickup.lat,
                pickup_lng: rideData.pickup.lng,
                drop_lat: rideData.drop.lat,
                drop_lng: rideData.drop.lng,
                pickup_address: rideData.pickup.address,
                drop_address: rideData.drop.address,
                fare: rideData.fare,
                distance_km: rideData.distance,
                status: 'requested'
            }).select().single();

            if (error) throw error;

            console.log('Ride created:', ride.id);
            
            // Notify Admin
            io.to('admin').emit('ride_updated', ride);

            // 2. Find Nearest Drivers (within 5km)
            const { data: drivers, error: driversError } = await supabase.rpc('get_nearest_drivers', {
                lat: rideData.pickup.lat,
                lng: rideData.pickup.lng,
                radius_meters: 5000
            });

            if (driversError) {
                console.error('Error finding drivers:', driversError);
                return;
            }

            console.log(`Found ${drivers?.length} drivers`);

            // 3. Notify Drivers
            if (drivers && drivers.length > 0) {
                drivers.forEach(driver => {
                    io.to(driver.id).emit('new_ride_request', {
                        rideId: ride.id,
                        riderId: rideData.riderId,
                        pickup: rideData.pickup,
                        drop: rideData.drop,
                        fare: rideData.fare,
                        distance: drivers.find(d => d.id === driver.id).dist_meters 
                    });
                });
            } else {
                io.to(rideData.riderId).emit('no_drivers_found');
            }

        } catch (e) {
            console.error('Error processing ride request:', e);
            io.to(rideData.riderId).emit('error', { message: 'Failed to request ride' });
        }
    });

    // Driver Accepts Ride
    socket.on('accept_ride', async ({ driverId, rideId }) => {
        try {
            const { data: ride } = await supabase.from('rides').select('status, rider_id, pickup_lat, pickup_lng, drop_lat, drop_lng, pickup_address, drop_address, fare, distance_km').eq('id', rideId).single();
            
            if (ride && ride.status === 'requested') {
                const { error } = await supabase.from('rides')
                    .update({ status: 'accepted', driver_id: driverId })
                    .eq('id', rideId);
                
                if (!error) {
                    const updatedRide = { ...ride, id: rideId, status: 'accepted', driver_id: driverId };
                    
                    // Notify User
                    io.to(ride.rider_id).emit('ride_accepted', { driverId, rideId, ...updatedRide });
                    
                    // Notify Admin
                    io.to('admin').emit('ride_updated', updatedRide);
                }
            } else {
                socket.emit('ride_unavailable', { message: 'Ride already taken' });
            }
        } catch (e) {
            console.error('Error accepting ride:', e);
        }
    });

    // Driver/User Cancels Ride
    socket.on('cancel_ride', async ({ rideId, userId, isDriver }) => {
        try {
            console.log(`Ride ${rideId} cancelled by ${userId}`);
            const { data: ride } = await supabase.from('rides').select('rider_id, driver_id, status').eq('id', rideId).single();
            
            if (ride && ride.status !== 'completed') {
                await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
                
                const updatedRide = { ...ride, id: rideId, status: 'cancelled' };
                
                // Notify Rider
                io.to(ride.rider_id).emit('ride_cancelled', { reason: isDriver ? 'Driver cancelled the ride.' : 'You cancelled the ride.' });
                
                // Notify Driver (if user cancelled)
                if (ride.driver_id && !isDriver) {
                     io.to(ride.driver_id).emit('ride_cancelled', { reason: 'User cancelled the ride.' });
                }

                // Notify Admin
                io.to('admin').emit('ride_updated', updatedRide);
            }
        } catch (e) {
            console.error("Error cancelling ride:", e);
        }
    });

    socket.on('disconnect', () => {
       // mark driver offline?
    });
  });
};
