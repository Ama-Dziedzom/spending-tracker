'use client';

import { Bell, Search, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 glass border-b border-white/10 dark:border-white/5">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em]">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all duration-300 active:scale-95">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all duration-300 active:scale-95 relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" />
                    </button>
                    <button className="w-10 h-10 ml-1 overflow-hidden rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30 active:scale-95 transition-transform">
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white italic font-bold">
                            <User className="w-5 h-5 shrink-0" />
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
