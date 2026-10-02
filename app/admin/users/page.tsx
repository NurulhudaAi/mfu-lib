import { createServiceClient } from '@/lib/supabase-server'
import AdminUsersContent from '@/components/AdminUsersContent'

async function getData() {
  const supabase = createServiceClient()
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return { users: users ?? [] }
}

export default async function AdminUsersPage() {
  const { users } = await getData()
  return (
    <AdminUsersContent users={users} />
  )
}