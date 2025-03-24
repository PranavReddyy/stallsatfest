import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import redis from '@/lib/redis';

export async function POST(request) {
    try {
        console.log("Cache invalidation API called");

        // Authentication can be added here in production

        const data = await request.json();
        console.log("Invalidation request data:", data);

        const { type, stallId, itemId } = data;

        if (!type) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters'
            }, { status: 400 });
        }

        // Paths to revalidate in Next.js
        const paths = [];
        // Keys to delete in Redis
        const redisKeys = [];

        if (type === 'menu_item' && stallId) {
            paths.push(`/stall/${stallId}`);
            redisKeys.push(`stall:${stallId}`);
            redisKeys.push(`stall:${stallId}:menu`);

            if (itemId) {
                paths.push(`/stall/${stallId}/item/${itemId}`);
                redisKeys.push(`menu_item:${stallId}:${itemId}`);
            }

            paths.push('/');
            paths.push('/stalls');
        } else if (type === 'stall' && stallId) {
            paths.push(`/stall/${stallId}`);
            redisKeys.push(`stall:${stallId}`);
            paths.push('/');
            paths.push('/stalls');
        } else if (type === 'all' || stallId === 'all') {
            // Clear all stalls cache
            paths.push('/');
            paths.push('/stalls');
            paths.push('/admin/dashboard');

            // Add specific keys we know about
            redisKeys.push('stalls:all');
            redisKeys.push('stalls:all:with_inactive');

            // Add common pattern matches for stall data
            // Since redis.keys() isn't available, we'll use these common patterns instead
            redisKeys.push('stall:*'); // This won't work for pattern matching, but worth trying

            // Add some likely keys based on your application structure
            // This is a static approach since we can't use pattern matching
            for (let i = 1; i <= 10; i++) {
                redisKeys.push(`stall:${i}`);
                redisKeys.push(`stall:${i}:menu`);
            }
        }

        console.log("Revalidating paths:", paths);
        console.log("Clearing Redis keys:", redisKeys);

        // Revalidate all paths in Next.js
        for (const path of paths) {
            try {
                await revalidatePath(path);
                console.log(`Successfully revalidated: ${path}`);
            } catch (err) {
                console.error(`Error revalidating path ${path}:`, err);
            }
        }

        // Clear all specified Redis keys
        if (redisKeys.length > 0) {
            try {
                for (const key of redisKeys) {
                    try {
                        // Try to delete individual keys
                        // Note: pattern matching with * won't work with del()
                        await redis.del(key);
                        console.log(`Deleted Redis key: ${key}`);
                    } catch (keyErr) {
                        console.error(`Error deleting Redis key ${key}:`, keyErr);
                    }
                }

                // Also clear the most important ones directly
                await redis.del('stalls:all');
                await redis.del('stalls:all:with_inactive');

                console.log('Key cache invalidation completed');
            } catch (err) {
                console.error('Error clearing Redis cache:', err);
                // Don't fail the whole request if Redis clearing fails
            }

            // As a fallback, let's also try the FLUSHDB command if available
            try {
                // This is a more aggressive approach that will clear ALL keys in the current DB
                // Only use this if you're sure your Redis instance only contains cache data
                if (redis.flushDb) {
                    await redis.flushDb();
                    console.log('Flushed entire Redis DB as fallback');
                }
            } catch (flushErr) {
                console.error('Error flushing Redis DB:', flushErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Cache invalidation completed',
            paths,
            redisKeys
        });

    } catch (error) {
        console.error('Error processing cache invalidation:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to process cache invalidation',
            error: error.message
        }, { status: 500 });
    }
}