/* IOIS SIMPLE AUTH — Supabase Email + Password only */
(() => {
  "use strict";

  const C = window.IOIS_CONFIG || {};
  const URL = C.SUPABASE_URL;
  const KEY = C.SUPABASE_PUBLISHABLE_KEY || C.SUPABASE_ANON_KEY;
  const $ = id => document.getElementById(id);

  if (!window.supabase || !URL || !KEY) {
    console.error("IOIS: Supabase configuration/library missing.");
    return;
  }

  const client = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const timeout = (p, ms=10000) => Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms))
  ]);

  function message(text, type="error") {
    const el = $("alert-area");
    if (!el) { console.warn(text); return; }
    el.textContent = text;
    el.className = "mt-4 rounded-xl border p-4 text-sm " +
      (type === "success"
        ? "border-emerald-400/40 bg-emerald-950/30 text-emerald-200"
        : "border-red-400/40 bg-red-950/30 text-red-200");
    el.classList.remove("hidden");
  }

  function page() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  async function getSession() {
    const { data, error } = await timeout(client.auth.getSession());
    if (error) throw error;
    return data.session || null;
  }

  async function getCurrentUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function login(email, password) {
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    if (!email || !password) {
      message("Email और Password दोनों भरें।");
      return { success:false };
    }

    try {
      const { data, error } = await timeout(
        client.auth.signInWithPassword({ email, password })
      );
      if (error) {
        const m = String(error.message || "");
        if (/invalid login credentials/i.test(m))
          message("Email या Password गलत है।");
        else if (/email not confirmed/i.test(m))
          message("Supabase में Confirm email को OFF करें।");
        else
          message(m || "Login नहीं हो सका।");
        return { success:false, error };
      }
      if (!data.session) {
        message("Login session नहीं बनी।");
        return { success:false };
      }
      message("Login सफल हुआ।", "success");
      return { success:true, user:data.user, session:data.session };
    } catch (e) {
      message(e.message === "TIMEOUT"
        ? "Login में बहुत समय लग रहा है। Internet connection check करें।"
        : "Login service से connection नहीं हो पाया।");
      return { success:false, error:e };
    }
  }

  async function logout(redirect="login.html") {
    try { await timeout(client.auth.signOut()); }
    catch (e) { console.warn("Logout:", e); }
    if (redirect) location.href = redirect;
  }

  async function forgotPassword(email) {
    email = String(email || "").trim().toLowerCase();
    if (!email) { message("Registered Email Address डालें।"); return false; }
    try {
      const redirectTo = new URL("reset-password.html", location.href).href;
      const { error } = await timeout(
        client.auth.resetPasswordForEmail(email, { redirectTo })
      );
      if (error) throw error;
      message("Password reset link आपके registered email पर भेज दिया गया है।", "success");
      return true;
    } catch (e) {
      message(e.message === "TIMEOUT"
        ? "Request में बहुत समय लग रहा है।"
        : (e.message || "Password reset नहीं हो सका।"));
      return false;
    }
  }

  async function updateProfile(updates={}) {
    const user = await getCurrentUser();
    if (!user) { message("पहले login करें।"); return {success:false}; }
    const allowed = {
      full_name: String(updates.full_name || "").trim(),
      mobile: String(updates.mobile || updates.phone || "").trim(),
      address: String(updates.address || "").trim()
    };
    const clean = Object.fromEntries(Object.entries(allowed).filter(([,v]) => v));
    const { data, error } = await timeout(
      client.from("members").update(clean).eq("auth_user_id", user.id).select().maybeSingle()
    );
    if (error) { message(error.message || "Profile save नहीं हुआ।"); return {success:false,error}; }
    message("Profile successfully updated.", "success");
    return {success:true,data};
  }

  async function requireLogin() {
    const session = await getSession();
    if (!session?.user) {
      location.replace("login.html?redirect=" + encodeURIComponent(page()));
      return null;
    }
    return session;
  }

  async function redirectIfLoggedIn() {
    const session = await getSession();
    if (session?.user && page() === "login.html") location.replace("dashboard.html");
    return session;
  }

  function getPostLoginRedirect() {
    const q = new URLSearchParams(location.search).get("redirect");
    return q && /^[a-zA-Z0-9._/?=&-]+$/.test(q) ? q : "dashboard.html";
  }

  function getSelectedPlan() {
    try { return JSON.parse(localStorage.getItem("iois_selected_plan") || "null"); }
    catch (_) { return null; }
  }

  function saveSelectedPlan(plan) {
    try { localStorage.setItem("iois_selected_plan", JSON.stringify(plan)); } catch (_) {}
  }

  async function loadProfile() {
    const user = await getCurrentUser();
    if (!user) return null;
    const { data, error } = await timeout(
      client.from("members").select("*").eq("auth_user_id", user.id).maybeSingle()
    );
    if (error) { console.warn("Profile:", error); return null; }
    return data;
  }

  async function loadUniqueUserId() {
    const m = await loadProfile();
    const id = m?.iois_user_id || m?.member_id || "";
    document.querySelectorAll("#unique-user-id,#dashboard-user-id,#user-id,#member-id")
      .forEach(el => { if (id) el.textContent = id; });
    return id;
  }

  function isAdmin() { return false; }
  async function requireAdmin() { return isAdmin(); }

  function init() { return client; }

  window.IOISAuth = {
    client,
    init, getClient: () => client, getSession, getCurrentUser,
    login, logout, forgotPassword, updateProfile, requireLogin,
    redirectIfLoggedIn, getPostLoginRedirect, getSelectedPlan,
    saveSelectedPlan, loadProfile, loadUniqueUserId, isAdmin, requireAdmin,
    register: null
  };

  function bindLogin() {
    const form = $("login-form");
    if (!form || form.dataset.ioisBound) return;
    form.dataset.ioisBound = "1";
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;
      const r = await login($("login-email")?.value, $("login-password")?.value);
      if (btn) btn.disabled = false;
      if (r.success) setTimeout(() => location.href = getPostLoginRedirect(), 250);
    });
  }

  function bindForgot() {
    const form = $("forgot-password-form");
    if (!form || form.dataset.ioisBound) return;
    form.dataset.ioisBound = "1";
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;
      await forgotPassword($("forgot-email")?.value);
      if (btn) btn.disabled = false;
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindLogin();
    bindForgot();
    if (page() === "login.html") await redirectIfLoggedIn().catch(console.warn);
  });
})();
