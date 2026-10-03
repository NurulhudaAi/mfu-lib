'use client'
import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, Users, ShieldAlert, ShieldCheck, ShieldX,
  MailPlus, X, AlertCircle, Check
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface Props { users: any[] }

export default function AdminUsersContent({ users = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user' | 'blacklisted'>('all')

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Blacklist modal
  const [blacklistModalUser, setBlacklistModalUser] = useState<any | null>(null)
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistLoading, setBlacklistLoading] = useState(false)
  const [blacklistError, setBlacklistError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    const isAnyModalOpen = inviteModalOpen || !!blacklistModalUser
    if (!isAnyModalOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInviteModalOpen(false)
        setBlacklistModalUser(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [inviteModalOpen, blacklistModalUser])

  const filtered = users.filter(u => {
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_id?.toLowerCase().includes(search.toLowerCase())

    let matchRole = true
    if (filterRole === 'admin') matchRole = u.role === 'admin'
    else if (filterRole === 'user') matchRole = u.role === 'user' && !u.is_blacklisted
    else if (filterRole === 'blacklisted') matchRole = !!u.is_blacklisted

    return matchSearch && matchRole
  })

  // Handle Invite Admin
  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setInviteMessage({ type: 'error', text: data.error || 'แต่งตั้งแอดมินไม่สำเร็จ' })
      } else {
        setInviteMessage({ type: 'success', text: `แต่งตั้ง ${inviteEmail} เป็นแอดมินเรียบร้อยแล้ว` })
        setInviteEmail('')
        startTransition(() => {
          router.refresh()
        })
        setTimeout(() => {
          setInviteModalOpen(false)
          setInviteMessage(null)
        }, 1500)
      }
    } catch (_) {
      setInviteMessage({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' })
    } finally {
      setInviteLoading(false)
    }
  }

  // Handle Blacklist User (With reason required)
  async function handleConfirmBlacklist() {
    if (!blacklistModalUser) return
    const reason = blacklistReason.trim()
    if (!reason) {
      setBlacklistError('กรุณากรอกเหตุผลในการขึ้นบัญชีดำ')
      return
    }

    setBlacklistLoading(true)
    setBlacklistError(null)

    try {
      const res = await fetch(`/api/admin/users/${blacklistModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_blacklisted: true,
          reason,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setBlacklistError(data.error || 'ระงับสิทธิ์ไม่สำเร็จ')
      } else {
        setBlacklistModalUser(null)
        setBlacklistReason('')
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (_) {
      setBlacklistError('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว')
    } finally {
      setBlacklistLoading(false)
    }
  }

  // Handle Un-blacklist User
  async function handleUnblacklist(user: any) {
    if (!confirm(`ต้องการปลดการระงับสิทธิ์ของ ${user.full_name || user.email} หรือไม่?`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blacklisted: false }),
      })
      if (res.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        const data = await res.json()
        alert(data.error || 'ปลดสิทธิ์ไม่สำเร็จ')
      }
    } catch (_) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว')
    }
  }

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">จัดการผู้ใช้</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{users.length} คนทั้งหมดในระบบ</p>
        </div>

        <button
          onClick={() => {
            setInviteEmail('')
            setInviteMessage(null)
            setInviteModalOpen(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-semibold transition-all shadow-sm"
        >
          <MailPlus size={16} />
          เชิญผู้ดูแลด้วยอีเมล
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, อีเมล, รหัสนักศึกษา..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {(['all', 'admin', 'user', 'blacklisted'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterRole(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === f
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' && 'ทั้งหมด'}
              {f === 'admin' && 'แอดมิน'}
              {f === 'user' && 'สมาชิก'}
              {f === 'blacklisted' && 'Blacklisted'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider">ผู้ใช้</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider hidden md:table-cell">รหัสนักศึกษา</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider hidden lg:table-cell">วันที่สมัคร</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">บทบาท</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">สถานะ</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-neutral-400">
                    <Users size={36} className="mx-auto mb-2 opacity-20" />
                    ไม่พบผู้ใช้
                  </td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.id} className={`transition-colors ${
                  user.is_blacklisted ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                }`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={14} className="text-neutral-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate max-w-[200px]">
                          {user.full_name || 'ไม่ระบุชื่อ'}
                        </p>
                        <p className="text-xs text-neutral-400 truncate max-w-[200px]">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-neutral-600 dark:text-neutral-400 text-xs hidden md:table-cell font-mono">
                    {user.student_id || '—'}
                  </td>

                  <td className="px-5 py-4 text-neutral-500 dark:text-neutral-400 text-xs hidden lg:table-cell">
                    {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: th }) : '—'}
                  </td>

                  {/* Role (Fixed pill badge, no switch) */}
                  <td className="px-5 py-4 text-center">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                        <ShieldCheck size={13} />
                        ผู้ดูแล (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        สมาชิก
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    {user.is_blacklisted ? (
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white">
                          <ShieldAlert size={12} />
                          Blacklisted
                        </span>
                        {user.blacklist_reason && (
                          <span className="text-[10px] text-rose-500 dark:text-rose-400 max-w-[140px] truncate mt-0.5" title={user.blacklist_reason}>
                            เหตุผล: {user.blacklist_reason}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        ปกติ
                      </span>
                    )}
                  </td>

                  {/* Blacklist Actions */}
                  <td className="px-5 py-4 text-right">
                    {user.role === 'admin' ? (
                      <span className="text-xs text-neutral-400 italic">ผู้ดูแล</span>
                    ) : user.is_blacklisted ? (
                      <button
                        onClick={() => handleUnblacklist(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <ShieldCheck size={13} className="text-emerald-500" />
                        ปลด Blacklist
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBlacklistModalUser(user)
                          setBlacklistReason('')
                          setBlacklistError(null)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        <ShieldX size={13} />
                        Blacklist
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {mounted && inviteModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteModalOpen(false)
          }}
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-[calc(100vw-24px)] sm:w-[min(480px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shrink-0">
                <MailPlus size={20} />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate">เชิญผู้ดูแลด้วยอีเมล</h3>
                <p className="text-xs text-neutral-400 truncate">แต่งตั้งสิทธิ์ Admin ผ่านอีเมล</p>
              </div>
            </div>

            <form onSubmit={handleInviteAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  อีเมลสมาชิก *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.member@lamduan.mfu.ac.th"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white"
                />
              </div>

              {inviteMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  inviteMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}>
                  {inviteMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  {inviteMessage.text}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black transition-all disabled:opacity-50"
                >
                  {inviteLoading ? 'กำลังดำเนินการ...' : 'ยืนยันแต่งตั้งแอดมิน'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Blacklist Modal with Mandatory Reason */}
      {mounted && blacklistModalUser && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBlacklistModalUser(null)
          }}
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-[calc(100vw-24px)] sm:w-[min(480px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setBlacklistModalUser(null)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate">ระงับสิทธิ์สมาชิก (Blacklist)</h3>
                <p className="text-xs text-neutral-400 truncate">สมาชิกที่ถูกขึ้นบัญชีดำจะไม่สามารถยืมหนังสือได้</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                {blacklistModalUser.avatar_url ? (
                  <img src={blacklistModalUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={14} className="text-neutral-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {blacklistModalUser.full_name || 'ไม่ระบุชื่อ'}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">{blacklistModalUser.email}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                เหตุผลการขึ้นบัญชีดำ <span className="text-rose-500 font-bold">(จำเป็นต้องระบุ *)</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="เช่น คืนหนังสือชำรุดเสียหายร้ายแรง, ไม่คืนหนังสือเกินกำหนด, หรือผิดกฎระเบียบห้องสมุด..."
                value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs outline-none focus:border-rose-500 text-neutral-900 dark:text-white resize-none"
              />
            </div>

            {blacklistError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle size={14} />
                {blacklistError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setBlacklistModalUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmBlacklist}
                disabled={blacklistLoading || !blacklistReason.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50"
              >
                {blacklistLoading ? 'กำลังบันทึก...' : 'ยืนยันขึ้นบัญชีดำ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}