-- =============================================
-- MFU Muslim Library — Full Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_blacklisted boolean not null default false,
  blacklist_reason text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on profiles for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 2. BOOKS TABLE
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text unique,
  description text,
  cover_url text,
  category text,
  publisher text,
  published_year int,
  total_copies int not null default 1,
  available_copies int not null default 1,
  is_featured boolean not null default false,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table books enable row level security;

create policy "Anyone can view books" on books for select using (true);
create policy "Admins can insert books" on books for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update books" on books for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete books" on books for delete using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 3. BORROWS TABLE
create table if not exists borrows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  book_id uuid references books(id) not null,
  status text not null default 'active' check (status in ('active', 'returned', 'overdue')),
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  return_proof_url text,
  notes text
);

alter table borrows enable row level security;

create policy "Users can view own borrows" on borrows for select using (auth.uid() = user_id);
create policy "Admins can view all borrows" on borrows for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can insert own borrows" on borrows for insert with check (auth.uid() = user_id);
create policy "Users can update own borrows" on borrows for update using (auth.uid() = user_id);
create policy "Admins can update any borrow" on borrows for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 4. QUEUE TABLE
create table if not exists queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  book_id uuid references books(id) not null,
  position int not null,
  notified boolean default false,
  created_at timestamptz not null default now(),
  unique(user_id, book_id)
);

alter table queue enable row level security;

create policy "Users can view own queue" on queue for select using (auth.uid() = user_id);
create policy "Admins can view all queue" on queue for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can insert to queue" on queue for insert with check (auth.uid() = user_id);
create policy "Users can delete own queue" on queue for delete using (auth.uid() = user_id);

-- 5. ANNOUNCEMENTS TABLE (NEW)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_en text,
  body text not null,
  body_en text,
  type text not null default 'info' check (type in ('info', 'warning', 'success')),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "Anyone can view active announcements" on announcements for select using (is_active = true);
create policy "Admins can manage announcements" on announcements for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 6. FEEDBACK TABLE (NEW)
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  rating int not null check (rating between 1 and 5),
  message text not null,
  category text not null default 'general' check (category in ('general', 'book_request', 'system', 'service')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "Users can insert feedback" on feedback for insert with check (true);
create policy "Admins can view all feedback" on feedback for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can view own feedback" on feedback for select using (auth.uid() = user_id);

-- 7. BLACKLIST LOG TABLE
create table if not exists blacklist_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  action text not null check (action in ('added', 'removed')),
  reason text,
  admin_id uuid references profiles(id) not null,
  created_at timestamptz not null default now()
);

alter table blacklist_log enable row level security;
create policy "Admins can view blacklist log" on blacklist_log for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can insert blacklist log" on blacklist_log for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- =============================================
-- AUTO-CREATE PROFILE ON GOOGLE LOGIN
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- AUTO-UPDATE book available_copies
-- =============================================
create or replace function update_book_availability()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'active' then
    update books set available_copies = available_copies - 1 where id = NEW.book_id;
  end if;
  if TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status in ('returned', 'overdue') then
    update books set available_copies = available_copies + 1 where id = NEW.book_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_borrow_change on borrows;
create trigger on_borrow_change
  after insert or update on borrows
  for each row execute procedure update_book_availability();

-- =============================================
-- STORAGE BUCKETS (run in Supabase Storage UI)
-- Create: return-proofs (private), book-covers (public)
-- =============================================
-- Storage policies:
create policy "Users can upload return proofs" on storage.objects for insert
  with check (bucket_id = 'return-proofs' and auth.role() = 'authenticated');

create policy "Users can view own return proofs" on storage.objects for select
  using (bucket_id = 'return-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Admins can view all return proofs" on storage.objects for select
  using (bucket_id = 'return-proofs' and exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone can view book covers" on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "Admins can upload book covers" on storage.objects for insert
  with check (bucket_id = 'book-covers' and exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- =============================================
-- SET FIRST ADMIN (replace with your email)
-- =============================================
-- update profiles set role = 'admin' where email = 'your.email@gmail.com';

-- =============================================
-- SAMPLE ANNOUNCEMENT
-- =============================================
insert into announcements (title, title_en, body, body_en, type)
values (
  'ยินดีต้อนรับสู่ห้องสมุดชมรมมุสลิม MFU',
  'Welcome to MFU Muslim Club Library',
  'ระบบยืม-คืนหนังสือออนไลน์พร้อมให้บริการแล้ว ยืมหนังสือได้สูงสุด 14 วัน',
  'Our online book borrowing system is now live. Borrow up to 14 days.',
  'success'
);
