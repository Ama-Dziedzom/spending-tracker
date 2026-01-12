export default function DashboardLoading() {
    return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 md:px-6 py-6 space-y-6">
                {/* Date Range Filter Skeleton */}
                <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))}
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-40 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
                    <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </div>

                {/* Transactions Skeleton */}
                <div className="p-6 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse">
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-300 dark:bg-gray-600 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
