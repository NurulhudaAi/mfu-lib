// components/ISBNScanner.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

interface Props {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-green-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">สแกน Barcode ISBN</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera / Error */}
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-sm"
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
                  <div className="w-64 h-20 border-2 border-green-400 rounded-lg opacity-70">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-400 rounded-br" />
                  </div>
                </div>
              )}
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-sm animate-pulse">กำลังเปิดกล้อง...</p>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 py-3 px-4">
              ส่องกล้องไปที่ barcode หลังปกหนังสือ
            </p>
          </>
        )}
      </div>
    </div>
  )
}