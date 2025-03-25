"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Crimson_Text } from 'next/font/google';
import { auth, db } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';


const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function DashboardLayout({ children }) {
    const [loading, setLoading] = useState(true);
    const [stallData, setStallData] = useState({
        id: '',
        name: '',
        logo: '/placeholder-logo.png'
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Check if this user is a stall owner
                    const stallsRef = collection(db, 'stalls');
                    const q = query(stallsRef, where('stall_owner', '==', user.email));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const stallDoc = querySnapshot.docs[0];
                        const stallData = stallDoc.data();

                        setStallData({
                            id: stallDoc.id,
                            name: stallData.name || 'My Stall',
                            logo: stallData.logo || '/placeholder-logo.png',
                            email: user.email
                        });

                        setLoading(false);
                    } else {
                        // User is not a stall owner
                        await signOut(auth);
                        router.push('/stallowner/login');
                    }
                } catch (err) {
                    console.error('Error checking stall ownership:', err);
                    router.push('/stallowner/login');
                }
            } else {
                // No user is signed in
                router.push('/stallowner/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/stallowner/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <div className="flex min-h-screen relative">
                {/* Sidebar - Desktop */}
                <div className="w-64 bg-gray-900 border-r border-gray-800 hidden md:block h-screen fixed">
                    <div className="p-4 border-b border-gray-800">
                        <Link href="/stallowner/dashboard">
                            <div className="flex flex-col items-center">
                                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500">
                                    <Image
                                        src={stallData.logo}
                                        alt="Stall Logo"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <h2 className="text-white font-medium text-center mt-2">
                                    {stallData.name}
                                </h2>
                                <p className="text-gray-400 text-xs text-center">
                                    {stallData.email}
                                </p>
                            </div>
                        </Link>
                    </div>

                    <nav className="py-4 h-[calc(100vh-180px)] overflow-y-auto">
                        <div className="px-4 mb-3 text-gray-400 uppercase text-xs font-medium">
                            Orders
                        </div>
                        <Link
                            href="/stallowner/dashboard/orders"
                            className={`flex items-center px-4 py-2.5 text-sm ${pathname === '/stallowner/dashboard/orders' ? 'bg-purple-800/30 text-white border-l-4 border-purple-600' : 'text-gray-300 hover:bg-gray-800/50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Active Orders
                        </Link>
                        <Link
                            href="/stallowner/dashboard/orders/completed"
                            className={`flex items-center px-4 py-2.5 text-sm ${pathname === '/stallowner/dashboard/orders/completed' ? 'bg-purple-800/30 text-white border-l-4 border-purple-600' : 'text-gray-300 hover:bg-gray-800/50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Completed Orders
                        </Link>

                        <div className="px-4 mb-3 mt-6 text-gray-400 uppercase text-xs font-medium">
                            Insights
                        </div>
                        <Link
                            href="/stallowner/dashboard/analytics"
                            className={`flex items-center px-4 py-2.5 text-sm ${pathname === '/stallowner/dashboard/analytics' ? 'bg-purple-800/30 text-white border-l-4 border-purple-600' : 'text-gray-300 hover:bg-gray-800/50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Analytics
                        </Link>
                        <div className="px-4 mb-3 mt-6 text-gray-400 uppercase text-xs font-medium">
                            Inventory
                        </div>
                        <Link
                            href="/stallowner/dashboard/stock"
                            className={`flex items-center px-4 py-2.5 text-sm ${pathname === '/stallowner/dashboard/stock' ? 'bg-purple-800/30 text-white border-l-4 border-purple-600' : 'text-gray-300 hover:bg-gray-800/50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Stock Management
                        </Link>
                    </nav>

                    <div className="absolute bottom-0 left-0 w-64 border-t border-gray-800 p-4">
                        <button onClick={handleLogout} className="flex items-center text-red-400 hover:text-red-300 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Header - Mobile */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 md:hidden flex justify-between items-center w-full fixed top-0 z-40">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-gray-300 p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="flex items-center">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-500 mr-2">
                                <Image
                                    src={stallData.logo}
                                    alt="Stall Logo"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-white font-medium text-sm truncate max-w-[160px]">
                                {stallData.name}
                            </span>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <Link href="/stallowner/dashboard/orders" className={pathname === '/stallowner/dashboard/orders' ? 'text-purple-400' : 'text-gray-300'}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </Link>
                        <Link href="/stallowner/dashboard/analytics" className={pathname === '/stallowner/dashboard/analytics' ? 'text-purple-400' : 'text-gray-300'}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </Link>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setMobileMenuOpen(false)}
                        ></div>
                        <div className="absolute left-0 top-0 w-64 bg-gray-900 h-full border-r border-gray-800 p-4 transform transition-transform duration-300 ease-in-out">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-purple-500 mr-2">
                                        <Image
                                            src={stallData.logo}
                                            alt="Stall Logo"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">{stallData.name}</h3>
                                        <p className="text-gray-400 text-xs">{stallData.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-gray-500"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <nav className="space-y-1">
                                <div className="text-gray-400 uppercase text-xs font-medium mt-4 mb-2">
                                    Orders
                                </div>
                                <Link
                                    href="/stallowner/dashboard/orders"
                                    className={`flex items-center p-2 text-sm rounded-lg ${pathname === '/stallowner/dashboard/orders' ? 'bg-purple-800/30 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Active Orders
                                </Link>
                                <Link
                                    href="/stallowner/dashboard/orders/completed"
                                    className={`flex items-center p-2 text-sm rounded-lg ${pathname === '/stallowner/dashboard/orders/completed' ? 'bg-purple-800/30 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Completed Orders
                                </Link>

                                <div className="text-gray-400 uppercase text-xs font-medium mt-4 mb-2">
                                    Insights
                                </div>
                                <Link
                                    href="/stallowner/dashboard/analytics"
                                    className={`flex items-center p-2 text-sm rounded-lg ${pathname === '/stallowner/dashboard/analytics' ? 'bg-purple-800/30 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Analytics
                                </Link>

                                <div className="text-gray-400 uppercase text-xs font-medium mt-4 mb-2">
                                    Inventory
                                </div>
                                <Link
                                    href="/stallowner/dashboard/stock"
                                    className={`flex items-center p-2 text-sm rounded-lg ${pathname === '/stallowner/dashboard/stock' ? 'bg-purple-800/30 text-white' : 'text-gray-300 hover:bg-gray-800/50'}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    Stock Management
                                </Link>
                            </nav>

                            <div className="absolute bottom-4 left-0 right-0 px-4">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center text-red-400 hover:text-red-300 p-2 w-full rounded-lg hover:bg-gray-800/30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 md:ml-64 pt-[65px] md:pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
}