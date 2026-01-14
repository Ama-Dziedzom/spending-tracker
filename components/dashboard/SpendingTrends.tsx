'use client';

import { ChevronLeft, ChevronRight, TrendingDown, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from '@/components/ui/chart';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface SpendingTrendsProps {
    currentMonth: string;
    currentYear: string;
    totalSpent: number;
    chartData: any[];
    chartConfig: ChartConfig;
}

export default function SpendingTrends({
    currentMonth,
    currentYear,
    totalSpent,
    chartData,
    chartConfig
}: SpendingTrendsProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center text-white">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                            {currentMonth} <span className="text-zinc-400 font-medium ml-1">{currentYear}</span>
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Spending Activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/30">
                    <button className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="glass border border-white/40 dark:border-white/5 rounded-[40px] p-8 space-y-8 premium-shadow">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-2">Month to Date</p>
                        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3">
                            {CURRENCY_SYMBOL}{totalSpent.toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                            <div className="flex items-center gap-1 text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <TrendingDown className="w-3 h-3" />
                                12%
                            </div>
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        {['Week', 'Month', 'Year'].map((tab) => (
                            <button
                                key={tab}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'Month'
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10'
                                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[280px] w-full -mx-4">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <AreaChart
                            data={chartData}
                            margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" opacity={0.2} />
                            <XAxis
                                dataKey="day"
                                fontSize={10}
                                fontWeight={700}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#A1A1AA' }}
                                dy={10}
                            />
                            <YAxis hide={true} domain={['dataMin - 10', 'dataMax + 20']} />

                            <Area
                                type="monotone"
                                dataKey="spent"
                                stroke="#6366f1"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorSpent)"
                                animationDuration={2000}
                            />

                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md border-none text-white dark:text-zinc-900 rounded-2xl shadow-2xl"
                                        labelFormatter={(value) => `${value}, ${currentYear}`}
                                        formatter={(value, name) => (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] uppercase font-black opacity-50 tracking-tighter">{name}</span>
                                                <span className="font-extrabold text-lg">{CURRENCY_SYMBOL}{value}</span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>
        </section>
    );
}
