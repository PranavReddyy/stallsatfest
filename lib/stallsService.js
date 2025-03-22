import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

// Helper function to determine if a path is local or remote
function isLocalPath(path) {
    return path && (path.startsWith('/') || path.startsWith('./'));
}

// Function to fetch all stalls with caching
export async function getStalls() {
    try {
        // Check for cached data if we're in the browser
        if (typeof window !== 'undefined') {
            const cachedData = localStorage.getItem('stalls');
            const cachedTime = localStorage.getItem('stallsCachedTime');

            // If cache is valid (less than 3 days old)
            if (cachedData && cachedTime) {
                const cacheAge = Date.now() - parseInt(cachedTime);
                if (cacheAge < 3 * 24 * 60 * 60 * 1000) { // 3 days in milliseconds
                    return JSON.parse(cachedData);
                }
            }
        }

        // Fetch fresh data
        const stallsSnapshot = await getDocs(collection(db, 'stalls'));
        const stallsData = [];

        for (const doc of stallsSnapshot.docs) {
            const stall = { id: doc.id, ...doc.data() };

            // Only process Firebase Storage paths, leave local paths as-is
            if (stall.logo && !stall.logo.startsWith('http') && !isLocalPath(stall.logo)) {
                try {
                    const logoRef = ref(storage, stall.logo);
                    stall.logo = await getDownloadURL(logoRef);
                } catch (error) {
                    console.error("Error getting logo URL:", error);
                    stall.logo = '/placeholder-logo.png';
                }
            }

            stallsData.push(stall);
        }

        // Cache the data if in browser
        if (typeof window !== 'undefined') {
            localStorage.setItem('stalls', JSON.stringify(stallsData));
            localStorage.setItem('stallsCachedTime', Date.now().toString());
        }

        return stallsData;
    } catch (error) {
        console.error("Error fetching stalls:", error);
        throw error;
    }
}

// Function to fetch a single stall with its menu items
export async function getStallWithMenu(stallId) {
    try {
        // Check for cached data if we're in the browser
        if (typeof window !== 'undefined') {
            const cachedData = localStorage.getItem(`stall_${stallId}`);
            const cachedTime = localStorage.getItem(`stall_${stallId}_cachedTime`);

            // If cache is valid (less than 3 days old)
            if (cachedData && cachedTime) {
                const cacheAge = Date.now() - parseInt(cachedTime);
                if (cacheAge < 3 * 24 * 60 * 60 * 1000) { // 3 days in milliseconds
                    return JSON.parse(cachedData);
                }
            }
        }

        // Get stall data
        const stallDoc = await getDoc(doc(db, 'stalls', stallId));

        if (!stallDoc.exists()) {
            throw new Error("Stall not found");
        }

        const stallData = { id: stallDoc.id, ...stallDoc.data() };

        // Get logo URL if needed
        if (stallData.logo && !stallData.logo.startsWith('http') && !isLocalPath(stallData.logo)) {
            try {
                const logoRef = ref(storage, stallData.logo);
                stallData.logo = await getDownloadURL(logoRef);
            } catch (error) {
                console.error("Error getting logo URL:", error);
                stallData.logo = '/placeholder-logo.png';
            }
        }

        // Get menu items
        const menuItemsSnapshot = await getDocs(collection(db, 'stalls', stallId, 'menu_items'));
        const menuItems = [];

        for (const itemDoc of menuItemsSnapshot.docs) {
            const item = { id: itemDoc.id, ...itemDoc.data() };

            // Process item images, handle local paths
            if (item.image && !item.image.startsWith('http') && !isLocalPath(item.image)) {
                try {
                    const imageRef = ref(storage, item.image);
                    item.image = await getDownloadURL(imageRef);
                } catch (error) {
                    console.error("Error getting item image URL:", error);
                    item.image = null;
                }
            }

            menuItems.push(item);
        }

        // Sort items by category
        menuItems.sort((a, b) => a.category.localeCompare(b.category));

        // Group items by category
        const menuByCategory = menuItems.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});

        const result = {
            ...stallData,
            menu: menuByCategory
        };

        // Cache the data if in browser
        if (typeof window !== 'undefined') {
            localStorage.setItem(`stall_${stallId}`, JSON.stringify(result));
            localStorage.setItem(`stall_${stallId}_cachedTime`, Date.now().toString());
        }

        return result;
    } catch (error) {
        console.error("Error fetching stall with menu:", error);
        throw error;
    }
}