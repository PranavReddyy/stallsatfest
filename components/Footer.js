'use client'
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Footer() {
    // Check if we're in the stallowner dashboard area
    const pathname = usePathname();
    const isStallOwnerDashboard = pathname && pathname.startsWith('/stallowner/dashboard');

    // Don't render the footer on stallowner dashboard
    if (isStallOwnerDashboard) {
        return null;
    }

    return (
        <footer className="bg-black border-t border-gray-800">
            {/* Main Footer Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="flex flex-row justify-between items-start">

                    <div className="flex flex-col gap-2 items-start max-w-[65%]">
                        <Link href="/">
                            <div className="relative w-40 h-auto">
                                <Image
                                    src="/officialaeon.png"
                                    alt="Aeonstalls Logo"
                                    width={150}
                                    height={150}
                                    className="rounded-lg w-full h-auto"
                                />
                            </div>
                        </Link>
                        <p className="text-xs sm:text-sm text-gray-400 text-left line-clamp-2 sm:line-clamp-none">
                            Order food from your favorite stalls during university events
                        </p>
                    </div>

                    {/* Right section - Login Links */}
                    <div className="flex flex-col gap-2 sm:gap-4 items-end">
                        <h3 className="font-medium text-sm sm:text-lg text-white text-right">
                            Navigation
                        </h3>
                        <div className="flex flex-col gap-2 sm:gap-3 items-end">
                            <Link
                                href="/"
                                className="text-xs sm:text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200"
                            >
                                Home
                            </Link>
                            <Link
                                href="/stallowner/login"
                                className="text-xs sm:text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200"
                            >
                                Stall Login
                            </Link>
                            <Link
                                href="/admin/login"
                                className="text-xs sm:text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200"
                            >
                                Admin Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright section */}
            <div className="border-t border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-row justify-between items-center">
                    <p className="text-[10px] sm:text-xs text-gray-500 text-left">
                        © {new Date().getFullYear()} Aeon. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}