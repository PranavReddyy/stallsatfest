import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
    try {
        console.log("All stalls API route called");

        // Fetch all stalls from Firestore
        const stallsCollection = collection(db, 'stalls');
        const snapshot = await getDocs(stallsCollection);

        const stalls = [];
        snapshot.forEach((doc) => {
            stalls.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${stalls.length} stalls`);
        return NextResponse.json({ stalls });
    } catch (error) {
        console.error('Error fetching stalls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stalls' },
            { status: 500 }
        );
    }
}