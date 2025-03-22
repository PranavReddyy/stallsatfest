"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crimson_Text } from 'next/font/google';
import Image from 'next/image';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function StallOwnerLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Check if already logged in
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Check if this user is a stall owner
                    // IMPORTANT: Make sure this field name matches what's in your security rules
                    const stallsRef = collection(db, 'stalls');
                    // Make sure 'stall_owner' is the exact field name in your Firestore
                    const q = query(stallsRef, where('stall_owner', '==', user.email));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const stallDoc = querySnapshot.docs[0];
                        const stallData = stallDoc.data();

                        // Store stall info in localStorage for dashboard use
                        localStorage.setItem('stallOwnerId', stallDoc.id);
                        localStorage.setItem('stallName', stallData.name || 'My Stall');
                        localStorage.setItem('stallLogo', stallData.logo || '/placeholder-logo.png');
                        localStorage.setItem('stallOwnerEmail', user.email);

                        // Redirect to dashboard
                        router.push('/stallowner/dashboard');
                    } else {
                        // User is not a stall owner, sign them out
                        await signOut(auth);
                        setError('Your account is not authorized as a stall owner');
                    }
                } catch (err) {
                    console.error('Error checking stall ownership:', err);
                    setError('Something went wrong. Please try again.');
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setError('');

        try {
            // Authenticate with Firebase
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error('Login error:', error);

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setError('Invalid email or password');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Too many failed login attempts. Please try again later.');
            } else {
                setError('Failed to log in. Please try again.');
            }
            setLoginLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-800">
                <div className="flex justify-center mb-6">
                    <Image src="/officialaeon.png" alt="Aeon Logo" width={180} height={180} className="py-2" />
                </div>

                <h1 className={`${crimsonText.className} text-2xl font-bold text-white text-center mb-6`}>
                    Stall Owner Login
                </h1>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="your@email.com"
                            required
                            disabled={loginLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="••••••••"
                            required
                            disabled={loginLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 hover:shadow-lg hover:shadow-purple-700/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loginLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Logging in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}