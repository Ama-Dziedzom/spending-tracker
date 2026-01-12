'use client';

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Transaction } from '@/types/transactions';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

interface SpendingChartProps {
    transactions: Transaction[];
    months?: number;
}

export default function SpendingChart({ transactions, months = 6 }: SpendingChartProps) {
    const data = useMemo(() => {
        const now = new Date();
        const startDate = startOfMonth(subMonths(now, months - 1));
        const endDate = now;

        const monthlyData: Record<string, { income: number; expenses: number }> = {};

        // Initialize all months
        eachMonthOfInterval({ start: startDate, end: endDate }).forEach((date) => {
            const key = format(date, 'MMM yyyy');
            monthlyData[key] = { income: 0, expenses: 0 };
        });

        // Aggregate transactions
        transactions.forEach((t) => {
            const date = parseISO(t.transaction_date);
            const key = format(date, 'MMM yyyy');

            if (monthlyData[key]) {
                if (t.type === 'credit') {
                    monthlyData[key].income += Math.abs(t.amount);
                } else {
                    monthlyData[key].expenses += Math.abs(t.amount);
                }
            }
        });

        return Object.entries(monthlyData).map(([month, values]) => ({
            month,
            ...values,
        }));
    }, [transactions, months]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            Income: {formatCurrency(payload[0]?.value || 0)}
                        </p>
                        <p className="text-sm text-rose-600 dark:text-rose-400">
                            Expenses: {formatCurrency(payload[1]?.value || 0)}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data to display
            </div>
        );
    }

    return (
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        iconType="circle"
                        formatter={(value: string) => (
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{value}</span>
                        )}
                    />
                    <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#incomeGradient)"
                    />
                    <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="#F43F5E"
                        strokeWidth={2}
                        fill="url(#expensesGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
