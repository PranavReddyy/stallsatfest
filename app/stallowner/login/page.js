"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crimson_Text } from 'next/font/google';
import Image from 'next/image';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

// Form validation schema
const formSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function StallOwnerLogin() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Initialize form
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    // Check if already logged in
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Check if this user is a stall owner
                    const stallsRef = collection(db, 'stalls');
                    let q = query(stallsRef, where('owner_uid', '==', user.uid));
                    let querySnapshot = await getDocs(q);

                    // If no stall found with owner_uid, try the legacy email lookup
                    if (querySnapshot.empty) {
                        q = query(stallsRef, where('stall_owner', '==', user.email));
                        querySnapshot = await getDocs(q);
                    }

                    if (!querySnapshot.empty) {
                        const stallDoc = querySnapshot.docs[0];
                        const stallData = stallDoc.data();

                        // Store stall info in localStorage for dashboard use
                        localStorage.setItem('stallOwnerId', stallDoc.id);
                        localStorage.setItem('stallName', stallData.name || 'My Stall');
                        localStorage.setItem('stallLogo', stallData.logo || '/placeholder-logo.png');
                        localStorage.setItem('stallOwnerEmail', user.email);
                        localStorage.setItem('stallOwnerUid', user.uid);

                        // Redirect to dashboard
                        router.push('/stallowner/dashboard');
                    } else {
                        // Also check the users collection to see if they have a stallId assigned
                        const userRef = doc(db, 'users', user.uid);
                        const userDoc = await getDoc(userRef);

                        if (userDoc.exists() && userDoc.data().stallId) {
                            const stallId = userDoc.data().stallId;
                            const stallRef = doc(db, 'stalls', stallId);
                            const stallDoc = await getDoc(stallRef);

                            if (stallDoc.exists()) {
                                const stallData = stallDoc.data();

                                // Store stall info
                                localStorage.setItem('stallOwnerId', stallId);
                                localStorage.setItem('stallName', stallData.name || 'My Stall');
                                localStorage.setItem('stallLogo', stallData.logo || '/placeholder-logo.png');
                                localStorage.setItem('stallOwnerEmail', user.email);
                                localStorage.setItem('stallOwnerUid', user.uid);

                                // Redirect to dashboard
                                router.push('/stallowner/dashboard');
                                return;
                            }
                        }

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

    const onSubmit = async (values) => {
        setError('');

        try {
            // Authenticate with Firebase
            await signInWithEmailAndPassword(auth, values.email, values.password);
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
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Image
                        src="/officialaeon.png"
                        alt="Aeon Logo"
                        width={150}
                        height={150}
                        className="mx-auto mb-4"
                    />
                    <h1 className={`${crimsonText.className} text-3xl font-bold text-white`}>
                        Aeon Stalls
                    </h1>
                    <p className="text-gray-400 mt-2">Manage your food stall and serve customers efficiently</p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 text-white shadow-xl">
                    <CardHeader>
                        <CardTitle className={`${crimsonText.className} text-xl`}>Stall Owner Sign In</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Enter your credentials to access your stall dashboard
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="email"
                                                    className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-purple-500"
                                                    placeholder="your@email.com"
                                                    disabled={isSubmitting}
                                                    autoComplete="email"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-300">Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-purple-500"
                                                    placeholder="••••••••"
                                                    disabled={isSubmitting}
                                                    autoComplete="current-password"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </div>
                                    ) : "Sign In"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-2 text-zinc-500 text-sm">
                        <p>For security reasons, this login is exclusively for stall owners.</p>
                    </CardFooter>
                </Card>

                <div className="text-center mt-6">
                    <p className="text-zinc-600 text-sm">
                        © {new Date().getFullYear()} Aeon Stalls. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}