-- ============================================================================
-- Admin user management — expose auth emails + user deletion to training admins
-- ============================================================================
-- Both functions use SECURITY DEFINER so they can read auth.users and call
-- auth.admin APIs that the default anon/authenticated roles can't reach.
-- Each function checks that the caller is a training admin before doing work.
--
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================================

-- Returns {id, email, created_at} for every profile. Admin-only.
-- The frontend joins this with the profiles query by id to show emails
-- next to member names in TeamManagement.
create or replace function public.admin_get_profile_emails()
returns table (id uuid, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Gate: caller must be a training admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_training_admin = true
  ) then
    raise exception 'Not authorized: training admin access required';
  end if;

  return query
    select u.id, u.email::text, u.created_at
    from auth.users u
    where exists (select 1 from public.profiles p where p.id = u.id)
    order by u.created_at asc;
end;
$$;

revoke all on function public.admin_get_profile_emails() from public;
grant execute on function public.admin_get_profile_emails() to authenticated;


-- Deletes a user from auth.users. The existing FK `profiles.id references
-- auth.users` cascades, removing the profile row automatically.
-- Admin-only. Caller cannot delete themselves.
create or replace function public.admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Gate: caller must be a training admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_training_admin = true
  ) then
    raise exception 'Not authorized: training admin access required';
  end if;

  -- Can't delete yourself
  if target_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  -- Delete from auth.users (cascades to profiles via FK)
  delete from auth.users where id = target_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
