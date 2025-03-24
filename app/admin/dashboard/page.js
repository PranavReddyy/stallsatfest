'use client'

import { useState, useEffect } from 'react'
import { Crimson_Text } from 'next/font/google'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import CacheManagement from '../components/CacheManagement';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
)

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
})

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [stalls, setStalls] = useState([])
    const [expandedStall, setExpandedStall] = useState(null)
    const [overallStats, setOverallStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalStalls: 0,
        universityCut: 0
    })
    const [topStallsChart, setTopStallsChart] = useState({
        labels: [],
        datasets: []
    })
    const [salesDistributionChart, setSalesDistributionChart] = useState({
        labels: [],
        datasets: []
    })

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)

                // Fetch all stalls
                const stallsRef = collection(db, 'stalls')
                const stallsSnapshot = await getDocs(stallsRef)

                const stallsData = []
                stallsSnapshot.forEach(doc => {
                    stallsData.push({
                        id: doc.id,
                        name: doc.data().name || 'Unnamed Stall',
                        logo: doc.data().logo || '/placeholder-logo.png',
                        owner: doc.data().stall_owner || 'Unknown',
                        email: doc.data().stall_owner || 'No email',
                        phone: doc.data().phone || 'No phone',
                        location: doc.data().location || 'Not specified',
                        description: doc.data().description || 'No description available',
                        active: doc.data().active !== false, // Default to true if not specified
                        // Initialize metrics
                        orders: [],
                        totalSales: 0,
                        totalOrders: 0,
                        universityCut: 0,
                        vendorCut: 0,
                        topItems: [],
                        menuItems: []
                    })
                })

                // Fetch all orders
                const ordersRef = collection(db, 'orders')
                const ordersSnapshot = await getDocs(ordersRef)

                const allOrders = []
                ordersSnapshot.forEach(doc => {
                    allOrders.push({
                        id: doc.id,
                        ...doc.data()
                    })
                })

                // Calculate overall stats
                const totalSales = allOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
                const universityCut = allOrders.reduce((sum, order) => sum + (Number(order.university_cut) || 0), 0)

                setOverallStats({
                    totalSales,
                    totalOrders: allOrders.length,
                    totalStalls: stallsData.length,
                    universityCut
                })

                // Process orders for each stall
                for (let stall of stallsData) {
                    // Get stall's orders
                    const stallOrders = allOrders.filter(order => order.stall_id === stall.id)
                    stall.orders = stallOrders
                    stall.totalSales = stallOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
                    stall.totalOrders = stallOrders.length
                    stall.universityCut = stallOrders.reduce((sum, order) => sum + (Number(order.university_cut) || 0), 0)
                    stall.vendorCut = stallOrders.reduce((sum, order) => sum + (Number(order.vendor_cut) || 0), 0)

                    // Categorize orders by status
                    stall.pendingOrders = stallOrders.filter(order => order.status === 'pending').length
                    stall.completedOrders = stallOrders.filter(order => order.status === 'completed').length

                    // Calculate top items for this stall
                    const itemsMap = new Map()

                    stallOrders.forEach(order => {
                        if (order.items && Array.isArray(order.items)) {
                            order.items.forEach(item => {
                                const key = item.id || item.name
                                if (itemsMap.has(key)) {
                                    const existingItem = itemsMap.get(key)
                                    existingItem.quantity += item.quantity
                                    existingItem.revenue += item.price * item.quantity
                                    itemsMap.set(key, existingItem)
                                } else {
                                    itemsMap.set(key, {
                                        id: item.id,
                                        name: item.name,
                                        quantity: item.quantity,
                                        revenue: item.price * item.quantity
                                    })
                                }
                            })
                        }
                    })

                    stall.topItems = Array.from(itemsMap.values())
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 5)

                    // Try to fetch menu items for the stall
                    try {
                        const menuItemsRef = collection(db, `stalls/${stall.id}/menu_items`)
                        const menuItemsSnapshot = await getDocs(menuItemsRef)

                        const menuItems = []
                        menuItemsSnapshot.forEach(doc => {
                            menuItems.push({
                                id: doc.id,
                                ...doc.data()
                            })
                        })

                        stall.menuItems = menuItems
                    } catch (error) {
                        console.error(`Error fetching menu items for stall ${stall.id}:`, error)
                        stall.menuItems = []
                    }
                }

                // Sort stalls by total sales
                stallsData.sort((a, b) => b.totalSales - a.totalSales)
                setStalls(stallsData)

                // Prepare top stalls chart data (top 8 stalls by sales)
                const topStalls = stallsData.slice(0, 8)
                setTopStallsChart({
                    labels: topStalls.map(stall => stall.name),
                    datasets: [
                        {
                            label: 'Sales Amount (₹)',
                            data: topStalls.map(stall => stall.totalSales),
                            backgroundColor: 'rgba(147, 51, 234, 0.7)',
                            borderColor: 'rgb(147, 51, 234)',
                            borderWidth: 1,
                            borderRadius: 4,
                        }
                    ]
                })

                // Prepare sales distribution chart data
                setSalesDistributionChart({
                    labels: ['University Cut', 'Vendors\' Earnings'],
                    datasets: [
                        {
                            data: [
                                universityCut,
                                totalSales - universityCut
                            ],
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(54, 162, 235, 0.7)',
                            ],
                            borderWidth: 1,
                        }
                    ]
                })

            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const toggleStallExpand = (stallId) => {
        if (expandedStall === stallId) {
            setExpandedStall(null)
        } else {
            setExpandedStall(stallId)
        }
    }

    // Format currency
    const formatRupees = (value) => {
        return `₹${parseFloat(value).toLocaleString('en-IN')}`
    }

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Chart options for the bar chart
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return `${formatRupees(context.parsed.y)}`
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    callback: function (value) {
                        return formatRupees(value)
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: {
                    display: false
                }
            }
        }
    }

    // Chart options for the pie chart
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'white',
                    padding: 15,
                }
            },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return ` ${formatRupees(context.parsed)}`
                    }
                }
            }
        },
        cutout: '60%'
    }

    return (
        <div className="space-y-6">
            <h1 className={`${crimsonText.className} text-2xl font-bold text-white`}>
                Aeon Stalls Dashboard
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CacheManagement />
                {/* Other dashboard cards */}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {/* Overall Stats Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-gradient-to-br from-purple-700 to-indigo-700 rounded-xl p-4 md:p-5 shadow-lg animate-fadeIn">
                            <p className="text-white/80 text-xs font-medium mb-1">Total Revenue</p>
                            <p className={`${crimsonText.className} text-xl md:text-2xl lg:text-3xl font-bold text-white`}>
                                {formatRupees(overallStats.totalSales)}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-green-700 to-emerald-700 rounded-xl p-4 md:p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">University Cut</p>
                            <p className={`${crimsonText.className} text-xl md:text-2xl lg:text-3xl font-bold text-white`}>
                                {formatRupees(overallStats.universityCut)}
                            </p>
                            <p className="text-white/60 text-xs mt-1">10% of total sales</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-700 to-cyan-700 rounded-xl p-4 md:p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">Total Orders</p>
                            <p className={`${crimsonText.className} text-xl md:text-2xl lg:text-3xl font-bold text-white`}>
                                {overallStats.totalOrders}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-700 to-orange-700 rounded-xl p-4 md:p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">Active Stalls</p>
                            <p className={`${crimsonText.className} text-xl md:text-2xl lg:text-3xl font-bold text-white`}>
                                {overallStats.totalStalls}
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                            <h2 className={`${crimsonText.className} text-lg font-bold mb-4`}>
                                Top Stalls by Revenue
                            </h2>
                            <div className="h-64">
                                {topStallsChart.labels.length > 0 ? (
                                    <Bar data={topStallsChart} options={barOptions} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        No sales data available
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                            <h2 className={`${crimsonText.className} text-lg font-bold mb-4`}>
                                Revenue Distribution
                            </h2>
                            <div className="h-64 flex items-center justify-center">
                                {salesDistributionChart.labels.length > 0 ? (
                                    <Doughnut data={salesDistributionChart} options={doughnutOptions} />
                                ) : (
                                    <div className="text-gray-500">
                                        No revenue data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stalls List */}
                    <div>
                        <h2 className={`${crimsonText.className} text-lg font-bold mb-4`}>
                            All Stalls Performance
                        </h2>

                        <div className="space-y-4">
                            {stalls.length === 0 ? (
                                <div className="bg-zinc-900 rounded-xl p-6 text-center border border-zinc-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-xl font-medium text-zinc-300 mb-2">No Stalls Found</h3>
                                    <p className="text-zinc-500">There are no stalls added to the system yet.</p>
                                </div>
                            ) : (
                                stalls.map(stall => (
                                    <div key={stall.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden animate-fadeIn">
                                        <div
                                            className="flex flex-col sm:flex-row items-start sm:items-center p-4 cursor-pointer hover:bg-zinc-800/50"
                                            onClick={() => toggleStallExpand(stall.id)}
                                        >
                                            <div className="flex items-center w-full sm:w-auto mb-3 sm:mb-0">
                                                <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4 overflow-hidden flex-shrink-0">
                                                    {stall.logo ? (
                                                        <div className="relative h-full w-full">
                                                            <Image
                                                                src={stall.logo}
                                                                alt={`${stall.name} logo`}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full bg-gradient-to-br from-purple-700 to-indigo-700 flex items-center justify-center text-white font-medium">
                                                            {stall.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-grow">
                                                    <div className="flex items-center flex-wrap">
                                                        <h3 className="text-white font-medium mr-2">{stall.name}</h3>
                                                        {stall.active ? (
                                                            <span className="px-1.5 py-0.5 text-xs bg-green-900/40 text-green-400 rounded">Active</span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 text-xs bg-red-900/40 text-red-400 rounded">Inactive</span>
                                                        )}
                                                    </div>
                                                    <p className="text-zinc-400 text-sm">{stall.owner}</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center w-full sm:w-auto sm:flex-none sm:ml-auto">
                                                <div className="flex space-x-4 sm:space-x-8">
                                                    <div>
                                                        <p className="text-zinc-400 text-xs sm:text-sm">Total Sales</p>
                                                        <p className="text-white font-medium text-sm sm:text-base">{formatRupees(stall.totalSales)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-zinc-400 text-xs sm:text-sm">Orders</p>
                                                        <p className="text-white font-medium text-sm sm:text-base">{stall.totalOrders}</p>
                                                    </div>
                                                </div>

                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className={`h-5 w-5 text-zinc-500 ml-4 transform transition-transform ${expandedStall === stall.id ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Expanded section - update for mobile */}
                                        {expandedStall === stall.id && (
                                            <div className="px-4 pb-4 pt-2 border-t border-zinc-800 bg-zinc-900/30">
                                                {/* Tabs for detailed info */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                                    {/* Column 1: Stall Details */}
                                                    <div>
                                                        <h4 className="text-zinc-400 text-sm font-medium mb-2">Stall Information</h4>
                                                        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                                                            <div className="flex flex-wrap justify-between">
                                                                <span className="text-zinc-400 text-sm">ID</span>
                                                                <span className="text-white text-sm break-all">{stall.id}</span>
                                                            </div>
                                                            <div className="flex flex-wrap justify-between">
                                                                <span className="text-zinc-400 text-sm">Owner</span>
                                                                <span className="text-white text-sm break-all">{stall.owner}</span>
                                                            </div>
                                                            <div className="flex flex-wrap justify-between">
                                                                <span className="text-zinc-400 text-sm">Email</span>
                                                                <span className="text-white text-sm break-all">{stall.email}</span>
                                                            </div>
                                                            <div className="flex flex-wrap justify-between">
                                                                <span className="text-zinc-400 text-sm">Phone</span>
                                                                <span className="text-white text-sm">{stall.phone}</span>
                                                            </div>
                                                            <div className="flex flex-wrap justify-between">
                                                                <span className="text-zinc-400 text-sm">Location</span>
                                                                <span className="text-white text-sm">{stall.location}</span>
                                                            </div>
                                                            <div className="pt-2 border-t border-zinc-700">
                                                                <span className="text-zinc-400 text-sm">Description</span>
                                                                <p className="text-white text-sm mt-1">{stall.description}</p>
                                                            </div>
                                                        </div>

                                                        <h4 className="text-zinc-400 text-sm font-medium mt-4 mb-2">Revenue Details</h4>
                                                        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400 text-sm">Total Revenue</span>
                                                                <span className="text-white text-sm">{formatRupees(stall.totalSales)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400 text-sm">University Cut</span>
                                                                <span className="text-white text-sm">{formatRupees(stall.universityCut)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400 text-sm">Vendor Earnings</span>
                                                                <span className="text-green-400 text-sm">{formatRupees(stall.vendorCut)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Order & Sales Info */}
                                                    <div className="lg:col-span-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <h4 className="text-zinc-400 text-sm font-medium mb-2">Orders Summary</h4>
                                                                <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-400 text-sm">Total Orders</span>
                                                                        <span className="text-white text-sm">{stall.totalOrders}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-400 text-sm">Pending Orders</span>
                                                                        <span className="text-amber-400 text-sm">{stall.pendingOrders}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-400 text-sm">Completed Orders</span>
                                                                        <span className="text-green-400 text-sm">{stall.completedOrders}</span>
                                                                    </div>
                                                                </div>

                                                                <h4 className="text-zinc-400 text-sm font-medium mt-4 mb-2">Latest Orders</h4>
                                                                <div className="bg-zinc-800 rounded-lg p-3">
                                                                    {stall.orders.length > 0 ? (
                                                                        <div className="space-y-3">
                                                                            {stall.orders.slice(0, 3).map((order, index) => (
                                                                                <div key={order.id} className="flex justify-between text-sm pb-2 border-b border-zinc-700 last:border-0 last:pb-0">
                                                                                    <div>
                                                                                        <p className="text-white">Order #{order.id.slice(-5)}</p>
                                                                                        <p className="text-zinc-400 text-xs">{formatDate(order.created_at)}</p>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <p className="text-white">{formatRupees(order.total_amount)}</p>
                                                                                        <p className={`text-xs ${order.status === 'completed' ? 'text-green-400' : 'text-amber-400'}`}>
                                                                                            {order.status === 'completed' ? 'Completed' : 'Pending'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-zinc-500 text-sm text-center py-2">No orders yet</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <h4 className="text-zinc-400 text-sm font-medium mb-2">Top Selling Items</h4>
                                                                <div className="bg-zinc-800 rounded-lg p-3">
                                                                    {stall.topItems.length > 0 ? (
                                                                        <ul className="space-y-2">
                                                                            {stall.topItems.slice(0, 3).map((item, index) => (
                                                                                <li key={index} className="flex justify-between items-center pb-2 border-b border-zinc-700 last:border-0 last:pb-0">
                                                                                    <div className="flex items-center">
                                                                                        <div className="w-5 h-5 rounded-full bg-purple-900 flex items-center justify-center mr-2 text-xs font-bold text-white">
                                                                                            {index + 1}
                                                                                        </div>
                                                                                        <span className="text-white text-sm">{item.name}</span>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <p className="text-white text-sm">{item.quantity} sold</p>
                                                                                        <p className="text-green-400 text-xs">{formatRupees(item.revenue)}</p>
                                                                                    </div>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="text-zinc-500 text-sm text-center py-2">No sales data available</p>
                                                                    )}
                                                                </div>

                                                                <h4 className="text-zinc-400 text-sm font-medium mt-4 mb-2">Menu Items ({stall.menuItems.length})</h4>
                                                                <div className="bg-zinc-800 rounded-lg p-3">
                                                                    {stall.menuItems.length > 0 ? (
                                                                        <div className="space-y-3 max-h-40 sm:max-h-64 overflow-y-auto">
                                                                            {stall.menuItems.slice(0, 6).map((item) => (
                                                                                <div key={item.id} className="flex justify-between text-sm pb-2 border-b border-zinc-700 last:border-0 last:pb-0">
                                                                                    <div className="flex-1 mr-2">
                                                                                        <p className="text-white truncate">{item.name}</p>
                                                                                        {item.description && (
                                                                                            <p className="text-zinc-400 text-xs truncate max-w-[150px] sm:max-w-[200px]">{item.description}</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-white text-right">{formatRupees(item.price)}</p>
                                                                                </div>
                                                                            ))}
                                                                            {stall.menuItems.length > 6 && (
                                                                                <p className="text-zinc-400 text-xs text-center">
                                                                                    + {stall.menuItems.length - 6} more items
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-zinc-500 text-sm text-center py-2">No menu items available</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}