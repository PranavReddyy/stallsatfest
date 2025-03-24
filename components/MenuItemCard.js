import { useState, useEffect, useRef } from 'react';
import { Crimson_Text } from 'next/font/google';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function MenuItemCard({ item, onAddToCart, cartItems = [] }) {
    const [quantity, setQuantity] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const updateRef = useRef(null);

    // Check if the item is available
    const isAvailable = item.isAvailable !== false;

    // Calculate total quantity across all versions of this item in cart
    useEffect(() => {
        if (cartItems && Array.isArray(cartItems)) {
            const totalQuantity = cartItems
                .filter(cartItem => cartItem.id === item.id)
                .reduce((sum, cartItem) => sum + (cartItem.quantity || 0), 0);

            if (totalQuantity !== quantity) {
                setQuantity(totalQuantity);
            }
        }
    }, [cartItems, item.id, quantity]);

    useEffect(() => {
        // Update isAvailable if the item props change
        const available = item.isAvailable !== false;
        console.log(`[MenuItemCard] ${item.name} availability: ${available}`);
    }, [item.isAvailable, item.name]);

    // This specifically handles the initial add button click
    const handleInitialAdd = () => {
        // If item is out of stock, don't allow adding
        if (!isAvailable) {
            toast.error(`${item.name} is currently out of stock`);
            return;
        }

        if (item.customizations || item.extras) {
            setIsAdding(true);
            // Open customization modal
            onAddToCart(item, 0, { customizationRequest: true });
            setTimeout(() => {
                setIsAdding(false);
            }, 200);
        } else {
            setIsAdding(true);
            setAnimating(true);
            setTimeout(() => {
                setQuantity(1);
                onAddToCart(item, 1);
                setIsAdding(false);
                setTimeout(() => {
                    setAnimating(false);
                }, 150);
            }, 250);
        }
    };

    // Called by parent when cart state changes
    const updateQuantityAfterCustomization = (newQuantity) => {
        setAnimating(false);
        setIsRemoving(false);
        if (quantity !== newQuantity) {
            setAnimating(true);
            setQuantity(newQuantity);
            setTimeout(() => {
                setAnimating(false);
            }, 200);
        } else {
            setQuantity(newQuantity);
        }
    };

    const handleChangeQuantity = (newQuantity, isIncrement = false) => {
        // If item is out of stock and trying to increment, don't allow
        if (!isAvailable && isIncrement) {
            toast.error(`${item.name} is currently out of stock`);
            return;
        }

        // For customizable items
        if (item.customizations || item.extras) {
            if (isIncrement) {
                onAddToCart(item, 0, { customizationRequest: true });
            } else {
                // Remove one version
                setIsRemoving(true);
                setAnimating(true);
                onAddToCart(item, 0);
                setTimeout(() => {
                    setAnimating(false);
                    setIsRemoving(false);
                }, 800);
            }
            return;
        }

        // For non-customizable items
        if (newQuantity <= 0) {
            setAnimating(true);
            setTimeout(() => {
                setQuantity(0);
                onAddToCart(item, 0);
                setAnimating(false);
            }, 200);
        } else {
            setQuantity(newQuantity);
            onAddToCart(item, newQuantity);
        }
    };

    // Store the update function in the ref and assign it to the item
    useEffect(() => {
        updateRef.current = updateQuantityAfterCustomization;
        item.updateQuantity = updateQuantityAfterCustomization;

        // Important: Return a cleanup function to handle component unmounting
        return () => {
            if (item) {
                item.updateQuantity = null;
            }
        };
    }, [item, quantity]);

    return (
        <div className={`bg-gradient-to-br from-gray-800/90 to-gray-900/95 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-purple-900/30 hover:border-purple-800/50 ${!isAvailable ? 'opacity-75' : ''} relative`}>
            <div className="flex flex-row">
                {item.image && (
                    <div className="w-1/4 relative bg-gradient-to-br from-gray-800 to-purple-900/40">
                        <div className="aspect-square relative">
                            <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className={`object-contain p-1 ${!isAvailable ? 'grayscale' : ''}`}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 20vw"
                            />
                        </div>
                    </div>
                )}
                <div className={`p-3.5 ${item.image ? 'w-3/4' : 'w-full'} flex flex-col justify-between ${!isAvailable ? 'pt-6' : ''}`}>
                    <div>
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-3.5 h-3.5 border ${item.isVeg ? 'border-green-500' : 'border-red-500'} flex items-center justify-center rounded-sm`}>
                                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </div>
                                    <h3 className={`${crimsonText.className} text-lg font-medium text-white tracking-wide line-clamp-1`}>
                                        {item.name}
                                    </h3>
                                </div>
                            </div>
                            <p className={`${crimsonText.className} text-base font-semibold text-white whitespace-nowrap`}>
                                ₹{item.price}
                            </p>
                        </div>
                        {item.description && (
                            <p className="text-purple-200/70 text-xs mt-1.5 line-clamp-2">
                                {item.description}
                            </p>
                        )}
                        {(item.customizations || item.extras) && (
                            <div className="mt-1.5 text-xs text-purple-300/80 italic">
                                {item.customizations && item.extras
                                    ? 'Customizations & extras'
                                    : item.customizations
                                        ? 'Customizations available'
                                        : 'Extras available'}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end mt-2.5 h-8">
                        {quantity === 0 && !isRemoving ? (
                            <div className={`transition-all duration-300 ${animating ? 'scale-90 opacity-90' : 'scale-100 opacity-100'}`}>
                                <button
                                    onClick={handleInitialAdd}
                                    disabled={isAdding || !isAvailable}
                                    className={`bg-gradient-to-r ${isAvailable
                                        ? 'from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600'
                                        : 'from-gray-700 to-gray-800 cursor-not-allowed'
                                        } text-white px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${isAvailable ? 'hover:shadow-lg hover:shadow-purple-700/20' : ''
                                        } focus:outline-none ${isAdding ? 'animate-pulse' : isAvailable ? 'hover:scale-105 active:scale-95' : ''}`}
                                >
                                    {isAdding ? 'Adding...' : isAvailable ? 'Add' : 'Out of Stock'}
                                </button>
                            </div>
                        ) : (
                            <div className={`transition-all duration-300 ${animating ? 'scale-90 opacity-90' : 'scale-100 opacity-100'}`}>
                                <div className="flex items-center bg-gray-800/60 rounded-full p-0.5 border border-gray-700 hover:border-purple-500/50 transition-colors duration-300">
                                    <button
                                        onClick={() => handleChangeQuantity(quantity - 1, false)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-white transition-all duration-200 hover:scale-105 active:scale-90 focus:outline-none"
                                    >
                                        <span className="text-sm font-medium leading-none select-none">−</span>
                                    </button>
                                    <span className="w-7 text-center text-white text-xs font-medium select-none transition-colors duration-200">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => handleChangeQuantity(quantity + 1, true)}
                                        disabled={!isAvailable}
                                        className={`w-7 h-7 flex items-center justify-center rounded-full ${isAvailable
                                            ? 'bg-purple-700 hover:bg-purple-600'
                                            : 'bg-gray-700 cursor-not-allowed'
                                            } text-white transition-all duration-200 ${isAvailable ? 'hover:scale-105 active:scale-90' : ''
                                            } focus:outline-none`}
                                    >
                                        <span className="text-sm font-medium leading-none select-none">+</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}