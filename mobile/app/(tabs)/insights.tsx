import { View, Text, ScrollView, RefreshControl, Pressable, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowUp01Icon,
    ArrowDown01Icon,
    AiMagicIcon,
    Alert01Icon,
    InformationCircleIcon,
    Tick01Icon,
    Calendar01Icon,
    ChartBarLineIcon,
    Wallet01Icon,
    PercentIcon,
} from '@hugeicons/core-free-icons';
import { getGlobalAnalytics, formatCurrency, GlobalAnalytics } from '../../lib/transaction-service';
import { getInsightsData, generateInsights, Insight, InsightsData } from '../../lib/insights-service';
import { COLORS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Insights() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<'week' | 'month'>('month');
    const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
    const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [analyticsRes, insightsDataRes] = await Promise.all([
                getGlobalAnalytics(period),
                getInsightsData(period)
            ]);
            setAnalytics(analyticsRes);
            setInsightsData(insightsDataRes);
            setInsights(generateInsights(insightsDataRes));
        } catch (error) {
            console.error('Error fetching insights data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [period]);

    const renderInsightCard = (insight: Insight, index: number) => {
        const typeColors = {
            positive: { bg: '#F0FDF4', border: '#DCFCE7', icon: '#10B981', iconComp: Tick01Icon, title: '#065F46' },
            attention: { bg: '#FFF1F2', border: '#FFE4E6', icon: '#F43F5E', iconComp: Alert01Icon, title: '#9F1239' },
            neutral: { bg: '#F8FAFF', border: '#E2E8F0', icon: '#1642E5', iconComp: InformationCircleIcon, title: '#1E40AF' }
        };

        const config = typeColors[insight.type] || typeColors.neutral;

        return (
            <Animated.View
                key={index}
                {...{ entering: FadeInDown.delay(100 * index).duration(500) } as any}
                className="rounded-[28px] p-6 mb-4 border-[1px]"
                style={{
                    backgroundColor: config.bg,
                    borderColor: config.border,
                }}
            >
                <View className="flex-row items-start gap-4">
                    <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: `${config.icon}15` }}
                    >
                        <HugeiconsIcon icon={config.iconComp} size={24} color={config.icon} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[17px] font-manrope-bold mb-1.5" style={{ color: config.title }}>
                            {insight.title}
                        </Text>
                        <Text className="text-slate-600 text-[14px] font-manrope leading-[22px]">
                            {insight.description}
                        </Text>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />
            {/* Dark Top Section */}
            <View style={{ height: 340, width: '100%', position: 'absolute' }}>
                <LinearGradient
                    colors={['#0F172A', '#1E1B4B', '#312E81']}
                    className="flex-1"
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FFFFFF"
                    />
                }
            >
                {/* Header Context */}
                <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24 }}>
                    <View className="flex-row items-center justify-between mb-8">
                        <View>
                            <Text className="text-white/60 font-manrope-medium text-[14px] uppercase tracking-[2px]">Overview</Text>
                            <Text className="text-white font-manrope-bold text-[32px]">Finance Radar</Text>
                        </View>

                        {/* Custom Animated Toggle */}
                        <View className="flex-row bg-white/10 rounded-2xl p-1 border border-white/10 backdrop-blur-xl">
                            <Pressable
                                onPress={() => setPeriod('week')}
                                className={`px-5 py-2.5 rounded-xl ${period === 'week' ? 'bg-white shadow-lg' : ''}`}
                            >
                                <Text className={`text-[13px] font-manrope-bold ${period === 'week' ? 'text-indigo-900' : 'text-white/60'}`}>Week</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setPeriod('month')}
                                className={`px-5 py-2.5 rounded-xl ${period === 'month' ? 'bg-white shadow-lg' : ''}`}
                            >
                                <Text className={`text-[13px] font-manrope-bold ${period === 'month' ? 'text-indigo-900' : 'text-white/60'}`}>Month</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Main Cashflow Highlight */}
                    <Animated.View
                        {...{ entering: FadeInUp.duration(600) } as any}
                        className="mb-10"
                    >
                        <View className="flex-row items-center gap-3 mb-2">
                            <View className="w-2 h-2 rounded-full bg-indigo-400" />
                            <Text className="text-indigo-200 font-manrope-medium text-[14px]">Net Cashflow</Text>
                        </View>
                        <View className="flex-row items-end gap-2">
                            <Text className="text-white text-[48px] font-manrope-bold tracking-[-1px]">
                                {formatCurrency(analytics?.netCashflow || 0).replace('GH₵', '₵')}
                            </Text>
                            <View className="mb-3 px-2 py-1 rounded-lg bg-indigo-400/20 border border-indigo-400/30">
                                <Text className="text-indigo-200 text-[12px] font-manrope-bold">
                                    {analytics?.netCashflow && analytics.netCashflow > 0 ? 'Surplus' : 'Deficit'}
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Quick Stats Grid */}
                    <View className="flex-row gap-4 mb-12">
                        <View className="flex-1 bg-white/10 border border-white/20 rounded-[24px] p-5 backdrop-blur-xl">
                            <Text className="text-white/50 text-[12px] font-manrope-bold uppercase tracking-widest mb-2">Inflow</Text>
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center">
                                    <HugeiconsIcon icon={ArrowDown01Icon} size={16} color="#10B981" />
                                </View>
                                <Text className="text-white text-[18px] font-manrope-bold">
                                    {formatCurrency(analytics?.totalInflow || 0).replace('GH₵', '₵')}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-1 bg-white/10 border border-white/20 rounded-[24px] p-5 backdrop-blur-xl">
                            <Text className="text-white/50 text-[12px] font-manrope-bold uppercase tracking-widest mb-2">Outflow</Text>
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center">
                                    <HugeiconsIcon icon={ArrowUp01Icon} size={16} color="#F43F5E" />
                                </View>
                                <Text className="text-white text-[18px] font-manrope-bold">
                                    {formatCurrency(analytics?.totalSpent || 0).replace('GH₵', '₵')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content White Section */}
                <View className="bg-[#F8FAFC] rounded-t-[40px] px-6 pt-10 mt-[-20px] shadow-2xl shadow-black/20">

                    {/* Spending Trend Section */}
                    <View className="mb-10">
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-slate-900 text-[20px] font-manrope-bold">Spending Activity</Text>
                                <Text className="text-slate-500 text-[13px] font-manrope">Daily volume tracking</Text>
                            </View>
                            <View className="w-10 h-10 rounded-2xl bg-indigo-50 items-center justify-center">
                                <HugeiconsIcon icon={ChartBarLineIcon} size={20} color={COLORS.primary} />
                            </View>
                        </View>

                        <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                            {isLoading ? (
                                <View className="h-[200px] items-center justify-center">
                                    <ActivityIndicator color={COLORS.primary} />
                                </View>
                            ) : analytics?.spendingHistory && analytics.spendingHistory.length > 0 ? (
                                <BarChart
                                    data={analytics.spendingHistory.map(item => ({
                                        value: item.amount,
                                        label: item.label,
                                        frontColor: item.amount > 500 ? '#4F46E5' : '#818CF8',
                                    }))}
                                    width={SCREEN_WIDTH - 100}
                                    height={200}
                                    barWidth={period === 'week' ? 32 : 12}
                                    spacing={period === 'week' ? 14 : 12}
                                    barBorderRadius={8}
                                    yAxisThickness={0}
                                    xAxisThickness={0}
                                    hideRules
                                    hideYAxisText
                                    xAxisLabelTextStyle={{ color: '#94A3B8', fontSize: 11, fontFamily: 'Manrope_500Medium' }}
                                    isAnimated
                                    animationDuration={800}
                                />
                            ) : (
                                <View className="h-[200px] items-center justify-center">
                                    <Text className="text-slate-400 font-manrope">Not enough data to map trend</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Category Split */}
                    <View className="mb-10">
                        <Text className="text-slate-900 text-[20px] font-manrope-bold mb-6">Category DNA</Text>
                        <View className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm shadow-slate-200/50">
                            {analytics?.categorySpending && analytics.categorySpending.length > 0 ? (
                                <View className="flex-row items-center justify-between">
                                    <View className="items-center">
                                        <PieChart
                                            data={analytics.categorySpending.map(cat => ({
                                                value: cat.amount,
                                                color: cat.color,
                                            }))}
                                            donut
                                            radius={85}
                                            innerRadius={65}
                                            innerCircleColor={'#fff'}
                                            centerLabelComponent={() => (
                                                <View className="items-center">
                                                    <HugeiconsIcon icon={Wallet01Icon} size={24} color="#CBD5E1" />
                                                    <Text className="text-[22px] font-manrope-bold text-slate-900 mt-1">
                                                        {analytics.categorySpending.length}
                                                    </Text>
                                                </View>
                                            )}
                                        />
                                    </View>

                                    <View className="flex-1 ml-10 gap-5">
                                        {analytics.categorySpending.slice(0, 3).map((cat, idx) => (
                                            <View key={idx}>
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-[14px] font-manrope-bold text-slate-700" numberOfLines={1}>
                                                        {cat.category}
                                                    </Text>
                                                    <Text className="text-[14px] font-manrope-bold text-slate-900">
                                                        {cat.percentage.toFixed(0)}%
                                                    </Text>
                                                </View>
                                                <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <Animated.View
                                                        {...{ entering: FadeInDown.delay(300 + idx * 100) } as any}
                                                        className="h-full rounded-full"
                                                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                <View className="py-10 items-center">
                                    <Text className="text-slate-400 font-manrope">No categories to display</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* AI Insights Section */}
                    <View className="mb-8">
                        <View className="flex-row items-center gap-3 mb-6">
                            <LinearGradient
                                colors={['#4F46E5', '#EC4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/30"
                            >
                                <HugeiconsIcon icon={AiMagicIcon} size={24} color="white" />
                            </LinearGradient>
                            <View>
                                <Text className="text-slate-900 text-[20px] font-manrope-bold">AI Strategist</Text>
                                <Text className="text-slate-500 text-[13px] font-manrope">Powered by local data patterns</Text>
                            </View>
                        </View>

                        {insights.length > 0 ? (
                            insights.map((insight, idx) => renderInsightCard(insight, idx))
                        ) : (
                            <View className="bg-slate-50 border border-slate-100 rounded-[32px] p-10 items-center">
                                <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-4">
                                    <HugeiconsIcon icon={Calendar01Icon} size={32} color="#818CF8" />
                                </View>
                                <Text className="text-slate-900 font-manrope-bold text-[18px] text-center mb-2">Analyzing Patterns</Text>
                                <Text className="text-slate-500 font-manrope text-center leading-[22px]">
                                    We need a few more days of transactions to generate personalized local insights for you.
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="h-10" />
                </View>
            </ScrollView>
        </View>
    );
}
