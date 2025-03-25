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
const auth = admin.auth();

// Configure the timestamp
const FieldValue = admin.firestore.FieldValue;
const timestamp = FieldValue.serverTimestamp();

// Stall owner emails for each stall
const stallOwnerEmails = {
    "Subway": "subway@aeon.com",
    "Starbucks": "starbucks@aeon.com"
};

// Sample data
const stalls = [
    {
        name: "Subway",
        description: "Fresh and customizable submarine sandwiches, salads, and wraps.",
        logo: "/images/stalls/subway.png",
        categories: ["Sandwiches", "Wraps", "Salads", "Healthy"],
        stall_owner: "subway@aeon.com", // Added stall owner email
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        menuItems: [
            {
                name: "Veggie Delite",
                price: 199,
                description: "Crispy lettuce, tomatoes, green peppers, onions, olives on freshly baked bread.",
                category: "Sandwiches",
                isVeg: true,
                isAvailable: true,
                position: 1,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Cheese",
                        price: 35,
                        isVeg: true,
                        isAvailable: true
                    },
                    {
                        id: "extra2",
                        name: "Double Veggies",
                        price: 30,
                        isVeg: true,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Bread Type",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Italian",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Multigrain",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Parmesan Oregano",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    },
                    {
                        id: "custom2",
                        name: "Sauce Options",
                        type: "multiple",
                        required: false,
                        options: [
                            {
                                id: "option1",
                                name: "Mayonnaise",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Chipotle Southwest",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Honey Mustard",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option4",
                                name: "Sweet Onion",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Chicken Teriyaki",
                price: 279,
                description: "Tender chunks of grilled chicken with teriyaki sauce on freshly baked bread.",
                category: "Sandwiches",
                isVeg: false,
                isAvailable: true,
                position: 2,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Cheese",
                        price: 35,
                        isVeg: true,
                        isAvailable: true
                    },
                    {
                        id: "extra2",
                        name: "Double Meat",
                        price: 60,
                        isVeg: false,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Bread Type",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Italian",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Multigrain",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Parmesan Oregano",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Veggie Patty",
                price: 249,
                description: "Delicious veggie patty with your choice of fresh vegetables and condiments.",
                category: "Sandwiches",
                isVeg: true,
                isAvailable: true,
                position: 3,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Cheese",
                        price: 35,
                        isVeg: true,
                        isAvailable: true
                    }
                ]
            },
            {
                name: "Italian B.M.T.",
                price: 299,
                description: "A hearty sandwich with Genoa salami, pepperoni, and ham, topped with your choice of vegetables.",
                category: "Sandwiches",
                isVeg: false,
                isAvailable: true,
                position: 4,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Cheese",
                        price: 35,
                        isVeg: true,
                        isAvailable: true
                    },
                    {
                        id: "extra2",
                        name: "Double Meat",
                        price: 60,
                        isVeg: false,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Bread Type",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Italian",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Multigrain",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Parmesan Oregano",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Tuna Sub",
                price: 269,
                description: "Flaked tuna, mixed with mayo, and your choice of vegetables on freshly baked bread.",
                category: "Sandwiches",
                isVeg: false,
                isAvailable: true,
                position: 5,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Cheese",
                        price: 35,
                        isVeg: true,
                        isAvailable: true
                    }
                ]
            },
            {
                name: "Chicken & Bacon Ranch Melt",
                price: 319,
                description: "Tender chicken with crispy bacon, melted cheese, and ranch dressing.",
                category: "Sandwiches",
                isVeg: false,
                isAvailable: true,
                position: 6
            },
            {
                name: "Spinach Wrap",
                price: 259,
                description: "Your choice of fillings wrapped in a spinach tortilla.",
                category: "Wraps",
                isVeg: true,
                isAvailable: true,
                position: 7
            },
            {
                name: "Caesar Salad",
                price: 229,
                description: "Fresh romaine lettuce, grated parmesan cheese, and croutons with Caesar dressing.",
                category: "Salads",
                isVeg: true,
                isAvailable: true,
                position: 8,
                extras: [
                    {
                        id: "extra1",
                        name: "Add Chicken",
                        price: 50,
                        isVeg: false,
                        isAvailable: true
                    }
                ]
            },
            {
                name: "Chocolate Chip Cookie",
                price: 69,
                description: "Freshly baked cookie with chocolate chips.",
                category: "Desserts",
                isVeg: true,
                isAvailable: true,
                position: 9
            }
        ]
    },
    {
        name: "Starbucks",
        description: "Premium coffee, teas, and snacks in a comfortable atmosphere.",
        logo: "/images/stalls/starbucks.png",
        categories: ["Coffee", "Beverages", "Pastries", "Snacks"],
        stall_owner: "starbucks@aeon.com", // Added stall owner email
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        menuItems: [
            {
                name: "Caffe Latte",
                price: 219,
                description: "Rich espresso with steamed milk and a light layer of foam.",
                category: "Coffee",
                isVeg: true,
                isAvailable: true,
                position: 1,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Shot",
                        price: 50,
                        isVeg: true,
                        isAvailable: true
                    },
                    {
                        id: "extra2",
                        name: "Whipped Cream",
                        price: 25,
                        isVeg: true,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Milk Options",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Whole Milk",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Almond Milk",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Soy Milk",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option4",
                                name: "Oat Milk",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    },
                    {
                        id: "custom2",
                        name: "Size",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Tall",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Grande",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Venti",
                                price: 80,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Cold Brew",
                price: 249,
                description: "Slow-steeped, super-smooth cold coffee served over ice.",
                category: "Coffee",
                isVeg: true,
                isAvailable: true,
                position: 2,
                extras: [
                    {
                        id: "extra1",
                        name: "Vanilla Syrup",
                        price: 30,
                        isVeg: true,
                        isAvailable: true
                    },
                    {
                        id: "extra2",
                        name: "Caramel Syrup",
                        price: 30,
                        isVeg: true,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Size",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Tall",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Grande",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Venti",
                                price: 80,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Blueberry Muffin",
                price: 170,
                description: "Moist, tender muffin bursting with blueberries and a hint of lemon.",
                category: "Pastries",
                isVeg: true,
                isAvailable: true,
                position: 3
            },
            {
                name: "Caramel Macchiato",
                price: 289,
                description: "Espresso with vanilla-flavored syrup, milk, and caramel sauce.",
                category: "Coffee",
                isVeg: true,
                isAvailable: true,
                position: 4,
                extras: [
                    {
                        id: "extra1",
                        name: "Extra Shot",
                        price: 50,
                        isVeg: true,
                        isAvailable: true
                    }
                ],
                customizations: [
                    {
                        id: "custom1",
                        name: "Milk Options",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Whole Milk",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Almond Milk",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Soy Milk",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    },
                    {
                        id: "custom2",
                        name: "Size",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Tall",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Grande",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Venti",
                                price: 80,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Chai Tea Latte",
                price: 239,
                description: "Black tea infused with cinnamon, clove, and other warming spices, combined with steamed milk.",
                category: "Beverages",
                isVeg: true,
                isAvailable: true,
                position: 5,
                customizations: [
                    {
                        id: "custom1",
                        name: "Size",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Tall",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Grande",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Venti",
                                price: 80,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Iced Americano",
                price: 199,
                description: "Espresso shots topped with cold water to produce a light layer of crema, then served over ice.",
                category: "Coffee",
                isVeg: true,
                isAvailable: true,
                position: 6
            },
            {
                name: "Chocolate Croissant",
                price: 190,
                description: "Butter croissant filled with chocolate batons.",
                category: "Pastries",
                isVeg: true,
                isAvailable: true,
                position: 7
            },
            {
                name: "Strawberry Açaí Refresher",
                price: 229,
                description: "Sweet strawberry flavors with açaí notes and accents of passion fruit, served over ice.",
                category: "Beverages",
                isVeg: true,
                isAvailable: true,
                position: 8,
                customizations: [
                    {
                        id: "custom1",
                        name: "Size",
                        type: "single",
                        required: true,
                        options: [
                            {
                                id: "option1",
                                name: "Tall",
                                price: 0,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option2",
                                name: "Grande",
                                price: 40,
                                isVeg: true,
                                isAvailable: true
                            },
                            {
                                id: "option3",
                                name: "Venti",
                                price: 80,
                                isVeg: true,
                                isAvailable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: "Chicken & Hummus Protein Box",
                price: 349,
                description: "Grilled chicken, hummus, fresh vegetables, and pita bread in a convenient grab-and-go box.",
                category: "Snacks",
                isVeg: false,
                isAvailable: true,
                position: 9
            }
        ]
    }
];

// Create an admin user with the specified email
async function createAdminUser() {
    try {
        const userRecord = await auth.createUser({
            email: "stalls@aeon.com",
            password: "admin123", // You should change this to a secure password
            emailVerified: true
        });

        console.log('Admin user created:', userRecord.uid);

        // Create a custom claim for this user to identify them as admin
        // (You can check this in your security rules or app logic)
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });

        console.log('Admin claim added to user');

        // Store the admin user in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email: "stalls@aeon.com",
            isAdmin: true,
            createdAt: timestamp
        });

        console.log('Admin user added to Firestore');

        return userRecord.uid;
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('Admin user already exists, skipping creation');

            // Try to find the user by email
            const userRecord = await auth.getUserByEmail("stalls@aeon.com");
            return userRecord.uid;
        } else {
            console.error('Error creating admin user:', error);
            throw error;
        }
    }
}

// Populate the database with stalls and menu items
async function populateStalls() {
    try {
        const stallRefs = {}; // To store stall IDs by name

        for (const stall of stalls) {
            // Extract menu items and remove from stall object
            const { menuItems, ...stallData } = stall;

            // Add stall to Firestore
            const stallRef = await db.collection('stalls').add({
                ...stallData,
                // Add Redis connection field
                redisConnected: false,
                lastSyncTime: admin.firestore.FieldValue.serverTimestamp()
            });

            stallRefs[stall.name] = stallRef.id;
            console.log(`Added stall: ${stall.name} with ID: ${stallRef.id}`);

            // Add menu items to stall
            for (const item of menuItems) {
                const menuItemRef = await db.collection(`stalls/${stallRef.id}/menu_items`).add({
                    ...item,
                    extras: item.extras || [],
                    customizations: item.customizations || [],
                    // Ensure these fields exist for Redis caching
                    isAvailable: item.isAvailable || true,
                    lastAvailabilityUpdate: admin.firestore.FieldValue.serverTimestamp(),
                    redisTracked: true,
                    createdAt: timestamp,
                    updatedAt: timestamp
                });
                console.log(`Added menu item: ${item.name} with ID: ${menuItemRef.id}`);
            }
        }

        console.log('Database population completed!');
        return stallRefs;
    } catch (error) {
        console.error('Error populating database:', error);
        throw error;
    }
}

async function createSystemSettings() {
    try {
        // Create system settings document
        await db.collection('settings').doc('websockets').set({
            enabled: true,
            maxConnections: 500,
            pingInterval: 30, // in seconds
            lastRestart: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: timestamp,
            updatedAt: timestamp
        });

        // Create Redis settings
        await db.collection('settings').doc('redis').set({
            enabled: true,
            cacheTTL: 3600, // 1 hour in seconds
            cacheMenuItems: true,
            cacheUserSessions: true,
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: timestamp,
            updatedAt: timestamp
        });

        console.log('System settings created for WebSockets and Redis');
    } catch (error) {
        console.error('Error creating system settings:', error);
        throw error;
    }
}

// Create stall owners collection
async function createStallOwners(adminUid, stallRefs) {
    try {
        // Create a stall owner for the admin (can access all stalls)
        const stallsSnapshot = await db.collection('stalls').get();

        const stallIds = {};
        stallsSnapshot.forEach(doc => {
            stallIds[doc.id] = true;
        });

        await db.collection('stall_owners').doc(adminUid).set({
            email: "stalls@aeon.com",
            stallIds: stallIds,
            isAdmin: true,
            createdAt: timestamp
        });

        console.log('Admin added as stall owner for all stalls');

        // Create stall owner entries for individual stalls
        console.log('Stall owner mapping (you need to create these users in Firebase Auth manually):');

        for (const [stallName, email] of Object.entries(stallOwnerEmails)) {
            const stallId = stallRefs[stallName];
            if (!stallId) {
                console.log(`Warning: No stall ID found for ${stallName}`);
                continue;
            }

            console.log(`${email} -> ${stallName} (${stallId})`);
        }

    } catch (error) {
        console.error('Error creating stall owners:', error);
    }
}

async function invalidateCache() {
    console.log('Invalidating application cache...');

    try {
        // This approach works in both local dev and production
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/invalidate-cache`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'dev-temp-key'
            },
            body: JSON.stringify({
                type: 'all',
                stallId: 'all'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Cache invalidation completed successfully:', data);
        } else {
            console.error('Failed to invalidate cache:', await response.text());
        }
    } catch (error) {
        console.error('Error invalidating cache:', error);
    }
}

async function deleteStallAndMenuItems(stallId) {
    // Delete menu items first
    const menuItemsSnapshot = await db.collection(`stalls/${stallId}/menu_items`).get();
    for (const doc of menuItemsSnapshot.docs) {
        await doc.ref.delete();
    }

    // Then delete the stall
    await db.collection('stalls').doc(stallId).delete();

    console.log(`Deleted stall ${stallId} and all its menu items`);
}

async function clearExistingData() {
    // Delete stalls collection (this is recursive and will delete subcollections too)
    const stallsSnapshot = await db.collection('stalls').get();
    const batchDeletes = [];

    for (const doc of stallsSnapshot.docs) {
        batchDeletes.push(deleteStallAndMenuItems(doc.id));
    }

    await Promise.all(batchDeletes);
    console.log('Existing data cleared');
}

// Main function to run the script
async function main() {
    try {
        console.log('Starting database population...');

        // Uncomment the following line if you want to clear existing data
        // await clearExistingData();

        // Create admin user
        const adminUid = await createAdminUser();

        // Populate stalls and menu items
        const stallRefs = await populateStalls();

        // Create system settings for WebSockets and Redis
        await createSystemSettings();

        // Set up stall owners
        await createStallOwners(adminUid, stallRefs);

        await invalidateCache();

        console.log('\nDatabase setup completed successfully!');
        console.log('\nIMPORTANT: You need to manually create Firebase Authentication users for these stall owners:');
        for (const [stallName, email] of Object.entries(stallOwnerEmails)) {
            console.log(`- ${email} (for ${stallName})`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error in main function:', error);
        process.exit(1);
    }
}

// Run the script
main();