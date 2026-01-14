'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    LayoutGrid,
    Plus,
} from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Wallet' },
        { href: '/analytics', icon: LayoutGrid, label: 'Charts' },
    ];

    return (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <div className="glass border border-white/20 dark:border-white/5 rounded-[32px] px-4 py-3 pb-4 shadow-2xl flex items-center justify-around relative">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex flex-col items-center gap-1.5 px-6 py-2 transition-all duration-500 rounded-2xl ${isActive
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                }`}
                        >
                            <div className={`p-2 rounded-xl transition-all duration-500 scale-110`}>
                                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            )}
                        </Link>
                    );
                })}

                <button className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-white dark:ring-zinc-900 ring-offset-0">
                    <Plus className="w-8 h-8" />
                </button>
            </div>
        </nav>
    );
}
