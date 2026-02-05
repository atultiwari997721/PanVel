const io = require('socket.io-client');

const socketUrl = 'http://localhost:5000';

// 1. Admin Socket
const adminSocket = io(socketUrl);

adminSocket.on('connect', () => {
    console.log('Admin connected:', adminSocket.id);
    adminSocket.emit('join_admin');
});

adminSocket.on('ride_updated', (ride) => {
    console.log('SUCCESS: Admin received ride_updated:', ride.id);
    console.log('Test Passed. Backend is working.');
    process.exit(0);
});

// 2. User Socket
const userSocket = io(socketUrl);

userSocket.on('connect', () => {
    console.log('User connected:', userSocket.id);
    
    // Request a ride after brief delay
    setTimeout(() => {
        console.log('Sending request_ride...');
        userSocket.emit('request_ride', {
            riderId: '22222222-2222-4222-8222-222222222222',
            pickup: { lat: 19.0330, lng: 73.0297, address: 'Realtime Test Pickup' },
            drop: { lat: 18.9894, lng: 73.1175, address: 'Realtime Test Drop' },
            fare: 200,
            distance: 7.5
        });
    }, 1000);
});

userSocket.on('error', (err) => {
    console.error('User received error:', err);
});

// Timeout
setTimeout(() => {
    console.log('TIMEOUT: No event received after 10s.');
    process.exit(1);
}, 10000);
