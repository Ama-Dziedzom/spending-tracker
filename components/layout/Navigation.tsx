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
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/analytics', icon: LayoutGrid, label: 'Analysis' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-2xl border-t border-zinc-100 dark:border-zinc-800 px-8 pb-[env(safe-area-inset-bottom,16px)] pt-2.5 shadow-[0_-1px_3px_0_rgba(0,0,0,0.02)]">
            <div className="max-w-screen-xl mx-auto flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1.5 px-5 py-1 transition-all duration-300 ${isActive
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500'
                                }`}
                        >
                            <div className={`p-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-transparent'}`}>
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
