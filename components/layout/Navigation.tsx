'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    BarChart3,
    List,
    Wallet,
    MoreHorizontal,
    Plus,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/analytics', icon: BarChart3, label: 'Insight' },
];

const rightNavItems = [
    { href: '/budget', icon: Wallet, label: 'Budget' },
    { href: '/settings', icon: MoreHorizontal, label: 'Settings' },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop Sidebar (kept for responsiveness) */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col z-40">
                <div className="p-6">
                    <h1 className="text-xl font-bold bg-gray-900 dark:bg-white bg-clip-text text-transparent italic">
                        Omar Levin
                    </h1>
                </div>

                <div className="flex-1 px-3">
                    <div className="space-y-1">
                        {[...navItems, ...rightNavItems].map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-gray-900 dark:text-white' : ''}`} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation - Matching the Image */}
            <nav className="md:hidden fixed bottom-10 left-6 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 z-50 px-4 py-2 rounded-[32px] shadow-lg">
                <div className="flex justify-between items-center max-w-md mx-auto relative px-2">
                    {/* Home & Insight */}
                    <div className="flex gap-8">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-black dark:text-white font-bold' : 'text-gray-400'}`}
                                >
                                    <item.icon className="w-6 h-6" />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Central Plus Button */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-4">
                        <Link href="/dashboard?add=true" className="w-14 h-14 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                            <Plus className="w-6 h-6 text-white dark:text-black" />
                        </Link>
                    </div>

                    {/* Budget & Extras */}
                    <div className="flex gap-8">
                        {rightNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-black dark:text-white font-bold' : 'text-gray-400'}`}
                                >
                                    <item.icon className="w-6 h-6" />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
}
