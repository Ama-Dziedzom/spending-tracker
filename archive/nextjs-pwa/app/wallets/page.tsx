"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function WalletsPage() {
    const { data: wallets, isLoading } = useQuery({
        queryKey: ["wallets"],
        queryFn: async () => {
            const { data, error } = await supabase.from("wallets").select("*").eq("is_active", true);
            if (error) throw error;
            return data;
        },
    });

    const totalBalance = wallets?.reduce((sum, w) => sum + Number(w.current_balance), 0) || 0;

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </LayoutWrapper>
        );
    }

    return (
        <LayoutWrapper>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Wallets</h1>
                <Badge variant="outline" className="font-semibold px-3 py-1">January 2026</Badge>
            </div>

            {/* Total Balance Summary */}
            <Card className="p-6 mb-8 rounded-[1.5rem] bg-muted/30 border-none shadow-none">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Balance</p>
                        <h2 className="text-3xl font-bold tracking-tight">GHS {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-green-600">↑ GHS 3,500 <span className="text-[10px] font-normal text-muted-foreground ml-1">IN</span></span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-600">↓ GHS 2,120 <span className="text-[10px] font-normal text-muted-foreground ml-1">OUT</span></span>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                {wallets?.map((wallet) => {
                    const walletBalance = Number(wallet.current_balance);
                    const percentOfTotal = totalBalance > 0 ? (walletBalance / totalBalance) * 100 : 0;

                    return (
                        <Link key={wallet.id} href={`/wallets/${wallet.id}`}>
                            <Card className="p-5 rounded-3xl border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-2xl" style={{ backgroundColor: `${wallet.color}20` }}>
                                            {wallet.icon}
                                        </div>
                                        <div>
                                            <p className="font-bold">{wallet.name}</p>
                                            <p className="text-xs text-muted-foreground italic">12 transactions this month</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-red-500 font-bold">↓ 15%</p>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <div className="flex justify-between items-end mb-1">
                                        <p className="text-xl font-black">GHS {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{Math.round(percentOfTotal)}% of total</p>
                                    </div>
                                    <Progress value={percentOfTotal} className="h-1.5" style={{ "--progress-foreground": wallet.color } as any} />
                                </div>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            <Link href="/wallets/add" className="block mt-6">
                <Button variant="outline" className="w-full h-16 rounded-3xl border-dashed border-2 text-muted-foreground font-bold">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Wallet
                </Button>
            </Link>
        </LayoutWrapper>
    );
}

import { Badge } from "@/components/ui/badge";
