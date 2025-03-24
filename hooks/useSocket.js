import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Singleton socket instance
let socket;

export default function useSocket(channel = 'all') {
    const [isConnected, setIsConnected] = useState(false);
    const [stockUpdates, setStockUpdates] = useState([]);
    const stockUpdatesRef = useRef([]);

    // Initialize socket
    useEffect(() => {
        // Make sure socket server is initialized
        const initSocket = async () => {
            try {
                // Initialize the socket server if needed
                await fetch('/api/socket');

                if (!socket) {
                    socket = io();

                    socket.on('connect', () => {
                        console.log('Socket connected!');
                        setIsConnected(true);
                    });

                    socket.on('disconnect', () => {
                        console.log('Socket disconnected');
                        setIsConnected(false);
                    });
                }

                // Subscribe to updates for a specific stall
                if (channel !== 'all') {
                    console.log(`Subscribing to ${channel}`);
                    socket.emit('subscribe', channel);
                }

                // Listen for stock updates
                function handleStockUpdate(update) {
                    console.log('Received stock update:', update);

                    // Add to the updates array
                    const newUpdates = [...stockUpdatesRef.current, update];
                    stockUpdatesRef.current = newUpdates;
                    setStockUpdates(newUpdates);

                    // Also dispatch a custom event for components to listen to
                    window.dispatchEvent(new CustomEvent('stockUpdate', {
                        detail: update
                    }));
                }

                // Listen for stall visibility updates
                function handleStallVisibility(update) {
                    console.log('Received stall visibility update:', update);
                    // Dispatch a custom event for components to listen to
                    window.dispatchEvent(new CustomEvent('stallVisibilityUpdate', {
                        detail: update
                    }));
                }

                // Add event listeners
                socket.on('stockUpdate', handleStockUpdate);
                socket.on('stallVisibilityUpdate', handleStallVisibility);

                // Clean up function
                return () => {
                    // Remove event listeners
                    socket.off('stockUpdate', handleStockUpdate);
                    socket.off('stallVisibilityUpdate', handleStallVisibility);

                    // Unsubscribe from channel
                    if (channel !== 'all') {
                        socket.emit('unsubscribe', channel);
                    }
                };
            } catch (err) {
                console.error('Socket initialization error:', err);
            }
        };

        initSocket();

        // Reset stock updates when channel changes
        return () => {
            setStockUpdates([]);
            stockUpdatesRef.current = [];
        };
    }, [channel]);

    // Function to clear updates after processing
    const clearStockUpdates = () => {
        setStockUpdates([]);
        stockUpdatesRef.current = [];
    };

    return { socket, isConnected, stockUpdates, clearStockUpdates };
}