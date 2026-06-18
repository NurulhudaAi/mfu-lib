import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import AdminUsersContent from '@/components/AdminUsersContent'

async function getData() {
  const supabase = createServiceClient()
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('users error:', error)
  console.log('users count:', users?.length)

  return { users: users ?? [] }
}

export default async function AdminUsersPage() {
  const { users } = await getData()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <AdminUsersContent users={users} />
    </div>
  )
}