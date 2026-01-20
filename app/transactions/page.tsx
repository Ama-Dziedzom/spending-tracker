"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useState } from "react";
import {
    Search,
    Filter,
    ChevronLeft,
    ArrowUpRight,
    ArrowDownLeft,
    Zap,
    Calendar,
    Wallet as WalletIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [filterWallet, setFilterWallet] = useState("all");
    const [filterTime, setFilterTime] = useState("month");

    const { data: transactions, isLoading } = useQuery({
        queryKey: ["transactions", filterWallet, filterTime],
        queryFn: async () => {
            let query = supabase.from("transactions").select("*, wallets(name, icon)");

            if (filterWallet !== "all") {
                query = query.eq("wallet_id", filterWallet);
            }

            // Filter by time logic would go here

            const { data, error } = await query.order("transaction_date", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: wallets } = useQuery({
        queryKey: ["wallets-simple"],
        queryFn: async () => {
            const { data } = await supabase.from("wallets").select("id, name");
            return data;
        }
    });

    const filteredTransactions = transactions?.filter(tx =>
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase())
    );

    const groupTransactions = (txs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        txs.forEach(tx => {
            const date = new Date(tx.transaction_date);
            let key = format(date, "MMM d, yyyy");
            if (isToday(date)) key = "Today";
            else if (isYesterday(date)) key = "Yesterday";

            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });
        return groups;
    };

    const grouped = filteredTransactions ? groupTransactions(filteredTransactions) : {};

    return (
        <LayoutWrapper>
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold">Transactions</h1>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex gap-2">
                    <Select value={filterTime} onValueChange={(val) => setFilterTime(val || "month")}>
                        <SelectTrigger className="flex-1 h-11 rounded-xl bg-muted/50 border-none px-4">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue>Period</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterWallet} onValueChange={(val) => setFilterWallet(val || "all")}>
                        <SelectTrigger className="flex-1 h-11 rounded-xl bg-muted/50 border-none px-4">
                            <WalletIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue>Wallet</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Wallets</SelectItem>
                            {wallets?.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search transactions..."
                        className="h-12 rounded-2xl bg-muted/50 border-none pl-11 pr-4"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-8">
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-16 w-full rounded-2xl" />
                            <Skeleton className="h-16 w-full rounded-2xl" />
                        </div>
                    ))
                ) : Object.keys(grouped).length > 0 ? (
                    Object.entries(grouped).map(([date, txs]) => (
                        <div key={date} className="space-y-4">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{date}</h3>
                            <div className="space-y-6">
                                {txs.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between group active:scale-[0.98] transition-transform cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-xl group-hover:bg-primary/10 transition-colors">
                                                {tx.wallets?.icon || "💳"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-tight mb-0.5">{tx.description}</p>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-tight">{tx.category}</Badge>
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{tx.wallets?.name} • {format(new Date(tx.transaction_date), "p")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("font-bold text-sm", tx.type === "debit" ? "text-foreground" : "text-green-600")}>
                                                {tx.type === "debit" ? "-" : "+"}GHS {Number(tx.amount).toFixed(2)}
                                            </p>
                                            {tx.is_transfer && (
                                                <span className="text-[8px] font-bold text-blue-500 uppercase flex items-center justify-end gap-0.5 mt-0.5">
                                                    <Zap className="w-2 h-2 fill-current" /> Transfer
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">No transactions found</p>
                    </div>
                )}
            </div>

            <div className="py-10 text-center">
                <Button variant="ghost" className="text-primary font-bold">Load More</Button>
            </div>
        </LayoutWrapper>
    );
}
