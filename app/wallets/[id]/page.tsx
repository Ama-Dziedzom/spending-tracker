"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    MoreVertical,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    Zap,
    TrendingDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function WalletDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const { data: wallet, isLoading: walletLoading } = useQuery({
        queryKey: ["wallet", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("wallets").select("*").eq("id", id).single();
            if (error) throw error;
            return data;
        },
    });

    const { data: transactions, isLoading: transactionsLoading } = useQuery({
        queryKey: ["wallet-transactions", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("wallet_id", id)
                .order("transaction_date", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    if (walletLoading || transactionsLoading) {
        return (
            <LayoutWrapper>
                <Skeleton className="h-8 w-8 rounded-full mb-6" />
                <Skeleton className="h-40 w-full rounded-3xl mb-8" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </LayoutWrapper>
        );
    }

    if (!wallet) return <div>Wallet not found</div>;

    return (
        <LayoutWrapper>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{wallet.icon}</span>
                    <h1 className="text-xl font-bold">{wallet.name}</h1>
                </div>
                <button className="p-2 -mr-2 rounded-full hover:bg-muted">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            {/* Balance Card */}
            <div className="text-center mb-8">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
                <h2 className="text-4xl font-black mb-2">GHS {Number(wallet.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-sm bg-red-50 dark:bg-red-950/20 w-fit mx-auto px-3 py-1 rounded-full">
                    <TrendingDown className="w-4 h-4" />
                    <span>↓ 15% from last month</span>
                </div>
            </div>

            {/* Activity Summary */}
            <Card className="p-6 mb-8 rounded-3xl border-none bg-muted/30">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">January Activity</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600">
                                <ArrowDownLeft className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground">IN</p>
                                <p className="font-bold">GHS 2,650</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-right text-muted-foreground">
                            <p>Transfers: GHS 2,500</p>
                            <p>Income: GHS 150</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground">OUT</p>
                                <p className="font-bold">GHS 2,320</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-right text-muted-foreground">
                            <p>Spending: GHS 1,600</p>
                            <p>Transfers: GHS 720</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Transactions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Transactions</h3>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-full bg-muted/50"><Search className="w-4 h-4" /></button>
                        <button className="p-2 rounded-full bg-muted/50"><Filter className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="space-y-6">
                    {transactions?.length ? (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today</p>
                            <div className="space-y-5">
                                {transactions.map((tx) => (
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
                                        <p className={cn("font-bold", tx.type === "debit" ? "text-foreground" : "text-green-600")}>
                                            {tx.type === "debit" ? "-" : "+"}GHS {Number(tx.amount).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No transactions for this wallet.</p>
                        </div>
                    )}
                </div>
            </div>
        </LayoutWrapper>
    );
}
