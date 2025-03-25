import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
    return (
        <nav className="w-full py-5 sticky top-0 z-[100] transition-all duration-300 backdrop-blur-md bg-white/50 dark:bg-black shadow-sm h-[100px]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/officialaeon.png"
                                alt="Aeon Logo"
                                width={180}
                                height={180}
                                className="py-2"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}