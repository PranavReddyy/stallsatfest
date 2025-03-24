import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

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

    // If there are no items, don't show the cart
    if (items.length === 0) return null;

    // Handle remove item with animation
    const handleRemoveItem = (index) => {
        setAnimatingItems(prev => ({ ...prev, [index]: true }));
        setTimeout(() => {
            const newItems = [...items];
            newItems.splice(index, 1);
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
    const handleCheckout = () => {
        // First close the expanded cart view if it's open
        if (expanded) {
            setExpanded(false);
        }

        // Then start the checkout process
        setCheckoutAnimating(true);
        setTimeout(() => {
            setIsCheckingOut(true);
            setCheckoutAnimating(false);
        }, 300);
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
    const handlePlaceOrder = (e) => {
        e.preventDefault();
        // Show payment gateway instead of immediately completing the order
        setShowPaymentGateway(true);
    };

    // Add this new function for processing the payment
    const processPayment = () => {
        setPaymentProcessing(true);

        // Simulate payment processing delay (2 seconds)
        setTimeout(() => {
            setPaymentProcessing(false);
            setPaymentSuccess(true);

            // Show success message for 1.5 seconds before completing the order
            setTimeout(async () => {
                // Generate IDs locally
                const paymentId = `PAYMENT${Math.floor(Math.random() * 100000)}`;
                const timestamp = new Date().toISOString();

                // Calculate university cut (10%) and vendor cut (90%)
                const universityCut = Math.round(totalPrice * 0.1); // 10% for university
                const vendorCut = totalPrice - universityCut; // 90% for vendor

                // Format items for storage
                const formattedItems = groupedItems().map(group => ({
                    id: group.id,
                    name: group.name,
                    price: group.price,
                    quantity: group.quantity,
                    customizations: group.selectedOptions ? group.selectedOptions.join(', ') : '',
                    extras: group.selectedExtras ? group.selectedExtras.join(', ') : ''
                }));

                // Create the order data structure
                const orderData = {
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
                    status: "pending", // Initial status
                    payment_id: paymentId,
                    created_at: timestamp,
                    updated_at: timestamp
                };

                try {
                    // Add the order to Firestore
                    const docRef = await addDoc(collection(db, 'orders'), orderData);
                    console.log('Order added to Firestore with ID:', docRef.id);

                    // Create a temporary copy of all cart items BEFORE clearing the cart
                    const cartItemsCopy = [...items];

                    // Clear cart and close the checkout
                    setCart([]);
                    onClose();

                    // Reset checkout state
                    setShowPaymentGateway(false);
                    setPaymentSuccess(false);
                    setIsCheckingOut(false);

                    // Reset all item quantities to 0 using both methods to ensure complete reset

                    // Method 1: Using the itemRef.updateQuantity for items with direct references
                    cartItemsCopy.forEach(item => {
                        if (item.itemRef && item.itemRef.updateQuantity) {
                            item.itemRef.updateQuantity(0);
                        }
                    });

                    // Method 2: Using the direct updateQuantity method (for backward compatibility)
                    cartItemsCopy.forEach(item => {
                        if (item.updateQuantity) {
                            item.updateQuantity(0);
                        }
                    });

                    // Optional: Show a success message to the user
                    alert('Order placed successfully! Order ID: ' + docRef.id);

                } catch (error) {
                    console.error("Error adding order to Firestore:", error);
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
        <div className="fixed inset-0 z-40 pointer-events-none">
            {/* Cart overlay - pointer-events-auto ONLY on the cart elements */}
            <div
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
                    <div className="bg-slate-950 h-full w-full overflow-y-auto animate-fadeIn">
                        \                        {/* Checkout header */}
                        <div className="sticky top-10 z-10 bg-slate-950 backdrop-blur-sm border-b border-gray-800" style={{ paddingTop: '64px' }}>
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
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
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

            {showPaymentGateway && (
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
                                        <p className="text-gray-500 text-sm mt-2">Please don't close this window</p>
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
            )}

            {/* Expanded cart view as a modal */}
            {expanded && (
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
            )}
        </div>
    );
}