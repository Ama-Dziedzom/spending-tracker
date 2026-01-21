"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    ChevronLeft,
    ChevronRight,
    Wallet,
    Landmark,
    Smartphone,
    Briefcase,
    Gift,
    GraduationCap,
    ArrowRight,
    Circle,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const WALLET_OPTIONS = [
    {
        id: "MTN_MoMo",
        name: "MTN MoMo",
        description: "Fast and secure mobile money",
        icon: "💳",
        color: "bg-yellow-100 dark:bg-yellow-900/30",
        iconColor: "text-yellow-600",
        type: "momo"
    },
    {
        id: "Vodafone_Cash",
        name: "Vodafone Cash",
        description: "Connect your Telecel wallet",
        icon: "📱",
        color: "bg-red-100 dark:bg-red-900/30",
        iconColor: "text-red-600",
        type: "momo"
    },
    {
        id: "Local_Bank",
        name: "Local Bank",
        description: "GCB, Ecobank, Stanbic & others",
        icon: "🏦",
        color: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600",
        type: "bank"
    },
];

const INCOME_SOURCES = [
    { id: "Salary", label: "Salary", icon: Wallet },
    { id: "Business", label: "Business", icon: Briefcase },
    { id: "Gift", label: "Gift", icon: Gift },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
    const [incomeDetails, setIncomeDetails] = useState({
        amount: "0.00",
        source: "Salary",
        isRecurring: true,
        note: ""
    });

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(Math.max(1, step - 1));

    const toggleWallet = (id: string) => {
        setSelectedWallets(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    const handleComplete = async () => {
        // 1. Create Wallets
        const walletsToCreate = selectedWallets.map(id => {
            const option = WALLET_OPTIONS.find(o => o.id === id);
            return {
                name: option?.name,
                type: option?.type,
                icon: option?.icon,
                initial_balance: 0,
                current_balance: 0,
                color: "#2563EB",
                is_active: true,
                source_identifier: id
            };
        });

        if (walletsToCreate.length > 0) {
            await supabase.from('wallets').insert(walletsToCreate);
        }

        // 2. Add Initial Income Transaction if amount > 0
        const amountNum = parseFloat(incomeDetails.amount);
        if (amountNum > 0) {
            // Find first wallet to add it to, or create a 'Cash' wallet if none selected
            let targetWalletId;
            const { data: createdWallets } = await supabase.from('wallets').select('id').limit(1);

            if (createdWallets && createdWallets.length > 0) {
                targetWalletId = createdWallets[0].id;
            }

            if (targetWalletId) {
                await supabase.from('transactions').insert({
                    wallet_id: targetWalletId,
                    amount: amountNum,
                    type: 'credit',
                    category: 'Income',
                    description: `Initial ${incomeDetails.source}${incomeDetails.note ? ': ' + incomeDetails.note : ''}`,
                    transaction_date: new Date().toISOString()
                });

                // Update wallet balance
                await supabase.rpc('increment_wallet_balance', {
                    wallet_id: targetWalletId,
                    amount: amountNum
                });
            }
        }

        onComplete();
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Step 1: Splash/Welcome */}
            {step === 1 && (
                <div
                    className="h-screen bg-[#0F4CFF] flex flex-col justify-end p-10 text-white relative overflow-hidden cursor-pointer"
                    onClick={nextStep}
                >
                    {/* Decorative Shapes */}
                    <div className="absolute -top-12 -right-12 w-[280px] h-[350px] bg-white/10 rounded-[5rem] rotate-12" />
                    <div className="absolute -top-6 -right-6 w-[220px] h-[280px] bg-white/20 rounded-[4rem] rotate-12" />
                    <div className="absolute top-0 right-0 w-[160px] h-[220px] bg-white/25 rounded-[3.5rem] rotate-12" />

                    <div className="space-y-0 text-left mb-16 animate-in slide-in-from-bottom-8 duration-700">
                        <h1 className="text-6xl font-bold tracking-tight leading-tight">smart.</h1>
                        <h1 className="text-6xl font-bold tracking-tight leading-tight">simple.</h1>
                        <h1 className="text-6xl font-bold tracking-tight leading-tight">money.</h1>
                    </div>

                    <div className="flex gap-3 mb-8">
                        <div className="h-1 flex-1 bg-white rounded-full" />
                        <div className="h-1 flex-1 bg-white/30 rounded-full" />
                        <div className="h-1 flex-1 bg-white/30 rounded-full" />
                    </div>
                </div>
            )}

            {/* Step 2: Add Wallet */}
            {step === 2 && (
                <div className="min-h-screen bg-[#F8FAFC] flex flex-col p-6 safe-area-inset">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-bold">Add Wallet</h2>
                        <div className="w-10" />
                    </div>

                    <div className="flex-1 space-y-8 pb-10">
                        {/* Illustration */}
                        <div className="relative w-full aspect-[4/3] bg-white rounded-[2.5rem] p-6 shadow-sm overflow-hidden flex flex-col items-center justify-center">
                            <div className="relative w-full h-full">
                                <Image
                                    src="/secure_connection.png"
                                    alt="Secure Connection"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <p className="text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase mt-2">Secure Connection</p>
                        </div>

                        <div className="text-center space-y-3">
                            <h1 className="text-3xl font-black tracking-tight">Link Your Wallets</h1>
                            <p className="text-sm text-slate-500 font-medium px-4">
                                Connect your accounts to automatically track and categorize your spending.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {WALLET_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => toggleWallet(option.id)}
                                    className={cn(
                                        "w-full p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 text-left relative",
                                        selectedWallets.includes(option.id)
                                            ? "border-blue-500 bg-white shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20"
                                            : "border-slate-100 bg-white hover:border-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                        selectedWallets.includes(option.id) ? "border-blue-500 bg-blue-500" : "border-slate-200"
                                    )}>
                                        {selectedWallets.includes(option.id) && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                        )}
                                    </div>

                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-colors", option.color)}>
                                        {option.icon}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 leading-tight">{option.name}</p>
                                        <p className="text-xs text-slate-500 font-medium truncate">{option.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-6">
                        <Button
                            className="w-full h-16 rounded-[2rem] bg-[#2563EB] hover:bg-[#1d4ed8] text-lg font-black shadow-xl shadow-blue-500/25 transition-all group"
                            onClick={nextStep}
                        >
                            Continue
                            <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <button
                            className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            onClick={nextStep}
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Track Your Income */}
            {step === 3 && (
                <div className="min-h-screen bg-white flex flex-col p-6 safe-area-inset">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-bold">Track Your Income</h2>
                        <div className="w-10" />
                    </div>

                    <div className="flex-1 flex flex-col items-center">
                        <p className="text-center text-sm text-slate-500 font-medium max-w-[280px] mb-12">
                            Enter your current balance or expected monthly income to start tracking.
                        </p>

                        <div className="flex flex-col items-center space-y-2 mb-16 group">
                            <div className="flex items-baseline gap-4">
                                <span className="text-xl font-black text-[#10B981]">GHS</span>
                                <input
                                    type="text"
                                    value={incomeDetails.amount}
                                    onChange={(e) => setIncomeDetails({ ...incomeDetails, amount: e.target.value })}
                                    className="text-6xl font-black tracking-tighter text-[#10B981]/40 focus:text-[#10B981] outline-none text-center bg-transparent w-[240px] transition-colors"
                                />
                            </div>
                            <div className="h-0.5 w-48 bg-emerald-500/10 group-focus-within:bg-emerald-500 transition-colors rounded-full" />
                        </div>

                        <div className="w-full space-y-8">
                            <div className="space-y-4">
                                <Label className="text-sm font-black text-slate-900 ml-1">Source</Label>
                                <div className="flex gap-3">
                                    {INCOME_SOURCES.map((source) => (
                                        <button
                                            key={source.id}
                                            onClick={() => setIncomeDetails({ ...incomeDetails, source: source.id })}
                                            className={cn(
                                                "flex-1 h-14 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all",
                                                incomeDetails.source === source.id
                                                    ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                    : "border-slate-100 bg-slate-50 text-slate-500"
                                            )}
                                        >
                                            <source.icon className="w-5 h-5" />
                                            {source.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Card className="p-6 rounded-3xl border-slate-100 bg-white/50 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-black text-slate-900">Recurring Income</p>
                                            <p className="text-[10px] font-medium text-slate-500">Automatically add this every month</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={incomeDetails.isRecurring}
                                        onCheckedChange={(val) => setIncomeDetails({ ...incomeDetails, isRecurring: val })}
                                    />
                                </div>
                            </Card>

                            <div className="space-y-3">
                                <Label className="text-sm font-black text-slate-900 ml-1">Note (Optional)</Label>
                                <Input
                                    placeholder="e.g. Monthly side project"
                                    value={incomeDetails.note}
                                    onChange={(e) => setIncomeDetails({ ...incomeDetails, note: e.target.value })}
                                    className="h-14 rounded-2xl border-2 border-slate-100 focus:border-blue-500 px-5 font-medium placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button
                            className="w-full h-16 rounded-[2rem] bg-[#2563EB] hover:bg-[#1d4ed8] text-lg font-black transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                            onClick={handleComplete}
                        >
                            Set Initial Balance
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
            <path d="M16 18h.01" />
        </svg>
    )
}
