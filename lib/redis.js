import { createClient } from 'redis';

// Track connection state
let client = null;
let isConnecting = false;
let connectionPromise = null;

// Get Redis client (creates it if doesn't exist)
export async function getRedisClient() {
    // If already connected, return the client
    if (client && client.isOpen) {
        return client;
    }

    // If connection is in progress, wait for it
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    // Start new connection
    isConnecting = true;
    console.log('Creating new Redis connection...');

    try {
        // Create a new client
        client = createClient({
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT),
            }
        });

        // Set up error handler
        client.on('error', (err) => {
            console.error('Redis client error:', err);
        });

        // Connect and wait
        connectionPromise = client.connect();
        await connectionPromise;
        console.log('Redis connected successfully!');

        return client;
    } catch (error) {
        console.error('Redis connection failed:', error);
        // Reset state on failure
        client = null;
        isConnecting = false;
        connectionPromise = null;
        throw error;
    } finally {
        isConnecting = false;
    }
}

// --- Core Redis functions for default export compatibility ---

// Get value by key
export async function get(key) {
    const redis = await getRedisClient();
    return redis.get(key);
}

// Set value with key, with optional expiration
export async function set(key, value, ...args) {
    const redis = await getRedisClient();
    return redis.set(key, value, ...args);
}

// Delete key
export async function del(key) {
    const redis = await getRedisClient();
    return redis.del(key);
}

// Publish to channel
export async function publish(channel, message) {
    const redis = await getRedisClient();
    return redis.publish(channel, message);
}

// Key prefixes for different data types
const ITEM_AVAILABILITY_KEY = (itemId) => `item:${itemId}:available`;
const EXTRA_AVAILABILITY_KEY = (itemId, extraId) => `item:${itemId}:extra:${extraId}:available`;
const OPTION_AVAILABILITY_KEY = (itemId, customId, optionId) =>
    `item:${itemId}:custom:${customId}:option:${optionId}:available`;

// --- Item Availability Functions ---

// Set item availability in Redis
export async function setItemAvailability(itemId, isAvailable) {
    const redis = await getRedisClient();
    console.log(`Setting item ${itemId} availability to ${isAvailable}`);
    await redis.set(ITEM_AVAILABILITY_KEY(itemId), isAvailable ? '1' : '0');
    // Set TTL to prevent stale data (1 day)
    await redis.expire(ITEM_AVAILABILITY_KEY(itemId), 86400);
}

// Get item availability from Redis
export async function getItemAvailability(itemId) {
    const redis = await getRedisClient();
    const value = await redis.get(ITEM_AVAILABILITY_KEY(itemId));
    return value === '1';
}

// --- Extra Item Availability Functions ---

// Set extra item availability in Redis
export async function setExtraAvailability(itemId, extraId, isAvailable) {
    const redis = await getRedisClient();
    console.log(`Setting extra ${extraId} for item ${itemId} availability to ${isAvailable}`);
    await redis.set(EXTRA_AVAILABILITY_KEY(itemId, extraId), isAvailable ? '1' : '0');
    await redis.expire(EXTRA_AVAILABILITY_KEY(itemId, extraId), 86400);
}

// Get extra item availability from Redis
export async function getExtraAvailability(itemId, extraId) {
    const redis = await getRedisClient();
    const value = await redis.get(EXTRA_AVAILABILITY_KEY(itemId, extraId));
    return value === '1';
}

// --- Customization Option Availability Functions ---

// Set customization option availability in Redis
export async function setOptionAvailability(itemId, customId, optionId, isAvailable) {
    const redis = await getRedisClient();
    console.log(`Setting option ${optionId} in customization ${customId} for item ${itemId} availability to ${isAvailable}`);
    await redis.set(OPTION_AVAILABILITY_KEY(itemId, customId, optionId), isAvailable ? '1' : '0');
    await redis.expire(OPTION_AVAILABILITY_KEY(itemId, customId, optionId), 86400);
}

// Get customization option availability from Redis
export async function getOptionAvailability(itemId, customId, optionId) {
    const redis = await getRedisClient();
    const value = await redis.get(OPTION_AVAILABILITY_KEY(itemId, customId, optionId));
    return value === '1';
}

// --- Publish Stock Updates ---

// Publish stock update to Redis for real-time updates
export async function publishStockUpdate(stallId, update) {
    const redis = await getRedisClient();
    const channel = `stock:${stallId}`;
    const message = JSON.stringify({
        ...update,
        timestamp: Date.now()
    });
    console.log(`Publishing stock update to ${channel}:`, message);
    return redis.publish(channel, message);
}

// --- Batch Operations ---

// Sync all item availabilities for a stall from Firestore to Redis
export async function syncStallItemsToRedis(stallId, items) {
    const redis = await getRedisClient();
    console.log(`Syncing ${items.length} items for stall ${stallId} to Redis`);

    const pipeline = redis.multi();

    for (const item of items) {
        // Main item availability
        pipeline.set(ITEM_AVAILABILITY_KEY(item.id), item.isAvailable !== false ? '1' : '0');
        pipeline.expire(ITEM_AVAILABILITY_KEY(item.id), 86400);

        // Extras availability
        if (item.extras && item.extras.length > 0) {
            for (const extra of item.extras) {
                pipeline.set(
                    EXTRA_AVAILABILITY_KEY(item.id, extra.id),
                    extra.isAvailable !== false ? '1' : '0'
                );
                pipeline.expire(EXTRA_AVAILABILITY_KEY(item.id, extra.id), 86400);
            }
        }

        // Customization options availability
        if (item.customizations && item.customizations.length > 0) {
            for (const customization of item.customizations) {
                if (customization.options && customization.options.length > 0) {
                    for (const option of customization.options) {
                        pipeline.set(
                            OPTION_AVAILABILITY_KEY(item.id, customization.id, option.id),
                            option.isAvailable !== false ? '1' : '0'
                        );
                        pipeline.expire(OPTION_AVAILABILITY_KEY(item.id, customization.id, option.id), 86400);
                    }
                }
            }
        }
    }

    await pipeline.exec();
    console.log(`Finished syncing items for stall ${stallId} to Redis`);
}

// Test function to verify Redis connection
export async function pingRedis() {
    try {
        const redis = await getRedisClient();
        const pong = await redis.ping();
        console.log('Redis ping response:', pong);
        return pong === 'PONG';
    } catch (error) {
        console.error('Redis ping failed:', error);
        return false;
    }
}

// Create a more complete default export that matches redis commands
const redisModule = {
    get,
    set,
    del,
    publish,
    pingRedis,
    setItemAvailability,
    getItemAvailability,
    setExtraAvailability,
    getExtraAvailability,
    setOptionAvailability,
    getOptionAvailability,
    publishStockUpdate,
    syncStallItemsToRedis
};

export default redisModule;