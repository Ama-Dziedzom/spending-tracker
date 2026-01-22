"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    ChevronRight,
    Utensils,
    Bus,
    ShoppingCart,
    Zap,
    MoreHorizontal,
    Bell,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardContent() {
    const { data: wallets, isLoading: walletsLoading } = useQuery({
        queryKey: ["wallets"],
        queryFn: async () => {
            const { data, error } = await supabase.from("wallets").select("*").eq("is_active", true);
            if (error) throw error;
            return data;
        },
    });

    const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
        queryKey: ["recent-transactions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .order("transaction_date", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
    });

    const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.current_balance), 0) || 0;

    // Mock data for spending progress
    const monthlySpent = 2120;
    const monthlyBudget = 2800;
    const progressPercent = (monthlySpent / monthlyBudget) * 100;

    if (walletsLoading || transactionsLoading) {
        return (
            <LayoutWrapper>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-3xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <div className="flex gap-4">
                        <Skeleton className="h-20 flex-1 rounded-2xl" />
                        <Skeleton className="h-20 flex-1 rounded-2xl" />
                    </div>
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        AD
                    </div>
                    <p className="font-semibold">Hi, Ama</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-full hover:bg-muted transition-colors">
                        <Bell className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-muted transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Balance Card */}
            <div className="mb-8 p-8 rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-3xl" />

                <p className="text-sm font-medium opacity-80 mb-1">Total Balance</p>
                <h2 className="text-4xl font-bold mb-4 tracking-tight">GHS {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>GHS 150.00 from last week</span>
                </div>
            </div>

            {/* Monthly Progress */}
            <Card className="p-6 mb-8 rounded-[1.5rem] border-none bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">January 2026 Spending</p>
                        <p className="text-lg font-bold">GHS {monthlySpent} / GHS {monthlyBudget} <span className="text-sm font-normal text-muted-foreground italic">avg</span></p>
                    </div>
                    <span className="text-sm font-bold text-primary">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-muted transition-all" />
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="p-4 rounded-3xl border-none bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                            <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider">Income</span>
                    </div>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">+3,650</p>
                </Card>
                <Card className="p-4 rounded-3xl border-none bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                        <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider">Spent</span>
                    </div>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">-2,120</p>
                </Card>
            </div>

            {/* My Wallets */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">My Wallets</h3>
                    <Button variant="link" className="text-primary font-semibold pr-0">View All</Button>
                </div>
                <div className="space-y-3">
                    {wallets?.map((wallet) => (
                        <Card key={wallet.id} className="p-4 rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-2xl" style={{ backgroundColor: `${wallet.color}20` }}>
                                        {wallet.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold">{wallet.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{wallet.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">GHS {Number(wallet.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    <p className="text-xs text-green-500 font-medium">↑ 5%</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Recent Transactions</h3>
                    <Button variant="link" className="text-primary font-semibold pr-0">View All</Button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today</p>
                        <div className="space-y-5">
                            {recentTransactions?.length ? recentTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{tx.description}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                {tx.category} • {format(new Date(tx.transaction_date), "p")}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={cn("font-bold", tx.type === 'debit' ? "text-foreground" : "text-green-600")}>
                                        {tx.type === 'debit' ? "-" : "+"}GHS {Number(tx.amount).toFixed(2)}
                                    </p>
                                </div>
                            )) : (
                                <div className="text-center py-6">
                                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </LayoutWrapper>
    );
}
