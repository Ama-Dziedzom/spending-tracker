'use client';

import { useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { formatCurrency } from '@/lib/utils';

interface CategoryChartProps {
    transactions: Transaction[];
    type?: 'debit' | 'credit' | 'all';
}

export default function CategoryChart({ transactions, type = 'debit' }: CategoryChartProps) {
    const data = useMemo(() => {
        const filtered = transactions.filter((t) => type === 'all' || t.type === type);

        const categoryTotals: Record<string, number> = {};
        filtered.forEach((t) => {
            const category = t.category || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(t.amount);
        });

        return Object.entries(categoryTotals)
            .map(([name, value]) => ({
                name,
                value,
                color: CATEGORIES[name]?.color || CATEGORIES['Other'].color,
            }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, type]);

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data to display
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        iconType="circle"
                        formatter={(value: string) => (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
