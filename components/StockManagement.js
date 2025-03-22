"use client";

import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import useSWR from 'swr';
import ManageMenuItemStock from './ManageMenuItemStock';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

// SWR fetcher function
const fetcher = (url) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
});

export default function StockManagement() {
    const [loading, setLoading] = useState(true);
    const [menuItems, setMenuItems] = useState([]);
    const [stallId, setStallId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'in-stock', 'out-of-stock'
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);

    // SWR hook for menu items availability
    const { data: menuItemsData, mutate: refreshMenu } = useSWR(
        stallId ? `/api/stalls/${stallId}/menu?include_availability=true` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateIfStale: true,
            dedupingInterval: 30000, // 30 seconds
            refreshInterval: 60000,  // 1 minute
            refreshWhenOffline: false,
        }
    );

    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                const auth = window.localStorage.getItem('stallOwnerId');
                if (!auth) return;

                setStallId(auth);

                // Set up real-time listener
                const menuItemsRef = collection(db, `stalls/${auth}/menu_items`);
                const unsubscribe = onSnapshot(menuItemsRef, (snapshot) => {
                    const items = [];
                    const categorySet = new Set();

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.category) {
                            categorySet.add(data.category);
                        }
                        items.push({
                            id: doc.id,
                            ...data
                        });
                    });

                    setMenuItems(items);
                    setCategories(['all', ...Array.from(categorySet)]);
                    setLoading(false);

                    // Also refresh the SWR cache
                    if (refreshMenu) refreshMenu();
                }, (error) => {
                    console.error("Error in Firestore listener:", error);
                    toast.error("Failed to listen for menu updates");

                    // Fallback to non-realtime if listener fails
                    fallbackFetch(auth);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error setting up menu items listener:", error);

                // Fallback to regular fetch
                const auth = window.localStorage.getItem('stallOwnerId');
                if (auth) fallbackFetch(auth);
            }
        };

        const fallbackFetch = async (stallId) => {
            try {
                const menuItemsRef = collection(db, `stalls/${stallId}/menu_items`);
                const querySnapshot = await getDocs(menuItemsRef);

                const items = [];
                const categorySet = new Set();

                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.category) {
                        categorySet.add(data.category);
                    }
                    items.push({
                        id: doc.id,
                        ...data
                    });
                });

                setMenuItems(items);
                setCategories(['all', ...Array.from(categorySet)]);
            } catch (error) {
                console.error("Error in fallback fetch:", error);
                toast.error("Failed to load menu items");
            } finally {
                setLoading(false);
            }
        };

        fetchMenuItems();
    }, [refreshMenu]);

    // Handle stock update
    const handleStockUpdate = (itemId, updates) => {
        // Update the local state to reflect changes
        setMenuItems(currentItems =>
            currentItems.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            )
        );
    };

    // Filter and search items
    const filteredItems = menuItems.filter(item => {
        // Apply search filter
        const matchesSearch = searchTerm === '' ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

        // Apply availability filter
        const matchesAvailability =
            filter === 'all' ||
            (filter === 'in-stock' && item.isAvailable !== false) ||
            (filter === 'out-of-stock' && item.isAvailable === false);

        // Apply category filter
        const matchesCategory =
            selectedCategory === 'all' ||
            item.category === selectedCategory;

        return matchesSearch && matchesAvailability && matchesCategory;
    });

    return (
        <div className="p-4 md:p-6">
            <Toaster position="top-center" />

            <div className="flex justify-between items-center mb-6">
                <h1 className={`${crimsonText.className} text-2xl md:text-3xl font-semibold text-white`}>
                    Stock Management
                </h1>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                        >
                            <option value="all">All Items</option>
                            <option value="in-stock">In Stock</option>
                            <option value="out-of-stock">Out of Stock</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category === 'all' ? 'All Categories' : category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {filteredItems.length === 0 ? (
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            <h3 className="text-xl font-medium text-white mb-2">No items found</h3>
                            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredItems.map(item => (
                                <ManageMenuItemStock
                                    key={item.id}
                                    item={item}
                                    stallId={stallId}
                                    onStockUpdate={handleStockUpdate}
                                    refreshMenu={refreshMenu}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}