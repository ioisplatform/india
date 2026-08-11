# IOIS PLATFORM — Final Frontend

Upload all files/folders in this directory to the GitHub repository root.

## Pages
- index.html
- membership.html
- news.html
- jobs.html
- chat.html
- panchang.html
- style.css
- script.js
- assets/logo.png (optional; add your actual IOIS logo)

## Notes
This is a static frontend. Weather uses Open-Meteo client-side. Registration demo stores leads in browser localStorage. Do not expose private Telegram/Supabase service keys in frontend code. Use a secure backend/serverless function for private credentials.


## Final Fix Build — 10 Aug 2026
This build consolidates the frontend configuration, fixes authentication configuration mismatch, removes the duplicate registration-page conflict, adds missing privacy/terms/default-avatar assets, and redirects legacy login/registration entry points to the canonical pages. See `FINAL-FIX-AUDIT.txt`.


## V3 Registration Fix
- Added timeout protection for Auth, Storage and RPC calls.
- Restored UPI ID and dynamic UPI QR generation.
- Added non-blocking Telegram notification trigger after successful registration.

## V6 Production Auth/Dashboard
Duplicate login handler removed; login timeout added; dashboard now uses actual members and iois_member_registry tables.


## V7 Fast Member-ID Login
See V7-SETUP-GUIDE.txt. Deploy `supabase/functions/iois-member-login/index.ts` and set server-side secrets. Do not expose service-role keys.
