'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { RefreshCcw, Database, Zap, Clock } from 'lucide-react';

export default function CacheManagement() {
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    // Function to invalidate specific cache
    const invalidateCache = async (type = 'all', stallId = 'all') => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/invalidate-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, stallId })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Cache refreshed successfully`);
                setLastRefreshed(new Date());
            } else {
                toast.error(`Failed to refresh cache: ${data.message}`);
            }
        } catch (error) {
            console.error('Error invalidating cache:', error);
            toast.error('Error refreshing cache');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to reload a specific page
    const reloadPage = async (path) => {
        // This triggers Next.js to revalidate a specific path
        try {
            const response = await fetch(`/api/revalidate?path=${encodeURIComponent(path)}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Page '${path}' refreshed successfully`);
            } else {
                toast.error(`Failed to refresh page: ${data.message}`);
            }
        } catch (error) {
            console.error('Error revalidating path:', error);
            toast.error('Error refreshing page');
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" /> Cache Management
                </CardTitle>
                <CardDescription>
                    Control how data is cached and refreshed in the application
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="stalls">
                    <TabsList className="mb-4">
                        <TabsTrigger value="stalls">Stalls Data</TabsTrigger>
                        <TabsTrigger value="pages">Pages</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stalls">
                        <div className="space-y-4">
                            <Alert>
                                <Zap className="h-4 w-4" />
                                <AlertTitle>Stalls Data Cache</AlertTitle>
                                <AlertDescription>
                                    If you've made changes to stalls or menu items in Firestore, refresh the cache to show the latest data immediately.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button
                                    variant="default"
                                    onClick={() => invalidateCache('all')}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh All Stalls Data
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => invalidateCache('menu_item', 'all')}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh Menu Items Only
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pages">
                        <div className="space-y-4">
                            <Alert>
                                <AlertTitle>Page Cache</AlertTitle>
                                <AlertDescription>
                                    Refresh specific pages to ensure they show the latest data from Firestore.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => reloadPage('/')}
                                    className="w-full"
                                >
                                    Refresh Homepage
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => reloadPage('/stalls')}
                                    className="w-full"
                                >
                                    Refresh Stalls Page
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="system">
                        <div className="space-y-4">
                            <Alert>
                                <AlertTitle>System Cache</AlertTitle>
                                <AlertDescription>
                                    These options affect the entire application. Use with caution.
                                </AlertDescription>
                            </Alert>

                            <Button
                                variant="destructive"
                                onClick={() => {
                                    invalidateCache('all');
                                    reloadPage('/');
                                }}
                                disabled={isLoading}
                                className="w-full"
                            >
                                <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Complete System Refresh
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
                <div className="text-xs text-muted-foreground">
                    {lastRefreshed ? (
                        <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Last refreshed: {lastRefreshed.toLocaleTimeString()}
                        </div>
                    ) : (
                        "Cache automatically expires after 5 minutes"
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                >
                    Refresh Page
                </Button>
            </CardFooter>
        </Card>
    );
}