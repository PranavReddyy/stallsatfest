const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');

// Load the service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const timestamp = FieldValue.serverTimestamp();

// Redis configuration
const REDIS_CONFIG = {
    username: 'default',
    password: 'CzUjzWEFZYfGxTGymEjFT6x5RVEM7F57',
    socket: {
        host: 'redis-18515.crce179.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 18515
    }
};

/**
 * Connect to Redis
 * @returns {Promise<Object>} Redis client
 */
async function connectToRedis() {
    try {
        const redis = createClient(REDIS_CONFIG);
        await redis.connect();
        console.log('Connected to Redis');
        return redis;
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
}

/**
 * Clear all Redis caches for a stall
 * @param {Object} redis - Redis client
 * @param {string} stallId - Stall ID
 */
async function clearStallCaches(redis, stallId) {
    try {
        // Clear all stalls list cache
        await redis.del('stalls:all');
        console.log('Cleared stalls:all cache');

        // Clear specific stall cache
        await redis.del(`stall:${stallId}:details`);
        console.log(`Cleared stall:${stallId}:details cache`);

        // Clear menu cache if it exists
        await redis.del(`stall:${stallId}:menu`);
        console.log(`Cleared stall:${stallId}:menu cache`);
    } catch (error) {
        console.error('Error clearing Redis caches:', error);
    }
}

/**
 * Send a WebSocket notification for stall visibility changes
 * @param {Object} redis - Redis client
 * @param {string} stallId - Stall ID
 * @param {boolean} isActive - New active status
 * @param {string} stallName - Stall name
 */
async function notifyStallVisibility(redis, stallId, isActive, stallName) {
    try {
        const message = JSON.stringify({
            stallId,
            isActive,
            stallName,
            timestamp: Date.now()
        });

        await redis.publish('stalls:visibility', message);
        console.log('Published stall visibility update to Redis');
    } catch (error) {
        console.error('Error publishing stall visibility update:', error);
    }
}

/**
 * Send a WebSocket notification for item availability changes
 * @param {Object} redis - Redis client
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 * @param {boolean} availability - New availability status
 * @param {string} itemName - Item name
 */
async function notifyItemAvailability(redis, stallId, itemId, availability, itemName) {
    try {
        const message = JSON.stringify({
            type: 'item',
            stallId,
            itemId,
            availability,
            itemName,
            timestamp: Date.now()
        });

        await redis.publish(`stock:${stallId}`, message);
        console.log(`Published item ${itemId} availability update to Redis`);
    } catch (error) {
        console.error('Error publishing item availability update:', error);
    }
}

/**
 * Send a WebSocket notification for extra availability changes
 * @param {Object} redis - Redis client
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 * @param {string} extraId - Extra ID
 * @param {boolean} availability - New availability status
 * @param {string} extraName - Extra name
 */
async function notifyExtraAvailability(redis, stallId, itemId, extraId, availability, extraName) {
    try {
        const message = JSON.stringify({
            type: 'extra',
            stallId,
            itemId,
            extraId,
            availability,
            extraName,
            timestamp: Date.now()
        });

        await redis.publish(`stock:${stallId}`, message);
        console.log(`Published extra ${extraId} availability update to Redis`);
    } catch (error) {
        console.error('Error publishing extra availability update:', error);
    }
}

/**
 * Send a WebSocket notification for customization option availability changes
 * @param {Object} redis - Redis client
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 * @param {string} customId - Customization ID
 * @param {string} optionId - Option ID
 * @param {boolean} availability - New availability status
 * @param {string} customName - Customization name
 * @param {string} optionName - Option name
 */
async function notifyOptionAvailability(redis, stallId, itemId, customId, optionId, availability, customName, optionName) {
    try {
        const message = JSON.stringify({
            type: 'option',
            stallId,
            itemId,
            customId,
            optionId,
            availability,
            customName,
            optionName,
            timestamp: Date.now()
        });

        await redis.publish(`stock:${stallId}`, message);
        console.log(`Published option ${optionId} availability update to Redis`);
    } catch (error) {
        console.error('Error publishing option availability update:', error);
    }
}

/**
 * Update Redis availability status for an item
 * @param {Object} redis - Redis client
 * @param {string} itemId - Item ID
 * @param {boolean} availability - New availability status
 */
async function updateItemRedisAvailability(redis, itemId, availability) {
    try {
        await redis.set(`item:${itemId}:available`, availability ? '1' : '0');
        await redis.expire(`item:${itemId}:available`, 86400); // 1 day
        console.log(`Updated item ${itemId} availability in Redis to ${availability}`);
    } catch (error) {
        console.error('Error updating item availability in Redis:', error);
    }
}

/**
 * Update Redis availability status for an extra
 * @param {Object} redis - Redis client
 * @param {string} itemId - Item ID
 * @param {string} extraId - Extra ID
 * @param {boolean} availability - New availability status
 */
async function updateExtraRedisAvailability(redis, itemId, extraId, availability) {
    try {
        await redis.set(`item:${itemId}:extra:${extraId}:available`, availability ? '1' : '0');
        await redis.expire(`item:${itemId}:extra:${extraId}:available`, 86400); // 1 day
        console.log(`Updated extra ${extraId} availability in Redis to ${availability}`);
    } catch (error) {
        console.error('Error updating extra availability in Redis:', error);
    }
}

/**
 * Update Redis availability status for a customization option
 * @param {Object} redis - Redis client
 * @param {string} itemId - Item ID
 * @param {string} customId - Customization ID
 * @param {string} optionId - Option ID
 * @param {boolean} availability - New availability status
 */
async function updateOptionRedisAvailability(redis, itemId, customId, optionId, availability) {
    try {
        await redis.set(`item:${itemId}:custom:${customId}:option:${optionId}:available`, availability ? '1' : '0');
        await redis.expire(`item:${itemId}:custom:${customId}:option:${optionId}:available`, 86400); // 1 day
        console.log(`Updated option ${optionId} availability in Redis to ${availability}`);
    } catch (error) {
        console.error('Error updating option availability in Redis:', error);
    }
}

/**
 * Toggle stall active status
 * @param {string} stallId - Stall ID
 */
async function toggleStallActive(stallId) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        // Get stall data
        const stallDoc = await db.collection('stalls').doc(stallId).get();
        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return false;
        }

        const stallData = stallDoc.data();
        const currentStatus = stallData.isActive !== false; // Default to true if not set
        const newStatus = !currentStatus;
        const stallName = stallData.name || 'Unknown stall';

        // Update in Firestore
        await db.collection('stalls').doc(stallId).update({
            isActive: newStatus,
            updatedAt: timestamp
        });

        console.log(`Toggled stall ${stallId} (${stallName}) active status to ${newStatus}.`);

        // Clear Redis caches
        await clearStallCaches(redis, stallId);

        // Notify via WebSocket
        await notifyStallVisibility(redis, stallId, newStatus, stallName);

        return true;
    } catch (error) {
        console.error(`Error toggling stall ${stallId} active status:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * Toggle item availability
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 */
async function toggleMenuItemAvailable(stallId, itemId) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        // Get item data
        const itemDoc = await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).get();
        if (!itemDoc.exists) {
            console.log(`Menu item with ID ${itemId} does not exist in stall ${stallId}.`);
            return false;
        }

        const itemData = itemDoc.data();
        const currentStatus = itemData.isAvailable !== false; // Default to true if not set
        const newStatus = !currentStatus;
        const itemName = itemData.name || 'Unknown item';

        // Update in Firestore
        await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).update({
            isAvailable: newStatus,
            updatedAt: timestamp
        });

        console.log(`Toggled menu item ${itemId} (${itemName}) in stall ${stallId} availability to ${newStatus}.`);

        // Clear Redis caches
        await clearStallCaches(redis, stallId);

        // Update Redis availability
        await updateItemRedisAvailability(redis, itemId, newStatus);

        // Notify via WebSocket
        await notifyItemAvailability(redis, stallId, itemId, newStatus, itemName);

        return true;
    } catch (error) {
        console.error(`Error toggling menu item ${itemId} in stall ${stallId} availability:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * Toggle extra availability
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 * @param {string} extraId - Extra ID
 */
async function toggleExtraAvailable(stallId, itemId, extraId) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        // Get item data
        const itemDoc = await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).get();
        if (!itemDoc.exists) {
            console.log(`Menu item with ID ${itemId} does not exist in stall ${stallId}.`);
            return false;
        }

        const itemData = itemDoc.data();
        const extras = itemData.extras || [];

        // Find the specific extra
        const extraIndex = extras.findIndex(e => e.id === extraId);
        if (extraIndex === -1) {
            console.log(`Extra with ID ${extraId} does not exist in item ${itemId}.`);
            return false;
        }

        const extra = extras[extraIndex];
        const currentStatus = extra.isAvailable !== false; // Default to true if not set
        const newStatus = !currentStatus;
        const extraName = extra.name || 'Unknown extra';

        // Update the extras array
        extras[extraIndex] = {
            ...extra,
            isAvailable: newStatus
        };

        // Update in Firestore
        await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).update({
            extras: extras,
            updatedAt: timestamp
        });

        console.log(`Toggled extra ${extraId} (${extraName}) in item ${itemId} availability to ${newStatus}.`);

        // Clear Redis caches
        await clearStallCaches(redis, stallId);

        // Update Redis availability
        await updateExtraRedisAvailability(redis, itemId, extraId, newStatus);

        // Notify via WebSocket
        await notifyExtraAvailability(redis, stallId, itemId, extraId, newStatus, extraName);

        return true;
    } catch (error) {
        console.error(`Error toggling extra ${extraId} in item ${itemId} availability:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * Toggle customization option availability
 * @param {string} stallId - Stall ID
 * @param {string} itemId - Item ID
 * @param {string} customId - Customization ID
 * @param {string} optionId - Option ID
 */
async function toggleOptionAvailable(stallId, itemId, customId, optionId) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        // Get item data
        const itemDoc = await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).get();
        if (!itemDoc.exists) {
            console.log(`Menu item with ID ${itemId} does not exist in stall ${stallId}.`);
            return false;
        }

        const itemData = itemDoc.data();
        const customizations = itemData.customizations || [];

        // Find the specific customization
        const customIndex = customizations.findIndex(c => c.id === customId);
        if (customIndex === -1) {
            console.log(`Customization with ID ${customId} does not exist in item ${itemId}.`);
            return false;
        }

        const customization = customizations[customIndex];
        const options = customization.options || [];

        // Find the specific option
        const optionIndex = options.findIndex(o => o.id === optionId);
        if (optionIndex === -1) {
            console.log(`Option with ID ${optionId} does not exist in customization ${customId}.`);
            return false;
        }

        const option = options[optionIndex];
        const currentStatus = option.isAvailable !== false; // Default to true if not set
        const newStatus = !currentStatus;
        const customName = customization.name || 'Unknown customization';
        const optionName = option.name || 'Unknown option';

        // Update the option
        options[optionIndex] = {
            ...option,
            isAvailable: newStatus
        };

        // Update the customization
        customizations[customIndex] = {
            ...customization,
            options: options
        };

        // Update in Firestore
        await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).update({
            customizations: customizations,
            updatedAt: timestamp
        });

        console.log(`Toggled option ${optionId} (${optionName}) in customization ${customId} (${customName}) availability to ${newStatus}.`);

        // Clear Redis caches
        await clearStallCaches(redis, stallId);

        // Update Redis availability
        await updateOptionRedisAvailability(redis, itemId, customId, optionId, newStatus);

        // Notify via WebSocket
        await notifyOptionAvailability(redis, stallId, itemId, customId, optionId, newStatus, customName, optionName);

        return true;
    } catch (error) {
        console.error(`Error toggling option ${optionId} in customization ${customId} availability:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * List all stalls and their menu items
 */
async function listAllStalls() {
    try {
        const stallsSnapshot = await db.collection('stalls').get();

        if (stallsSnapshot.empty) {
            console.log('No stalls found in the database.');
            return;
        }

        console.log('\n======== STALLS ========\n');

        for (const stallDoc of stallsSnapshot.docs) {
            const stallData = stallDoc.data();
            console.log(`ID: ${stallDoc.id}`);
            console.log(`Name: ${stallData.name}`);
            console.log(`Description: ${stallData.description}`);
            console.log(`Stall Owner: ${stallData.stall_owner || 'Not assigned'}`);
            console.log(`Active: ${stallData.isActive !== false ? 'Yes' : 'No'}`);
            console.log(`Categories: ${stallData.categories?.join(', ') || 'None'}`);

            // Get menu items
            const menuItemsSnapshot = await db.collection(`stalls/${stallDoc.id}/menu_items`).get();

            console.log('\nMenu Items:');
            if (menuItemsSnapshot.empty) {
                console.log('  No menu items found.');
            } else {
                menuItemsSnapshot.forEach(itemDoc => {
                    const itemData = itemDoc.data();
                    console.log(`  - ID: ${itemDoc.id}`);
                    console.log(`    Name: ${itemData.name}`);
                    console.log(`    Price: ₹${itemData.price}`);
                    console.log(`    Available: ${itemData.isAvailable !== false ? 'Yes' : 'No'}`);
                    console.log(`    Extras: ${itemData.extras ? itemData.extras.length : 0}`);
                    console.log(`    Customizations: ${itemData.customizations ? itemData.customizations.length : 0}`);
                    console.log('');
                });
            }

            console.log('------------------------\n');
        }
    } catch (error) {
        console.error('Error listing stalls:', error);
    }
}

/**
 * List a specific stall and its menu items in detail
 * @param {string} stallId - Stall ID
 */
async function listStallDetailed(stallId) {
    try {
        const stallDoc = await db.collection('stalls').doc(stallId).get();

        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return;
        }

        const stallData = stallDoc.data();
        console.log('\n======== STALL DETAILS ========\n');
        console.log(`ID: ${stallDoc.id}`);
        console.log(`Name: ${stallData.name}`);
        console.log(`Description: ${stallData.description}`);
        console.log(`Stall Owner: ${stallData.stall_owner || 'Not assigned'}`);
        console.log(`Active: ${stallData.isActive !== false ? 'Yes' : 'No'}`);
        console.log(`Categories: ${stallData.categories?.join(', ') || 'None'}`);

        // Get menu items
        const menuItemsSnapshot = await db.collection(`stalls/${stallDoc.id}/menu_items`).get();

        console.log('\nMenu Items:');
        if (menuItemsSnapshot.empty) {
            console.log('  No menu items found.');
        } else {
            for (const itemDoc of menuItemsSnapshot.docs) {
                const itemData = itemDoc.data();
                console.log(`  - ID: ${itemDoc.id}`);
                console.log(`    Name: ${itemData.name}`);
                console.log(`    Price: ₹${itemData.price}`);
                console.log(`    Available: ${itemData.isAvailable !== false ? 'Yes' : 'No'}`);

                // Show extras
                if (itemData.extras && itemData.extras.length > 0) {
                    console.log('    Extras:');
                    itemData.extras.forEach(extra => {
                        console.log(`      * ${extra.name} (₹${extra.price}) - ${extra.isAvailable !== false ? 'Available' : 'Unavailable'}`);
                    });
                }

                // Show customizations
                if (itemData.customizations && itemData.customizations.length > 0) {
                    console.log('    Customizations:');
                    itemData.customizations.forEach(custom => {
                        console.log(`      * ${custom.name} (${custom.required ? 'Required' : 'Optional'}):`);

                        if (custom.options && custom.options.length > 0) {
                            custom.options.forEach(option => {
                                console.log(`        - ${option.name} (₹${option.price}) - ${option.isAvailable !== false ? 'Available' : 'Unavailable'}`);
                            });
                        }
                    });
                }

                console.log('');
            }
        }

        console.log('------------------------\n');
    } catch (error) {
        console.error(`Error listing stall ${stallId} details:`, error);
    }
}

/**
 * List all stalls by owner email
 * @param {string} ownerEmail - Owner email
 */
async function listStallsByOwner(ownerEmail) {
    try {
        const stallsSnapshot = await db.collection('stalls')
            .where('stall_owner', '==', ownerEmail)
            .get();

        if (stallsSnapshot.empty) {
            console.log(`No stalls found for owner: ${ownerEmail}`);
            return;
        }

        console.log(`\n======== STALLS FOR ${ownerEmail} ========\n`);

        for (const stallDoc of stallsSnapshot.docs) {
            const stallData = stallDoc.data();
            console.log(`ID: ${stallDoc.id}`);
            console.log(`Name: ${stallData.name}`);
            console.log(`Description: ${stallData.description}`);
            console.log(`Active: ${stallData.isActive !== false ? 'Yes' : 'No'}`);
            console.log(`Categories: ${stallData.categories?.join(', ') || 'None'}`);
            console.log('------------------------\n');
        }
    } catch (error) {
        console.error('Error listing stalls by owner:', error);
    }
}

/**
 * Set/update stall owner
 * @param {string} stallId - Stall ID
 * @param {string} ownerEmail - Owner email
 */
async function setStallOwner(stallId, ownerEmail) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        const stallDoc = await db.collection('stalls').doc(stallId).get();
        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return false;
        }

        // Update in Firestore
        await db.collection('stalls').doc(stallId).update({
            stall_owner: ownerEmail,
            updatedAt: timestamp
        });

        console.log(`Updated stall ${stallId} owner to ${ownerEmail}.`);

        // Clear Redis caches
        await clearStallCaches(redis, stallId);

        return true;
    } catch (error) {
        console.error(`Error updating stall ${stallId} owner:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * Synchronize all items for a stall to Redis
 * @param {string} stallId - Stall ID
 */
async function syncStallItemsToRedis(stallId) {
    let redis;

    try {
        // Connect to Redis
        redis = await connectToRedis();

        // Get all menu items
        const menuItemsSnapshot = await db.collection(`stalls/${stallId}/menu_items`).get();

        if (menuItemsSnapshot.empty) {
            console.log(`No menu items found for stall ${stallId}.`);
            return;
        }

        console.log(`Syncing ${menuItemsSnapshot.size} items for stall ${stallId} to Redis...`);

        // Prepare Redis pipeline for batch operations
        const pipeline = redis.multi();

        // Process each menu item
        for (const itemDoc of menuItemsSnapshot.docs) {
            const itemId = itemDoc.id;
            const itemData = itemDoc.data();

            // Main item availability
            const itemAvailable = itemData.isAvailable !== false;
            pipeline.set(`item:${itemId}:available`, itemAvailable ? '1' : '0');
            pipeline.expire(`item:${itemId}:available`, 86400); // 1 day

            // Extras availability
            if (itemData.extras && itemData.extras.length > 0) {
                for (const extra of itemData.extras) {
                    const extraAvailable = extra.isAvailable !== false;
                    pipeline.set(`item:${itemId}:extra:${extra.id}:available`, extraAvailable ? '1' : '0');
                    pipeline.expire(`item:${itemId}:extra:${extra.id}:available`, 86400);
                }
            }

            // Customization options availability
            if (itemData.customizations && itemData.customizations.length > 0) {
                for (const custom of itemData.customizations) {
                    if (custom.options && custom.options.length > 0) {
                        for (const option of custom.options) {
                            const optionAvailable = option.isAvailable !== false;
                            pipeline.set(`item:${itemId}:custom:${custom.id}:option:${option.id}:available`, optionAvailable ? '1' : '0');
                            pipeline.expire(`item:${itemId}:custom:${custom.id}:option:${option.id}:available`, 86400);
                        }
                    }
                }
            }
        }

        // Execute all Redis commands
        await pipeline.exec();
        console.log(`Successfully synced stall ${stallId} data to Redis.`);

        // Clear cached menu data to force refresh
        await redis.del(`stall:${stallId}:details`);
        await redis.del(`stall:${stallId}:menu`);
        console.log(`Cleared stall ${stallId} caches.`);

        return true;
    } catch (error) {
        console.error(`Error syncing stall ${stallId} items to Redis:`, error);
        return false;
    } finally {
        if (redis) {
            await redis.disconnect();
            console.log('Disconnected from Redis');
        }
    }
}

/**
 * Main function to handle command line arguments
 */
async function main() {
    const command = process.argv[2];

    if (!command) {
        console.log('Please provide a command:');
        console.log('  list - List all stalls and menu items');
        console.log('  stall <stallId> - Show detailed info for a specific stall');
        console.log('  list-by-owner <email> - List all stalls for a specific owner');
        console.log('  toggle-stall <stallId> - Toggle a stall\'s active status');
        console.log('  toggle-item <stallId> <itemId> - Toggle a menu item\'s availability');
        console.log('  toggle-extra <stallId> <itemId> <extraId> - Toggle an extra\'s availability');
        console.log('  toggle-option <stallId> <itemId> <customId> <optionId> - Toggle an option\'s availability');
        console.log('  set-owner <stallId> <email> - Set/update stall owner email');
        console.log('  sync-redis <stallId> - Sync all items for a stall to Redis');
        process.exit(0);
    }

    switch (command) {
        case 'list':
            await listAllStalls();
            break;

        case 'stall':
            const stallId = process.argv[3];
            if (!stallId) {
                console.log('Please provide a stall ID.');
                break;
            }
            await listStallDetailed(stallId);
            break;

        case 'list-by-owner':
            const ownerEmail = process.argv[3];
            if (!ownerEmail) {
                console.log('Please provide an owner email.');
                break;
            }
            await listStallsByOwner(ownerEmail);
            break;

        case 'toggle-stall':
            const tStallId = process.argv[3];
            if (!tStallId) {
                console.log('Please provide a stall ID.');
                break;
            }
            await toggleStallActive(tStallId);
            break;

        case 'toggle-item':
            const tiStallId = process.argv[3];
            const itemId = process.argv[4];
            if (!tiStallId || !itemId) {
                console.log('Please provide both stall ID and item ID.');
                break;
            }
            await toggleMenuItemAvailable(tiStallId, itemId);
            break;

        case 'toggle-extra':
            const teStallId = process.argv[3];
            const teItemId = process.argv[4];
            const extraId = process.argv[5];
            if (!teStallId || !teItemId || !extraId) {
                console.log('Please provide stall ID, item ID, and extra ID.');
                break;
            }
            await toggleExtraAvailable(teStallId, teItemId, extraId);
            break;

        case 'toggle-option':
            const toStallId = process.argv[3];
            const toItemId = process.argv[4];
            const customId = process.argv[5];
            const optionId = process.argv[6];
            if (!toStallId || !toItemId || !customId || !optionId) {
                console.log('Please provide stall ID, item ID, customization ID, and option ID.');
                break;
            }
            await toggleOptionAvailable(toStallId, toItemId, customId, optionId);
            break;

        case 'set-owner':
            const soStallId = process.argv[3];
            const soEmail = process.argv[4];
            if (!soStallId || !soEmail) {
                console.log('Please provide both stall ID and owner email.');
                break;
            }
            await setStallOwner(soStallId, soEmail);
            break;

        case 'sync-redis':
            const srStallId = process.argv[3];
            if (!srStallId) {
                console.log('Please provide a stall ID.');
                break;
            }
            await syncStallItemsToRedis(srStallId);
            break;

        default:
            console.log('Unknown command:', command);
            break;
    }

    process.exit(0);
}

// Run the script
main();