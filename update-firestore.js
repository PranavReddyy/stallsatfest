const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load the service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the app
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const timestamp = FieldValue.serverTimestamp();

// Function to update a specific stall by ID
async function updateStall(stallId, updates) {
    try {
        // Check if stall exists
        const stallDoc = await db.collection('stalls').doc(stallId).get();
        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return false;
        }

        // Update the stall with provided data
        await db.collection('stalls').doc(stallId).update({
            ...updates,
            updatedAt: timestamp
        });

        console.log(`Updated stall ${stallId} successfully.`);
        return true;
    } catch (error) {
        console.error(`Error updating stall ${stallId}:`, error);
        return false;
    }
}

// Function to update a menu item by stallId and itemId
async function updateMenuItem(stallId, itemId, updates) {
    try {
        // Check if the menu item exists
        const itemDoc = await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).get();
        if (!itemDoc.exists) {
            console.log(`Menu item with ID ${itemId} does not exist in stall ${stallId}.`);
            return false;
        }

        // Update the menu item
        await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).update({
            ...updates,
            updatedAt: timestamp
        });

        console.log(`Updated menu item ${itemId} in stall ${stallId} successfully.`);
        return true;
    } catch (error) {
        console.error(`Error updating menu item ${itemId} in stall ${stallId}:`, error);
        return false;
    }
}

// Function to toggle stall availability
async function toggleStallActive(stallId) {
    try {
        const stallDoc = await db.collection('stalls').doc(stallId).get();
        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return false;
        }

        const currentStatus = stallDoc.data().isActive !== false; // Default to true if not set

        await db.collection('stalls').doc(stallId).update({
            isActive: !currentStatus,
            updatedAt: timestamp
        });

        console.log(`Toggled stall ${stallId} active status to ${!currentStatus}.`);
        return true;
    } catch (error) {
        console.error(`Error toggling stall ${stallId} active status:`, error);
        return false;
    }
}

// Function to toggle a menu item's availability
async function toggleMenuItemAvailable(stallId, itemId) {
    try {
        const itemDoc = await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).get();
        if (!itemDoc.exists) {
            console.log(`Menu item with ID ${itemId} does not exist in stall ${stallId}.`);
            return false;
        }

        const currentStatus = itemDoc.data().isAvailable !== false; // Default to true if not set

        await db.collection(`stalls/${stallId}/menu_items`).doc(itemId).update({
            isAvailable: !currentStatus,
            updatedAt: timestamp
        });

        console.log(`Toggled menu item ${itemId} in stall ${stallId} availability to ${!currentStatus}.`);
        return true;
    } catch (error) {
        console.error(`Error toggling menu item ${itemId} in stall ${stallId} availability:`, error);
        return false;
    }
}

// List all stalls and their menu items
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
            console.log(`Categories: ${stallData.categories.join(', ')}`);

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

// Add function to set/update stall owner
async function setStallOwner(stallId, ownerEmail) {
    try {
        const stallDoc = await db.collection('stalls').doc(stallId).get();
        if (!stallDoc.exists) {
            console.log(`Stall with ID ${stallId} does not exist.`);
            return false;
        }

        await db.collection('stalls').doc(stallId).update({
            stall_owner: ownerEmail,
            updatedAt: timestamp
        });

        console.log(`Updated stall ${stallId} owner to ${ownerEmail}.`);
        return true;
    } catch (error) {
        console.error(`Error updating stall ${stallId} owner:`, error);
        return false;
    }
}

// List all stalls by owner email
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
            console.log(`Categories: ${stallData.categories.join(', ')}`);
            console.log('------------------------\n');
        }
    } catch (error) {
        console.error('Error listing stalls by owner:', error);
    }
}

// Example usage
async function main() {
    const command = process.argv[2];

    if (!command) {
        console.log('Please provide a command:');
        console.log('  list - List all stalls and menu items');
        console.log('  list-by-owner <email> - List all stalls for a specific owner');
        console.log('  toggle-stall <stallId> - Toggle a stall\'s active status');
        console.log('  toggle-item <stallId> <itemId> - Toggle a menu item\'s availability');
        console.log('  update-stall <stallId> <field> <value> - Update a stall field');
        console.log('  update-item <stallId> <itemId> <field> <value> - Update a menu item field');
        console.log('  set-owner <stallId> <email> - Set/update stall owner email');
        process.exit(0);
    }

    switch (command) {
        case 'list':
            await listAllStalls();
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
            const stallId = process.argv[3];
            if (!stallId) {
                console.log('Please provide a stall ID.');
                break;
            }
            await toggleStallActive(stallId);
            break;

        case 'toggle-item':
            const tStallId = process.argv[3];
            const itemId = process.argv[4];
            if (!tStallId || !itemId) {
                console.log('Please provide both stall ID and item ID.');
                break;
            }
            await toggleMenuItemAvailable(tStallId, itemId);
            break;

        case 'update-stall':
            const uStallId = process.argv[3];
            const stallField = process.argv[4];
            const stallValue = process.argv[5];
            if (!uStallId || !stallField || !stallValue) {
                console.log('Please provide stall ID, field, and value.');
                break;
            }

            // Parse value appropriately
            const parsedStallValue =
                stallValue === 'true' ? true :
                    stallValue === 'false' ? false :
                        !isNaN(stallValue) ? Number(stallValue) : stallValue;

            await updateStall(uStallId, { [stallField]: parsedStallValue });
            break;

        case 'update-item':
            const uiStallId = process.argv[3];
            const uiItemId = process.argv[4];
            const itemField = process.argv[5];
            const itemValue = process.argv[6];
            if (!uiStallId || !uiItemId || !itemField || !itemValue) {
                console.log('Please provide stall ID, item ID, field, and value.');
                break;
            }

            // Parse value appropriately
            const parsedItemValue =
                itemValue === 'true' ? true :
                    itemValue === 'false' ? false :
                        !isNaN(itemValue) ? Number(itemValue) : itemValue;

            await updateMenuItem(uiStallId, uiItemId, { [itemField]: parsedItemValue });
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

        default:
            console.log('Unknown command:', command);
            break;
    }

    process.exit(0);
}

main();