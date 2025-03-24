import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
    try {
        const url = new URL(request.url);
        const path = url.searchParams.get('path');

        if (!path) {
            return NextResponse.json({
                success: false,
                message: 'Path parameter is required'
            }, { status: 400 });
        }

        // Revalidate the path
        revalidatePath(path);

        return NextResponse.json({
            success: true,
            revalidated: true,
            path
        });
    } catch (error) {
        console.error('Error revalidating path:', error);
        return NextResponse.json({
            success: false,
            message: 'Error revalidating path'
        }, { status: 500 });
    }
}