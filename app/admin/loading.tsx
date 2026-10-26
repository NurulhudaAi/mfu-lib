export default function AdminLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-60 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="h-4 w-80 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>

      {/* Admin Stat Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-850 animate-pulse" />
            </div>
            <div className="h-7 w-16 bg-neutral-300 dark:bg-neutral-700 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Admin Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
          <div className="h-9 w-48 bg-neutral-100 dark:bg-neutral-850 rounded-xl animate-pulse" />
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-14 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                  <div className="h-3 w-32 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 bg-neutral-100 dark:bg-neutral-850 rounded-full animate-pulse" />
                <div className="h-7 w-20 bg-neutral-100 dark:bg-neutral-850 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
