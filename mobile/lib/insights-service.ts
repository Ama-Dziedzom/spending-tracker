import { supabase } from './supabase';
import { TRANSACTION_TYPES } from '../constants/theme';
import { getCategoryByIdOrName, getCategoryById } from './categories';
import { formatCurrency } from './transaction-service';

export interface Insight {
    type: 'positive' | 'neutral' | 'attention';
    title: string;
    description: string;
}

export interface InsightsData {
    timeframe: string;
    totalSpending: number;
    totalIncome: number;
    topCategories: { category: string; amount: number; percentage: number }[];
    recurringTransactions: { description: string; amount: number; count: number }[];
    anomalies: { description: string; amount: number; date: string }[];
    previousPeriodComparison: {
        spendingChange: number;
        incomeChange: number;
        categoryChanges: { category: string; change: number }[];
    };
}

export async function getInsightsData(period: 'week' | 'month' = 'month'): Promise<InsightsData> {
    const now = new Date();
    const startDate = new Date();
    const prevStartDate = new Date();

    if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
    } else {
        startDate.setMonth(now.getMonth() - 1);
        prevStartDate.setMonth(now.getMonth() - 2);
    }

    // Fetch current period transactions
    const { data: currentTxs } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', now.toISOString());

    // Fetch previous period transactions
    const { data: prevTxs } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', prevStartDate.toISOString())
        .lt('transaction_date', startDate.toISOString());

    const processTxs = (txs: any[]) => {
        const expenses = txs.filter(tx =>
            (tx.type === TRANSACTION_TYPES.EXPENSE || tx.type === TRANSACTION_TYPES.DEBIT) && !tx.is_transfer ||
            (tx.is_transfer && tx.transfer_side === 'from' && tx.category && tx.category !== 'transfer')
        );
        const income = txs.filter(tx =>
            (tx.type === TRANSACTION_TYPES.INCOME || tx.type === TRANSACTION_TYPES.CREDIT) && !tx.is_transfer ||
            (tx.is_transfer && tx.transfer_side === 'to' && tx.category && tx.category !== 'transfer' && tx.category !== 'income')
        );

        const totalSpending = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalIncome = income.reduce((sum, tx) => sum + Number(tx.amount), 0);

        const categoryMap: Record<string, number> = {};
        expenses.forEach(tx => {
            const cat = getCategoryByIdOrName(tx.category);
            const name = cat?.name || 'Other';
            categoryMap[name] = (categoryMap[name] || 0) + Number(tx.amount);
        });

        const topCategories = Object.entries(categoryMap).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
        })).sort((a, b) => b.amount - a.amount);

        return { totalSpending, totalIncome, topCategories, expenses, income };
    };

    const current = processTxs(currentTxs || []);
    const previous = processTxs(prevTxs || []);

    // Detect recurring (simplified: same description and similar amount)
    const recurringMap: Record<string, { amount: number; count: number }> = {};
    (currentTxs || []).forEach(tx => {
        const key = `${tx.description.toLowerCase()}-${Math.round(tx.amount)}`;
        if (!recurringMap[key]) {
            recurringMap[key] = { amount: Number(tx.amount), count: 0 };
        }
        recurringMap[key].count++;
    });
    const recurringTransactions = Object.entries(recurringMap)
        .filter(([_, data]) => data.count >= 2)
        .map(([key, data]) => ({ description: key.split('-')[0], amount: data.amount, count: data.count }));

    // Detect anomalies (spending > 2x average or > 500 GHS for random items)
    const anomalies = current.expenses
        .filter(tx => Number(tx.amount) > 500)
        .map(tx => ({ description: tx.description, amount: Number(tx.amount), date: tx.transaction_date }));

    // Category changes
    const categoryChanges = current.topCategories.map(currCat => {
        const prevCat = previous.topCategories.find(p => p.category === currCat.category);
        const change = prevCat ? ((currCat.amount - prevCat.amount) / prevCat.amount) * 100 : 100;
        return { category: currCat.category, change };
    });

    return {
        timeframe: period === 'week' ? 'this week' : 'this month',
        totalSpending: current.totalSpending,
        totalIncome: current.totalIncome,
        topCategories: current.topCategories,
        recurringTransactions,
        anomalies,
        previousPeriodComparison: {
            spendingChange: previous.totalSpending > 0 ? ((current.totalSpending - previous.totalSpending) / previous.totalSpending) * 100 : 0,
            incomeChange: previous.totalIncome > 0 ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome) * 100 : 0,
            categoryChanges
        }
    };
}

export function generateInsights(data: InsightsData): Insight[] {
    const insights: Insight[] = [];

    // 1. Significant changes in categories
    data.previousPeriodComparison.categoryChanges.forEach(cat => {
        if (cat.change > 20) {
            insights.push({
                type: 'attention',
                title: `${cat.category} spending is up`,
                description: `Your ${cat.category.toLowerCase()} costs jumped ${cat.change.toFixed(0)}% to ${formatCurrency(data.topCategories.find(c => c.category === cat.category)?.amount || 0)}. Reviewing these daily GHS payments could help.`
            });
        } else if (cat.change < -20) {
            insights.push({
                type: 'positive',
                title: `Great job on ${cat.category}!`,
                description: `You reduced your ${cat.category.toLowerCase()} spending by ${Math.abs(cat.change).toFixed(0)}% compared to last period. That's a solid win for your pocket.`
            });
        }
    });

    // 2. Savings check
    if (data.totalIncome > data.totalSpending) {
        const savings = data.totalIncome - data.totalSpending;
        insights.push({
            type: 'positive',
            title: "You're living within your means",
            description: `You've kept GHS ${savings.toFixed(2)} as a buffer ${data.timeframe}. Keep this up to build your emergency fund.`
        });
    } else if (data.totalSpending > data.totalIncome) {
        insights.push({
            type: 'attention',
            title: "Spending exceeded income",
            description: `You spent ${formatCurrency(data.totalSpending - data.totalIncome)} more than you earned ${data.timeframe}. Review your MoMo transactions for flexible expenses to cut back.`
        });
    }

    // 3. Anomalies
    if (data.anomalies.length > 0) {
        const biggest = data.anomalies.sort((a, b) => b.amount - a.amount)[0];
        insights.push({
            type: 'neutral',
            title: "Large one-time expense",
            description: `A payment of ${formatCurrency(biggest.amount)} for "${biggest.description}" stands out. Was this a planned purchase for your home or business?`
        });
    }

    // 4. Recurring payments
    if (data.recurringTransactions.length > 0) {
        const count = data.recurringTransactions.length;
        insights.push({
            type: 'neutral',
            title: "Multiple recurring payments",
            description: `We found ${count} regular payments ${data.timeframe}. Check your Vodafone or MTN subscriptions to ensure you still need them all.`
        });
    }

    // fallback if no insights
    if (insights.length === 0) {
        insights.push({
            type: 'positive',
            title: "Financial habits looking stable",
            description: "Your spending patterns are consistent with your usual behavior. Great job maintaining balance!"
        });
    }

    // Limit to 3-5 insights
    return insights.slice(0, 5);
}
