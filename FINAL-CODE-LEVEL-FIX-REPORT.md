# IOIS PLATFORM — FINAL CODE-LEVEL FIX & RELEASE REVIEW

Audit date: 2026-08-14
Source package: IOIS-FINAL-PRODUCTION-READY-V3(2).zip

## Concrete issues found in the supplied ZIP

1. **Authentication storage-key mismatch**
   - `auth.js` used `iois-auth-session`.
   - `register.js`, `supabase-config.js`, and `supabase.js` created clients without the same storage key.
   - This could cause different pages/clients to see different sessions and can reproduce login/dashboard bouncing.
   - FIXED: all browser-side Supabase clients now use the shared `iois-auth-session` key.

2. **Incomplete legacy profile merge**
   - `auth.js` could return a `profiles` row immediately, even when a more complete `members` or `iois_member_registry` row existed.
   - `dashboard.html` similarly could fail to reconstruct a legacy profile when the UUID link was missing.
   - FIXED: supported sources are now merged instead of allowing an incomplete profile row to hide valid member data.

3. **Legacy email fallback was incompatible with normal RLS**
   - A browser-side email query against `iois_member_registry` cannot reliably retrieve an unlinked legacy row when RLS only permits `user_id = auth.uid()`.
   - FIXED: added a `SECURITY DEFINER` function `public.iois_get_legacy_profile()` to `IOIS-SUPABASE-PRODUCTION-FIX.sql`.
   - The function derives the caller email from the authenticated JWT and returns only the matching legacy profile fields.
   - The frontend calls this RPC only after the UUID-linked sources are unavailable.

4. **Package/report mismatch**
   - The AI Studio report claimed `IOIS-SUPABASE-PRODUCTION-SETUP.sql` existed.
   - That file is NOT present in the supplied ZIP.
   - The ZIP contains `IOIS-SUPABASE-PRODUCTION-FIX.sql` instead.
   - No nonexistent setup file was fabricated.

## Verification performed locally

- ZIP opened successfully.
- 83 packaged entries inspected.
- 15 JavaScript files passed `node --check`.
- Local HTML asset/reference scan found no missing literal local files; `${...}` template URLs in jobs/news are runtime-generated.
- No service-role key or Telegram bot token was found in the frontend configuration inspected.
- Existing UI files were not redesigned or replaced.
- Existing plan amounts remain 10, 49, 99, 199, 299, 499, 999.

## Important live limitations

The ZIP alone cannot prove:

- real Supabase registration
- real Supabase login/logout
- password reset against live Auth
- RLS correctness in the live project
- admin authorization against live data
- Storage policies/upload
- payment insertion/approval
- Edge Function deployment/secrets
- Telegram delivery
- real legacy-member records

These remain LIVE VERIFICATION REQUIRED.

## Required Supabase step

Run `IOIS-SUPABASE-PRODUCTION-FIX.sql` in the intended Supabase project.
This is required for the new legacy profile RPC as well as the existing policy
patches.

Do not place the service-role key in frontend files.

## Design preservation

No redesign was performed. Existing IOIS branding, colors, layouts, assets,
membership amounts, page structure, clock/weather/Panchang and other existing
features were preserved.

## Release classification

**CODE-LEVEL FIXED / LIVE VERIFICATION REQUIRED**

This package must NOT be described as 100% live-tested or guaranteed bug-free
until the Supabase-dependent flows are exercised against the actual project.
