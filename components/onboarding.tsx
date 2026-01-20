"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Wallet, Landmark, CreditCard, Coins, CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const WALLET_TYPES = [
    { id: "bank", label: "Bank Account", icon: Landmark, color: "bg-blue-500" },
    { id: "momo", label: "Mobile Money", icon: CreditCard, color: "bg-green-500" },
    { id: "cash", label: "Cash", icon: Coins, color: "bg-amber-500" },
    { id: "other", label: "Other", icon: Wallet, color: "bg-slate-500" },
];

const ICONS = ["💳", "🏦", "💰", "💵", "🎫", "💎"];
const COLORS = ["#2563EB", "#10B981", "#F97316", "#9333EA", "#EC4899", "#EAB308"];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [wallets, setWallets] = useState<any[]>([]);
    const [currentWallet, setCurrentWallet] = useState<any>({
        name: "",
        type: "bank",
        icon: "💳",
        color: "#2563EB",
        initial_balance: "0",
    });

    const nextStep = () => setStep(step + 1);

    const addWallet = async () => {
        // In a real app, we'd save this to Supabase
        // For now, we'll just add to local state
        setWallets([...wallets, { ...currentWallet, id: crypto.randomUUID() }]);
        setCurrentWallet({
            name: "",
            type: "bank",
            icon: "💳",
            color: "#2563EB",
            initial_balance: "0",
        });
    };

    const handleComplete = async () => {
        // Save all wallets to Supabase
        if (wallets.length > 0) {
            const { error } = await supabase.from('wallets').insert(wallets.map(w => ({
                name: w.name,
                type: w.type,
                icon: w.icon,
                color: w.color,
                initial_balance: parseFloat(w.initial_balance),
                current_balance: parseFloat(w.initial_balance),
                is_active: true
            })));
            if (error) {
                console.error("Error saving wallets:", error);
            }
        }
        onComplete();
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 max-w-md mx-auto">
            {step === 1 && (
                <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                            <Wallet className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">FinTracker</h1>
                        <p className="text-muted-foreground text-lg">
                            Track spending across all your wallets in one place.
                        </p>
                    </div>
                    <Button size="lg" className="w-full h-14 text-lg rounded-2xl" onClick={nextStep}>
                        Get Started
                        <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Set Up Wallets</h2>
                        <p className="text-muted-foreground">Add your bank accounts, mobile money, or cash.</p>
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {wallets.map((w) => (
                            <Card key={w.id} className="p-4 flex items-center justify-between border-2 border-primary/20 bg-primary/5">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{w.icon}</span>
                                    <div>
                                        <p className="font-semibold">{w.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{w.type}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-primary">GHS {parseFloat(w.initial_balance).toFixed(2)}</p>
                            </Card>
                        ))}
                    </div>

                    <Card className="p-6 space-y-4 border-dashed">
                        <div className="space-y-2">
                            <Label>Wallet Name</Label>
                            <Input
                                placeholder="e.g. MTN MoMo"
                                value={currentWallet.name}
                                onChange={(e) => setCurrentWallet({ ...currentWallet, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {WALLET_TYPES.map((t) => (
                                <button
                                    key={t.id}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                        currentWallet.type === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                    )}
                                    onClick={() => setCurrentWallet({ ...currentWallet, type: t.id })}
                                >
                                    <t.icon className={cn("w-5 h-5 mb-1", currentWallet.type === t.id ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-[10px] font-medium">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between items-end gap-4 text-center">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <div className="flex gap-2">
                                    {ICONS.slice(0, 4).map(icon => (
                                        <button
                                            key={icon}
                                            className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", currentWallet.icon === icon ? "border-primary bg-primary/10" : "border-border")}
                                            onClick={() => setCurrentWallet({ ...currentWallet, icon })}
                                        >{icon}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 space-y-2 text-left">
                                <Label>Initial Balance</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={currentWallet.initial_balance}
                                    onChange={(e) => setCurrentWallet({ ...currentWallet, initial_balance: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button variant="outline" className="w-full border-dashed" onClick={addWallet} disabled={!currentWallet.name}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Wallet
                        </Button>
                    </Card>

                    <Button className="w-full h-14 text-lg rounded-2xl" onClick={nextStep} disabled={wallets.length === 0}>
                        Continue
                        <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
                    <div className="space-y-4">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold">All Set! 🎉</h2>
                        <p className="text-muted-foreground text-lg">
                            Your transactions are now organized by wallet.
                        </p>
                    </div>
                    <Button size="lg" className="w-full h-14 text-lg rounded-2xl" onClick={handleComplete}>
                        Go to Dashboard
                    </Button>
                </div>
            )}
        </div>
    );
}
