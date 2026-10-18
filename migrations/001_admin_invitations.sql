-- =============================================
-- MIGRATION: Admin invitations (max 2 admins, email-confirmed)
-- Run this once in Supabase SQL Editor
-- =============================================

-- 1. Invitation table
create table if not exists admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,              -- sha256 ของ token ที่ส่งให้ผู้ได้รับเชิญ
  invited_by uuid references profiles(id) on delete set null,
  replace_admin_id uuid references profiles(id) on delete set null,  -- แอดมินที่จะถูกแทนที่ (null = เพิ่มช่องว่าง)
  resign_token_hash text unique,                -- sha256 ของ token ที่ส่งให้แอดมินเดิมยืนยันสละสิทธิ์
  accepted_at timestamptz,                      -- ผู้ได้รับเชิญกดยอมรับแล้ว
  accepted_user_id uuid references profiles(id) on delete set null,
  resign_confirmed_at timestamptz,              -- แอดมินเดิมยืนยันสละสิทธิ์แล้ว
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_invitations_status_idx on admin_invitations (status);

-- เข้าถึงผ่าน service role เท่านั้น (API routes) → เปิด RLS โดยไม่มี policy
alter table admin_invitations enable row level security;

-- 2. Hard limit: never more than 2 admins (DB-level safety net)
create or replace function enforce_max_admins()
returns trigger
language plpgsql
as $$
declare
  admin_count int;
begin
  if NEW.role = 'admin' and (TG_OP = 'INSERT' or OLD.role is distinct from 'admin') then
    select count(*) into admin_count from public.profiles where role = 'admin' and id <> NEW.id;
    if admin_count >= 2 then
      raise exception 'MAX_ADMINS_REACHED: ระบบอนุญาตผู้ดูแลได้สูงสุด 2 คน';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_max_admins on profiles;
create trigger profiles_max_admins
  before insert or update of role on profiles
  for each row execute procedure enforce_max_admins();

-- 3. Atomic finalize: demote old admin (if any) + promote new admin in one transaction
create or replace function finalize_admin_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv admin_invitations%rowtype;
begin
  select * into inv from admin_invitations where id = p_invitation_id for update;

  if not found then raise exception 'INVITATION_NOT_FOUND'; end if;
  if inv.status <> 'pending' then raise exception 'INVITATION_NOT_PENDING'; end if;
  if inv.accepted_user_id is null then raise exception 'INVITATION_NOT_ACCEPTED'; end if;
  if inv.replace_admin_id is not null and inv.resign_confirmed_at is null then
    raise exception 'RESIGN_NOT_CONFIRMED';
  end if;

  -- ถอดแอดมินเดิมก่อน เพื่อไม่ให้ชน limit 2 คน
  if inv.replace_admin_id is not null then
    update profiles set role = 'user' where id = inv.replace_admin_id;
  end if;

  update profiles set role = 'admin' where id = inv.accepted_user_id;

  update admin_invitations
    set status = 'completed', completed_at = now()
    where id = inv.id;
end;
$$;

revoke all on function finalize_admin_invitation(uuid) from public, anon, authenticated;
grant execute on function finalize_admin_invitation(uuid) to service_role;
