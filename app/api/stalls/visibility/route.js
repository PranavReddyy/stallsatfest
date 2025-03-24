// filepath: /Users/Pranav/LocalDocuments/aeonstalls/app/api/stalls/visibility/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import redis from '@/lib/redis';

export async function POST(request) {
    try {
        const { stallId, isActive } = await request.json();

        if (!stallId) {
            return NextResponse.json({
                success: false,
                message: 'Missing stallId parameter'
            }, { status: 400 });
        }

        // 1. Update in Firestore
        const stallRef = doc(db, 'stalls', stallId);
        await updateDoc(stallRef, {
            isActive: isActive,
            updatedAt: serverTimestamp()
        });

        // 2. Update in Redis cache
        const cacheKey = `stall:${stallId}:details`;
        const stallCacheData = await redis.get(cacheKey);
        if (stallCacheData) {
            const stallData = JSON.parse(stallCacheData);
            stallData.isActive = isActive;
            await redis.set(cacheKey, JSON.stringify(stallData), 'EX', 300);
        }

        // 3. Invalidate all stalls cache to force refresh
        await redis.del('stalls:all');

        // 4. Publish real-time update through Redis pub/sub
        await redis.publish('stalls:visibility', JSON.stringify({
            stallId,
            isActive,
            timestamp: Date.now()
        }));

        return NextResponse.json({
            success: true,
            message: `Stall visibility updated: ${isActive ? 'visible' : 'hidden'}`
        });

    } catch (error) {
        console.error('Error updating stall visibility:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update stall visibility',
            error: error.message
        }, { status: 500 });
    }
}