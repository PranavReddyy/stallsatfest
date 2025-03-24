import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import {
    setItemAvailability,
    setExtraAvailability,
    setOptionAvailability,
    publishStockUpdate
} from '@/lib/redis';

export async function POST(request) {
    try {
        const data = await request.json();
        const { stallId, type, itemId, extraId, customId, optionId, availability } = data;

        console.log('Stock update request:', data);

        if (!stallId || !type || !itemId) {
            return NextResponse.json({
                success: false,
                message: 'Missing required parameters'
            }, { status: 400 });
        }

        // Update in Firestore and Redis
        if (type === 'item') {
            // Update item availability
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, itemId);
            await updateDoc(itemRef, {
                isAvailable: availability,
                updatedAt: serverTimestamp()
            });

            // Update in Redis
            await setItemAvailability(itemId, availability);

            // Publish update for real-time notification
            await publishStockUpdate(stallId, {
                type,
                itemId,
                availability
            });

            console.log(`Updated item ${itemId} availability to ${availability}`);
        }
        else if (type === 'extra' && extraId) {
            // Update in Firestore
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, itemId);
            const menuItemDoc = await getDoc(itemRef);

            if (!menuItemDoc.exists()) {
                return NextResponse.json({
                    success: false,
                    message: 'Menu item not found'
                }, { status: 404 });
            }

            const menuItemData = menuItemDoc.data();
            const updatedExtras = (menuItemData.extras || []).map(extra => {
                if (extra.id === extraId) {
                    return { ...extra, isAvailable: availability };
                }
                return extra;
            });

            await updateDoc(itemRef, {
                extras: updatedExtras,
                updatedAt: serverTimestamp()
            });

            // Update in Redis
            await setExtraAvailability(itemId, extraId, availability);

            // Publish update
            await publishStockUpdate(stallId, {
                type,
                itemId,
                extraId,
                availability
            });

            console.log(`Updated extra ${extraId} for item ${itemId} availability to ${availability}`);
        }
        else if (type === 'option' && customId && optionId) {
            // Update in Firestore
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, itemId);
            const menuItemDoc = await getDoc(itemRef);

            if (!menuItemDoc.exists()) {
                return NextResponse.json({
                    success: false,
                    message: 'Menu item not found'
                }, { status: 404 });
            }

            const menuItemData = menuItemDoc.data();
            const updatedCustomizations = (menuItemData.customizations || []).map(customization => {
                if (customization.id === customId) {
                    const updatedOptions = (customization.options || []).map(option => {
                        if (option.id === optionId) {
                            return { ...option, isAvailable: availability };
                        }
                        return option;
                    });

                    return { ...customization, options: updatedOptions };
                }
                return customization;
            });

            await updateDoc(itemRef, {
                customizations: updatedCustomizations,
                updatedAt: serverTimestamp()
            });

            // Update in Redis
            await setOptionAvailability(itemId, customId, optionId, availability);

            // Publish update
            await publishStockUpdate(stallId, {
                type,
                itemId,
                customId,
                optionId,
                availability
            });

            console.log(`Updated option ${optionId} in customization ${customId} for item ${itemId} availability to ${availability}`);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${type} availability`
        });

    } catch (error) {
        console.error('Error updating stock:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update stock',
            error: error.message
        }, { status: 500 });
    }
}