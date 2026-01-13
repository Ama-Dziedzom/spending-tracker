'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
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
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[18px] font-semibold text-black dark:text-white">{currentMonth},</span>
                        <span className="text-[18px] text-zinc-400 font-medium">{currentYear}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ChevronLeft className="w-6 h-6 text-zinc-300 dark:text-zinc-600 cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                        <ChevronRight className="w-6 h-6 text-zinc-300 dark:text-zinc-600 cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                    <h3 className="text-[38px] font-bold tracking-tight text-black dark:text-white leading-none">
                        {CURRENCY_SYMBOL}{totalSpent.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[20px] font-semibold text-zinc-400 dark:text-zinc-500">Spent</span>
                </div>
            </div>

            <div className="h-72 w-full relative">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <LineChart
                        data={chartData}
                        margin={{ left: 12, right: 12, top: 20, bottom: 40 }}
                    >
                        <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="0" opacity={0.4} />
                        <YAxis hide={true} domain={['dataMin - 10', 'dataMax + 20']} />

                        <Line
                            type="monotone"
                            dataKey="spent"
                            stroke="var(--color-spent)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--color-spent)', strokeWidth: 0 }}
                        />

                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="bg-[#121212] border border-white/5 text-white rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                                    labelFormatter={(value) => `${value}, ${currentYear}`}
                                    formatter={(value, name) => (
                                        <>
                                            <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                                                {name}
                                            </span>
                                            <span className="font-bold text-[17px] tracking-tight ml-auto">
                                                {CURRENCY_SYMBOL}{value}
                                            </span>
                                        </>
                                    )}
                                />
                            }
                        />
                    </LineChart>
                </ChartContainer>

                <div className="flex items-center justify-between text-[12px] font-semibold text-zinc-300 dark:text-zinc-600 mt-0 px-1">
                    <span>Sep 1</span>
                    <span className="text-zinc-400 dark:text-zinc-500">Sep 7</span>
                    <span>Sep 15</span>
                </div>
            </div>
        </section>
    );
}
