import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
    getItemAvailability,
    getExtraAvailability,
    getOptionAvailability,
    syncStallItemsToRedis
} from '@/lib/redis';

export async function GET(request, { params }) {
    try {
        // Await params using Promise.resolve to satisfy Next.js requirements
        const { id } = await Promise.resolve(params);
        console.log("Menu API route called with stall ID:", id);

        // Parse URL parameters
        const url = new URL(request.url);
        const includeAvailability = url.searchParams.get('include_availability') === 'true';
        const forceRefresh = url.searchParams.get('force_refresh') === 'true';
        console.log(`Fetching menu for stall ${id}, includeAvailability: ${includeAvailability}, forceRefresh: ${forceRefresh}`);

        // Fetch menu items from Firestore
        const menuItemsCollection = collection(db, `stalls/${id}/menu_items`);
        const snapshot = await getDocs(menuItemsCollection);

        const items = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                ...data,
                // Default availability if not explicitly getting availability data
                isAvailable: includeAvailability ? data.isAvailable !== false : true
            });
        });

        // Sync items to Redis for future use (do this in background)
        syncStallItemsToRedis(id, items).catch(error => {
            console.error(`Error syncing items to Redis for stall ${id}:`, error);
        });

        // If availability info is requested, update from Redis
        if (includeAvailability) {
            // Process each item to get its availability from Redis
            await Promise.all(items.map(async (item) => {
                try {
                    // Get main item availability
                    const isAvailable = await getItemAvailability(item.id);
                    if (isAvailable !== null) {
                        item.isAvailable = isAvailable;
                    }

                    // Process extras if they exist
                    if (item.extras && item.extras.length > 0) {
                        await Promise.all(item.extras.map(async (extra) => {
                            try {
                                const extraAvailable = await getExtraAvailability(item.id, extra.id);
                                if (extraAvailable !== null) {
                                    extra.isAvailable = extraAvailable;
                                }
                            } catch (err) {
                                console.warn(`Error getting extra ${extra.id} availability:`, err);
                            }
                        }));
                    }

                    // Process customization options if they exist
                    if (item.customizations && item.customizations.length > 0) {
                        await Promise.all(item.customizations.map(async (customization) => {
                            if (customization.options && customization.options.length > 0) {
                                await Promise.all(customization.options.map(async (option) => {
                                    try {
                                        const optionAvailable = await getOptionAvailability(
                                            item.id,
                                            customization.id,
                                            option.id
                                        );
                                        if (optionAvailable !== null) {
                                            option.isAvailable = optionAvailable;
                                        }
                                    } catch (err) {
                                        console.warn(`Error getting option ${option.id} availability:`, err);
                                    }
                                }));
                            }
                        }));
                    }
                } catch (error) {
                    console.warn(`Error processing Redis availability for item ${item.id}:`, error);
                }
            }));
        }

        console.log(`Found ${items.length} menu items for stall ${id}`);
        return NextResponse.json({
            items,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch menu items' },
            { status: 500 }
        );
    }
}