import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-black border-t border-gray-800">
            {/* Main Footer Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    {/* Left section - Logo */}
                    <div className="flex flex-col gap-2 items-center md:items-start">
                        <div className="flex items-center gap-3">
                            <div className="relative w-60 h-15">
                                <Image
                                    src="/officialaeon.png"
                                    alt="Aeonstalls Logo"
                                    width={150}
                                    height={150}
                                    className="rounded-lg"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 md:max-w-xs text-center md:text-left">
                            Order food from your favorite stalls during university events
                        </p>
                    </div>

                    {/* Right section - Login Links */}
                    <div className="flex flex-col gap-4">
                        <h3 className="font-medium text-lg text-white text-center md:text-right">Logins</h3>
                        <div className="flex flex-col gap-3 items-center md:items-end">
                            <Link
                                href="/stallowner/login"
                                className="text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200"
                            >
                                Stall Login
                            </Link>
                            <Link
                                href="/admin/login"
                                className="text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200"
                            >
                                Admin Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright section */}
            <div className="border-t border-gray-800">
                <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <p className="text-xs text-gray-500 text-center sm:text-left">
                        © {new Date().getFullYear()} Aeon. All rights reserved.
                    </p>

                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/PranavReddyy/aeonstalls"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}