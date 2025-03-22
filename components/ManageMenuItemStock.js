import { useState } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function ManageMenuItemStock({ item, stallId, onStockUpdate, refreshMenu }) {
    const [updating, setUpdating] = useState(false);

    // Track availability states
    const [isItemAvailable, setIsItemAvailable] = useState(item.isAvailable !== false);
    const [extrasAvailability, setExtrasAvailability] = useState(
        (item.extras || []).reduce((acc, extra) => {
            acc[extra.id] = extra.isAvailable !== false;
            return acc;
        }, {})
    );
    const [customOptionsAvailability, setCustomOptionsAvailability] = useState(
        (item.customizations || []).reduce((acc, customization) => {
            (customization.options || []).forEach(option => {
                acc[`${customization.id}-${option.id}`] = option.isAvailable !== false;
            });
            return acc;
        }, {})
    );

    // Toggle main item availability
    const toggleItemAvailability = async () => {
        if (updating) return;

        try {
            setUpdating(true);

            const newAvailability = !isItemAvailable;
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, item.id);

            // Update in Firestore
            await updateDoc(itemRef, {
                isAvailable: newAvailability,
                updatedAt: serverTimestamp()
            });

            // Update local state
            setIsItemAvailable(newAvailability);

            // Trigger parent callback
            if (onStockUpdate) {
                onStockUpdate(item.id, { isAvailable: newAvailability });
            }

            // Show success message
            toast.success(`${item.name} is now ${newAvailability ? 'available' : 'unavailable'}`);

            // Invalidate cache
            try {
                await fetch('/api/invalidate-cache', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.NEXT_PUBLIC_CACHE_INVALIDATION_API_KEY || 'your-temp-dev-key'
                    },
                    body: JSON.stringify({
                        type: 'menu_item',
                        stallId,
                        itemId: item.id,
                        updatedAvailability: newAvailability
                    })
                });

                // Refresh the SWR cache
                if (refreshMenu) {
                    refreshMenu();
                }
            } catch (error) {
                console.error('Failed to invalidate cache:', error);
            }

        } catch (error) {
            console.error('Error updating item availability:', error);
            toast.error('Failed to update availability');
        } finally {
            setUpdating(false);
        }
    };

    // Toggle extra availability
    const toggleExtraAvailability = async (extraId) => {
        if (updating) return;

        try {
            setUpdating(true);

            const newAvailability = !extrasAvailability[extraId];
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, item.id);

            // Get the current extras array
            const updatedExtras = (item.extras || []).map(extra => {
                if (extra.id === extraId) {
                    return { ...extra, isAvailable: newAvailability };
                }
                return extra;
            });

            // Update in Firestore
            await updateDoc(itemRef, {
                extras: updatedExtras,
                updatedAt: serverTimestamp()
            });

            // Update local state
            setExtrasAvailability(prev => ({
                ...prev,
                [extraId]: newAvailability
            }));

            // Find the extra name
            const extraName = item.extras.find(e => e.id === extraId)?.name || 'Extra';

            // Show success message
            toast.success(`${extraName} is now ${newAvailability ? 'available' : 'unavailable'}`);

            // Invalidate cache
            try {
                await fetch('/api/invalidate-cache', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.NEXT_PUBLIC_CACHE_INVALIDATION_API_KEY || 'your-temp-dev-key'
                    },
                    body: JSON.stringify({
                        type: 'menu_item',
                        stallId,
                        itemId: item.id,
                        updatedAvailability: null // Indicate it's an extra, not the main item
                    })
                });

                // Refresh the SWR cache
                if (refreshMenu) {
                    refreshMenu();
                }
            } catch (error) {
                console.error('Failed to invalidate cache:', error);
            }

        } catch (error) {
            console.error('Error updating extra availability:', error);
            toast.error('Failed to update availability');
        } finally {
            setUpdating(false);
        }
    };

    // Toggle customization option availability
    const toggleCustomOptionAvailability = async (customizationId, optionId) => {
        if (updating) return;

        try {
            setUpdating(true);

            const optionKey = `${customizationId}-${optionId}`;
            const newAvailability = !customOptionsAvailability[optionKey];
            const itemRef = doc(db, `stalls/${stallId}/menu_items`, item.id);

            // Get the current customizations array and update the specific option
            const updatedCustomizations = (item.customizations || []).map(customization => {
                if (customization.id === customizationId) {
                    const updatedOptions = (customization.options || []).map(option => {
                        if (option.id === optionId) {
                            return { ...option, isAvailable: newAvailability };
                        }
                        return option;
                    });
                    return { ...customization, options: updatedOptions };
                }
                return customization;
            });

            // Update in Firestore
            await updateDoc(itemRef, {
                customizations: updatedCustomizations,
                updatedAt: serverTimestamp()
            });

            // Update local state
            setCustomOptionsAvailability(prev => ({
                ...prev,
                [optionKey]: newAvailability
            }));

            // Find the option name
            const customization = item.customizations.find(c => c.id === customizationId);
            const optionName = customization?.options.find(o => o.id === optionId)?.name || 'Option';

            // Show success message
            toast.success(`${optionName} is now ${newAvailability ? 'available' : 'unavailable'}`);

            // Invalidate cache
            try {
                await fetch('/api/invalidate-cache', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.NEXT_PUBLIC_CACHE_INVALIDATION_API_KEY || 'your-temp-dev-key'
                    },
                    body: JSON.stringify({
                        type: 'menu_item',
                        stallId,
                        itemId: item.id,
                        updatedAvailability: null // Indicate it's a customization option, not the main item
                    })
                });

                // Refresh the SWR cache
                if (refreshMenu) {
                    refreshMenu();
                }
            } catch (error) {
                console.error('Failed to invalidate cache:', error);
            }

        } catch (error) {
            console.error('Error updating customization option availability:', error);
            toast.error('Failed to update availability');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            {/* Item header with main availability toggle */}
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800/80">
                <div className="flex justify-between items-start">
                    <div className="flex items-start">
                        {item.image && (
                            <div className="relative w-12 h-12 rounded-md overflow-hidden mr-3 border border-gray-700">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className={`object-cover ${!isItemAvailable ? 'grayscale opacity-70' : ''}`}
                                />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <h3 className={`${crimsonText.className} text-lg font-semibold text-white`}>
                                    {item.name}
                                </h3>
                            </div>
                            <p className="text-gray-400 text-sm mt-0.5">₹{item.price}</p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <span className={`text-sm mr-3 ${isItemAvailable ? 'text-green-400' : 'text-red-400'}`}>
                            {isItemAvailable ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <label className="inline-flex items-center cursor-pointer">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isItemAvailable}
                                    onChange={toggleItemAvailability}
                                    disabled={updating}
                                />
                                <div className={`w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isItemAvailable ? 'peer-checked:bg-green-600' : 'peer-checked:bg-red-600'}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {/* Extras section */}
                {item.extras && item.extras.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm text-white font-medium mb-2">Extras</h4>
                        <div className="space-y-2">
                            {item.extras.map(extra => (
                                <div
                                    key={extra.id}
                                    className={`flex items-center justify-between p-2 rounded-lg border ${extrasAvailability[extra.id] ? 'border-gray-700 bg-gray-800/50' : 'border-red-900/50 bg-red-900/20'}`}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-3 h-3 rounded-full mr-2 ${extra.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className="text-white text-sm">{extra.name}</span>
                                        <span className="text-purple-400 text-xs ml-2">+₹{extra.price}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`text-xs mr-2 ${extrasAvailability[extra.id] ? 'text-green-400' : 'text-red-400'}`}>
                                            {extrasAvailability[extra.id] ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={extrasAvailability[extra.id]}
                                                    onChange={() => toggleExtraAvailability(extra.id)}
                                                    disabled={updating}
                                                />
                                                <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Customizations section */}
                {item.customizations && item.customizations.length > 0 && (
                    <div>
                        <h4 className="text-sm text-white font-medium mb-2">Customizations</h4>
                        <div className="space-y-4">
                            {item.customizations.map(customization => (
                                <div key={customization.id} className="bg-gray-800/30 rounded-lg border border-gray-700 p-3">
                                    <h5 className="text-sm text-white font-medium mb-2">
                                        {customization.name}
                                        {customization.required && (
                                            <span className="text-red-400 text-xs ml-2">*Required</span>
                                        )}
                                    </h5>
                                    <div className="space-y-2 pl-2">
                                        {customization.options.map(option => (
                                            <div
                                                key={option.id}
                                                className={`flex items-center justify-between p-2 rounded-lg border ${customOptionsAvailability[`${customization.id}-${option.id}`]
                                                        ? 'border-gray-700 bg-gray-800/50'
                                                        : 'border-red-900/50 bg-red-900/20'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${option.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    <span className="text-white text-sm">{option.name}</span>
                                                    {option.price > 0 && (
                                                        <span className="text-purple-400 text-xs ml-2">+₹{option.price}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`text-xs mr-2 ${customOptionsAvailability[`${customization.id}-${option.id}`]
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                        }`}>
                                                        {customOptionsAvailability[`${customization.id}-${option.id}`] ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={customOptionsAvailability[`${customization.id}-${option.id}`]}
                                                                onChange={() => toggleCustomOptionAvailability(customization.id, option.id)}
                                                                disabled={updating}
                                                            />
                                                            <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}