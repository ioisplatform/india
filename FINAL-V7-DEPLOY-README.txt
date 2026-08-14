IOIS V7 FINAL CLEAN AUTH BUILD
==============================

This package is the cleaned frontend/auth build for IOIS.

IMPORTANT
- Email reset-link flow has been removed from HTML/JS.
- The obsolete reset-password.html page has been removed.
- Forgot User ID and Forgot Password use recovery.html only.
- Login uses Member ID + Password via iois-member-login Edge Function.
- Recovery uses iois-account-recovery Edge Function.
- Passwords are never stored in frontend/localStorage.
- Supabase service-role key must NEVER be placed in frontend files.

SUPABASE SETTINGS
1. Authentication -> Providers -> Email -> Confirm email: OFF.
2. Deploy Edge Function: iois-member-login.
3. Deploy Edge Function: iois-account-recovery.
4. Add SUPABASE_SERVICE_ROLE_KEY as an Edge Function secret.
5. Keep member-documents Storage bucket available.

RECOVERY
Forgot User ID:
  Registered Email + Registered WhatsApp/Mobile -> Member ID.

Forgot Password:
  Member ID + Registered Email + Registered WhatsApp/Mobile + New Password.

No email reset link or OTP is used by the frontend recovery flow.

TEST ORDER
1. Open register.html in a private/incognito window.
2. Register a test account with an active membership plan.
3. Confirm the Member ID is shown immediately after successful registration.
4. Login with Member ID + Password.
5. Confirm dashboard data loads.
6. Test Forgot User ID.
7. Test Forgot Password.
8. Test login again with the new password.

FINAL FRONTEND AUDIT
- JavaScript syntax checks passed for all root .js files.
- No resetPasswordForEmail call remains in .html/.js.
- No type=recovery/PASSWORD_RECOVERY/reset-password references remain in .html/.js.
- Obsolete reset-password.html removed.
- assets/logo.png exists.
