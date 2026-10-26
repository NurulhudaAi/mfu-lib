export default function BooksLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Top Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-11 flex-1 bg-neutral-100 dark:bg-neutral-850 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 animate-pulse" />
        <div className="h-11 w-32 bg-neutral-100 dark:bg-neutral-850 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 animate-pulse" />
      </div>

      {/* Categories Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[80, 110, 95, 120, 90, 100].map((w, idx) => (
          <div
            key={idx}
            style={{ width: `${w}px` }}
            className="h-8 rounded-full bg-neutral-100 dark:bg-neutral-850 border border-neutral-200/50 dark:border-neutral-800/80 animate-pulse shrink-0"
          />
        ))}
      </div>

      {/* Books Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 pt-2">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="group relative flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-xs p-3 space-y-3"
          >
            {/* Book Cover Skeleton */}
            <div className="w-full aspect-[2/3] rounded-xl bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-300/40 dark:from-neutral-700/40 to-transparent" />
            </div>

            {/* Title & Author Skeleton */}
            <div className="space-y-1.5 pt-1">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-5/6 animate-pulse" />
              <div className="h-3 bg-neutral-100 dark:bg-neutral-850 rounded-md w-3/5 animate-pulse" />
            </div>

            {/* Bottom Meta Pill Skeleton */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
              <div className="h-5 w-16 bg-neutral-100 dark:bg-neutral-850 rounded-full animate-pulse" />
              <div className="h-5 w-10 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
