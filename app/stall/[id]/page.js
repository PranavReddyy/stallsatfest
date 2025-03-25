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
import useSocket from '@/hooks/useSocket';


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
    const { isConnected, stockUpdates = [], clearStockUpdates } = useSocket(stallId);

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
    const [stickyCategoryId, setStickyCategoryId] = useState(null);
    const categoryHeaderRefs = useRef({});
    const categoryContentRefs = useRef({});
    const filterBarHeight = useRef(0);
    const [pushingCategoryId, setPushingCategoryId] = useState(null);
    const [pushProgress, setPushProgress] = useState(0);


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
            dedupingInterval: 89500000, // 1 day
            refreshInterval: 0,  // Don't auto-refresh
            refreshWhenOffline: false,
        }
    );

    useEffect(() => {
        if (stockUpdates.length > 0 && stall) {
            // Process each update
            stockUpdates.forEach(update => {
                // Create a deep copy of the current stall data
                setStall(prevStall => {
                    if (!prevStall) return prevStall;

                    const newStall = JSON.parse(JSON.stringify(prevStall));

                    // Handle main item availability updates
                    if (update.type === 'item' && update.itemId) {
                        // Find and update the item in every category
                        Object.keys(newStall.menu).forEach(category => {
                            const itemIndex = newStall.menu[category].findIndex(item => item.id === update.itemId);
                            if (itemIndex !== -1) {
                                // Update the item's availability
                                newStall.menu[category][itemIndex].isAvailable = update.availability;
                            }
                        });
                    }

                    // Handle extra item availability updates
                    else if (update.type === 'extra' && update.itemId && update.extraId) {
                        // Find the item first
                        Object.keys(newStall.menu).forEach(category => {
                            const itemIndex = newStall.menu[category].findIndex(item => item.id === update.itemId);
                            if (itemIndex !== -1) {
                                // Find the extra in the item
                                const item = newStall.menu[category][itemIndex];
                                if (item.extras && item.extras.length > 0) {
                                    const extraIndex = item.extras.findIndex(extra => extra.id === update.extraId);
                                    if (extraIndex !== -1) {
                                        // Update the extra's availability
                                        item.extras[extraIndex].isAvailable = update.availability;
                                    }
                                }
                            }
                        });
                    }

                    // Handle customization option availability updates
                    else if (update.type === 'option' && update.itemId && update.customId && update.optionId) {
                        // Find the item first
                        Object.keys(newStall.menu).forEach(category => {
                            const itemIndex = newStall.menu[category].findIndex(item => item.id === update.itemId);
                            if (itemIndex !== -1) {
                                // Find the customization in the item
                                const item = newStall.menu[category][itemIndex];
                                if (item.customizations && item.customizations.length > 0) {
                                    const customizationIndex = item.customizations.findIndex(c => c.id === update.customId);
                                    if (customizationIndex !== -1) {
                                        // Find the option in the customization
                                        const customization = item.customizations[customizationIndex];
                                        if (customization.options && customization.options.length > 0) {
                                            const optionIndex = customization.options.findIndex(o => o.id === update.optionId);
                                            if (optionIndex !== -1) {
                                                // Update the option's availability
                                                customization.options[optionIndex].isAvailable = update.availability;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }

                    return newStall;
                });
            });
            clearStockUpdates();
        }
    }, [stockUpdates, stall, clearStockUpdates]);

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

            // Calculate the navbar + filter height offset
            const navbarHeight = 95; // Your navbar height
            const filterHeight = navRef.current?.offsetHeight || 50;
            const totalOffset = navbarHeight + filterHeight;

            // Update active category based on scroll position using the scroll target elements
            if (stall) {
                const categories = Object.keys(stall.menu);
                let activeFound = false;

                // Start from the bottom and work up to handle overlapping sections correctly
                for (let i = categories.length - 1; i >= 0; i--) {
                    const category = categories[i];
                    const element = document.getElementById(`scroll-target-${category}`);

                    if (element) {
                        const rect = element.getBoundingClientRect();

                        // Use the scroll target's position plus a small buffer (10px) to determine visibility
                        if (rect.top <= totalOffset + 10) {
                            if (activeCategory !== category) {
                                setActiveCategory(category);
                                setActiveCategoryIndex(i);
                            }
                            activeFound = true;
                            break;
                        }
                    }
                }

                // If no category is found in view (we're above all categories)
                // set the first category as active
                if (!activeFound && categories.length > 0 && activeCategory !== categories[0]) {
                    setActiveCategory(categories[0]);
                    setActiveCategoryIndex(0);
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
        const element = document.getElementById(`scroll-target-${category}`);
        if (element) {
            // Get heights for calculations
            const navbarHeight = 95; // Navbar height
            const filterHeight = navRef.current?.offsetHeight || 50;
            const totalOffset = navbarHeight + filterHeight - 20; // Add 20px padding

            // Calculate position
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - totalOffset;

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
                }
            } else {
                // If no versions found, remove all (shouldn't happen)
                setCart(cart.filter(i => i.id !== item.id));
            }
            return;
        }

        // For customizations and extras
        if (options.processed) {
            // Calculate total price with customizations and extras
            let totalPrice = item.price;
            let selectedOptions = [];
            let selectedExtras = [];

            // Create a fingerprint for this exact customization
            let customizationFingerprint = '';

            // Process customizations
            if (options.options) {
                // Sort customization keys for consistent fingerprinting
                const sortedCustomKeys = Object.keys(options.options).sort();

                sortedCustomKeys.forEach(customId => {
                    const optionId = options.options[customId];
                    customizationFingerprint += `${customId}:${optionId};`;

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

            // Process extras
            if (options.selected) {
                // Sort extras keys for consistent fingerprinting
                const sortedExtraKeys = Object.keys(options.selected).sort();

                sortedExtraKeys.forEach(extraId => {
                    const isSelected = options.selected[extraId];
                    if (isSelected) {
                        customizationFingerprint += `e:${extraId};`;

                        const extra = item.extras?.find(e => e.id === extraId);
                        if (extra) {
                            totalPrice += extra.price;
                            selectedExtras.push(extra.name);
                        }
                    }
                });
            }

            // Check if this exact customization already exists in cart
            const existingItemIndex = cart.findIndex(cartItem =>
                cartItem.id === item.id &&
                cartItem.customizationFingerprint === customizationFingerprint
            );

            if (existingItemIndex !== -1) {
                // Update existing customized item
                const newCart = [...cart];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: newCart[existingItemIndex].quantity + 1
                };
                setCart(newCart);
            } else {
                // Add new customized item
                const cartItem = {
                    id: item.id,
                    name: item.name,
                    price: totalPrice,
                    basePrice: item.price,
                    quantity: 1,
                    customizations: options.options || {},
                    extras: options.selected || {},
                    selectedOptions,
                    selectedExtras,
                    isVeg: item.isVeg,
                    versionKey: `v_${Date.now()}`,
                    customizationFingerprint,
                    itemRef: item
                };

                setCart([...cart, cartItem]);
            }
        } else {
            // For regular items without customization
            const existingItemIndex = cart.findIndex(i =>
                i.id === item.id &&
                !i.customizationFingerprint
            );

            if (existingItemIndex !== -1) {
                // Update existing regular item
                const newCart = [...cart];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: quantity
                };
                setCart(newCart);
            } else {
                // Add new regular item
                setCart([...cart, {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    basePrice: item.price,
                    quantity: quantity,
                    isVeg: item.isVeg,
                    versionKey: `v_${Date.now()}`
                }]);
            }
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
                    } else if (menuItem.updateQuantity && !itemQuantities[menuItem.id]) {
                        // If item is not in cart anymore, reset to 0
                        menuItem.updateQuantity(0);
                    }
                });
            });
        }
    }, [cart, stall]);

    useEffect(() => {
        if (!stall) return;

        // Function to determine which category header should be sticky
        const handleCategoryTracking = () => {
            const navbarHeight = 95; // Your navbar height
            const filterHeight = navRef.current?.offsetHeight || 50;
            const totalOffset = navbarHeight + filterHeight;

            // Store filter bar height for other calculations
            filterBarHeight.current = filterHeight;

            // Get all category keys
            const categories = Object.keys(stall.menu);

            // Default to no sticky header
            let newStickyCategory = null;
            let pushingCategory = null; // Track the category that's about to push
            let pushProgress = 0;       // Track the push progress (0 to 1)

            for (let i = 0; i < categories.length; i++) {
                const category = categories[i];
                const headerRef = categoryHeaderRefs.current[category];
                const contentRef = categoryContentRefs.current[category];

                if (!headerRef || !contentRef) continue;

                const headerRect = headerRef.getBoundingClientRect();
                const contentRect = contentRef.getBoundingClientRect();
                const headerHeight = headerRect.height;

                // Check if we're in the current category's content area
                if (contentRect.bottom > totalOffset + headerHeight) {
                    // This is the current category in view
                    if (headerRect.top <= totalOffset) {
                        newStickyCategory = category;

                        // Check if we need to start pushing this header out
                        if (i < categories.length - 1) {
                            // Get the next category header
                            const nextCategory = categories[i + 1];
                            const nextHeaderRef = categoryHeaderRefs.current[nextCategory];

                            if (nextHeaderRef) {
                                const nextHeaderRect = nextHeaderRef.getBoundingClientRect();

                                // Calculate how close the next header is to pushing this one
                                // When nextHeaderRect.top equals totalOffset + headerHeight,
                                // the next header is just about to touch the bottom of the current sticky header
                                const distanceToSticky = nextHeaderRect.top - (totalOffset + headerHeight);

                                // Start the push effect when within pushThreshold pixels
                                const pushThreshold = headerHeight;

                                if (distanceToSticky <= 0 && distanceToSticky > -headerHeight) {
                                    // Next header is actively pushing the current one
                                    pushingCategory = nextCategory;

                                    // Simple linear progress for exact physical tracking
                                    pushProgress = Math.abs(distanceToSticky) / headerHeight;

                                    // No easing - this creates the most accurate "physical" push feeling
                                    // that exactly follows scroll position
                                }
                            }
                        }
                    }
                    break;
                }
            }

            // Update state with all the tracking information
            setStickyCategoryId(newStickyCategory);
            setPushingCategoryId(pushingCategory);
            setPushProgress(pushProgress);
        };

        // Add scroll event listener
        window.addEventListener('scroll', handleCategoryTracking);
        // Run once on mount to initialize
        handleCategoryTracking();

        return () => window.removeEventListener('scroll', handleCategoryTracking);
    }, [stall, stickyCategoryId]);


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
            <div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0">
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
                className="sticky z-20 bg-black"
                style={{ top: '95px' }} // Exactly the height of the navbar
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {/* Back button */}
                            <button
                                onClick={() => window.history.back()}
                                className="p-1.5 rounded-full text-gray-300 hover:bg-gray-800/70 mr-3"
                                aria-label="Go back"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {/* Filter options */}
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
            </div>
            {isConnected && (
                <div className="fixed bottom-4 right-4 z-50">
                    <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-green-400 border border-green-500/20">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live
                    </span>
                </div>
            )}

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
                            className="mb-10 relative"
                            id={`category-${category}`}
                            ref={el => categoryContentRefs.current[category] = el}
                        >
                            {/* Invisible anchor for better scroll targeting */}
                            <div
                                className="absolute top-0 left-0 h-2 w-full -mt-10"
                                id={`scroll-target-${category}`}
                            />

                            {/* Category header with conditional sticky behavior */}
                            <div
                                ref={el => categoryHeaderRefs.current[category] = el}
                                className={`${stickyCategoryId === category || pushingCategoryId === category
                                    ? 'sticky bg-black shadow-lg will-change-transform'
                                    : 'bg-black'}`} // Add background to non-sticky state too for consistency
                                style={{
                                    top: (stickyCategoryId === category || pushingCategoryId === category)
                                        ? `${95 + (navRef.current?.offsetHeight || 0)}px`
                                        : 'auto',
                                    // Perfect box-pushing transform
                                    transform: stickyCategoryId === category && pushingCategoryId
                                        ? `translateY(-${pushProgress * 100}%)`
                                        : pushingCategoryId === category
                                            ? `translateY(${(1 - pushProgress) * 100}%)`
                                            : 'translateY(0)',
                                    // Maintain full opacity
                                    opacity: 1,
                                    // Z-index management
                                    zIndex: pushingCategoryId === category ? 9 : 10,
                                    // NO transition - critical for physical feel
                                    transition: 'none',
                                    // Apply border to ALL states, not just sticky
                                    borderBottom: '1px solid rgba(126, 34, 206, 0.3)',
                                    // Apply consistent padding to create uniform box height
                                    padding: '0px',
                                    // Remove any margin that might be creating gaps
                                    margin: '0px',
                                    // Ensure overflow is properly handled
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Category header content - ensure consistent inner padding */}
                                <div
                                    className="flex items-center justify-between py-3 px-1 cursor-pointer"
                                    onClick={() => toggleCategory(category)}
                                >
                                    <h2 className={`${crimsonText.className} text-2xl font-semibold text-white mb-0`}>
                                        {category}
                                    </h2>

                                    {/* Arrow icon that rotates based on expanded state */}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 text-purple-400 transform transition-transform duration-300 ${expandedCategories[category] ? 'rotate-180' : 'rotate-0'
                                            }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
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
                                            cartItems={cart}
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
                className={`fixed left-1/2 transform -translate-x-1/2 z-30 transition-all duration-300 ${showFloatingNav ? 'opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
                    } ${
                    // This moves the navigation up when cart is visible
                    showCart && cart.length > 0 ? 'bottom-[140px]' : 'bottom-10'
                    }`}
            >
                {!showAllCategories ? (
                    // Collapsed floating navigation - Keep this part unchanged
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
                    // NEW Expanded floating categories list - Shows only the category names
                    <div className="bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-purple-800/40 max-w-xs w-95 animate-fadeIn">
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

                        <div className="space-y-1.5 max-h-95 overflow-y-auto hide-scrollbar">
                            {Object.keys(stall.menu).map((category, index) => (
                                <button
                                    key={category}
                                    onClick={() => scrollToCategory(category)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeCategory === category
                                        ? 'bg-purple-700/60 text-white font-medium'
                                        : 'text-gray-300 hover:bg-gray-800/70'
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