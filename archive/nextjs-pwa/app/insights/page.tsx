"use client";

import { LayoutWrapper } from "@/components/layout-wrapper";
import { Card } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from "recharts";
import {
    TrendingUp,
    PieChart as PieChartIcon,
    ArrowRight,
    ChevronRight,
    Lightbulb,
    PartyPopper
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SPENDING_TREND = [
    { day: "1", amount: 120 },
    { day: "5", amount: 350 },
    { day: "10", amount: 150 },
    { day: "15", amount: 600 },
    { day: "20", amount: 200 },
    { day: "25", amount: 450 },
    { day: "30", amount: 250 },
];

const CATEGORY_DATA = [
    { name: "Food", value: 650, color: "#F97316" },
    { name: "Transport", value: 520, color: "#3B82F6" },
    { name: "Bills", value: 420, color: "#EAB308" },
    { name: "Shopping", value: 320, color: "#EC4899" },
    { name: "Other", value: 210, color: "#64748B" },
];

const INCOME_EXPENSE = [
    { month: "Oct", income: 3000, spent: 2100 },
    { month: "Nov", income: 3200, spent: 2400 },
    { month: "Dec", income: 4500, spent: 2800 },
    { month: "Jan", income: 3650, spent: 2120 },
];

export default function InsightsPage() {
    return (
        <LayoutWrapper>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Insights</h1>
                <Select defaultValue="jan-2026">
                    <SelectTrigger className="w-[130px] h-9 rounded-full bg-muted/50 border-none font-bold text-xs uppercase">
                        <SelectValue>Period</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="jan-2026">Jan 2026</SelectItem>
                        <SelectItem value="dec-2025">Dec 2025</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Smart Tip */}
            <Card className="p-5 mb-8 rounded-3xl border-none bg-primary/5 flex gap-4 items-start border-l-4 border-l-primary">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold flex items-center gap-2">
                        This Month <PartyPopper className="w-3.5 h-3.5 text-orange-500" />
                    </p>
                    <p className="text-sm text-muted-foreground leading-snug">
                        You spent <span className="text-primary font-bold">15% less</span> than usual! You're on track to save GHS 1,530 this month.
                    </p>
                </div>
            </Card>

            {/* Spending Trend */}
            <div className="mb-8">
                <h2 className="text-md font-bold mb-4 ml-1">Spending Trend</h2>
                <Card className="p-4 rounded-[2rem] border-none shadow-sm h-64 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={SPENDING_TREND}>
                            <defs>
                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} dy={10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontWeight: 'bold' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Category Breakdown */}
            <div className="mb-8">
                <h2 className="text-md font-bold mb-4 ml-1">Category Breakdown</h2>
                <Card className="p-6 rounded-[2rem] border-none shadow-sm">
                    <div className="flex gap-4 items-center mb-6">
                        <div className="h-40 w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={CATEGORY_DATA}
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {CATEGORY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-3">
                            {CATEGORY_DATA.slice(0, 3).map((item) => (
                                <div key={item.name} className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.name}</span>
                                        <span className="text-xs font-black">{Math.round((item.value / 2120) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${(item.value / 650) * 100}%`, backgroundColor: item.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        {CATEGORY_DATA.map(item => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-semibold">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold">GHS {item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Income vs Expenses */}
            <div className="mb-8">
                <h2 className="text-md font-bold mb-4 ml-1">Income vs Expenses</h2>
                <Card className="p-6 rounded-[2rem] border-none shadow-sm">
                    <div className="h-48 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={INCOME_EXPENSE}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} />
                                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                                <Bar dataKey="spent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-950/20">
                            <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Income</p>
                            <p className="text-xs font-black">GHS 3.6K</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/20">
                            <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Spent</p>
                            <p className="text-xs font-black">GHS 2.1K</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-primary/10">
                            <p className="text-[9px] font-bold text-primary uppercase mb-1">Net</p>
                            <p className="text-xs font-black">+GHS 1.5K</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Money Movement */}
            <div className="mb-10">
                <h2 className="text-md font-bold mb-4 ml-1">Money Movement</h2>
                <Card className="p-5 rounded-3xl border-none shadow-sm space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center text-lg">🏦</div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center text-lg">💳</div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">GHS 2,500</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">5 Transfers</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Net to MoMo: <span className="font-bold text-foreground">GHS 2,300</span></p>
                    </div>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
