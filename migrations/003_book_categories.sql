-- =============================================
-- Migration 003: Book Categories Management
-- Run this in Supabase SQL Editor (Optional but recommended)
-- =============================================

create table if not exists book_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

alter table book_categories enable row level security;

create policy "Anyone can view book_categories" on book_categories for select using (true);
create policy "Admins can insert book_categories" on book_categories for insert with check (is_admin());
create policy "Admins can update book_categories" on book_categories for update using (is_admin());
create policy "Admins can delete book_categories" on book_categories for delete using (is_admin());
