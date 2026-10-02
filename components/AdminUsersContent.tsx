'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Users, ShieldBan, ShieldCheck, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface Props { users: any[] }

const ROLES = [
  { value: 'user', label: 'ผู้ใช้งาน' },
  { value: 'admin', label: 'แอดมิน' },
]

export default function AdminUsersContent({ users = [] }: Props) {
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const router = useRouter()

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleBlacklist(userId: string, current: boolean) {
    setToggling(userId + '_blacklist')
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_blacklisted: !current }),
    })
    if (res.ok) router.refresh()
    else alert('เปลี่ยนสถานะไม่สำเร็จ')
    setToggling(null)
  }

  async function changeRole(userId: string, role: string) {
    setToggling(userId + '_role')
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) router.refresh()
    else alert('เปลี่ยนบทบาทไม่สำเร็จ')
    setToggling(null)
  }

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">จัดการผู้ใช้</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{users.length} คนทั้งหมด</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล, รหัสนักศึกษา..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none focus:border-black dark:focus:border-white text-neutral-900 dark:text-white transition-colors"
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider">ผู้ใช้</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider hidden md:table-cell">วันที่สมัคร</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">บทบาท</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">สถานะ</th>
                <th className="px-5 py-3.5 font-bold text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider text-center">Blacklist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-neutral-400">
                    <Users size={36} className="mx-auto mb-2 opacity-20" />
                    ไม่พบผู้ใช้
                  </td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.id} className={`transition-colors ${
                  user.is_blacklisted ? 'bg-neutral-100/50 dark:bg-neutral-800/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
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

                  <td className="px-5 py-4 text-neutral-500 dark:text-neutral-400 text-xs hidden md:table-cell">
                    {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: th }) : '—'}
                  </td>

                  {/* Role selector */}
                  <td className="px-5 py-4 text-center">
                    <div className="relative inline-block">
                      <select
                        value={user.role || 'user'}
                        onChange={e => changeRole(user.id, e.target.value)}
                        disabled={toggling === user.id + '_role'}
                        className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 outline-none cursor-pointer transition-colors disabled:opacity-50 ${
                          user.role === 'admin'
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    {user.is_blacklisted ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black text-white dark:bg-white dark:text-black">
                        Blacklisted
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        ปกติ
                      </span>
                    )}
                  </td>

                  {/* Blacklist toggle */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleBlacklist(user.id, user.is_blacklisted)}
                      disabled={toggling === user.id + '_blacklist'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border disabled:opacity-50 ${
                        user.is_blacklisted
                          ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {user.is_blacklisted
                        ? <><ShieldCheck size={13} /> ปลด Blacklist</>
                        : <><ShieldBan size={13} /> Blacklist</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}