export default function AnalyticsLoading() {
    return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 md:px-6 py-6 space-y-6">
                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Average Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
                    <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
                </div>

                {/* Source Breakdown Skeleton */}
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />

                {/* Top Categories Skeleton */}
                <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            </main>
        </div>
    );
}
