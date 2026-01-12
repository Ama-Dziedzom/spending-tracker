'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    BarChart3,
    Plus,
    Wallet,
    Settings,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/analytics', icon: BarChart3, label: 'Insight' },
    { href: '/budget', icon: Wallet, label: 'Budget' },
    { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop Sidebar (Optional, but kept for responsiveness) */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col z-40">
                <div className="p-6">
                    <h1 className="text-xl font-bold bg-gray-900 dark:bg-white bg-clip-text text-transparent italic">
                        Omar Levin
                    </h1>
                </div>

                <div className="flex-1 px-3">
                    <div className="space-y-1">
                        {navItems.map((item) => {
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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-50 px-4 pb-6 pt-2">
                <div className="flex justify-between items-center max-w-md mx-auto relative px-2">
                    {/* Left Two Items */}
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center gap-1 transition-all ${pathname === '/dashboard' ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>

                    <Link
                        href="/analytics"
                        className={`flex flex-col items-center gap-1 transition-all ${pathname === '/analytics' ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <BarChart3 className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Insight</span>
                    </Link>

                    {/* Center Plus Button */}
                    <div className="relative -top-3">
                        <Link href="/dashboard?add=true">
                            <button className="bg-[#0F172A] dark:bg-white text-white dark:text-black p-3.5 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                                <Plus className="w-7 h-7 stroke-[3]" />
                            </button>
                        </Link>
                    </div>


                    {/* Right Two Items */}
                    <Link
                        href="/dashboard?view=budget"
                        className={`flex flex-col items-center gap-1 transition-all ${pathname === '/budget' ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <Wallet className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Budget</span>
                    </Link>

                    <Link
                        href="/dashboard?view=settings"
                        className={`flex flex-col items-center gap-1 transition-all ${pathname === '/settings' ? 'text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <Settings className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Settings</span>
                    </Link>
                </div>
            </nav>
        </>
    );
}

