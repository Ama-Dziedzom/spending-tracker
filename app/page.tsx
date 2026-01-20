"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Onboarding } from "@/components/onboarding";
import { DashboardContent } from "@/components/dashboard-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
    const { data: wallets, isLoading, refetch } = useQuery({
        queryKey: ["wallets-exist"],
        queryFn: async () => {
            const { data, error } = await supabase.from("wallets").select("id").limit(1);
            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-4">
                    <Skeleton className="h-12 w-3/4 mx-auto" />
                    <Skeleton className="h-64 w-full rounded-3xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    const hasWallets = wallets && wallets.length > 0;

    if (!hasWallets) {
        return <Onboarding onComplete={() => refetch()} />;
    }

    return <DashboardContent />;
}