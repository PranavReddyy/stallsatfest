import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request, context) {
    try {
        // Fix for "params should be awaited" error
        const { params } = context;
        console.log("Stall details API route called with params:", params);
        const stallId = params.id;

        // Fetch stall details from Firestore
        const stallRef = doc(db, 'stalls', stallId);
        const stallDoc = await getDoc(stallRef);

        if (!stallDoc.exists()) {
            return NextResponse.json(
                { error: 'Stall not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: stallDoc.id,
            ...stallDoc.data()
        });
    } catch (error) {
        console.error('Error fetching stall details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stall details' },
            { status: 500 }
        );
    }
}