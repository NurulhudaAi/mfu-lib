// components/ISBNScanner.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera } from 'lucide-react'

interface Props {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let stopped = false

    async function initQuagga() {
      try {
        const Quagga = (await import('@ericblade/quagga2')).default

        if (!videoRef.current || stopped) return

        await new Promise<void>((resolve, reject) => {
          Quagga.init({
            inputStream: {
              type: 'LiveStream',
              target: videoRef.current!,
              constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: 'environment',
              },
            },
            decoder: {
              readers: ['ean_reader', 'ean_8_reader', 'code_128_reader'],
            },
            locate: true,
          }, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })

        if (stopped) { Quagga.stop(); return }

        Quagga.start()
        setReady(true)

        Quagga.onDetected((result) => {
          const code = result.codeResult.code
          if (code && code.length >= 10) {
            Quagga.stop()
            onDetected(code)
          }
        })

      } catch (err) {
        console.error(err)
        setError('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์กล้องก่อน')
      }
    }

    initQuagga()

    return () => {
      stopped = true
      import('@ericblade/quagga2').then(m => {
        try { m.default.stop() } catch {}
      })
    }
  }, [])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black/80 flex items-center justify-center z-[10000] p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl animate-scale-in">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Camera size={18} className="text-neutral-900 dark:text-white" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm">สแกน Barcode ISBN</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera / Error */}
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-sm font-medium"
            >
              ปิด
            </button>
          </div>
        ) : (
          <>
            <div
              ref={videoRef}
              className="w-full relative bg-black"
              style={{ height: 300 }}
            >
              {/* Scan guide overlay */}
              {ready && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-24 border-2 border-white/80 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br" />
                    {/* Laser line */}
                    <div className="w-full h-[1.5px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] opacity-90 animate-pulse" />
                  </div>
                </div>
              )}
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-xs font-medium tracking-wide animate-pulse">กำลังเปิดกล้อง...</p>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-neutral-400 py-3.5 px-4">
              ส่องกล้องไปที่ barcode หลังปกหนังสือ
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}