export default function BookDetailLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 sm:p-8 lg:p-10 space-y-8 animate-fade-in">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        <span className="text-neutral-400">›</span>
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        <span className="text-neutral-400">›</span>
        <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left: Cover Skeleton */}
        <div className="flex-shrink-0 flex flex-col items-center gap-4 lg:w-[280px]">
          <div className="w-full max-w-[240px] aspect-[2/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-lg relative overflow-hidden animate-pulse">
            <div className="absolute top-0 right-4 w-6 h-10 bg-amber-500/30 rounded-b-md" />
          </div>
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        </div>

        {/* Right: Book Details Skeleton */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <div className="h-6 w-24 bg-amber-500/20 rounded-full animate-pulse" />
            <div className="h-8 sm:h-10 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-5 w-2/5 bg-neutral-100 dark:bg-neutral-850 rounded-lg animate-pulse" />
          </div>

          {/* Stats Bar Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-neutral-300 dark:bg-neutral-700 rounded-md animate-pulse" />
              </div>
            ))}
          </div>

          {/* Description Skeleton */}
          <div className="space-y-2.5 pt-2">
            <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
            <div className="h-3.5 w-full bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
            <div className="h-3.5 w-full bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
            <div className="h-3.5 w-3/4 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="h-12 flex-1 bg-neutral-900/10 dark:bg-white/10 rounded-2xl animate-pulse" />
            <div className="h-12 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
