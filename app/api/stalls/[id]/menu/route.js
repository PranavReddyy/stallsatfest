import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET(request, { params }) {
    try {
        // Await params using Promise.resolve to satisfy Next.js requirements
        const { id } = await Promise.resolve(params);
        console.log("Menu API route called with stall ID:", id);

        // Parse URL parameters
        const url = new URL(request.url);
        const includeAvailability = url.searchParams.get('include_availability') === 'true';
        console.log(`Fetching menu for stall ${id}, includeAvailability: ${includeAvailability}`);

        // Fetch menu items from Firestore
        const menuItemsCollection = collection(db, `stalls/${id}/menu_items`);
        const snapshot = await getDocs(menuItemsCollection);

        const items = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                ...data,
                isAvailable: data.isAvailable !== false
            });
        });

        console.log(`Found ${items.length} menu items for stall ${id}`);
        return NextResponse.json({ items });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch menu items' },
            { status: 500 }
        );
    }
}