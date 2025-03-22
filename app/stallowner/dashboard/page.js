"use client";

import { useEffect, useState } from 'react';
import { Crimson_Text } from 'next/font/google';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function Dashboard() {
    const [activeOrders, setActiveOrders] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [latestOrders, setLatestOrders] = useState([]);
    const [stallId, setStallId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const auth = window.localStorage.getItem('stallOwnerId');
                if (!auth) return;

                setStallId(auth);

                // Fetch active orders count
                const pendingOrdersRef = collection(db, 'orders');
                const pendingQuery = query(
                    pendingOrdersRef,
                    where('stall_id', '==', auth),
                    where('status', '==', 'pending')
                );
                const pendingSnapshot = await getDocs(pendingQuery);
                setActiveOrders(pendingSnapshot.size);

                // Fetch latest 5 orders
                const latestOrdersRef = collection(db, 'orders');
                const latestQuery = query(
                    latestOrdersRef,
                    where('stall_id', '==', auth),
                    orderBy('created_at', 'desc'),
                    limit(5)
                );
                const latestSnapshot = await getDocs(latestQuery);
                const ordersData = [];
                latestSnapshot.forEach(doc => {
                    ordersData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                setLatestOrders(ordersData);

                // Calculate total sales
                const allOrdersRef = collection(db, 'orders');
                const allOrdersQuery = query(
                    allOrdersRef,
                    where('stall_id', '==', auth)
                );
                const allOrdersSnapshot = await getDocs(allOrdersQuery);
                let total = 0;
                allOrdersSnapshot.forEach(doc => {
                    const data = doc.data();
                    total += data.total_amount || 0;
                });
                setTotalSales(total);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            day: 'numeric',
            month: 'short'
        }).format(date);
    };

    const dashboardCards = [
        {
            title: 'Active Orders',
            value: activeOrders,
            link: '/stallowner/dashboard/orders',
            color: 'from-orange-600 to-red-600',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            )
        },
        {
            title: 'Total Sales',
            value: `₹${totalSales.toLocaleString()}`,
            link: '/stallowner/dashboard/analytics',
            color: 'from-green-600 to-emerald-600',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
                <h1 className={`${crimsonText.className} text-2xl font-bold text-white mb-2 md:mb-0`}>
                    Dashboard
                </h1>
                <div className="text-sm text-gray-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                        {dashboardCards.map((card, index) => (
                            <Link key={index} href={card.link} className="block">
                                <div className={`bg-gradient-to-br ${card.color} rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white/80 text-sm font-medium mb-1">{card.title}</p>
                                            <p className={`${crimsonText.className} text-xl md:text-2xl font-bold text-white`}>{card.value}</p>
                                        </div>
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            {card.icon}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
                            <h2 className={`${crimsonText.className} text-xl font-bold text-white mb-4`}>
                                Latest Orders
                            </h2>

                            {latestOrders.length > 0 ? (
                                <div className="space-y-3">
                                    {latestOrders.map(order => (
                                        <Link
                                            key={order.id}
                                            href={order.status === 'pending' ? '/stallowner/dashboard/orders' : '/stallowner/dashboard/orders/completed'}
                                            className="block"
                                        >
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                                                <div className="flex items-center">
                                                    <div className={`${order.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'} p-2 rounded-full mr-3`}>
                                                        {order.status === 'pending' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-white text-sm font-medium">#{order.id.slice(-5)}</div>
                                                        <div className="text-gray-400 text-xs">{formatDate(order.created_at)}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white text-sm">₹{order.total_amount}</div>
                                                    <div className="text-xs">
                                                        <span className={order.status === 'pending' ? 'text-orange-400' : 'text-green-400'}>
                                                            {order.status === 'pending' ? 'Pending' : 'Completed'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32 bg-gray-800/30 rounded-lg border border-gray-700 text-gray-400 text-sm">
                                    No recent orders
                                </div>
                            )}

                            <div className="mt-4 text-center">
                                <Link href="/stallowner/dashboard/orders" className="text-purple-400 text-sm hover:text-purple-300 hover:underline">
                                    View all orders →
                                </Link>
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
                            <h2 className={`${crimsonText.className} text-xl font-bold text-white mb-4`}>
                                Quick Tips
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                    <div className="flex items-start">
                                        <div className="p-1 bg-purple-500/20 rounded-md mr-3 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white text-sm font-medium mb-1">Process orders quickly</h3>
                                            <p className="text-gray-400 text-xs">Orders appear in the Active Orders tab immediately after payment is confirmed.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                    <div className="flex items-start">
                                        <div className="p-1 bg-purple-500/20 rounded-md mr-3 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white text-sm font-medium mb-1">Mark orders as complete</h3>
                                            <p className="text-gray-400 text-xs">Use the green checkmark button to mark orders as completed when ready.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                    <div className="flex items-start">
                                        <div className="p-1 bg-purple-500/20 rounded-md mr-3 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white text-sm font-medium mb-1">Track your sales performance</h3>
                                            <p className="text-gray-400 text-xs">The Analytics page shows your best-selling items and revenue metrics.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}