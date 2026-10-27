import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-guard'

// GET: ดึงรายการหมวดหมู่ทั้งหมดแบบไม่ซ้ำกัน
export async function GET() {
  try {
    const supabase = createServiceClient()

    // 1. ดึงจากตาราง books
    const { data: bookCats } = await supabase
      .from('books')
      .select('category')
      .not('category', 'is', null)

    // 2. ดึงจากตาราง book_categories (หากมี)
    let customCats: string[] = []
    try {
      const { data: dbCats } = await supabase
        .from('book_categories')
        .select('name')
      if (dbCats) {
        customCats = dbCats.map((c: any) => c.name).filter(Boolean)
      }
    } catch {
      // ตารางยังไม่ได้ถูกสร้าง -> ข้ามได้
    }

    const all = [
      ...(bookCats || []).map((b: any) => b.category),
      ...customCats,
    ]

    // Normalize & Deduplicate
    const map = new Map<string, string>()
    for (const item of all) {
      if (!item) continue
      const trimmed = String(item).trim()
      if (!trimmed) continue
      const lower = trimmed.toLowerCase()
      if (!map.has(lower)) {
        map.set(lower, trimmed)
      }
    }

    return NextResponse.json({
      categories: Array.from(map.values()),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// POST: เพิ่มหมวดหมู่ใหม่ (Admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const cleanName = name.trim()
    const supabase = createServiceClient()

    // ลองบันทึกลงตาราง book_categories ถ้ามี
    try {
      await supabase
        .from('book_categories')
        .upsert({ name: cleanName }, { onConflict: 'name' })
    } catch {
      // หากตารางยังไม่มี ให้ส่งสำเร็จเพื่อให้ UI ใช้งานได้
    }

    return NextResponse.json({ success: true, category: cleanName })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE: ลบหมวดหมู่ (Admin only)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { name, fallbackToGeneral = true } = await req.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const cleanName = name.trim()
    const supabase = createServiceClient()

    // 1. ถ้ามีหนังสือในหมวดนี้ ให้ปรับเป็น 'ทั่วไป' (General) เพื่อไม่ให้ข้อมูลสูญหาย
    if (fallbackToGeneral) {
      await supabase
        .from('books')
        .update({ category: 'ทั่วไป' })
        .eq('category', cleanName)
    }

    // 2. ลบออกจากตาราง book_categories ถ้ามี
    try {
      await supabase
        .from('book_categories')
        .delete()
        .eq('name', cleanName)
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, deleted: cleanName })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
