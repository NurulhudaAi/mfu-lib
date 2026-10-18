import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAnnouncementSchema, validateInput } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // ── Validate input ──
  const body = await req.json()
  const parsed = validateInput(createAnnouncementSchema, body)
  if (parsed.error) return parsed.error

  const supabase = createServiceClient()
  const { data: newAnn, error } = await supabase
    .from('announcements')
    .insert({
      ...parsed.data,
      created_by: auth.admin.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/')
  revalidatePath('/admin/announcements')

  return NextResponse.json({ success: true, data: newAnn })
}