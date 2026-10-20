'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { createClient } from '@/lib/supabase'

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const { locale, profile, profileLoading } = useApp()
  const isThai = locale === 'th'

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setError(isThai ? 'ไม่พบรหัสยืนยันคำเชิญ' : 'Invitation token is missing')
      setLoading(false)
      return
    }

    async function verifyToken() {
      try {
        setLoading(true)
        const res = await fetch(`/api/invite?token=${encodeURIComponent(token!)}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || (isThai ? 'ลิงก์ไม่ถูกต้องหรือหมดอายุ' : 'Invalid or expired link'))
        } else {
          setData(json)
        }
      } catch (err: any) {
        setError(isThai ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' : 'Failed to connect to server')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token, isThai])

  // ถ้ากลับมาจากการล็อกอินด้วย auto_confirm=1 และเป็น user ที่ถูกต้อง → ดำเนินการยืนยันทันที
  useEffect(() => {
    const autoConfirm = searchParams.get('auto_confirm') === '1'
    if (autoConfirm && data?.isRightUser && !actionLoading && !actionSuccess && !error) {
      handleConfirm()
    }
  }, [data?.isRightUser, searchParams])

  async function handleLogin() {
    const returnUrl = `/invite?token=${encodeURIComponent(token || '')}&auto_confirm=1`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(returnUrl)}`,
      },
    })
  }

  async function handleConfirm() {
    if (!token) return
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || (isThai ? 'ทำรายการไม่สำเร็จ' : 'Action failed'))
      } else {
        if (json.status === 'completed') {
          setActionSuccess(
            data?.kind === 'accept'
              ? (isThai ? 'ยินดีด้วย! คุณได้รับสิทธิ์ผู้ดูแลระบบ (Admin) เรียบร้อยแล้ว' : 'Congratulations! You are now an Admin.')
              : (isThai ? 'ยืนยันการสละสิทธิ์เรียบร้อยแล้ว' : 'Resignation confirmed successfully.')
          )
          setTimeout(() => {
            router.push(data?.kind === 'accept' ? '/admin/dashboard' : '/')
            router.refresh()
          }, 2000)
        } else if (json.status === 'waiting_resign') {
          setActionSuccess(
            isThai
              ? `คุณยอมรับคำเชิญแล้ว! ระบบได้ส่งอีเมลยืนยันการสละสิทธิ์ไปที่ ${json.replaceAdminEmail || 'ผู้ดูแลคนเดิม'} เรียบร้อยแล้ว เมื่อผู้ดูแลคนเดิมกดยืนยัน บัญชีของคุณจะปรับเป็น Admin ทันที`
              : `You accepted the invitation! A resignation confirmation email has been sent to ${json.replaceAdminEmail || 'the current admin'}. Your role will be upgraded to Admin once confirmed.`
          )
        } else if (json.status === 'waiting_accept') {
          setActionSuccess(
            isThai
              ? 'คุณยืนยันการสละสิทธิ์แล้ว! สิทธิ์จะเปลี่ยนเมื่อผู้ดูแลคนใหม่กดยอมรับ'
              : 'You confirmed resignation! Role will change when new admin accepts.'
          )
        }
      }
    } catch (err) {
      setError(isThai ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' : 'Server connection failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-3" />
        <p className="text-sm text-neutral-500">{isThai ? 'กำลังตรวจสอบคำเชิญ...' : 'Verifying invitation...'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-scale-in">
        
        {/* Error State */}
        {error && !actionSuccess && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isThai ? 'ไม่สามารถดำเนินการได้' : 'Cannot proceed'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{error}</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold text-xs transition-transform active:scale-95"
            >
              {isThai ? 'กลับสู่หน้าหลัก' : 'Return Home'}
            </Link>
          </div>
        )}

        {/* Success State */}
        {actionSuccess && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isThai ? 'ดำเนินการเรียบร้อย' : 'Action Completed'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{actionSuccess}</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold text-xs transition-transform active:scale-95"
            >
              {isThai ? 'ไปยังหน้าหลัก' : 'Go to Home'}
            </Link>
          </div>
        )}

        {/* Valid State & Needs Action */}
        {!error && !actionSuccess && data && (
          <div className="space-y-6 text-left">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-900 dark:text-white">
                {data.kind === 'accept' ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {data.kind === 'accept'
                  ? (isThai ? 'คำเชิญเป็นผู้ดูแลระบบ (Admin)' : 'Admin Invitation')
                  : (isThai ? 'ยืนยันการส่งมอบสิทธิ์ผู้ดูแล' : 'Confirm Admin Resignation')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {data.kind === 'accept'
                  ? (isThai ? 'คุณได้รับคำเชิญให้เข้าร่วมเป็นผู้ดูแลระบบ' : 'You have been invited to become an administrator.')
                  : (isThai ? 'ขอให้ยืนยันการสละสิทธิ์เพื่อส่งต่อตำแหน่งให้คนใหม่' : 'Please confirm relinquishing admin role to your successor.')}
              </p>
            </div>

            {/* Info details */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">{isThai ? 'ผู้เชิญ:' : 'Inviter:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.inviter?.full_name || data.inviter?.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">{isThai ? 'อีเมลเป้าหมาย:' : 'Target Email:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.email}</span>
              </div>
              {data.replacing && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">{isThai ? 'แทนที่ตำแหน่งของ:' : 'Replacing:'}</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.replacing?.full_name || data.replacing?.email}</span>
                </div>
              )}
            </div>

            {/* Check Login State */}
            {!profile ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-neutral-500 text-center">
                  {isThai ? `กรุณาเข้าสู่ระบบด้วย Google (${data.email}) เพื่อดำเนินการ` : `Please sign in with Google (${data.email}) to proceed`}
                </p>
                <button
                  onClick={handleLogin}
                  className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <span>{isThai ? 'เข้าสู่ระบบเพื่อยืนยัน' : 'Sign in to confirm'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : !data.isRightUser ? (
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {isThai
                    ? `คุณเข้าสู่ระบบด้วย ${profile.email} แต่คำเชิญนี้สำหรับ ${data.email}`
                    : `Signed in as ${profile.email}, but this invite is for ${data.email}`}
                </p>
                <button
                  onClick={handleLogin}
                  className="text-xs font-bold text-neutral-900 dark:text-white underline"
                >
                  {isThai ? 'สลับบัญชี Google' : 'Switch Google Account'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>
                        {data.kind === 'accept'
                          ? (isThai ? 'ยอมรับคำเชิญเป็นผู้ดูแล' : 'Accept Admin Role')
                          : (isThai ? 'ยืนยันการสละสิทธิ์ผู้ดูแล' : 'Confirm Resignation')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
