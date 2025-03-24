'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import StallCard from '../components/StallCard';
import { Crimson_Text } from 'next/font/google';
import { getStalls } from '../lib/stallsService';
import useSWR from 'swr';
import useSocket from '../hooks/useSocket';
import { toast } from 'react-hot-toast';

// Initialize the Crimson Text font
const crimsonText = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Define fetcher function for SWR
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Home() {
  const router = useRouter();
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // SWR for data fetching with auto-revalidation
  const { data, error: swrError, mutate } = useSWR('/api/stalls', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Poll every 30 seconds
    dedupingInterval: 5000 // Prevent multiple requests in 5 seconds
  });

  // Socket for real-time updates - using 'all' for global notifications
  const { socket, isConnected } = useSocket('all');

  // Setup stall data when SWR data loads or changes
  useEffect(() => {
    if (data?.stalls) {
      setStalls(data.stalls);
      setLoading(false);
    }
    if (swrError) {
      console.error("SWR Error loading stalls:", swrError);
      setError("Failed to load stalls. Please try again later.");
      setLoading(false);
    }
  }, [data, swrError]);

  // Listen for real-time stall updates
  useEffect(() => {
    if (!socket) return;

    const handleStallVisibility = (update) => {
      console.log('Socket event: stall visibility update received:', update);

      // Force refresh the data
      mutate();

      // Show notification
      if (!update.isActive) {
        toast.info(`"${update.stallName || 'A stall'}" is now unavailable`);
      } else {
        toast.success(`"${update.stallName || 'A stall'}" is now available`);
      }
    };

    // Add direct socket event listener (this is more reliable than custom events)
    socket.on('stallVisibilityUpdate', handleStallVisibility);

    return () => {
      socket.off('stallVisibilityUpdate', handleStallVisibility);
    };
  }, [socket, mutate]);

  // Fallback to direct API call if SWR isn't working
  useEffect(() => {
    if (!data && !loading && !swrError) {
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
    }
  }, [data, loading, swrError]);

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

        {isConnected && (
          <div className="fixed bottom-4 right-4 z-50">
            <span className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-green-400 border border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        )}
      </main>
    </div>
  );
}