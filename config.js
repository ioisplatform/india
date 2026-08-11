/* =========================================================
   IOIS PLATFORM — FRONTEND CONFIGURATION
   Public configuration only.
   NEVER put service_role keys or Telegram bot tokens here.
   ========================================================= */

window.IOIS_CONFIG = Object.assign({
    brand: "IOIS PLATFORM",
    fullName: "Indian Online Income Supporting System",
    SUPABASE_URL: "https://hrvwzviprlnpkhrgzdrc.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tXoFuC0rz0JeDOQvmpjz7w_ZAJhKOVF",
    paymentUPI: "8877490845@spicepay",
    paymentName: "Vikas Kumar",
    whatsapp: "+918877490845",
    email: "ioisplatform@gmail.com",
    registrationPage: "register.html",
    loginPage: "login.html",
    dashboardPage: "dashboard.html"
}, window.IOIS_CONFIG || {});

/* Backward-compatible aliases used by the older IOIS modules. */
window.IOIS_SUPABASE_URL = window.IOIS_CONFIG.SUPABASE_URL;
window.IOIS_SUPABASE_ANON_KEY = window.IOIS_CONFIG.SUPABASE_PUBLISHABLE_KEY;
