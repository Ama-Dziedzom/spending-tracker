'use client';

import { useMemo } from 'react';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { formatCurrency, formatPercentage, calculatePercentageChange } from '@/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Zap,
    Calendar,
    Repeat,
} from 'lucide-react';

interface InsightCardProps {
    transaction: Transaction[];
    previousPeriodTransactions?: Transaction[];
}

interface Insight {
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    icon: React.ReactNode;
    title: string;
    description: string;
    value?: string;
}

export default function InsightsCard({ transaction: transactions, previousPeriodTransactions = [] }: InsightCardProps) {
    const insights = useMemo(() => {
        const insightsList: Insight[] = [];

        if (transactions.length === 0) return insightsList;

        // Current period calculations
        const totalExpenses = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalIncome = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Previous period calculations
        const prevExpenses = previousPeriodTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Spending change insight
        if (prevExpenses > 0) {
            const change = calculatePercentageChange(totalExpenses, prevExpenses);
            if (change < -10) {
                insightsList.push({
                    type: 'positive',
                    icon: <TrendingDown className="w-5 h-5" />,
                    title: 'Spending Down',
                    description: `You've spent ${formatPercentage(Math.abs(change))} less than last period`,
                    value: formatCurrency(prevExpenses - totalExpenses) + ' saved',
                });
            } else if (change > 20) {
                insightsList.push({
                    type: 'warning',
                    icon: <TrendingUp className="w-5 h-5" />,
                    title: 'Spending Increase',
                    description: `Your spending is up ${formatPercentage(change)} from last period`,
                    value: formatCurrency(totalExpenses - prevExpenses) + ' more',
                });
            }
        }

        // Savings rate insight
        if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
            if (savingsRate >= 20) {
                insightsList.push({
                    type: 'positive',
                    icon: <CheckCircle className="w-5 h-5" />,
                    title: 'Great Savings Rate',
                    description: `You're saving ${savingsRate.toFixed(0)}% of your income`,
                    value: formatCurrency(totalIncome - totalExpenses),
                });
            } else if (savingsRate < 0) {
                insightsList.push({
                    type: 'negative',
                    icon: <AlertTriangle className="w-5 h-5" />,
                    title: 'Overspending Alert',
                    description: 'You spent more than you earned this period',
                    value: formatCurrency(totalExpenses - totalIncome) + ' deficit',
                });
            }
        }

        // Top spending category insight
        const categorySpending: Record<string, number> = {};
        transactions
            .filter(t => t.type === 'debit')
            .forEach(t => {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(t.amount);
            });

        const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
        if (topCategory && totalExpenses > 0) {
            const percentage = (topCategory[1] / totalExpenses) * 100;
            if (percentage > 40) {
                insightsList.push({
                    type: 'neutral',
                    icon: <Zap className="w-5 h-5" />,
                    title: `${topCategory[0]} Dominates`,
                    description: `${percentage.toFixed(0)}% of your spending went to ${topCategory[0]}`,
                    value: formatCurrency(topCategory[1]),
                });
            }
        }

        // Frequency insight
        const transactionsPerDay = transactions.length > 0
            ? transactions.length / Math.max(1, getDaySpan(transactions))
            : 0;

        if (transactionsPerDay > 5) {
            insightsList.push({
                type: 'neutral',
                icon: <Repeat className="w-5 h-5" />,
                title: 'Frequent Transactions',
                description: `Averaging ${transactionsPerDay.toFixed(1)} transactions per day`,
            });
        }

        return insightsList.slice(0, 3); // Show max 3 insights
    }, [transactions, previousPeriodTransactions]);

    if (insights.length === 0) {
        return null;
    }

    const getColors = (type: Insight['type']) => {
        switch (type) {
            case 'positive':
                return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
            case 'negative':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
            default:
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded-xl border ${getColors(insight.type)} transition-all hover:shadow-md`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {insight.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{insight.title}</p>
                                <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
                                {insight.value && (
                                    <p className="text-sm font-bold mt-2">{insight.value}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getDaySpan(transactions: Transaction[]): number {
    if (transactions.length < 2) return 1;
    const dates = transactions.map(t => new Date(t.transaction_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;
}
