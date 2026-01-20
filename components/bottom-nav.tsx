"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Wallets", icon: Wallet, href: "/wallets" },
    { label: "Insights", icon: BarChart3, href: "/insights" },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                            <span className="text-[10px] font-medium mt-1">{item.label}</span>
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
