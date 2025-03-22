"use client";

import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        vendorCut: 0,
        totalOrders: 0,
        popularItems: [],
        averageOrderValue: 0
    });
    const [itemsChart, setItemsChart] = useState({
        labels: [],
        datasets: []
    });
    const [revenueChart, setRevenueChart] = useState({
        labels: [],
        datasets: []
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const stallId = localStorage.getItem('stallOwnerId');
                if (!stallId) {
                    setLoading(false);
                    return;
                }

                // Get all orders for this stall
                const ordersRef = collection(db, 'orders');
                const q = query(
                    ordersRef,
                    where('stall_id', '==', stallId)
                );

                const querySnapshot = await getDocs(q);
                const orders = [];
                querySnapshot.forEach((doc) => {
                    orders.push({ id: doc.id, ...doc.data() });
                });

                // Extract all items from orders
                const allItems = [];
                orders.forEach(order => {
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            allItems.push({
                                ...item,
                                orderStatus: order.status
                            });
                        });
                    }
                });

                // Calculate basic stats
                const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                const vendorCut = orders.reduce((sum, order) => sum + (order.vendor_cut || 0), 0);
                const averageOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

                // Group items by ID for popularity analysis
                const itemsMap = new Map();
                allItems.forEach(item => {
                    const key = item.id;
                    if (itemsMap.has(key)) {
                        const existingItem = itemsMap.get(key);
                        existingItem.quantity += item.quantity;
                        existingItem.revenue += item.price * item.quantity;
                        itemsMap.set(key, existingItem);
                    } else {
                        itemsMap.set(key, {
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            revenue: item.price * item.quantity
                        });
                    }
                });

                // Convert to array and sort by quantity
                const itemsArray = Array.from(itemsMap.values())
                    .sort((a, b) => b.quantity - a.quantity);

                // Get top 5 items for display in table
                const topItems = itemsArray.slice(0, 5);

                // Prepare chart for top 8 items by quantity
                const topChartItems = itemsArray.slice(0, 8);

                // Prepare items chart data
                const itemsChartData = {
                    labels: topChartItems.map(item => item.name),
                    datasets: [
                        {
                            label: 'Units Sold',
                            data: topChartItems.map(item => item.quantity),
                            backgroundColor: 'rgba(147, 51, 234, 0.7)',
                            borderColor: 'rgb(147, 51, 234)',
                            borderWidth: 1,
                            borderRadius: 4,
                            barThickness: 16,
                        }
                    ]
                };

                // Prepare revenue chart data
                const revenueChartData = {
                    labels: topChartItems.map(item => item.name),
                    datasets: [
                        {
                            label: 'Revenue (₹)',
                            data: topChartItems.map(item => item.revenue),
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',   // Red
                                'rgba(54, 162, 235, 0.7)',   // Blue
                                'rgba(255, 206, 86, 0.7)',   // Yellow
                                'rgba(75, 192, 192, 0.7)',   // Teal
                                'rgba(153, 102, 255, 0.7)',  // Purple
                                'rgba(255, 159, 64, 0.7)',   // Orange
                                'rgba(231, 233, 237, 0.7)',  // Light gray
                                'rgba(110, 120, 155, 0.7)',  // Blue-gray
                            ],
                            borderWidth: 1,
                        }
                    ]
                };

                // Update state with all data
                setStats({
                    totalSales,
                    vendorCut,
                    totalOrders: orders.length,
                    popularItems: topItems,
                    averageOrderValue
                });

                setItemsChart(itemsChartData);
                setRevenueChart(revenueChartData);

            } catch (error) {
                console.error("Error fetching analytics data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    // Format currency
    const formatRupees = (value) => {
        return `₹${value.toLocaleString('en-IN')}`;
    };

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
                boxPadding: 6,
                callbacks: {
                    label: function (context) {
                        return `${context.parsed.y} units`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 12
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 11
                    },
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: {
                    display: false
                }
            }
        }
    };

    // Chart options for the pie chart
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'white',
                    font: {
                        size: 12
                    },
                    padding: 15,
                    boxWidth: 12
                }
            },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                titleColor: 'white',
                bodyColor: 'white',
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return ` ${formatRupees(context.parsed)}`;
                    }
                }
            }
        },
        cutout: '60%'
    };

    return (
        <div className="p-4 md:p-6 text-white">
            <h1 className={`${crimsonText.className} text-xl md:text-2xl font-bold mb-6`}>
                Sales Analytics
            </h1>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-purple-700 to-indigo-700 rounded-xl p-5 shadow-lg animate-fadeIn">
                            <p className="text-white/80 text-xs font-medium mb-1">Total Sales</p>
                            <p className={`${crimsonText.className} text-2xl md:text-3xl font-bold text-white`}>
                                {formatRupees(stats.totalSales)}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-green-700 to-emerald-700 rounded-xl p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">Your Earnings</p>
                            <p className={`${crimsonText.className} text-2xl md:text-3xl font-bold text-white`}>
                                {formatRupees(stats.vendorCut)}
                            </p>
                            <p className="text-white/60 text-xs mt-1">90% of total sales</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-700 to-cyan-700 rounded-xl p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">Total Orders</p>
                            <p className={`${crimsonText.className} text-2xl md:text-3xl font-bold text-white`}>
                                {stats.totalOrders}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-700 to-orange-700 rounded-xl p-5 shadow-lg animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                            <p className="text-white/80 text-xs font-medium mb-1">Average Order</p>
                            <p className={`${crimsonText.className} text-2xl md:text-3xl font-bold text-white`}>
                                {formatRupees(stats.averageOrderValue)}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Top Selling Items Chart */}
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                            <h2 className={`${crimsonText.className} text-lg font-bold mb-4`}>Best Selling Items</h2>
                            <div className="h-64">
                                {itemsChart.labels.length > 0 ? (
                                    <Bar data={itemsChart} options={barOptions} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        No sales data available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revenue Breakdown */}
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                            <h2 className={`${crimsonText.className} text-lg font-bold mb-4`}>Revenue By Item</h2>
                            <div className="h-64 flex items-center justify-center">
                                {revenueChart.labels.length > 0 ? (
                                    <Doughnut data={revenueChart} options={doughnutOptions} />
                                ) : (
                                    <div className="text-gray-500">
                                        No revenue data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                        <div className="p-4 border-b border-gray-800">
                            <h2 className={`${crimsonText.className} text-lg font-bold`}>
                                Top Performing Items
                            </h2>
                        </div>

                        <div className="p-4">
                            {stats.popularItems.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-gray-400 text-left text-sm">
                                                <th className="pb-3 font-medium">Item</th>
                                                <th className="pb-3 font-medium text-right">Units Sold</th>
                                                <th className="pb-3 font-medium text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.popularItems.map((item, index) => (
                                                <tr key={`${item.id}-${index}`} className={`${index !== stats.popularItems.length - 1 ? 'border-b border-gray-800' : ''}`}>
                                                    <td className="py-3 flex items-center">
                                                        <div className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center mr-3 text-xs font-bold text-white">
                                                            {index + 1}
                                                        </div>
                                                        <span className="truncate">{item.name}</span>
                                                    </td>
                                                    <td className="py-3 text-right">{item.quantity}</td>
                                                    <td className="py-3 text-right text-green-400">{formatRupees(item.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <h3 className="text-xl font-medium text-gray-300 mb-2">No Sales Data Yet</h3>
                                    <p className="text-gray-500">Once you start making sales, your best-selling items will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tips for stall owners */}
                    <div className="mt-6 bg-gray-900/60 rounded-xl p-4 animate-fadeIn" style={{ animationDelay: '0.7s' }}>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Pro Tips:</h3>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• Your popular items are your money makers - make sure you're always stocked up!</li>
                            <li>• Consider discounting slower moving items to increase overall sales volume.</li>
                            <li>• Remember that your earnings are calculated as 90% of total sales.</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}