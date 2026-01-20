"use client";

import { LayoutWrapper } from "@/components/layout-wrapper";
import { Card } from "@/components/ui/card";
import {
    User,
    Wallet,
    Tag,
    Globe,
    Moon,
    Sun,
    Database,
    Info,
    ChevronRight,
    LogOut,
    Bell,
    Lock,
    Zap
} from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <LayoutWrapper>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="space-y-8">
                {/* Profile Section */}
                <Card className="p-6 rounded-[2rem] border-none bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-background">
                            <User className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-lg font-bold">Ama Dziedzom</p>
                            <p className="text-xs text-muted-foreground font-medium italic">Premium Member</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full bg-background/50 h-10 w-10">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </Card>

                {/* Section: Account */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-3">Account</h2>
                    <Card className="rounded-[1.5rem] border-none overflow-hidden py-1">
                        {[
                            { icon: Wallet, label: "Manage Wallets", detail: "3 Active" },
                            { icon: Zap, label: "Transfer Detection", detail: "Enabled" },
                            { icon: Tag, label: "Manage Categories", detail: "12 Total" },
                        ].map((item, i, arr) => (
                            <div key={item.label}>
                                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-muted group-hover:bg-background transition-colors">
                                            <item.icon className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <span className="font-semibold">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-medium">{item.detail}</span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                                    </div>
                                </button>
                                {i < arr.length - 1 && <Separator className="mx-4 w-auto bg-muted/50" />}
                            </div>
                        ))}
                    </Card>
                </div>

                {/* Section: Preferences */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-3">Preferences</h2>
                    <Card className="rounded-[1.5rem] border-none overflow-hidden py-1">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-muted">
                                    <Moon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="font-semibold">Dark Mode</span>
                            </div>
                            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                        </div>
                        <Separator className="mx-4 w-auto bg-muted/50" />
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-muted">
                                    <Globe className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="font-semibold">Currency</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">GHS (₵)</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                        </button>
                    </Card>
                </div>

                {/* Section: Data & Privacy */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-3">Data & Privacy</h2>
                    <Card className="rounded-[1.5rem] border-none overflow-hidden py-1">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-muted">
                                    <Database className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="font-semibold">Export Data</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        </button>
                        <Separator className="mx-4 w-auto bg-muted/50" />
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-red-600">Clear All Data</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-red-200" />
                        </button>
                    </Card>
                </div>

                {/* Footer info */}
                <div className="text-center pb-8 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">FinTracker Version 1.0.0</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Made with ❤️ for Ghana</p>
                </div>
            </div>
        </LayoutWrapper>
    );
}
