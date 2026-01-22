import { BottomNav } from "./bottom-nav";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-md mx-auto px-4 pt-6">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
