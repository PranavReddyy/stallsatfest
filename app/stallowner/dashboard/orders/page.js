"use client";

import { useState, useEffect } from 'react';
import { Crimson_Text } from 'next/font/google';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const crimsonText = Crimson_Text({
    weight: ['400', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

export default function ActiveOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [stallId, setStallId] = useState('');

    useEffect(() => {
        const id = localStorage.getItem('stallOwnerId');
        if (!id) return;

        setStallId(id);

        // Real-time listener for active orders
        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('stall_id', '==', id),
            where('status', '==', 'pending'),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = [];
            snapshot.forEach((doc) => {
                ordersData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, []);

    const markAsCompleted = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: 'completed',
                updated_at: new Date().toISOString()
            });
            // The real-time listener will update the UI
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

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

    const toggleOrderExpand = (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
        } else {
            setExpandedOrder(orderId);
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <h1 className={`${crimsonText.className} text-xl md:text-2xl font-bold text-white`}>
                    Active Orders
                </h1>
                <span className="text-sm text-gray-400">
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'} pending
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-gray-900 rounded-xl p-6 md:p-8 text-center border border-gray-800 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h2 className="text-xl font-medium text-gray-300 mb-2">No Active Orders</h2>
                    <p className="text-gray-500">When customers place orders, they will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden animate-fadeIn">
                            <div
                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 cursor-pointer hover:bg-gray-800/50"
                                onClick={() => toggleOrderExpand(order.id)}
                            >
                                <div className="flex-1 mb-3 sm:mb-0">
                                    <div className="flex items-center">
                                        <div className="mr-3 bg-orange-500/20 text-orange-400 rounded-lg p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Order #{order.id.slice(-5)}</p>
                                            <p className="text-gray-400 text-sm">{formatDate(order.created_at)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                                    <div className="text-right mr-2 sm:mr-4 flex-1 sm:flex-none">
                                        <p className="text-gray-400 text-sm">Total</p>
                                        <p className="text-white font-medium">₹{order.total_amount}</p>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsCompleted(order.id);
                                        }}
                                        className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
                                        title="Mark as Completed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="border-t border-gray-800 p-4 bg-gray-800/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                        <div>
                                            <h3 className="text-gray-400 text-sm font-medium mb-2">Customer Information</h3>
                                            <div className="bg-gray-800 rounded-lg p-3">
                                                <p className="text-white">{order.customer_info?.name || 'Customer'}</p>
                                                <p className="text-gray-400 text-sm">{order.customer_info?.phone || 'No phone'}</p>
                                            </div>

                                            <h3 className="text-gray-400 text-sm font-medium mb-2 mt-4">Payment Information</h3>
                                            <div className="bg-gray-800 rounded-lg p-3">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-gray-400 text-sm">Payment ID</span>
                                                    <span className="text-white text-sm">{order.payment_id || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400 text-sm">Your Cut</span>
                                                    <span className="text-green-400 text-sm">₹{order.vendor_cut || order.total_amount}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-gray-400 text-sm font-medium mb-2">Order Items</h3>
                                            <div className="bg-gray-800 rounded-lg p-3">
                                                <div className="space-y-3">
                                                    {order.items && order.items.map((item, index) => (
                                                        <div key={index} className="flex justify-between pb-2 border-b border-gray-700 last:border-0 last:pb-0">
                                                            <div>
                                                                <p className="text-white text-sm">
                                                                    <span className="text-purple-400">{item.quantity}×</span> {item.name}
                                                                </p>
                                                                {item.customizations && (
                                                                    <p className="text-gray-400 text-xs">{item.customizations}</p>
                                                                )}
                                                                {item.extras && (
                                                                    <p className="text-purple-300 text-xs">+ {item.extras}</p>
                                                                )}
                                                            </div>
                                                            <p className="text-white text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="border-t border-gray-700 mt-3 pt-3 flex justify-between font-medium">
                                                    <span className="text-white text-sm">Total</span>
                                                    <span className="text-white text-sm">₹{order.total_amount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={() => markAsCompleted(order.id)}
                                            className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Mark as Completed
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}