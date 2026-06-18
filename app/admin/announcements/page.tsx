import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import AdminAnnouncementsContent from '@/components/AdminAnnouncementsContent'

export default async function AdminAnnouncementsPage() {
  const supabase = createServiceClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <AdminAnnouncementsContent announcements={announcements || []} />
    </div>
  )
}