'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Crimson_Text } from 'next/font/google'
import { initializeApp } from 'firebase/app'
import { getAuth, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
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

export default function DashboardLayout({ children }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [adminEmail, setAdminEmail] = useState('')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Set persistence for longer auth sessions
    useEffect(() => {
        const setPersistenceAsync = async () => {
            try {
                await setPersistence(auth, browserLocalPersistence)
            } catch (error) {
                console.error("Error setting persistence:", error)
            }
        }

        setPersistenceAsync()
    }, [])

    // Set up token refresh
    useEffect(() => {
        // Refresh token every 50 minutes (before the 1 hour expiry)
        const refreshTimer = setInterval(() => {
            if (auth.currentUser) {
                auth.currentUser.getIdToken(true)
                    .then(() => {
                        console.log("Auth token refreshed successfully")
                    })
                    .catch(error => {
                        console.error("Error refreshing token:", error)
                    })
            }
        }, 50 * 60 * 1000) // 50 minutes in milliseconds

        return () => clearInterval(refreshTimer)
    }, [])

    // Handle network reconnections
    useEffect(() => {
        const handleOnline = () => {
            console.log("App is online, refreshing authentication")
            if (auth.currentUser) {
                auth.currentUser.getIdToken(true)
                    .catch(error => {
                        console.error("Error refreshing token after reconnect:", error)
                    })
            }
        }

        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    // Check authentication on page load
    useEffect(() => {
        let authCheckTimeout

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // If localStorage has admin info but Firebase doesn't have a user,
                // wait briefly before redirecting - might be a token refresh issue
                if (localStorage.getItem('adminAuthenticated') === 'true') {
                    authCheckTimeout = setTimeout(() => {
                        // Only redirect if still no user after timeout
                        if (!auth.currentUser) {
                            router.push('/admin/login')
                        }
                    }, 3000) // 3 second grace period for token refresh
                } else {
                    router.push('/admin/login')
                }
                return
            }

            clearTimeout(authCheckTimeout)

            // Check if the user's email is the admin email
            if (user.email === 'stalls@aeon.com') {
                try {
                    const adminDocRef = doc(db, 'admin', 'settings')
                    await getDoc(adminDocRef)

                    // Update localStorage to confirm still authenticated
                    localStorage.setItem('adminAuthenticated', 'true')
                    localStorage.setItem('adminEmail', user.email)

                    setAdminEmail(user.email)
                    setIsLoading(false)
                } catch (error) {
                    console.error("Permission check failed:", error)
                    localStorage.removeItem('adminAuthenticated')
                    localStorage.removeItem('adminEmail')
                    await auth.signOut()
                    router.push('/admin/login')
                }
            } else {
                localStorage.removeItem('adminAuthenticated')
                localStorage.removeItem('adminEmail')
                await auth.signOut()
                router.push('/admin/login')
            }
        })

        return () => {
            unsubscribe()
            clearTimeout(authCheckTimeout)
        }
    }, [router])

    // Handle logout
    const handleLogout = async () => {
        try {
            localStorage.removeItem('adminAuthenticated')
            localStorage.removeItem('adminEmail')
            await signOut(auth)
            router.push('/admin/login')
        } catch (error) {
            console.error("Error signing out:", error)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center justify-between">
                        <Link href="/admin/dashboard" className="flex items-center">
                            <Image
                                src="/officialaeon.png"
                                alt="Aeon Logo"
                                width={100}
                                height={100}
                                className="mr-2 sm:mr-3"
                            />
                            <h1 className={`${crimsonText.className} text-2xl font-bold`}>
                                Admin
                            </h1>
                        </Link>

                        {/* Mobile-only sign out button */}
                        <button
                            onClick={handleLogout}
                            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-lg text-white transition-colors sm:hidden"
                            aria-label="Sign Out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>

                    {/* Desktop User Info and Logout */}
                    <div className="hidden sm:flex items-center gap-4">
                        <span className="text-sm text-zinc-400">
                            {adminEmail}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-white transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {children}
            </main>
        </div>
    )
}