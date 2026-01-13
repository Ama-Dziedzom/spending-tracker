'use client';

import { AlertCircle } from 'lucide-react';

export default function SmartCategoryBanner() {
    return (
        <div className="p-6 rounded-[32px] bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex flex-shrink-0 items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Smart category</h4>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    We&quot;ve categorized your transaction, you may change here if you want.
                </p>
            </div>
        </div>
    );
}
