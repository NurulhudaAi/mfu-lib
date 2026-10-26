'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Users, ShieldCheck, ShieldAlert, ShieldX,
  MailPlus, AlertCircle, Check, Loader2, Clock, Trash2,
  Copy, ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { useApp } from '@/lib/app-context'
import Modal, { ModalButton } from '@/components/ui/Modal'

interface Props {
  users: any[]
}

interface PendingInvite {
  id: string
  email: string
  replace_admin_id: string | null
  accepted_at: string | null
  resign_confirmed_at: string | null
  expires_at: string
  created_at: string
  invite_link?: string
  resign_link?: string
}

export default function AdminUsersContent({ users = [] }: Props) {
  const router = useRouter()
  const { locale, t } = useApp()
  const dateLocale = locale === 'th' ? th : enUS
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user' | 'blacklisted'>('all')

  // Current Admins & Pending Invitations
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [replaceAdminId, setReplaceAdminId] = useState<string>('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedSql, setCopiedSql] = useState(false)
  const [createdInviteLinks, setCreatedInviteLinks] = useState<{
    inviteLink: string
    resignLink: string | null
    wasRedirected: boolean
    testEmail: string
  } | null>(null)
  const [copiedInviteLink, setCopiedInviteLink] = useState(false)
  const [copiedResignLink, setCopiedResignLink] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [copiedResignId, setCopiedResignId] = useState<string | null>(null)

  // Blacklist Modal
  const [blacklistModalUser, setBlacklistModalUser] = useState<any | null>(null)
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistLoading, setBlacklistLoading] = useState(false)
  const [blacklistError, setBlacklistError] = useState<string | null>(null)

  // Fetch pending invitations on mount
  useEffect(() => {
    fetchPendingInvites()
  }, [])

  async function fetchPendingInvites() {
    setLoadingInvites(true)
    try {
      const res = await fetch('/api/admin/users/invite')
      if (res.ok) {
        const data = await res.json()
        setPendingInvites(data.pending || [])
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingInvites(false)
    }
  }

  const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin')
  const maxAdmins = Infinity
  const isFull = false

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())

    let matchRole = true
    if (filterRole === 'admin') matchRole = u.role === 'admin' || u.role === 'super_admin'
    else if (filterRole === 'user') matchRole = u.role === 'user' && !u.is_blacklisted
    else if (filterRole === 'blacklisted') matchRole = !!u.is_blacklisted

    return matchSearch && matchRole
  })

  // Open invite modal
  function handleOpenInvite() {
    setInviteEmail('')
    setInviteMessage(null)
    setCreatedInviteLinks(null)
    setCopiedInviteLink(false)
    setCopiedResignLink(false)
    setReplaceAdminId('')
    setInviteModalOpen(true)
  }

  // Handle Send Invite Admin
  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          replaceAdminId: replaceAdminId || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setInviteMessage({ type: 'error', text: data.error || (locale === 'th' ? 'ส่งคำเชิญไม่สำเร็จ' : 'Failed to send invite') })
      } else {
        setInviteMessage({
          type: 'success',
          text: data.message || (locale === 'th' ? 'ส่งคำเชิญเรียบร้อยแล้ว' : 'Invitation sent successfully'),
        })
        if (data.inviteLink) {
          setCreatedInviteLinks({
            inviteLink: data.inviteLink,
            resignLink: data.resignLink || null,
            wasRedirected: !!data.wasRedirectedToTestEmail,
            testEmail: data.testEmail || '',
          })
        }
        setInviteEmail('')
        fetchPendingInvites()
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (_) {
      setInviteMessage({ type: 'error', text: locale === 'th' ? 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' : 'Connection failed' })
    } finally {
      setInviteLoading(false)
    }
  }

  // Cancel invitation
  async function handleCancelInvite(id: string) {
    if (!confirm(locale === 'th' ? 'ต้องการยกเลิกคำเชิญนี้ใช่หรือไม่?' : 'Cancel this invitation?')) return
    try {
      const res = await fetch(`/api/admin/users/invite?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchPendingInvites()
      } else {
        const json = await res.json()
        alert(json.error || 'Failed to cancel')
      }
    } catch {
      alert('Error')
    }
  }

  // Handle Confirm Blacklist
  async function handleConfirmBlacklist() {
    if (!blacklistModalUser) return
    const reason = blacklistReason.trim()
    if (!reason) {
      setBlacklistError(locale === 'th' ? 'กรุณากรอกเหตุผลในการขึ้นบัญชีดำ' : 'Reason is required')
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
        setBlacklistError(data.error || (locale === 'th' ? 'ระงับสิทธิ์ไม่สำเร็จ' : 'Action failed'))
      } else {
        setBlacklistModalUser(null)
        setBlacklistReason('')
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (_) {
      setBlacklistError(locale === 'th' ? 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' : 'Connection failed')
    } finally {
      setBlacklistLoading(false)
    }
  }

  // Handle Un-blacklist User
  async function handleUnblacklist(user: any) {
    const confirmMsg =
      locale === 'th'
        ? `ต้องการปลดการระงับสิทธิ์ของ ${user.full_name || user.email} หรือไม่?`
        : `Are you sure you want to unblacklist ${user.full_name || user.email}?`
    if (!confirm(confirmMsg)) return

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
        alert(data.error || (locale === 'th' ? 'ปลดสิทธิ์ไม่สำเร็จ' : 'Failed to unblacklist'))
      }
    } catch (_) {
      alert(locale === 'th' ? 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' : 'Failed to connect to server')
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('adminUsersHeading')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {users.length} {locale === 'th' ? 'สมาชิกทั้งหมดในระบบ' : 'total members in system'}
          </p>
        </div>

        <button
          onClick={handleOpenInvite}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-[0.98]"
        >
          <MailPlus size={16} />
          <span>{locale === 'th' ? 'เชิญผู้ดูแลระบบ' : 'Invite Admin'}</span>
        </button>
      </div>

      {/* ── User Role KPI Summary Chips (Fluid responsive grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* All Users */}
        <button
          type="button"
          onClick={() => setFilterRole('all')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterRole === 'all'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
            {t('filterRoleAll')}
          </span>
          <p className="text-xl sm:text-2xl font-extrabold mt-0.5 tracking-tight">{users.length}</p>
        </button>

        {/* Admins */}
        <button
          type="button"
          onClick={() => setFilterRole(filterRole === 'admin' ? 'all' : 'admin')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterRole === 'admin'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
              {t('filterRoleAdmin')}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {admins.length} คน
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold mt-0.5 tracking-tight">{admins.length}</p>
        </button>

        {/* Regular Members */}
        <button
          type="button"
          onClick={() => setFilterRole(filterRole === 'user' ? 'all' : 'user')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterRole === 'user'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
            {t('filterRoleUser')}
          </span>
          <p className="text-xl sm:text-2xl font-extrabold mt-0.5 tracking-tight">
            {users.filter(u => u.role === 'user' && !u.is_blacklisted).length}
          </p>
        </button>

        {/* Blacklisted / Suspended */}
        <button
          type="button"
          onClick={() => setFilterRole(filterRole === 'blacklisted' ? 'all' : 'blacklisted')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            filterRole === 'blacklisted'
              ? 'bg-rose-600 text-white border-transparent shadow-xs'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-rose-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
            {t('filterRoleBlacklisted')}
          </span>
          <p className={`text-xl sm:text-2xl font-extrabold mt-0.5 tracking-tight ${
            filterRole === 'blacklisted'
              ? 'text-white'
              : (users.some(u => u.is_blacklisted) ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white')
          }`}>
            {users.filter(u => !!u.is_blacklisted).length}
          </p>
        </button>
      </div>

      {/* Admin Panel (Unlimited Admins) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#121214] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
            <ShieldCheck size={16} />
            <span>
              {locale === 'th'
                ? `รายชื่อผู้ดูแลระบบ (Admin) — ${admins.length} คน (ไม่จำกัดจำนวน)`
                : `Active Admins — ${admins.length} (Unlimited)`}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 font-medium">
            {locale === 'th' ? 'ไม่จำกัดจำนวนผู้ดูแล' : 'No admin limit'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {admins.map((adminUser) => {
            const isTargetSuper = adminUser.role === 'super_admin'
            return (
              <div
                key={adminUser.id}
                className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                    {adminUser.avatar_url ? (
                      <img src={adminUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={14} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {adminUser.full_name || adminUser.email}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">{adminUser.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  isTargetSuper
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}>
                  {isTargetSuper ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Pending Invitation Alert */}
        {pendingInvites.length > 0 && (
          <div className="pt-2">
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-neutral-500" />
                  <span>{locale === 'th' ? 'คำเชิญที่รอดำเนินการ' : 'Pending Invitation'}</span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  {locale === 'th' ? 'หมดอายุใน 48 ชม.' : 'Expires in 48h'}
                </span>
              </div>

              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-2 pb-1 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{inv.email}</span>
                      {inv.replace_admin_id && (
                        <span className="text-[10px] text-neutral-500">
                          ({locale === 'th' ? 'แทนที่แอดมินเดิม' : 'replacing admin'})
                        </span>
                      )}
                    </div>
                    {/* Status badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        inv.accepted_at
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {inv.accepted_at
                          ? (locale === 'th' ? '✓ คนใหม่กดยอมรับแล้ว' : '✓ Accepted by new admin')
                          : (locale === 'th' ? '⏳ รอคนใหม่กดยอมรับ' : '⏳ Waiting for accept')}
                      </span>
                      {inv.replace_admin_id && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          inv.resign_confirmed_at
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {inv.resign_confirmed_at
                            ? (locale === 'th' ? '✓ แอดมินเดิมยืนยันสละสิทธิ์แล้ว' : '✓ Resign confirmed')
                            : (locale === 'th' ? '⏳ รอแอดมินเดิมกดยืนยันสละสิทธิ์' : '⏳ Waiting for resign')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 shrink-0 justify-end sm:self-center">
                    {inv.invite_link && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.invite_link!)
                          setCopiedInviteId(inv.id)
                          setTimeout(() => setCopiedInviteId(null), 2500)
                        }}
                        className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors text-[11px]"
                        title={locale === 'th' ? 'คัดลอกลิงก์คำเชิญ (สำหรับคนใหม่)' : 'Copy invite link'}
                      >
                        {copiedInviteId === inv.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{locale === 'th' ? 'ลิงก์เชิญ' : 'Invite'}</span>
                      </button>
                    )}
                    {inv.resign_link && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.resign_link!)
                          setCopiedResignId(inv.id)
                          setTimeout(() => setCopiedResignId(null), 2500)
                        }}
                        className="px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1 transition-colors text-[11px]"
                        title={locale === 'th' ? 'คัดลอกลิงก์ยืนยันสละสิทธิ์ (สำหรับแอดมินเดิม)' : 'Copy resign link'}
                      >
                        {copiedResignId === inv.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{locale === 'th' ? 'ลิงก์สละสิทธิ์' : 'Resign'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title={locale === 'th' ? 'ยกเลิกคำเชิญ' : 'Cancel invite'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchUsersPlaceholder')}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs sm:text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-none max-w-full">
          {(['all', 'admin', 'user', 'blacklisted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterRole(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterRole === f
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' && t('filterRoleAll')}
              {f === 'admin' && t('filterRoleAdmin')}
              {f === 'user' && t('filterRoleUser')}
              {f === 'blacklisted' && t('filterRoleBlacklisted')}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table (md+) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
                <th className="px-5 py-3 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider">{t('colUser')}</th>
                <th className="px-5 py-3 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider hidden md:table-cell">{t('colRegisteredDate')}</th>
                <th className="px-5 py-3 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">{t('colRole')}</th>
                <th className="px-5 py-3 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">{t('colUserStatus')}</th>
                <th className="px-5 py-3 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-right">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-neutral-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    {t('noUsersFound')}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      user.is_blacklisted ? 'bg-neutral-50/60 dark:bg-neutral-800/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users size={14} className="text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate max-w-[200px] text-xs sm:text-sm">
                            {user.full_name || (locale === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown')}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs hidden md:table-cell">
                      {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: dateLocale }) : '—'}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5 text-center">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                          <ShieldCheck size={11} />
                          {t('roleAdminPill')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {t('roleMemberPill')}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      {user.is_blacklisted ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white">
                            <ShieldAlert size={11} />
                            {t('statusBlacklisted')}
                          </span>
                          {user.blacklist_reason && (
                            <span className="text-[10px] text-neutral-400 max-w-[140px] truncate mt-0.5" title={user.blacklist_reason}>
                              {user.blacklist_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                          {t('statusNormal')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {user.role === 'admin' ? (
                        <span className="text-[11px] text-neutral-400 italic">
                          {locale === 'th' ? 'ผู้ดูแลระบบ' : 'Admin'}
                        </span>
                      ) : user.is_blacklisted ? (
                        <button
                          onClick={() => handleUnblacklist(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <ShieldCheck size={12} />
                          {t('unblacklistBtn')}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setBlacklistModalUser(user)
                            setBlacklistReason('')
                            setBlacklistError(null)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-colors"
                        >
                          <ShieldX size={12} />
                          {t('blacklistBtn')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">{t('noUsersFound')}</p>
          </div>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3 ${
                user.is_blacklisted ? 'border-neutral-400 dark:border-neutral-600' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={14} className="text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate text-xs sm:text-sm">
                      {user.full_name || (locale === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown')}
                    </p>
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-black shrink-0">
                        <ShieldCheck size={10} />
                        {t('roleAdminPill')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0">
                        {t('roleMemberPill')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800 text-neutral-500">
                <div className="text-[11px] text-neutral-400">
                  {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: dateLocale }) : '—'}
                </div>
                <div>
                  {user.is_blacklisted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-neutral-300 dark:border-neutral-700">
                      <ShieldAlert size={10} />
                      {t('statusBlacklisted')}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                      {t('statusNormal')}
                    </span>
                  )}
                </div>
              </div>

              {user.is_blacklisted && user.blacklist_reason && (
                <div className="text-[11px] p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  <span className="font-semibold">{locale === 'th' ? 'เหตุผล: ' : 'Reason: '}</span>
                  {user.blacklist_reason}
                </div>
              )}

              {user.role !== 'admin' && (
                <div className="pt-1">
                  {user.is_blacklisted ? (
                    <button
                      onClick={() => handleUnblacklist(user)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <ShieldCheck size={13} />
                      {t('unblacklistBtn')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setBlacklistModalUser(user)
                        setBlacklistReason('')
                        setBlacklistError(null)
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-colors"
                    >
                      <ShieldX size={13} />
                      {t('blacklistBtn')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Invite Admin Modal (Single Close Mechanism via Footer Buttons) */}
      <Modal
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false)
          setCreatedInviteLinks(null)
          setInviteMessage(null)
        }}
        title={locale === 'th' ? 'เชิญผู้ดูแลระบบ (Admin)' : 'Invite Administrator'}
        description={
          createdInviteLinks
            ? (locale === 'th'
                ? 'คำเชิญถูกสร้างและส่งอีเมลเรียบร้อยแล้ว'
                : 'Invitation created and email sent successfully')
            : (locale === 'th'
                ? 'ผู้ได้รับเชิญจะได้รับลิงก์ยืนยันทางอีเมล (หมดอายุ 48 ชม.)'
                : 'Invitee will receive an email confirmation link (expires in 48h)')
        }
        icon={<MailPlus size={18} />}
        footer={
          createdInviteLinks ? (
            <ModalButton
              variant="primary"
              onClick={() => {
                setInviteModalOpen(false)
                setCreatedInviteLinks(null)
                setInviteMessage(null)
              }}
            >
              {locale === 'th' ? 'ปิดหน้าต่าง' : 'Done'}
            </ModalButton>
          ) : (
            <>
              <ModalButton
                variant="secondary"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviteLoading}
              >
                {t('cancel')}
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleInviteAdmin}
                disabled={inviteLoading || !inviteEmail.trim()}
              >
                {inviteLoading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 size={14} className="animate-spin" />
                    <span>{locale === 'th' ? 'กำลังส่งคำเชิญ...' : 'Sending...'}</span>
                  </span>
                ) : (
                  locale === 'th' ? 'ส่งคำเชิญ' : 'Send Invite'
                )}
              </ModalButton>
            </>
          )
        }
      >
        {createdInviteLinks ? (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {locale === 'th' ? 'ส่งคำเชิญเรียบร้อยแล้ว' : 'Invitation Sent'}
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  {createdInviteLinks.wasRedirected
                    ? (locale === 'th'
                        ? `([Sandbox Mode] โหมดทดสอบก่อนขึ้น Production: ระบบส่งสำเนาเข้า ${createdInviteLinks.testEmail} และคุณสามารถคัดลอกลิงก์ด้านล่างเพื่อเปิดทดสอบยืนยันได้ทันที)`
                        : `([Sandbox Mode] Sent to ${createdInviteLinks.testEmail}. You can also test with the links below.)`)
                    : (locale === 'th'
                        ? 'ระบบได้ส่งอีเมลคำเชิญไปเรียบร้อยแล้ว หรือสามารถคัดลอกลิงก์ด้านล่างนี้ไปเปิดเพื่อยืนยันได้เช่นกัน'
                        : 'Email sent successfully. You can also copy the direct link below.')}
                </p>
              </div>
            </div>

            {/* Invite link card */}
            <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <span>{locale === 'th' ? 'ลิงก์สำหรับผู้ได้รับเชิญ (แอดมินใหม่)' : 'Link for New Admin (Invitee)'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteLinks.inviteLink)
                    setCopiedInviteLink(true)
                    setTimeout(() => setCopiedInviteLink(false), 2500)
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 text-[11px] font-semibold transition-opacity"
                >
                  {copiedInviteLink ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedInviteLink ? (locale === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (locale === 'th' ? 'คัดลอกลิงก์' : 'Copy Link')}</span>
                </button>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 break-all select-all">
                {createdInviteLinks.inviteLink}
              </div>
            </div>

            {/* Resign link card (if replacing admin) */}
            {createdInviteLinks.resignLink && (
              <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <span>{locale === 'th' ? 'ลิงก์ยืนยันสละสิทธิ์ (สำหรับแอดมินเดิม)' : 'Link for Outgoing Admin (Resign)'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteLinks.resignLink!)
                      setCopiedResignLink(true)
                      setTimeout(() => setCopiedResignLink(false), 2500)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 text-[11px] font-semibold transition-opacity"
                  >
                    {copiedResignLink ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedResignLink ? (locale === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (locale === 'th' ? 'คัดลอกลิงก์' : 'Copy Link')}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 break-all select-all">
                  {createdInviteLinks.resignLink}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleInviteAdmin} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {t('emailLabel')} *
              </label>
              <input
                type="email"
                required
                placeholder="example@lamduan.mfu.ac.th"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white"
              />
            </div>

            {/* Optional replace admin */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {locale === 'th' ? 'ต้องการให้แทนที่ผู้ดูแลเดิมหรือไม่ (ไม่จำเป็น)' : 'Replace Existing Admin (Optional)'}
              </label>
              <select
                value={replaceAdminId}
                onChange={(e) => setReplaceAdminId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs sm:text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white"
              >
                <option value="">{locale === 'th' ? '-- ไม่แทนที่ (เพิ่มเป็นแอดมินใหม่ร่วมกัน) --' : '-- Do not replace (Add as co-admin) --'}</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email} ({a.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                {locale === 'th'
                  ? 'ระบบไม่จำกัดจำนวนผู้ดูแล หากเลือกแทนที่จะมีการส่งอีเมลให้ผู้ดูแลเดิมยืนยันการสละสิทธิ์'
                  : 'No admin limit. If replaced, the outgoing admin will be emailed to confirm resignation.'}
              </p>
            </div>

            {inviteMessage && (
              <div className="space-y-2">
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                    inviteMessage.type === 'success'
                      ? 'border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800'
                      : 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                  }`}
                >
                  {inviteMessage.type === 'success' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                  <div className="flex-1 leading-relaxed">{inviteMessage.text}</div>
                </div>

                {inviteMessage.type === 'error' && (inviteMessage.text.includes('admin_invitations') || inviteMessage.text.includes('schema cache')) && (
                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 space-y-2 text-xs">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                      <span>{locale === 'th' ? 'คำสั่ง SQL สำหรับตั้งค่าตาราง (รันครั้งเดียว)' : 'SQL Migration Script (Run once)'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ADMIN_INVITATION_SQL)
                          setCopiedSql(true)
                          setTimeout(() => setCopiedSql(false), 2500)
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity text-[11px] font-medium"
                      >
                        {copiedSql ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedSql ? (locale === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (locale === 'th' ? 'คัดลอก SQL' : 'Copy SQL')}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {locale === 'th'
                        ? 'เปิด Supabase Dashboard → เข้า SQL Editor → วางคำสั่งแล้วกด Run จากนั้นลองส่งคำเชิญใหม่อีกครั้ง'
                        : 'Go to Supabase Dashboard → SQL Editor → Paste & click Run, then retry inviting.'}
                    </p>
                    <a
                      href="https://supabase.com/dashboard/project/trhqpnkxyhgzfvxjazrc/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-900 dark:text-white font-medium underline underline-offset-2 hover:opacity-80 pt-0.5"
                    >
                      <span>{locale === 'th' ? 'เปิด Supabase SQL Editor ของโปรเจกต์นี้' : 'Open Supabase SQL Editor'}</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Blacklist Modal (Single Close Mechanism via Footer Buttons) */}
      <Modal
        open={!!blacklistModalUser}
        onClose={() => setBlacklistModalUser(null)}
        title={t('blacklistModalTitle')}
        description={
          locale === 'th'
            ? 'สมาชิกที่ถูกขึ้นบัญชีดำจะไม่สามารถยืมหนังสือได้'
            : 'Blacklisted members cannot borrow books'
        }
        icon={<ShieldAlert size={18} />}
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setBlacklistModalUser(null)}
              disabled={blacklistLoading}
            >
              {t('cancel')}
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={handleConfirmBlacklist}
              disabled={blacklistLoading || !blacklistReason.trim()}
            >
              {blacklistLoading ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('confirmingBtn')}</span>
                </span>
              ) : (
                t('confirmBlacklistBtn')
              )}
            </ModalButton>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          {blacklistModalUser && (
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                {blacklistModalUser.avatar_url ? (
                  <img src={blacklistModalUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={14} className="text-neutral-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {blacklistModalUser.full_name || (locale === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown')}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">{blacklistModalUser.email}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {t('blacklistReasonLabel')} *
            </label>
            <textarea
              required
              rows={3}
              placeholder={t('blacklistReasonPlaceholder')}
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white resize-none"
            />
          </div>

          {blacklistError && (
            <div className="p-3 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{blacklistError}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

const ADMIN_INVITATION_SQL = `-- =============================================
-- MIGRATION: Admin invitations (max 2 admins, email-confirmed)
-- Run this once in Supabase SQL Editor
-- =============================================

-- 1. Invitation table
create table if not exists admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  replace_admin_id uuid references profiles(id) on delete set null,
  resign_token_hash text unique,
  accepted_at timestamptz,
  accepted_user_id uuid references profiles(id) on delete set null,
  resign_confirmed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_invitations_status_idx on admin_invitations (status);
alter table admin_invitations enable row level security;

-- 2. Hard limit: never more than 2 admins (DB-level safety net)
create or replace function enforce_max_admins()
returns trigger
language plpgsql
as $$
declare
  admin_count int;
begin
  if NEW.role = 'admin' and (TG_OP = 'INSERT' or OLD.role is distinct from 'admin') then
    select count(*) into admin_count from public.profiles where role = 'admin' and id <> NEW.id;
    if admin_count >= 2 then
      raise exception 'MAX_ADMINS_REACHED: ระบบอนุญาตผู้ดูแลได้สูงสุด 2 คน';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_max_admins on profiles;
create trigger profiles_max_admins
  before insert or update of role on profiles
  for each row execute procedure enforce_max_admins();

-- 3. Atomic finalize: demote old admin (if any) + promote new admin in one transaction
create or replace function finalize_admin_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv admin_invitations%rowtype;
begin
  select * into inv from admin_invitations where id = p_invitation_id for update;

  if not found then raise exception 'INVITATION_NOT_FOUND'; end if;
  if inv.status <> 'pending' then raise exception 'INVITATION_NOT_PENDING'; end if;
  if inv.accepted_user_id is null then raise exception 'INVITATION_NOT_ACCEPTED'; end if;
  if inv.replace_admin_id is not null and inv.resign_confirmed_at is null then
    raise exception 'RESIGN_NOT_CONFIRMED';
  end if;

  if inv.replace_admin_id is not null then
    update profiles set role = 'user' where id = inv.replace_admin_id;
  end if;

  update profiles set role = 'admin' where id = inv.accepted_user_id;

  update admin_invitations
    set status = 'completed', completed_at = now()
    where id = inv.id;
end;
$$;

revoke all on function finalize_admin_invitation(uuid) from public, anon, authenticated;
grant execute on function finalize_admin_invitation(uuid) to service_role;
`