import { Server } from 'socket.io';
import { createClient } from 'redis';
import redis from '../../lib/redis';

// Define Redis configuration
const REDIS_CONFIG = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            // Reconnect after retries * 50ms
            return Math.min(retries * 50, 1000);
        }
    }
};

const SocketHandler = async (req, res) => {
    // Check if socket.io server is already running
    if (res.socket.server.io) {
        console.log('Socket is already running');
        res.end();
        return;
    }

    console.log('Setting up Socket.io server...');

    // Initialize Socket.io server
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    // Create Redis pub/sub clients - Import createClient from redis
    const pubClient = createClient(REDIS_CONFIG);
    const subClient = createClient(REDIS_CONFIG);

    try {
        await Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]);
        console.log('Redis pub/sub clients connected');

        // Subscribe to stall visibility updates
        await subClient.subscribe('stalls:visibility', (message) => {
            try {
                console.log('Received stall visibility update:', message);
                const update = JSON.parse(message);

                // Broadcast to all connected clients
                io.emit('stallVisibilityUpdate', update);
                console.log('Broadcast stall visibility update to all clients');
            } catch (err) {
                console.error('Error broadcasting stall visibility update:', err);
            }
        });

        // Subscribe to stock updates
        await subClient.pSubscribe('stock:*', (message, channel) => {
            try {
                const stallId = channel.split(':')[1];
                console.log(`Received stock update for stall ${stallId}:`, message);
                const update = JSON.parse(message);

                // Broadcast to stall room
                io.to(`stall:${stallId}`).emit('stockUpdate', update);
            } catch (err) {
                console.error('Error broadcasting stock update:', err);
            }
        });

        // Client connection handler
        io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}, total clients: ${io.engine.clientsCount}`);

            // Handle subscription to specific stall updates
            socket.on('subscribe', (stallId) => {
                socket.join(`stall:${stallId}`);
                console.log(`Client ${socket.id} subscribed to stall ${stallId}`);
            });

            // Handle unsubscription
            socket.on('unsubscribe', (stallId) => {
                socket.leave(`stall:${stallId}`);
                console.log(`Client ${socket.id} unsubscribed from stall ${stallId}`);
            });

            // Disconnect handler
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}, remaining clients: ${io.engine.clientsCount}`);
            });
        });

        console.log('Socket.io server setup complete');
    } catch (error) {
        console.error('Error setting up Socket.io server:', error);
    }

    res.end();
};

export default SocketHandler;