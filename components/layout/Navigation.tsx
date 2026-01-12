'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    Wallet,
    Plus,
    LayoutGrid,
    Target,
} from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Home' },
        { href: '/wallet', icon: Wallet, label: 'Wallet' },
        { href: '/dashboard?add=true', icon: Plus, label: 'Add', isAction: true },
        { href: '/analytics', icon: LayoutGrid, label: 'Analytics' },
        { href: '/settings', icon: Target, label: 'Goals' },
    ];

    return (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl px-4 py-3 rounded-[32px] flex items-center justify-between gap-6 shadow-2xl border border-white/10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    if (item.isAction) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg"
                            >
                                <Plus className="w-6 h-6 text-black" strokeWidth={3} />
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`p-2 transition-all hover:opacity-100 ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
