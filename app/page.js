'use client'

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StallCard from '../components/StallCard';
import { Crimson_Text } from 'next/font/google';
import { getStalls } from '../lib/stallsService';

// Initialize the Crimson Text font
const crimsonText = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function Home() {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStalls() {
      try {
        setLoading(true);
        const stallsData = await getStalls();
        setStalls(stallsData);
        setError(null);
      } catch (err) {
        console.error("Error loading stalls:", err);
        setError("Failed to load stalls. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadStalls();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className={`${crimsonText.className} text-2xl font-bold text-white mb-2`}>Food Stalls</h2>
          <p className={`${crimsonText.className} text-gray-400`}>Explore offerings from our university fest stalls</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6 bg-red-900/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        ) : stalls.length === 0 ? (
          <div className="text-center p-6 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400">No stalls available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stalls.map((stall) => (
              <StallCard key={stall.id} stall={stall} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}