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
                image: "/images/menu/veggie-delite.jpg",
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
                image: "/images/menu/chicken-teriyaki.jpg",
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
                image: "/images/menu/veggie-patty.jpg",
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
                ],
                customizations: []
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
                image: "/images/menu/caffe-latte.jpg",
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
                image: "/images/menu/cold-brew.jpg",
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
                image: "/images/menu/blueberry-muffin.jpg",
                isAvailable: true,
                position: 3
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
            const stallRef = await db.collection('stalls').add(stallData);
            stallRefs[stall.name] = stallRef.id;
            console.log(`Added stall: ${stall.name} with ID: ${stallRef.id}`);

            // Add menu items to stall
            for (const item of menuItems) {
                const menuItemRef = await db.collection(`stalls/${stallRef.id}/menu_items`).add({
                    ...item,
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

// Main function to run the script
async function main() {
    try {
        console.log('Starting database population...');

        // Create admin user
        const adminUid = await createAdminUser();

        // Populate stalls and menu items
        const stallRefs = await populateStalls();

        // Set up stall owners
        await createStallOwners(adminUid, stallRefs);

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