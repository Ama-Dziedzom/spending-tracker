export default function TransactionsLoading() {
    return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 md:px-6 py-6 space-y-4">
                {/* Search Bar Skeleton */}
                <div className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />

                {/* Filter Buttons Skeleton */}
                <div className="flex items-center gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    ))}
                </div>

                {/* Transaction List Skeleton */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
                    <div className="space-y-3">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
