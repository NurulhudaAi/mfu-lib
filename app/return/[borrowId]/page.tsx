'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ReturnPage() {
  const params = useParams()
  const router = useRouter()
  const borrowId = params?.borrowId as string

  useEffect(() => {
    if (borrowId) {
      router.replace(`/my-borrows?return=${borrowId}`)
    } else {
      router.replace('/my-borrows')
    }
  }, [borrowId, router])

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}