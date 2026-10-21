import { createServiceClient } from '@/lib/supabase-server'
import AdminAnnouncementsContent from '@/components/AdminAnnouncementsContent'

export default async function AdminAnnouncementsPage() {
  const supabase = createServiceClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .not('title', 'like', '__SYS_%')
    .order('created_at', { ascending: false })

  return (
    <AdminAnnouncementsContent announcements={announcements || []} />
  )
}