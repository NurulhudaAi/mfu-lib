-- ====================================================================
-- Migration 002: Unlimited Admins & Super Admin Role Support
-- MFU Muslim Club Library
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ====================================================================

-- 1. ปรับ Check Constraint ของตาราง profiles ให้รองรับ 'super_admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. อัปเดตฟังก์ชัน is_admin() ให้ครอบคลุมทั้ง admin และ super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- 3. อัปเดต RLS Policy สำหรับ storage (หากมีการใช้งาน)
DROP POLICY IF EXISTS "Admins can view all return proofs" ON storage.objects;
CREATE POLICY "Admins can view all return proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'return-proofs' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can upload book covers" ON storage.objects;
CREATE POLICY "Admins can upload book covers" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-covers' AND public.is_admin());

-- 4. ตั้งค่า Super Admin คนแรก (ใส่อีเมลของผู้ดูแลระบบหลัก)
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'nurulhudaadamishaq@gmail.com';
