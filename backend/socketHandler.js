const { createClient } = require('@supabase/supabase-js');

module.exports = (io, supabase) => {
  const activeDrivers = {}; // socketId -> driverId mapping?? Or just use rooms.
  // Actually, we can join drivers to a 'drivers' room if they are online.

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room based on user ID if provided
    socket.on('join_room', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    // Driver goes online
    socket.on('driver_online', async ({ driverId, location }) => {
        // location: { lat, lng }
        try {
            await supabase.from('profiles').update({
                is_online: true,
                current_location: `POINT(${location.lng} ${location.lat})`
            }).eq('id', driverId);
            
            socket.join('drivers'); // Join generic drivers room? 
            // Better: We will query nearest drivers and emit to their specific IDs.
        } catch (e) {
            console.error('Error going online:', e);
        }
    });

    // Driver location update (frequent)
    socket.on('update_location', async ({ driverId, location }) => {
        // Debounce database updates in production!
        // For now, update DB directly or Redis. 
        // We'll update Supabase for simplicity as per prompt.
        await supabase.from('profiles').update({
            current_location: `POINT(${location.lng} ${location.lat})`
        }).eq('id', driverId);
    });

    // User requests a ride
    socket.on('request_ride', async (rideData) => {
        // rideData: { riderId, pickup: {lat, lng}, drop: {lat, lng}, fare, distance }
        console.log('Ride requested', rideData);

        try {
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
                    // Send to driver's personal room (assuming they joined one with their ID)
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
        // Use a transaction or optimistic lock to ensure only one driver accepts
        // For MERN simplicity: FIFO
        try {
            // Check if ride is still 'requested'
            const { data: ride } = await supabase.from('rides').select('status, rider_id').eq('id', rideId).single();
            if (ride && ride.status === 'requested') {
                // Assign Driver
                const { error } = await supabase.from('rides')
                    .update({ status: 'accepted', driver_id: driverId })
                    .eq('id', rideId);
                
                if (!error) {
                    // Notify User
                    io.to(ride.rider_id).emit('ride_accepted', { driverId, rideId });
                    // Notify other drivers (optional: to remove the popup)
                    // We'd need to know which drivers received the request originally. 
                    // For now, client side can check status or timeout.
                }
            } else {
                socket.emit('ride_unavailable', { message: 'Ride already taken' });
            }
        } catch (e) {
            console.error('Error accepting ride:', e);
        }
    });

    socket.on('disconnect', () => {
       // mark driver offline?
    });
  });
};
