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

    // Force render onboarding for UI design focus
    return <Onboarding onComplete={() => refetch()} />;
}