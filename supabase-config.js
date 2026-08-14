/* =========================================================
   IOIS PLATFORM
   SUPABASE CONFIGURATION
   =========================================================

   SECURITY:
   - ONLY Supabase Project URL + ANON/PUBLISHABLE KEY
   - NEVER put service_role key here
   - NEVER put Telegram Bot Token here
   ========================================================= */

const IOIS_SUPABASE_CONFIG_URL = window.IOIS_SUPABASE_CONFIG_URL || "https://hrvwzviprlnpkhrgzdrc.supabase.co";

const IOIS_SUPABASE_CONFIG_ANON_KEY = window.IOIS_SUPABASE_CONFIG_ANON_KEY || "sb_publishable_tXoFuC0rz0JeDOQvmpjz7w_ZAJhKOVF";


window.IOIS_SUPABASE_URL = IOIS_SUPABASE_CONFIG_URL;
window.IOIS_SUPABASE_ANON_KEY = IOIS_SUPABASE_CONFIG_ANON_KEY;

/* ---------------------------------------------------------
   Supabase Client
   --------------------------------------------------------- */

if (
    typeof window.supabase === "undefined" &&
    typeof window.supabaseClient === "undefined"
) {
    console.error(
        "IOIS: Supabase JS library is not loaded. Add Supabase CDN before this file."
    );
}


/* ---------------------------------------------------------
   Create client
   --------------------------------------------------------- */

let ioisSupabase = null;

try {

    if (
        typeof window.supabase !== "undefined" &&
        typeof window.supabase.createClient === "function"
    ) {

        ioisSupabase = window.supabase.createClient(
            IOIS_SUPABASE_CONFIG_URL,
            IOIS_SUPABASE_CONFIG_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );

    }

} catch (error) {

    console.error(
        "IOIS Supabase initialization error:",
        error
    );

}


/* ---------------------------------------------------------
   Global compatibility
   --------------------------------------------------------- */

window.ioisSupabase = ioisSupabase;


/* ---------------------------------------------------------
   Configuration check
   --------------------------------------------------------- */

function ioisSupabaseConfigured() {

    if (!IOIS_SUPABASE_CONFIG_URL ||
        IOIS_SUPABASE_CONFIG_URL.includes("YOUR_SUPABASE")) {

        return false;
    }

    if (!IOIS_SUPABASE_CONFIG_ANON_KEY ||
        IOIS_SUPABASE_CONFIG_ANON_KEY.includes("YOUR_SUPABASE")) {

        return false;
    }

    return !!ioisSupabase;
}


/* ---------------------------------------------------------
   Get current session
   --------------------------------------------------------- */

async function ioisGetSession() {

    if (!ioisSupabase) {
        return {
            session: null,
            error: new Error("Supabase is not configured.")
        };
    }

    try {

        const {
            data,
            error
        } = await ioisSupabase.auth.getSession();

        return {
            session: data?.session || null,
            error
        };

    } catch (error) {

        return {
            session: null,
            error
        };

    }

}


/* ---------------------------------------------------------
   Get current user
   --------------------------------------------------------- */

async function ioisGetUser() {

    if (!ioisSupabase) {
        return {
            user: null,
            error: new Error("Supabase is not configured.")
        };
    }

    try {

        const {
            data,
            error
        } = await ioisSupabase.auth.getUser();

        return {
            user: data?.user || null,
            error
        };

    } catch (error) {

        return {
            user: null,
            error
        };

    }

}


/* ---------------------------------------------------------
   Logout
   --------------------------------------------------------- */

async function ioisLogout() {

    if (!ioisSupabase) {
        return {
            success: false,
            error: new Error("Supabase is not configured.")
        };
    }

    try {

        const {
            error
        } = await ioisSupabase.auth.signOut();

        if (error) {

            return {
                success: false,
                error
            };

        }

        return {
            success: true,
            error: null
        };

    } catch (error) {

        return {
            success: false,
            error
        };

    }

}


/* ---------------------------------------------------------
   Expose helpers
   --------------------------------------------------------- */

window.ioisSupabaseConfigured = ioisSupabaseConfigured;
window.ioisGetSession = ioisGetSession;
window.ioisGetUser = ioisGetUser;
window.ioisLogout = ioisLogout;


/* ---------------------------------------------------------
   Debug information
   --------------------------------------------------------- */

if (!ioisSupabaseConfigured()) {

    console.warn(
        "IOIS: Supabase configuration is incomplete. " +
        "Set IOIS_SUPABASE_URL and IOIS_SUPABASE_ANON_KEY."
    );

}
