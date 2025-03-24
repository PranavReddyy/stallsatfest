import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import redis from '@/lib/redis';

const CACHE_TTL = 300; // 5 minutes

export async function GET(request, context) {
    try {
        // Fix for "params should be awaited" error
        const { params } = context;
        const stallId = await Promise.resolve(params.id);
        console.log("Stall details API route called with stall ID:", stallId);

        // Try to get from Redis cache first
        const cacheKey = `stall:${stallId}:details`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("Returning cached stall details");
            return NextResponse.json(JSON.parse(cachedData));
        }

        // Cache miss, fetch from Firestore
        console.log("Cache miss, fetching from Firestore");
        const stallRef = doc(db, 'stalls', stallId);
        const stallDoc = await getDoc(stallRef);

        if (!stallDoc.exists()) {
            return NextResponse.json(
                { error: 'Stall not found' },
                { status: 404 }
            );
        }

        const stallData = {
            id: stallDoc.id,
            ...stallDoc.data()
        };

        // Cache the result
        await redis.set(cacheKey, JSON.stringify(stallData), 'EX', CACHE_TTL);

        return NextResponse.json(stallData);
    } catch (error) {
        console.error('Error fetching stall details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stall details' },
            { status: 500 }
        );
    }
}