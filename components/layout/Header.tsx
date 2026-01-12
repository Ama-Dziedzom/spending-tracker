'use client';

import { Bell } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 bg-transparent">
            <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-900 dark:text-white hover:opacity-70 transition-opacity relative">
                            <Bell className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

