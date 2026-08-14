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
