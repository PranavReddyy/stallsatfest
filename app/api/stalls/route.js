import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import redis from '@/lib/redis';

const CACHE_KEY = 'stalls:all';
const CACHE_TTL = 300; // 5 minutes

export async function GET(request) {
    try {
        console.log("All stalls API route called");

        // Check for showInactive query param
        const url = new URL(request.url);
        const showInactive = url.searchParams.get('showInactive') === 'true';
        const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

        // If we need to show all stalls (for admin), use a different cache key
        const cacheKey = showInactive ? 'stalls:all:with_inactive' : CACHE_KEY;

        if (!forceRefresh) {
            // Your existing Redis cache lookup code
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`Returning cached stalls data (showInactive=${showInactive})`);
                return NextResponse.json({ stalls: JSON.parse(cachedData) });
            }
        } else {
            console.log('Force refresh requested, skipping cache');
            // Optionally clear the cache key
            await redis.del(cacheKey);
        }

        // Try to get from Redis cache first
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`Returning cached stalls data (showInactive=${showInactive})`);
            return NextResponse.json({ stalls: JSON.parse(cachedData) });
        }

        // Cache miss, fetch from Firestore
        console.log(`Cache miss, fetching from Firestore (showInactive=${showInactive})`);

        // Create query - filter for active stalls unless showInactive is true
        let stallsQuery;
        if (!showInactive) {
            // Only get active stalls
            stallsQuery = query(
                collection(db, 'stalls'),
                where('isActive', '!=', false) // This will get stalls where isActive is true or not set
            );
        } else {
            // Get all stalls
            stallsQuery = collection(db, 'stalls');
        }

        const snapshot = await getDocs(stallsQuery);

        const stalls = [];
        snapshot.forEach((doc) => {
            stalls.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Cache the result
        await redis.set(cacheKey, JSON.stringify(stalls), 'EX', CACHE_TTL);
        console.log(`Cached ${stalls.length} stalls with key ${cacheKey}`);

        return NextResponse.json({ stalls });
    } catch (error) {
        console.error("Error fetching stalls:", error);
        return NextResponse.json({ error: "Failed to fetch stalls" }, { status: 500 });
    }
}