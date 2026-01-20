"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    X,
    Wallet,
    Landmark,
    CreditCard,
    Coins,
    ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WALLET_TYPES = [
    { id: "bank", label: "Bank Account", icon: Landmark },
    { id: "momo", label: "Mobile Money", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Coins },
    { id: "other", label: "Other", icon: Wallet },
];

const ICONS = ["💳", "🏦", "💰", "💵", "🎫", "💎", "🏧", "🏪"];
const COLORS = ["#2563EB", "#10B981", "#F97316", "#9333EA", "#EC4899", "#EAB308", "#6366F1", "#64748B"];

export default function AddWalletPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        type: "bank",
        icon: "💳",
        color: "#2563EB",
        initial_balance: "0",
        source_identifier: "none"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from("wallets").insert({
                name: formData.name,
                type: formData.type,
                icon: formData.icon,
                color: formData.color,
                initial_balance: parseFloat(formData.initial_balance),
                current_balance: parseFloat(formData.initial_balance),
                source_identifier: formData.source_identifier === "none" ? null : formData.source_identifier,
                is_active: true,
            });

            if (error) throw error;
            router.push("/wallets");
        } catch (error) {
            console.error("Error adding wallet:", error);
            alert("Failed to add wallet");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LayoutWrapper>
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Add New Wallet</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Wallet Name</Label>
                    <Input
                        placeholder="e.g. My Savings Account"
                        className="h-14 rounded-2xl border-2 focus:border-primary px-5 text-lg"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-4">
                    <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {WALLET_TYPES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all h-24",
                                    formData.type === t.id ? "border-primary bg-primary/5 text-primary" : "border-muted-foreground/10 hover:border-primary/50"
                                )}
                                onClick={() => setFormData({ ...formData, type: t.id })}
                            >
                                <t.icon className={cn("w-6 h-6 mb-2", formData.type === t.id ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-xs font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Choose Icon</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {ICONS.map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    className={cn(
                                        "h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all",
                                        formData.icon === icon ? "border-primary bg-primary/10" : "border-transparent bg-muted/30"
                                    )}
                                    onClick={() => setFormData({ ...formData, icon })}
                                >{icon}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Color</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "h-10 rounded-xl border-2 transition-all",
                                        formData.color === color ? "border-primary scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Starting Balance (Optional)</Label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">GHS</span>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="h-14 rounded-2xl border-2 focus:border-primary pl-16 pr-5 text-xl font-black"
                            value={formData.initial_balance}
                            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground ml-1">Link to Transaction Source</Label>
                    <Select value={formData.source_identifier} onValueChange={(val) => setFormData({ ...formData, source_identifier: val || "none" })}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 px-5">
                            <SelectValue>Select Source</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="MTN_MoMo">MTN MoMo</SelectItem>
                            <SelectItem value="Vodafone_Cash">Telecel Cash</SelectItem>
                            <SelectItem value="GCBBank">GCB Bank</SelectItem>
                            <SelectItem value="StanChart">Standard Chartered</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button type="button" variant="outline" className="flex-1 h-16 rounded-2xl font-bold text-lg" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-16 rounded-2xl font-bold text-lg" disabled={loading || !formData.name}>
                        {loading ? "Adding..." : "Add Wallet"}
                    </Button>
                </div>
            </form>
        </LayoutWrapper>
    );
}
