'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crimson_Text } from 'next/font/google'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

// Initialize the Crimson Text font
const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
})

// Form validation schema
const formSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function AdminLogin() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Check if user is already logged in
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Check if the user's email is the admin email
                if (user.email === 'stalls@aeon.com') {
                    // Attempt to access an admin-only document to verify permissions
                    try {
                        // Try to read an admin document - this will be allowed by rules if admin
                        const adminDocRef = doc(db, 'admin', 'settings');
                        await getDoc(adminDocRef);
                        router.push('/admin/dashboard');
                    } catch (error) {
                        // If there's an error, user might be authenticated but not admin
                        console.error("Permission check failed:", error);
                        setError('You do not have admin privileges');
                        auth.signOut();
                    }
                } else {
                    // Not the admin email
                    setError('You do not have admin privileges');
                    auth.signOut();
                }
            }
        })

        return () => unsubscribe()
    }, [router])

    // Initialize form
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    async function onSubmit(values) {
        setIsLoading(true)
        setError('')

        try {
            // Check if the email is the admin email
            if (values.email !== 'stalls@aeon.com') {
                setError('You do not have admin privileges');
                setIsLoading(false);
                return;
            }

            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(
                auth,
                values.email,
                values.password
            )

            // Attempt to access an admin-only document to verify permissions
            try {
                // Initialize admin documents if they don't exist yet
                const adminDocRef = doc(db, 'admin', 'settings');
                const adminDoc = await getDoc(adminDocRef);

                if (!adminDoc.exists()) {
                    // We don't need to create it - the rules will prevent this
                    // for non-admins anyway, so if we get here, we're the admin
                }

                // Successful admin verification - redirect
                router.push('/admin/dashboard');
            } catch (error) {
                console.error("Admin verification failed:", error);
                setError('Unable to access admin area. Please contact support.');
                await auth.signOut();
            }
        } catch (err) {
            console.error('Login error:', err)

            // Handle specific Firebase Auth errors
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password')
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed login attempts. Please try again later')
            } else {
                setError('Failed to sign in. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className={`${crimsonText.className} text-3xl font-bold text-white`}>
                        Aeon Stalls Admin
                    </h1>
                    <p className="text-gray-400 mt-2">Manage your food stalls and analyze performance</p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 text-white shadow-xl">
                    <CardHeader>
                        <CardTitle className={`${crimsonText.className} text-xl`}>Admin Sign In</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Enter your credentials to access the admin dashboard
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
                                                    placeholder="stalls@aeon.com"
                                                    disabled={isLoading}
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
                                                    disabled={isLoading}
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
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
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
                        <p>For security reasons, this page is only accessible to administrators.</p>
                    </CardFooter>
                </Card>

                <div className="text-center mt-6">
                    <p className="text-zinc-600 text-sm">
                        © {new Date().getFullYear()} Aeon Stalls. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}