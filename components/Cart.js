import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function Cart({ items, show, onClose, setCart, stallId, stallName }) {
    const [expanded, setExpanded] = useState(false);
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [animatingItems, setAnimatingItems] = useState({});
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutAnimating, setCheckoutAnimating] = useState(false);
    const [checkoutInfo, setCheckoutInfo] = useState({
        name: '',
        phone: '',
    });


    // Add these state variables at the top with your other useState declarations
    const [showPaymentGateway, setShowPaymentGateway] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    // First, add a new state variable at the top with your other state variables

    const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState(null);
    const [unavailableItems, setUnavailableItems] = useState([]);
    const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);
    const [isValidatingAvailability, setIsValidatingAvailability] = useState(false);


    // Calculate totals whenever items change
    useEffect(() => {
        const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const count = items.reduce((acc, item) => acc + item.quantity, 0);
        setTotalPrice(total);
        setTotalItems(count);
    }, [items]);

    useEffect(() => {
        if (showPaymentGateway) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup
        return () => {
            document.body.style.overflow = '';
        };
    }, [showPaymentGateway]);

    useEffect(() => {
        // When checkout is open, prevent body scrolling
        if (isCheckingOut) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup function to restore scrolling when component unmounts
        return () => {
            document.body.style.overflow = '';
        };
    }, [isCheckingOut]);

    useEffect(() => {
        // Prevent background scrolling when any modal is open
        const shouldLockScroll = showOrderConfirmation || expanded || isCheckingOut || showPaymentGateway;

        if (shouldLockScroll) {
            // Save the current overflow value to restore it later
            const originalStyle = window.getComputedStyle(document.body).overflow;
            // Prevent scrolling on the background
            document.body.style.overflow = 'hidden';

            // Clean up function to restore scrolling when component unmounts or dependencies change
            return () => {
                document.body.style.overflow = originalStyle;
            };
        } else {
            // Important: explicitly restore scrolling when all modals are closed
            document.body.style.overflow = '';
        }
    }, [showOrderConfirmation, expanded, isCheckingOut, showPaymentGateway]);

    useEffect(() => {
        // When the cart becomes empty, make sure expanded view is closed
        if (items.length === 0) {
            setExpanded(false);
        }
    }, [items.length]);

    // If there are no items, don't show the cart
    if (items.length === 0) return null;

    const checkItemsAvailability = async () => {
        setIsValidatingAvailability(true);

        try {
            // Use your existing menu endpoint to get availability data
            const response = await fetch(`/api/stalls/${stallId}/menu?include_availability=true`);

            if (!response.ok) {
                throw new Error(`Failed to fetch menu data: ${response.status}`);
            }

            const data = await response.json();
            const menuItems = data.items || [];

            // Find unavailable items by comparing cart items with menu data
            const unavailableFound = [];

            for (const cartItem of items) {
                // Find corresponding menu item
                const menuItem = menuItems.find(item => item.id === cartItem.id);

                // If menu item doesn't exist or is unavailable
                if (!menuItem) {
                    unavailableFound.push({
                        itemId: cartItem.id,
                        name: cartItem.name,
                        message: "This item no longer exists"
                    });
                    continue;
                }

                if (menuItem.isAvailable === false) {
                    unavailableFound.push({
                        itemId: cartItem.id,
                        name: cartItem.name,
                        message: "This item is currently unavailable"
                    });
                    continue;
                }

                // Check extras availability
                if (cartItem.selectedExtras && cartItem.selectedExtras.length > 0 && menuItem.extras) {
                    const unavailableExtras = [];

                    // Handle different formats of selectedExtras
                    const extractExtraId = (extra) => {
                        return typeof extra === 'object' ? extra.id : extra;
                    };

                    const extraIds = cartItem.selectedExtras.map(extractExtraId);

                    // Check each extra
                    for (const extraId of extraIds) {
                        const menuExtra = menuItem.extras.find(e => e.id === extraId);
                        if (menuExtra && menuExtra.isAvailable === false) {
                            const extraName = menuExtra.name || 'Unknown extra';
                            unavailableExtras.push(extraName);
                        }
                    }

                    if (unavailableExtras.length > 0) {
                        unavailableFound.push({
                            itemId: cartItem.id,
                            name: cartItem.name,
                            message: `Unavailable extras: ${unavailableExtras.join(', ')}`
                        });
                        continue;
                    }
                }

                // Check customization options availability
                if (menuItem.customizations &&
                    ((cartItem.selectedOptions && cartItem.selectedOptions.length > 0) ||
                        (cartItem.customizations && Object.keys(cartItem.customizations).length > 0))) {

                    const unavailableOptions = [];

                    // Handle different formats of options
                    let optionIds = [];
                    if (cartItem.customizations) {
                        // Extract option IDs from customizations object
                        optionIds = Object.values(cartItem.customizations);
                    } else if (cartItem.selectedOptions) {
                        // Extract from selectedOptions array
                        optionIds = cartItem.selectedOptions.map(opt => typeof opt === 'object' ? opt.id : opt);
                    }

                    // Check each option across all customization groups
                    for (const optionId of optionIds) {
                        // Find the option in any customization group
                        let found = false;

                        for (const customization of menuItem.customizations) {
                            if (!customization.options) continue;

                            const menuOption = customization.options.find(o => o.id === optionId);
                            if (menuOption) {
                                found = true;
                                if (menuOption.isAvailable === false) {
                                    unavailableOptions.push(menuOption.name || 'Unknown option');
                                }
                                break; // Option found, no need to check other customization groups
                            }
                        }

                        // If option wasn't found at all, it's unavailable
                        if (!found) {
                            unavailableOptions.push('Unknown option');
                        }
                    }

                    if (unavailableOptions.length > 0) {
                        unavailableFound.push({
                            itemId: cartItem.id,
                            name: cartItem.name,
                            message: `Unavailable options: ${unavailableOptions.join(', ')}`
                        });
                        continue;
                    }
                }
            }

            // Update state based on check results
            setIsValidatingAvailability(false);

            if (unavailableFound.length > 0) {
                setUnavailableItems(unavailableFound);
                setShowAvailabilityWarning(true);
                return false;
            }

            return true;

        } catch (error) {
            console.error("Error checking availability:", error);
            // On error, proceed with checkout for better UX
            setIsValidatingAvailability(false);
            return true;
        }
    };

    const showConfirmationScreen = (orderData, orderId) => {
        setConfirmedOrder({
            ...orderData,
            order_id: orderId
        });
        setShowOrderConfirmation(true);
        return true;
    };

    const removeUnavailableItems = () => {
        const unavailableItemIds = unavailableItems.map(item => item.itemId);
        const newItems = items.filter(item => !unavailableItemIds.includes(item.id));

        // If this will empty the cart, close all modals
        if (newItems.length === 0) {
            setExpanded(false);
            setIsCheckingOut(false);
            onClose();
        }

        setCart(newItems);
        setShowAvailabilityWarning(false);
    };

    // Handle remove item with animation
    const handleRemoveItem = (index) => {
        setAnimatingItems(prev => ({ ...prev, [index]: true }));

        setTimeout(() => {
            const newItems = [...items];
            newItems.splice(index, 1);

            // If this will empty the cart, close the expanded view
            if (newItems.length === 0) {
                setExpanded(false);
            }

            setCart(newItems);
            setAnimatingItems(prev => {
                const updated = { ...prev };
                delete updated[index];
                return updated;
            });
        }, 300);
    };

    // Handle change quantity with animation
    const updateQuantity = (index, newQuantity) => {
        const newItems = [...items];

        if (newQuantity <= 0) {
            // Remove the item entirely
            newItems.splice(index, 1);
        } else {
            // Update quantity
            newItems[index] = {
                ...newItems[index],
                quantity: newQuantity
            };
        }

        setCart(newItems);
    };

    // Handle checkout transition
    const handleCheckout = async () => {
        // First close the expanded cart view if it's open
        if (expanded) {
            setExpanded(false);
        }

        // Check availability before proceeding
        const allAvailable = await checkItemsAvailability();

        if (allAvailable) {
            // Then start the checkout process
            setCheckoutAnimating(true);
            setTimeout(() => {
                setIsCheckingOut(true);
                setCheckoutAnimating(false);
            }, 300);
        }
        // If not all available, the warning modal will show
    };

    // Handle back from checkout
    const handleBackFromCheckout = () => {
        setCheckoutAnimating(true);
        setTimeout(() => {
            setIsCheckingOut(false);
            setCheckoutAnimating(false);
        }, 300);
    };

    // Handle input changes for checkout form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCheckoutInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle place order
    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        // Final availability check before proceeding to payment
        const allAvailable = await checkItemsAvailability();

        if (allAvailable) {
            // Show payment gateway
            setShowPaymentGateway(true);
        }
        // If not all available, the warning modal will show
    };

    // Add this new function for processing the payment
    const processPayment = async () => {
        // One final check before processing payment
        const allAvailable = await checkItemsAvailability();

        if (!allAvailable) {
            // Don't process payment if items became unavailable
            setPaymentProcessing(false);
            return;
        }

        setPaymentProcessing(true);

        // Simulate payment processing delay (2 seconds)
        setTimeout(() => {
            setPaymentProcessing(false);
            setPaymentSuccess(true);

            // Show success message for 1.5 seconds before completing the order
            setTimeout(async () => {
                try {
                    // Generate a payment ID (we'll still use a random one)
                    const paymentId = `PAYMENT${Math.floor(Math.random() * 100000)}`;
                    const timestamp = new Date().toISOString();

                    // Calculate university cut (10%) and vendor cut (90%)
                    const universityCut = Math.round(totalPrice * 0.1);
                    const vendorCut = totalPrice - universityCut;

                    // Format items for storage
                    const formattedItems = groupedItems().map(group => ({
                        id: group.id,
                        name: group.name,
                        price: group.price,
                        quantity: group.quantity,
                        customizations: group.selectedOptions ? group.selectedOptions.join(', ') : '',
                        extras: group.selectedExtras ? group.selectedExtras.join(', ') : ''
                    }));

                    let orderId;

                    // Get next order ID using a transaction to ensure uniqueness
                    try {
                        // Use a transaction to safely increment the counter
                        await runTransaction(db, async (transaction) => {
                            const counterRef = doc(db, "counters", "orders");
                            const counterDoc = await transaction.get(counterRef);

                            if (!counterDoc.exists()) {
                                // If counter doesn't exist yet, create it
                                transaction.set(counterRef, { value: 1 });
                                orderId = 1;
                            } else {
                                // Increment the counter
                                const newValue = counterDoc.data().value + 1;
                                transaction.update(counterRef, { value: newValue });
                                orderId = newValue;
                            }
                        });

                        console.log(`Generated new order ID: ${orderId}`);
                    } catch (error) {
                        // Fallback to timestamp-based ID if transaction fails
                        console.error("Failed to get incrementing order ID:", error);
                        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
                        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                        orderId = `AEON-${dateStr}-${randomPart}`;
                    }

                    // Create the order data structure
                    const orderData = {
                        order_id: orderId.toString(), // Convert to string for consistency
                        stall_id: stallId,
                        stall_name: stallName,
                        customer_info: {
                            name: checkoutInfo.name,
                            phone: checkoutInfo.phone
                        },
                        items: formattedItems,
                        total_amount: totalPrice,
                        university_cut: universityCut,
                        vendor_cut: vendorCut,
                        status: "pending",
                        payment_id: paymentId,
                        created_at: timestamp,
                        updated_at: timestamp
                    };

                    // 1. First save a copy of cart items
                    const cartItemsCopy = [...items];

                    try {
                        // Add the order to Firestore
                        const docRef = await addDoc(collection(db, 'orders'), orderData);
                        console.log('Order added to Firestore with ID:', docRef.id);

                        // Set confirmed order data
                        setConfirmedOrder({
                            ...orderData,
                            order_id: orderId.toString() // Ensure it's a string
                        });

                        // Hide payment gateway
                        setShowPaymentGateway(false);
                        setPaymentSuccess(false);

                        // IMPORTANT: Hide checkout view BEFORE showing confirmation
                        setIsCheckingOut(false);

                        // Show confirmation screen
                        setShowOrderConfirmation(true);

                        // Reset item quantities (no UI impact)
                        cartItemsCopy.forEach(item => {
                            if (item.itemRef && item.itemRef.updateQuantity) {
                                item.itemRef.updateQuantity(0);
                            }
                            if (item.updateQuantity) {
                                item.updateQuantity(0);
                            }
                        });

                    } catch (error) {
                        console.error("Error in payment process:", error);
                        alert('There was an error placing your order. Please try again.');
                        setPaymentSuccess(false);
                        setShowPaymentGateway(false);
                    }
                } catch (error) {
                    console.error("Error in payment process:", error);
                    alert('There was an error placing your order. Please try again.');
                    setPaymentSuccess(false);
                    setShowPaymentGateway(false);
                }
            }, 1500);
        }, 2000);
    };

    const groupedItems = () => {
        // Group items with identical customization fingerprints
        const groupMap = items.reduce((acc, item, index) => {
            // Create a composite key for grouping
            const key = item.customizationFingerprint || `regular-${item.id}`;

            if (!acc[key]) {
                // Create a new group with the original index
                acc[key] = {
                    ...item,
                    indices: [index],
                    signature: key
                };
            } else {
                // Add to existing group
                acc[key].quantity += item.quantity;
                acc[key].indices.push(index);
            }

            return acc;
        }, {});

        // Convert back to array
        return Object.values(groupMap);
    };

    const resetAllItemQuantities = () => {
        if (stall && stall.menu) {
            // Reset all menu items to 0 quantity in UI
            Object.values(stall.menu).forEach(categoryItems => {
                categoryItems.forEach(menuItem => {
                    if (menuItem.updateQuantity) {
                        menuItem.updateQuantity(0);
                    }
                });
            });
        }
    };

    return (
        <div className="fixed inset-0 z-40 pointer-events-none" style={{ zIndex: showOrderConfirmation ? 999 : 40 }}>
            {/* Cart overlay - pointer-events-auto ONLY on the cart elements */}
            < div
                onClick={() => expanded && setExpanded(false)}
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${show && (expanded || isCheckingOut) ? 'opacity-100 pointer-events-auto' : 'opacity-0 hidden'
                    }`}
            ></div>

            {/* Cart slide-up panel */}
            <div
                className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out pointer-events-auto ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                    }`}
                style={{
                    position: 'fixed',
                    top: isCheckingOut ? '0' : 'auto', // Change from '64px' to '0' to cover entire viewport
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: isCheckingOut ? '100%' : 'auto', // Change from 'calc(100% - 64px)' to '100%'
                    zIndex: isCheckingOut ? '50' : '40'  // Increase z-index to be above navbar when in checkout
                }}
            >
                {isCheckingOut ? (
                    // Full screen checkout view - Simplified
                    <div className="bg-black h-full w-full overflow-y-auto animate-fadeIn">
                        {/* Checkout header */}
                        <div className="sticky top-10 z-10 bg-black backdrop-blur-sm border-b border-gray-800" style={{ paddingTop: '64px' }}>
                            <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                                <button
                                    onClick={handleBackFromCheckout}
                                    className="p-2 rounded-full bg-gray-800 mr-3 hover:bg-gray-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h1 className={`${crimsonText.className} text-xl font-bold text-white`}>
                                    Checkout
                                </h1>
                            </div>
                        </div>

                        {/* Checkout content - Simplified */}
                        <form onSubmit={handlePlaceOrder} className="max-w-md mx-auto px-4 py-6">
                            {/* Order summary */}
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 mt-10 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                                <h2 className={`${crimsonText.className} text-lg font-semibold text-white mb-4`}>
                                    Order Summary • {stallName}
                                </h2>

                                <div className="space-y-3 mb-4">
                                    {groupedItems().map((group, index) => (
                                        <div key={group.signature} className="flex justify-between animate-fadeIn" style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
                                            <div className="flex items-start">
                                                <span className="text-purple-400 mr-2">{group.quantity}×</span>
                                                <div>
                                                    <p className="text-white">{group.name}</p>
                                                    {(group.selectedOptions && group.selectedOptions.length > 0) && (
                                                        <p className="text-xs text-gray-400">{group.selectedOptions.join(', ')}</p>
                                                    )}
                                                    {(group.selectedExtras && group.selectedExtras.length > 0) && (
                                                        <p className="text-xs text-purple-300">+ {group.selectedExtras.join(', ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-white">₹{group.price * group.quantity}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-700 pt-3 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                                    <div className="flex justify-between font-medium">
                                        <p className="text-white">Total Amount</p>
                                        <p className="text-white">₹{totalPrice}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Basic info - Name & Phone */}
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                                <h2 className={`${crimsonText.className} text-lg font-semibold text-white mb-4`}>
                                    Contact Information
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={checkoutInfo.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-300 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={checkoutInfo.phone}
                                            onChange={handleInputChange}
                                            required
                                            pattern="[0-9]{10}"
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="10-digit phone number"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment - Only gateway */}
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-8 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                                <h2 className={`${crimsonText.className} text-lg font-semibold text-white mb-4`}>
                                    Payment Method
                                </h2>

                                <div className="p-4 bg-gradient-to-r from-indigo-800/50 to-purple-800/50 rounded-lg border border-indigo-700/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mr-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Online Payment</p>
                                                <p className="text-xs text-indigo-300">Pay securely online</p>
                                            </div>
                                        </div>
                                        <div className="h-5 w-5 rounded-full border-2 border-white flex items-center justify-center">
                                            <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 hover:shadow-lg hover:shadow-purple-700/20 active:scale-98 animate-fadeIn"
                                style={{ animationDelay: '0.4s' }}
                            >
                                Proceed to Payment • ₹{totalPrice}
                            </button>
                        </form>
                    </div>


                ) : (
                    // Super minimal cart view
                    <div
                        className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl shadow-xl mx-4 md:mx-30 mb-10 transform transition-all duration-500 ease-out hover:shadow-2xl animate-cartAppear"
                    >
                        <div className="flex justify-between items-center p-4">
                            <div className="flex flex-row items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">
                                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                    </p>
                                    <p className={`${crimsonText.className} text-xl font-semibold text-white`}>
                                        ₹{totalPrice}
                                    </p>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setExpanded(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                    View Order
                                </button>

                                <button
                                    onClick={handleCheckout}
                                    className="bg-white text-indigo-900 px-4 py-2 rounded-full font-medium text-sm hover:bg-purple-100 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md"
                                >
                                    Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {
                showPaymentGateway && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn pointer-events-auto">
                        <div className="bg-white rounded-xl max-w-sm w-full p-5 mx-4 shadow-2xl animate-slideUp pointer-events-auto">
                            {paymentSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-gray-800 text-xl font-bold mb-2">Payment Successful!</h3>
                                    <p className="text-gray-600 mb-6">Your order has been placed successfully.</p>
                                    <div className="mx-auto w-8 h-8 border-t-4 border-b-4 border-green-500 rounded-full animate-spin"></div>
                                    <p className="text-sm text-gray-500 mt-4">Redirecting to confirmation...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-gray-800 text-lg font-bold">Payment Gateway</h3>
                                        {!paymentProcessing && (
                                            <button
                                                onClick={() => setShowPaymentGateway(false)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {paymentProcessing ? (
                                        <div className="text-center py-10">
                                            <div className="mx-auto w-12 h-12 border-t-4 border-b-4 border-purple-500 rounded-full animate-spin mb-4"></div>
                                            <p className="text-gray-600">Processing your payment...</p>
                                            <p className="text-gray-500 text-sm mt-2">Please don&apos;t close this window</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-gray-600 text-sm">Order Total:</span>
                                                    <span className="text-gray-800 font-semibold">₹{totalPrice}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 text-sm">From:</span>
                                                    <span className="text-gray-800">{stallName}</span>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <label className="block text-gray-700 text-sm font-medium mb-2">Card Number</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    placeholder="4242 4242 4242 4242"
                                                    defaultValue="4242 4242 4242 4242"
                                                />
                                                <div className="flex mt-4 space-x-4">
                                                    <div className="flex-1">
                                                        <label className="block text-gray-700 text-sm font-medium mb-2">Expiry Date</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            placeholder="MM/YY"
                                                            defaultValue="12/25"
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <label className="block text-gray-700 text-sm font-medium mb-2">CVV</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            placeholder="123"
                                                            defaultValue="123"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={processPayment}
                                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition shadow-md hover:shadow-lg"
                                            >
                                                Pay ₹{totalPrice}
                                            </button>

                                            <div className="mt-4 text-center">
                                                <p className="text-gray-500 text-xs">This is a test payment gateway. No real payments are processed.</p>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Expanded cart view as a modal */}
            {
                expanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto px-4">
                        <div className="bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-800 animate-fadeIn">
                            <div className="sticky top-0 z-10 p-3 border-b border-gray-700 flex justify-between items-center bg-gradient-to-b from-gray-900 to-gray-900/95">
                                <h3 className={`${crimsonText.className} text-lg font-semibold text-white`}>
                                    Your Order • {stallName}
                                </h3>
                                <button
                                    onClick={() => setExpanded(false)}
                                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
                                <div className="p-3 space-y-3">
                                    {groupedItems().map((group, groupIndex) => (
                                        <div
                                            key={group.signature}
                                            className={`flex justify-between items-start border-b border-gray-700 pb-2.5 transition-all duration-300 opacity-100`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h4 className="text-white text-sm font-medium">{group.name}</h4>
                                                    <p className="text-white text-sm">₹{group.price}</p>
                                                </div>

                                                {group.selectedOptions && group.selectedOptions.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-gray-400">
                                                            {group.selectedOptions.join(', ')}
                                                        </p>
                                                    </div>
                                                )}

                                                {group.selectedExtras && group.selectedExtras.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-purple-300">
                                                            + {group.selectedExtras.join(', ')}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center mt-1.5">
                                                    <div className="flex items-center bg-gray-800/60 rounded-full p-0.5 border border-gray-700">
                                                        <button
                                                            onClick={() => {
                                                                // Decrease quantity of the first item in the group
                                                                updateQuantity(group.indices[0], group.quantity - 1);
                                                            }}
                                                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-700 text-white text-xs transition-all duration-200 active:scale-90"
                                                        >
                                                            <span className="text-xs font-medium leading-none select-none">-</span>
                                                        </button>
                                                        <span className="w-6 text-center text-white text-xs font-medium transition-colors duration-300">
                                                            {group.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                // Increase quantity of the first item in the group
                                                                updateQuantity(group.indices[0], group.quantity + 1);
                                                            }}
                                                            className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-700 hover:bg-purple-600 text-white text-xs transition-all duration-200 active:scale-90"
                                                        >
                                                            <span className="text-xs font-medium leading-none select-none">+</span>
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            // Remove all items in this group
                                                            handleRemoveItem(group.indices[0]);
                                                        }}
                                                        className="ml-3 text-red-400 hover:text-red-300 text-xs hover:underline transition-all duration-200"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 border-t border-gray-700 bg-gradient-to-t from-gray-900 to-gray-900/95">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-white text-sm">Total ({totalItems} items):</span>
                                    <span className={`${crimsonText.className} text-lg font-semibold text-white`}>
                                        ₹{totalPrice}
                                    </span>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setExpanded(false)}
                                        className="flex-1 py-2 border border-gray-600 rounded-full text-white text-sm hover:bg-gray-700 transition-all duration-200 active:scale-98 focus:outline-none"
                                    >
                                        Continue Shopping
                                    </button>

                                    <button
                                        onClick={handleCheckout}
                                        className="flex-1 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-sm rounded-full text-center transition-all duration-200 hover:shadow-lg hover:shadow-purple-700/20 active:scale-98 focus:outline-none"
                                    >
                                        Checkout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showOrderConfirmation && confirmedOrder && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto overflow-hidden">
                        <div
                            className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-purple-800/30 animate-fadeIn"
                            style={{
                                width: 'calc(100% - 32px)',
                                maxWidth: '450px',
                                maxHeight: '85vh',
                                margin: '16px'
                            }}
                        >
                            <div className="sticky top-0 z-10 p-3 border-b border-gray-800 flex justify-between items-center bg-gradient-to-b from-gray-900 to-gray-900/95">
                                <div className="flex items-center">
                                    <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center mr-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className={`${crimsonText.className} text-base font-semibold text-white`}>
                                        Order Confirmed
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowOrderConfirmation(false);
                                        setCart([]);
                                        onClose();
                                    }}
                                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(85vh - 50px)' }}>
                                {/* Order Summary Section - Condensed */}
                                <div className="bg-purple-900/30 border border-purple-800/30 rounded-lg p-3 mb-3">
                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                        <h4 className="text-white text-xs font-medium">Order ID</h4>
                                        <span className="text-purple-300 font-mono text-xs text-right break-all">
                                            #{confirmedOrder.order_id}
                                        </span>

                                        <h4 className="text-white text-xs font-medium">Date & Time</h4>
                                        <span className="text-gray-300 text-xs text-right">
                                            {new Date(confirmedOrder.created_at).toLocaleString()}
                                        </span>

                                        <h4 className="text-white text-xs font-medium">Amount</h4>
                                        <span className="text-white text-xs font-medium text-right">₹{confirmedOrder.total_amount}</span>

                                        <h4 className="text-white text-xs font-medium">Payment</h4>
                                        <span className="flex items-center text-green-400 text-xs justify-end">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                                            Paid Online
                                        </span>
                                    </div>
                                </div>

                                {/* Customer Info - Compact */}
                                <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                                    <h4 className="text-white text-xs font-medium mb-2">Customer Details</h4>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <p className="text-gray-400">Name</p>
                                        <p className="text-white text-right">{confirmedOrder.customer_info.name}</p>

                                        <p className="text-gray-400">Phone</p>
                                        <p className="text-white text-right">{confirmedOrder.customer_info.phone}</p>
                                    </div>
                                </div>

                                {/* Order Details - Compact */}
                                <div className="mb-3">
                                    <h4 className="text-white text-xs font-medium mb-1">Order Details</h4>
                                    <div className="bg-gray-800/50 rounded-lg p-2 space-y-1.5">
                                        {confirmedOrder.items.map((item, index) => (
                                            <div key={index} className="flex justify-between text-xs border-b border-gray-700 pb-1.5 last:border-0 last:pb-0">
                                                <div>
                                                    <p className="text-white">{item.quantity}× {item.name}</p>
                                                    {item.customizations && (
                                                        <p className="text-xs text-gray-400">{item.customizations}</p>
                                                    )}
                                                    {item.extras && (
                                                        <p className="text-xs text-purple-300">+ {item.extras}</p>
                                                    )}
                                                </div>
                                                <p className="text-white text-right whitespace-nowrap">₹{item.price * item.quantity}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions + Pickup - Combined and Compact */}
                                <div className="bg-gray-800/50 rounded-lg p-3 mb-3 text-xs">
                                    <div className="flex items-start mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400 mr-1.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-gray-300">
                                            Please take a screenshot and show it at {confirmedOrder.stall_name} to collect your order.
                                        </p>
                                    </div>

                                    <div className="flex items-start">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-gray-300">
                                            Pickup at: <span className="text-white">{confirmedOrder.stall_name}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Got it Button */}
                                <button
                                    onClick={() => {
                                        setShowOrderConfirmation(false);
                                        setCart([]);
                                        setIsCheckingOut(false);
                                        onClose();
                                    }}
                                    className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-medium transition-all duration-200"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {showAvailabilityWarning && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn pointer-events-auto">
                    <div className="bg-gray-900 rounded-xl max-w-sm w-full p-5 mx-4 shadow-2xl animate-slideUp pointer-events-auto border border-red-500/30">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white text-lg font-bold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Availability Changed
                            </h3>
                            <button
                                onClick={() => setShowAvailabilityWarning(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-white text-sm mb-3">
                                Some items in your cart are no longer available:
                            </p>
                            <div className="bg-gray-800 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                                {unavailableItems.map((item, index) => (
                                    <div key={index} className="flex items-start text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <div>
                                            <p className="text-white">{item.name}</p>
                                            {item.message && <p className="text-xs text-gray-400">{item.message}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={removeUnavailableItems}
                                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Remove Unavailable
                            </button>
                            <button
                                onClick={() => setShowAvailabilityWarning(false)}
                                className="flex-1 py-2 bg-transparent border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Keep Browsing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading spinner for availability checking */}
            {isValidatingAvailability && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
                    <div className="bg-gray-900/90 rounded-lg px-6 py-4 flex items-center shadow-xl border border-gray-800">
                        <div className="w-6 h-6 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin mr-3"></div>
                        <p className="text-white text-sm">Checking availability...</p>
                    </div>
                </div>
            )}
        </div >
    );
}