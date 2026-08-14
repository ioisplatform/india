/* IOIS — SAFE LIVE SUPABASE POLICY / READINESS PATCH
   Does not delete members, registry rows, payments, auth users, or plans.
   Run in Supabase SQL Editor once.
*/

begin;

-- Active membership plans must be readable by the registration page before Auth signup.
drop policy if exists "Public can view active membership plans" on public.membership_plans;
create policy "Public can view active membership plans"
on public.membership_plans
for select
to anon, authenticated
using (is_active = true);

-- Existing member dashboard compatibility.
drop policy if exists "IOIS users can view own profile" on public.members;
create policy "IOIS users can view own profile"
on public.members
for select
to authenticated
using (auth_user_id = auth.uid() or public.is_iois_admin());

-- Legacy registry compatibility.
drop policy if exists "IOIS users can view own registry record" on public.iois_member_registry;
create policy "IOIS users can view own registry record"
on public.iois_member_registry
for select
to authenticated
using (user_id = auth.uid() or public.is_iois_admin());

commit;

-- Verification report.
select 'active_plans' as check_name, count(*)::text as result
from public.membership_plans where is_active = true
union all
select 'active_plan_amounts', string_agg(amount::text, ', ' order by amount)
from public.membership_plans where is_active = true
union all
select 'member_count', count(*)::text from public.members
union all
select 'registry_count', count(*)::text from public.iois_member_registry;

/*
  IOIS legacy profile fallback.
  SECURITY DEFINER is used because RLS intentionally prevents an authenticated
  user from searching unlinked legacy rows by arbitrary email. The function
  derives the email from the caller's JWT and returns only that user's
  legacy profile fields.
*/
create or replace function public.iois_get_legacy_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_result jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then
    return null;
  end if;

  select jsonb_build_object(
    'user_id', r.user_id,
    'member_id', r.member_id,
    'full_name', r.full_name,
    'email', r.email,
    'phone', r.phone,
    'address', r.address,
    'plan_amount', r.plan_amount,
    'plan_code', r.plan_code,
    'plan_name', r.plan_name,
    'sponsor_id', r.sponsor_id,
    'sponsor_name', r.sponsor_name,
    'withdrawal_details', r.withdrawal_details,
    'created_at', r.created_at
  )
  into v_result
  from public.iois_member_registry r
  where lower(trim(coalesce(r.email, ''))) = v_email
  order by r.created_at desc nulls last
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.iois_get_legacy_profile() from public;
grant execute on function public.iois_get_legacy_profile() to authenticated;
