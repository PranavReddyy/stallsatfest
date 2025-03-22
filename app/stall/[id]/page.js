'use client'

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Crimson_Text } from 'next/font/google';
import Image from 'next/image';
import Navbar from '../../../components/Navbar';
import MenuItemCard from '../../../components/MenuItemCard';
import Cart from '../../../components/Cart';
import CustomizationModal from '../../../components/CustomizationModal';
import { getStallWithMenu } from '../../../lib/stallsService';
import useSWR from 'swr';

// Define fetcher function at module level (this is fine)
const fetcher = async (url) => {
    console.log("Fetching:", url);
    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error fetching ${url}: Status ${response.status}`);
            throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error(`Error in fetcher for ${url}:`, error);
        throw error;
    }
};

// Font definition is fine at module level
const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function StallPage() {
    // Move params inside the component
    const params = useParams();
    const stallId = params.id;

    const [stall, setStall] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [showCustomizationModal, setShowCustomizationModal] = useState(false);

    // Enhanced UI states
    const [expandedCategories, setExpandedCategories] = useState({});
    const [activeCategory, setActiveCategory] = useState('');
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
    const [filterType, setFilterType] = useState('all'); // 'all', 'veg', 'nonveg'
    const [headerVisible, setHeaderVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [showFloatingNav, setShowFloatingNav] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);

    // Refs for elements
    const categoryRefs = useRef({});
    const navRef = useRef(null);

    // Move SWR hooks inside the component
    const { data: stallsData, mutate: refreshStalls } = useSWR('/api/stalls', fetcher, {
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 60000, // 1 minute
        refreshInterval: 300000,  // 5 minutes - periodic refresh
        refreshWhenOffline: false,
    });

    // For menu items with availability info 
    const { data: menuItems, mutate: refreshMenu } = useSWR(
        stallId ? `/api/stalls/${stallId}/menu?include_availability=true` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateIfStale: true,
            dedupingInterval: 30000, // 30 seconds
            refreshInterval: 60000,  // 1 minute - more frequent refresh
            refreshWhenOffline: false,
        }
    );

    // For static menu item data without availability
    const { data: menuItemDetails } = useSWR(
        stallId ? `/api/stalls/${stallId}/menu?include_availability=false` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            dedupingInterval: 86400000, // 1 day
            refreshInterval: 0,  // Don't auto-refresh
            refreshWhenOffline: false,
        }
    );

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!stallId) return;

        // Only connect if stallId is available
        const socket = new WebSocket(`wss://your-websocket-endpoint/${stallId}`);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'availability_update') {
                // Trigger a refresh of the menu items
                refreshMenu();
            }
        };

        return () => {
            socket.close();
        };
    }, [stallId, refreshMenu]);

    useEffect(() => {
        // When menuItems data is available, update your state
        if (menuItems) {
            // Transform data as needed and update your state
            setStall(prevStall => {
                if (!prevStall) return prevStall;

                // Update only the availability information in your stall data
                const updatedMenu = { ...prevStall.menu };

                // Update each item's availability
                Object.keys(updatedMenu).forEach(category => {
                    updatedMenu[category] = updatedMenu[category].map(item => {
                        const updatedItem = menuItems.items.find(menuItem => menuItem.id === item.id);
                        if (updatedItem) {
                            return {
                                ...item,
                                isAvailable: updatedItem.isAvailable,
                                extras: item.extras?.map(extra => {
                                    const updatedExtra = updatedItem.extras?.find(e => e.id === extra.id);
                                    return updatedExtra ? { ...extra, isAvailable: updatedExtra.isAvailable } : extra;
                                }),
                                customizations: item.customizations?.map(customization => {
                                    const updatedCustomization = updatedItem.customizations?.find(c => c.id === customization.id);
                                    if (!updatedCustomization) return customization;

                                    return {
                                        ...customization,
                                        options: customization.options.map(option => {
                                            const updatedOption = updatedCustomization.options?.find(o => o.id === option.id);
                                            return updatedOption ? { ...option, isAvailable: updatedOption.isAvailable } : option;
                                        })
                                    };
                                })
                            };
                        }
                        return item;
                    });
                });

                return {
                    ...prevStall,
                    menu: updatedMenu
                };
            });
        }
    }, [menuItems]);

    useEffect(() => {
        async function loadStall() {
            try {
                setLoading(true);
                const stallData = await getStallWithMenu(params.id);
                setStall(stallData);

                // Initialize all categories as expanded
                const initialExpanded = {};
                Object.keys(stallData.menu).forEach(category => {
                    initialExpanded[category] = true;
                });
                setExpandedCategories(initialExpanded);

                // Set first category as active
                if (Object.keys(stallData.menu).length > 0) {
                    setActiveCategory(Object.keys(stallData.menu)[0]);
                }

                setError(null);
            } catch (err) {
                console.error("Error loading stall:", err);
                setError("Failed to load stall information. Please try again later.");
            } finally {
                setLoading(false);
            }
        }

        if (params.id) {
            loadStall();
        }
    }, [params.id]);

    // Add scroll listener for header visibility and category tracking
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Hide/show header based on scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setHeaderVisible(false);
            } else {
                setHeaderVisible(true);
            }
            setLastScrollY(currentScrollY);

            // Show floating nav when scrolled past the first category
            setShowFloatingNav(currentScrollY > 200);

            // Update active category based on scroll position
            if (stall) {
                const categories = Object.keys(stall.menu);
                for (let i = categories.length - 1; i >= 0; i--) {
                    const category = categories[i];
                    const element = document.getElementById(`category-${category}`);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        // Adjust threshold to account for both navbar and filters
                        if (rect.top <= 150) {
                            if (activeCategory !== category) {
                                setActiveCategory(category);
                                setActiveCategoryIndex(i);
                            }
                            break;
                        }
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY, stall, activeCategory]);

    // Update active category index when active category changes
    useEffect(() => {
        if (stall && activeCategory) {
            const categories = Object.keys(stall.menu);
            const index = categories.indexOf(activeCategory);
            if (index !== -1) {
                setActiveCategoryIndex(index);
            }
        }
    }, [activeCategory, stall]);


    // Toggle category expansion
    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Navigate to previous category
    const goToPrevCategory = () => {
        if (stall) {
            const categories = Object.keys(stall.menu);
            if (activeCategoryIndex > 0) {
                scrollToCategory(categories[activeCategoryIndex - 1]);
            }
        }
    };

    // Navigate to next category
    const goToNextCategory = () => {
        if (stall) {
            const categories = Object.keys(stall.menu);
            if (activeCategoryIndex < categories.length - 1) {
                scrollToCategory(categories[activeCategoryIndex + 1]);
            }
        }
    };

    // Smooth scroll to category
    const scrollToCategory = (category) => {
        setActiveCategory(category);
        const element = document.getElementById(`category-${category}`);
        if (element) {
            // Account for both navbar (64px) and filters section (approximately 50px)
            const navbarHeight = 64;
            const filtersHeight = 50;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - navbarHeight - filtersHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // If all categories view is open, close it
            if (showAllCategories) {
                setShowAllCategories(false);
            }
        }
    };

    // Filter menu items based on selection
    const getFilteredItems = (items) => {
        if (filterType === 'all') return items;
        if (filterType === 'veg') return items.filter(item => item.isVeg);
        if (filterType === 'nonveg') return items.filter(item => !item.isVeg);
        return items;
    };

    const handleAddToCart = (item, quantity = 1, options = {}) => {
        // Check if this is just a request to open the customization modal
        if (options.customizationRequest) {
            setCurrentItem(item);
            setShowCustomizationModal(true);
            return; // Don't add anything to cart yet
        }

        // If quantity is 0, this is a removal operation
        if (quantity === 0) {
            // Find all versions of this item
            const itemVersions = cart.filter(i => i.id === item.id);

            if (itemVersions.length > 0) {
                // Create a copy of the cart to modify
                const newCart = [...cart];

                // Find the most recently added version of this item (last one)
                const indexToRemove = newCart.findIndex(i =>
                    i.id === item.id &&
                    i.versionKey === itemVersions[itemVersions.length - 1].versionKey
                );

                if (indexToRemove !== -1) {
                    // Remove just that one item
                    newCart.splice(indexToRemove, 1);
                    setCart(newCart);

                    // Calculate the new total quantity for UI update
                    const remainingItems = newCart.filter(i => i.id === item.id);
                    const newTotalQuantity = remainingItems.reduce((sum, i) => sum + i.quantity, 0);

                    // Update the UI
                    if (item.updateQuantity) {
                        if (newTotalQuantity > 0) {
                            item.updateQuantity(newTotalQuantity);
                        } else {
                            item.updateQuantity(0);
                        }
                    }
                }
            } else {
                // If no versions found, remove all (shouldn't happen)
                setCart(cart.filter(i => i.id !== item.id));
                if (item.updateQuantity) {
                    item.updateQuantity(0);
                }
            }
            return;
        }

        // Calculate total price with customizations and extras
        let totalPrice = item.price;
        let selectedOptions = [];
        let selectedExtras = [];

        // Create a unique version key for this customization
        let versionKey = `v_${Date.now()}`;

        // Handle customizations from modal submission
        if (options.processed && options.options) {
            Object.entries(options.options).forEach(([customId, optionId]) => {
                const customization = item.customizations?.find(c => c.id === customId);
                if (customization) {
                    const option = customization.options.find(o => o.id === optionId);
                    if (option) {
                        totalPrice += option.price;
                        selectedOptions.push(option.name);
                    }
                }
            });
        }

        // Add extras prices
        if (options.processed && options.selected) {
            Object.entries(options.selected).forEach(([extraId, isSelected]) => {
                if (isSelected) {
                    const extra = item.extras?.find(e => e.id === extraId);
                    if (extra) {
                        totalPrice += extra.price;
                        selectedExtras.push(extra.name);
                    }
                }
            });
        }

        // Create cart item
        const cartItem = {
            id: item.id,
            name: item.name,
            price: totalPrice,
            basePrice: item.price,
            quantity: 1, // Always add 1 for a customized item
            customizations: options.processed ? options.options : {},
            extras: options.processed ? options.selected : {},
            selectedOptions,
            selectedExtras,
            isVeg: item.isVeg,
            versionKey,
            itemRef: item // Keep reference to update UI
        };

        // Get total quantity of this item across all versions
        let totalQuantity = 0;
        const hasCustomization = item.customizations || item.extras;

        if (hasCustomization && options.processed) {
            // For customized items, add a new entry with quantity 1
            setCart([...cart, cartItem]);

            // Calculate the new total quantity
            totalQuantity = cart.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0) + 1;
        } else if (!hasCustomization) {
            // For regular items without customization, just update quantity
            const existingItem = cart.find(i => i.id === item.id && !i.versionKey);

            if (existingItem) {
                setCart(cart.map(i =>
                    i.id === item.id && !i.versionKey ? { ...i, quantity } : i
                ));
                totalQuantity = quantity;
            } else {
                setCart([...cart, { ...cartItem, versionKey: undefined, quantity }]);
                totalQuantity = quantity;
            }
        }

        // Update the UI counter with the total quantity
        if (item.updateQuantity) {
            item.updateQuantity(totalQuantity);
        }

        // Show cart if this is the first item
        if (cart.length === 0) {
            setShowCart(true);
        }
    };

    // Also update handleCustomizationSubmit
    const handleCustomizationSubmit = (customizationSelections, extraSelections) => {
        // Create a combined options object for cleaner code
        const options = {
            processed: true,
            options: customizationSelections,
            selected: extraSelections
        };

        // Call handleAddToCart with the processed options
        handleAddToCart(
            currentItem,
            1, // Always start with 1 for newly customized items
            options
        );

        // Close modal and clear current item
        setShowCustomizationModal(false);
        setCurrentItem(null);
    };

    // Add an effect to update all MenuItemCards when cart changes
    useEffect(() => {
        if (stall && stall.menu) {
            // Create a map of item IDs to total quantities
            const itemQuantities = {};

            // Calculate total quantity for each item across all versions
            cart.forEach(item => {
                if (!itemQuantities[item.id]) {
                    itemQuantities[item.id] = 0;
                }
                itemQuantities[item.id] += item.quantity;
            });

            // Update the UI for each menu item
            Object.values(stall.menu).forEach(categoryItems => {
                categoryItems.forEach(menuItem => {
                    if (menuItem.updateQuantity && itemQuantities[menuItem.id] !== undefined) {
                        menuItem.updateQuantity(itemQuantities[menuItem.id]);
                    }
                });
            });
        }
    }, [cart, stall]);


    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center p-6 bg-red-900/20 rounded-lg">
                        <p className="text-red-400">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!stall) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center p-6 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-400">Stall not found.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <Navbar />

            {/* Stall header */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-15">
                    <div className="flex items-center mb-6">
                        <div className="w-24 h-24 relative mr-4">
                            <Image
                                src={stall.logo || '/placeholder-logo.png'}
                                alt={stall.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div>
                            <h1 className={`${crimsonText.className} text-3xl font-bold text-white`}>
                                {stall.name}
                            </h1>
                            <p className="text-gray-300 mt-1">{stall.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky header with veg/non-veg filter */}
            <div
                ref={navRef}
                className={`sticky z-20 bg-slate-900/20 backdrop-blur-md  ${headerVisible ? '-translate-y-full' : '-translate-y-full'
                    }`}
                style={{ top: '152.5px' }} // Exactly the height of the navbar
            >
                <div className="max-w-7xl mx-auto px-4 ¯sm:px-6 lg:px-8 py-3">
                    {/* Veg/Non-veg filter */}
                    <div className="flex items-center">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${filterType === 'all'
                                    ? 'bg-purple-700 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType('veg')}
                                className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 transition-colors ${filterType === 'veg'
                                    ? 'bg-green-700 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span>Veg Only</span>
                            </button>
                            <button
                                onClick={() => setFilterType('nonveg')}
                                className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 transition-colors ${filterType === 'nonveg'
                                    ? 'bg-red-700 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span>Non-Veg</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu categories and items */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 pb-32">
                {Object.keys(stall.menu).length === 0 ? (
                    <div className="text-center p-6 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-400">No menu items available.</p>
                    </div>
                ) : (
                    Object.entries(stall.menu).map(([category, items]) => (
                        <div
                            key={category}
                            className="mb-10"
                            id={`category-${category}`}
                        >
                            {/* Category header with toggle arrow */}
                            <div
                                className="flex items-center justify-between border-b border-purple-800/30 pb-2 cursor-pointer"
                                onClick={() => toggleCategory(category)}
                            >
                                <h2 className={`${crimsonText.className} text-2xl font-semibold text-white mb-0`}>
                                    {category}
                                </h2>
                                <div className={`transform transition-transform duration-300 ${expandedCategories[category] ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Collapsible content */}
                            <div className={`transition-all duration-300 overflow-hidden ${expandedCategories[category] ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                                }`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {getFilteredItems(items).map((item) => (
                                        <MenuItemCard
                                            key={item.id}
                                            item={item}
                                            onAddToCart={handleAddToCart}
                                        />
                                    ))}
                                </div>

                                {getFilteredItems(items).length === 0 && (
                                    <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                                        <p className="text-gray-400">
                                            No {filterType === 'veg' ? 'vegetarian' : 'non-vegetarian'} items in this category.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Floating Category Navigation - Swiggy Style */}
            <div
                className={`fixed bottom-35 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-300 ${showFloatingNav ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
                    }`}
            >
                {!showAllCategories ? (
                    // Collapsed floating navigation
                    <div className="bg-gray-900/95 backdrop-blur-md px-3 py-2 rounded-full shadow-xl border border-purple-800/40 flex items-center gap-3">
                        <button
                            onClick={goToPrevCategory}
                            disabled={activeCategoryIndex === 0}
                            className={`p-1.5 rounded-full ${activeCategoryIndex === 0
                                ? 'text-gray-500 cursor-not-allowed'
                                : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div
                            className="px-3 font-medium text-white text-center cursor-pointer"
                            onClick={() => setShowAllCategories(true)}
                        >
                            {activeCategory}
                        </div>

                        <button
                            onClick={goToNextCategory}
                            disabled={activeCategoryIndex === Object.keys(stall.menu).length - 1}
                            className={`p-1.5 rounded-full ${activeCategoryIndex === Object.keys(stall.menu).length - 1
                                ? 'text-gray-500 cursor-not-allowed'
                                : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    // Expanded floating categories list
                    <div className="bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-purple-800/40 max-w-xs w-64 animate-fadeIn">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-medium">Categories</h3>
                            <button
                                onClick={() => setShowAllCategories(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-1.5 max-h-64 overflow-y-auto hide-scrollbar">
                            {Object.keys(stall.menu).map((category) => (
                                <button
                                    key={category}
                                    onClick={() => scrollToCategory(category)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeCategory === category
                                        ? 'bg-purple-800 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Cart component */}
            <Cart
                items={cart}
                show={showCart}
                onClose={() => setShowCart(false)}
                setCart={setCart}
                stallId={params.id}
                stallName={stall.name}
            />

            {/* Customization Modal */}
            {showCustomizationModal && currentItem && (
                <CustomizationModal
                    item={currentItem}
                    onClose={() => setShowCustomizationModal(false)}
                    onSubmit={handleCustomizationSubmit}
                />
            )}
        </div>
    );
}