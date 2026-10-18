'use client'
import { useEffect, useState, ReactNode, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Modal มาตรฐานของทั้งระบบ
 *
 * กฎ UX (ไม่ซ้ำซ้อน):
 *  - มี `footer` (ปุ่มยืนยัน/ยกเลิก) → ไม่แสดงปุ่ม X  (ปิดได้ด้วยปุ่มยกเลิก, Esc, คลิกพื้นหลัง)
 *  - ไม่มี `footer` (แสดงข้อมูลอย่างเดียว) → แสดงปุ่ม X มุมขวาบนเท่านั้น
 *
 * Responsive: มือถือ = bottom sheet เต็มความกว้าง, ≥sm = กล่องกลางจอ
 */
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** ปิดการคลิกพื้นหลัง/Esc ขณะกำลังบันทึก */
  dismissible?: boolean
}

const SIZE = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  footer,
  children,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, dismissible])

  if (!mounted || !open) return null

  const showX = !footer

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/70 animate-fade-in sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`w-full ${SIZE[size]} max-h-[92dvh] sm:max-h-[calc(100dvh-32px)] flex flex-col bg-white dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up sm:animate-scale-in`}
      >
        {/* Grab handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <span className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        {(title || icon || showX) && (
          <div className="flex items-start gap-3 px-5 sm:px-6 pt-3 sm:pt-6 pb-4 shrink-0">
            {icon && (
              <div className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{description}</p>
              )}
            </div>
            {showX && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 -mt-1 p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {children && (
          <div className="px-5 sm:px-6 pb-5 overflow-y-auto min-h-0 flex-1">{children}</div>
        )}

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/** ปุ่มมาตรฐานสำหรับ footer ของ Modal */
export function ModalButton({
  variant = 'secondary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-bold',
    secondary: 'border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-bold',
  }
  return (
    <button
      type="button"
      {...props}
      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${styles[variant]} ${className}`}
    />
  )
}
