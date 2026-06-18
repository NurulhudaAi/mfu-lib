import { createServiceClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import AdminFeedbackContent from '@/components/AdminFeedbackContent'

async function getData() {
  const supabase = createServiceClient()
  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, rating, message, category, is_read, created_at, profiles(full_name, email, avatar_url)')
    .order('created_at', { ascending: false })
  return { feedback: feedback || [] }
}

export default async function AdminFeedbackPage() {
  const { feedback } = await getData()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <AdminFeedbackContent feedback={feedback} />
    </div>
  )
}
