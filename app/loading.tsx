export default function GlobalLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-6 animate-fade-in">
      {/* Glowing Brand Pulse Icon */}
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-primary-500/10 to-amber-600/20 animate-pulse border border-amber-500/30 flex items-center justify-center shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-amber-500/80 animate-ping opacity-25 absolute" />
          <svg
            className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>

      {/* Loading text with shimmer */}
      <div className="text-center space-y-2">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 tracking-wide">
          กำลังโหลดข้อมูล...
        </h3>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          MFU Muslim Library • กำลังเตรียมหน้าสำหรับคุณ
        </p>
      </div>

      {/* Skeleton placeholders */}
      <div className="w-full max-w-2xl space-y-3 pt-4">
        <div className="h-3 bg-neutral-200/70 dark:bg-neutral-800/70 rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-3 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full w-1/2 mx-auto animate-pulse" />
      </div>
    </div>
  )
}
