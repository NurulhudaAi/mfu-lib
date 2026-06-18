'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Users, ShieldBan, ShieldCheck, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface Props { users: any[] }

const ROLES = [
  // ✅ BUG FIX #10: แก้ไขคำผิด "ผู้ใช้ทงาน" → "ผู้ใช้งาน"
  { value: 'user', label: 'ผู้ใช้งาน', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  { value: 'admin', label: 'แอดมิน', color: 'bg-purple-100 dark:bg-purple-950 text-primary-600 dark:text-primary-600' },
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} คนทั้งหมด</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-green-500 text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">ผู้ใช้</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">วันที่สมัคร</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">บทบาท</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">สถานะ</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Blacklist</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Users size={36} className="mx-auto mb-2 opacity-20" />
                  ไม่พบผู้ใช้
                </td>
              </tr>
            ) : filtered.map(user => (
              <tr key={user.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${
                user.is_blacklisted ? 'bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users size={14} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                        {user.full_name || 'ไม่ระบุชื่อ'}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: th }) : '—'}
                </td>

                {/* Role selector */}
                <td className="px-4 py-3 text-center">
                  <div className="relative inline-block">
                    <select
                      value={user.role || 'user'}
                      onChange={e => changeRole(user.id, e.target.value)}
                      disabled={toggling === user.id + '_role'}
                      className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-semibold border-0 outline-none cursor-pointer transition-colors disabled:opacity-50 ${
                        user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center">
                  {user.is_blacklisted ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                      Blacklist
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
                      ปกติ
                    </span>
                  )}
                </td>

                {/* Blacklist toggle */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleBlacklist(user.id, user.is_blacklisted)}
                    disabled={toggling === user.id + '_blacklist'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                      user.is_blacklisted
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-green-100'
                        : 'bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {user.is_blacklisted
                      ? <><ShieldCheck size={13} /> ปลด</>
                      : <><ShieldBan size={13} /> Blacklist</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}