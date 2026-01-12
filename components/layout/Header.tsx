'use client';

import { Menu, Headphones, Bell, Eye } from 'lucide-react';

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 bg-transparent px-6 py-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                        <Headphones className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
                    </button>
                </div>
            </div>
        </header>
    );
}

