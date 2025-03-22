import Link from 'next/link';
import Image from 'next/image';
import { Crimson_Text } from 'next/font/google';

// Initialize the Crimson Text font
const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function StallCard({ stall }) {
    return (
        <Link
            href={`/stall/${stall.id}`}
            className="bg-gradient-to-br from-gray-800/90 to-gray-900/95 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-purple-900/30 transition-all duration-300 hover:-translate-y-1 border border-purple-900/30"
        >
            <div className="flex flex-row h-full">
                {/* Logo container on the left */}
                <div className="w-1/3 sm:w-1/4 relative bg-gradient-to-br from-gray-800 to-purple-900/40">
                    <div className="aspect-square relative">
                        <Image
                            src={stall.logo || '/placeholder-logo.png'}
                            alt={`${stall.name} logo`}
                            fill
                            className="object-contain p-4 transition-transform duration-500 hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                        />
                    </div>
                </div>

                {/* Content container on the right */}
                <div className="p-5 w-2/3 sm:w-3/4 flex flex-col justify-center">
                    <div className="text-left">
                        <h3 className={`${crimsonText.className} text-xl font-medium text-white tracking-wide`}>
                            {stall.name}
                        </h3>
                        {stall.description && (
                            <p className={`${crimsonText.className} text-purple-200/80 text-sm mt-1 line-clamp-2`}>
                                {stall.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}