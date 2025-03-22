import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
    try {
        console.log("Cache invalidation API called");

        // Get API key from request headers
        const headersList = request.headers;
        const apiKey = headersList.get('x-api-key');

        // Use environment variable for the API key or a temporary one for development
        const validApiKey = process.env.CACHE_INVALIDATION_API_KEY || 'dev-temp-key';

        // In development, you might want to skip this check
        // if (apiKey !== validApiKey) {
        //     return NextResponse.json({ 
        //         success: false, 
        //         message: 'Unauthorized' 
        //     }, { status: 401 });
        // }

        const data = await request.json();
        console.log("Invalidation request data:", data);

        const { type, stallId, itemId } = data;

        if (!type || !stallId) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters'
            }, { status: 400 });
        }

        // Paths to revalidate
        const paths = [];

        if (type === 'menu_item' && stallId) {
            paths.push(`/stall/${stallId}`);

            if (itemId) {
                paths.push(`/stall/${stallId}/item/${itemId}`);
            }

            paths.push('/stalls');
        } else if (type === 'stall' && stallId) {
            paths.push(`/stall/${stallId}`);
            paths.push('/stalls');
        }

        console.log("Revalidating paths:", paths);

        // Revalidate all paths
        for (const path of paths) {
            try {
                await revalidatePath(path);
                console.log(`Successfully revalidated: ${path}`);
            } catch (err) {
                console.error(`Error revalidating path ${path}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Cache invalidation completed',
            paths
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