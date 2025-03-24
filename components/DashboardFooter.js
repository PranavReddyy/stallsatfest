import React from 'react';
import Link from 'next/link';

export default function DashboardFooter() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
            <div className="px-4 py-4 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <p className="text-xs text-gray-500">
                            © {new Date().getFullYear()} Aeonstalls. All rights reserved.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/support"
                            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
                        >
                            Support
                        </Link>
                        <a
                            href="https://github.com/PranavReddyy/aeonstalls"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}