'use client';

import { Sparkles, X } from 'lucide-react';

export default function SmartCategoryBanner() {
    return (
        <div className="relative overflow-hidden p-8 rounded-[40px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl shadow-indigo-600/20 group animate-fade-in-up">
            <div className="absolute top-0 right-0 p-4">
                <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Background sparkle effect */}
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-700" />

            <div className="relative flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-white text-indigo-600 flex flex-shrink-0 items-center justify-center shadow-xl ring-8 ring-white/10">
                    <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 pr-8">
                    <h4 className="text-xl font-black tracking-tight leading-none">Smart categorization</h4>
                    <p className="text-sm font-medium text-indigo-100/90 leading-relaxed">
                        We've automatically categorized your transactions. Review them anytime to improve accuracy.
                    </p>
                </div>
            </div>
        </div>
    );
}
