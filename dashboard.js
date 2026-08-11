(() => {
  "use strict";

  let currentUser = null, currentMember = null, currentRegistry = null;
  const $ = id => document.getElementById(id);
  const text = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value == null || value === "" ? "—" : String(value);
  };
  const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))
  ]);

  function toast(message, type="info") {
    if (typeof window.showToast === "function") window.showToast(message, type);
    else console.warn(message);
  }

  function formatDate(v) {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("hi-IN", {
      day:"2-digit", month:"short", year:"numeric"
    });
  }

  async function init() {
    try {
      const auth = window.IOISAuth;
      if (!auth) throw new Error("AUTH_NOT_READY");

      const session = await withTimeout(auth.getSession(), 10000, "SESSION_TIMEOUT");
      if (!session?.user) {
        location.replace("login.html?redirect=dashboard.html");
        return;
      }
      currentUser = session.user;

      const client = auth.getClient();
      if (!client) throw new Error("SUPABASE_NOT_READY");

      // Query both existing IOIS sources independently. A missing/blocked
      // members row must not prevent the registry row from loading.
      const [membersResult, registryResult] = await Promise.allSettled([
        withTimeout(
          client.from("members").select("*").eq("auth_user_id", currentUser.id).maybeSingle(),
          8000, "MEMBER_QUERY_TIMEOUT"
        ),
        withTimeout(
          client.from("iois_member_registry").select("*").eq("user_id", currentUser.id).maybeSingle(),
          8000, "REGISTRY_QUERY_TIMEOUT"
        )
      ]);

      currentMember =
        membersResult.status === "fulfilled" && !membersResult.value.error
          ? membersResult.value.data
          : null;

      currentRegistry =
        registryResult.status === "fulfilled" && !registryResult.value.error
          ? registryResult.value.data
          : null;

      // Some older registrations have the registry row but the members row
      // is incomplete. Registry is therefore a valid source, not an error.
      if (!currentMember && !currentRegistry) {
        console.error("IOIS member sources:", membersResult, registryResult);
        throw new Error("MEMBER_NOT_FOUND");
      }

      const m = currentMember || {};
      const r = currentRegistry || {};
      const u = currentUser.user_metadata || {};

      const name =
        m.full_name || r.full_name || u.full_name || "IOIS Member";
      const email =
        m.email || r.email || currentUser.email || "";
      const phone =
        m.mobile || r.phone || u.phone || "";
      const id =
        m.iois_user_id || r.member_id || "Pending";
      const plan =
        m.selected_plan || r.plan_name || r.plan_code || "—";
      const amount =
        m.plan_amount ?? r.plan_amount ?? null;
      const status =
        m.status || "pending";
      const sponsor =
        m.sponsor_id || r.sponsor_id || "—";
      const address =
        m.address || r.address || "";
      const withdrawal =
        r.withdrawal_details || "";
      const joined =
        m.created_at || r.created_at || null;

      [
        ["dashboard-name", name],
        ["profile-name", name],
        ["profile-email", email],
        ["profile-phone", phone],
        ["profile-address", address],
        ["profile-sponsor-id", sponsor],
        ["profile-sponsor-name", r.sponsor_name || "—"],
        ["user-id", id],
        ["dashboard-user-id", id],
        ["member-id", id],
        ["membership-plan", plan],
        ["plan-name", plan],
        ["plan-amount", amount == null ? "—" : `₹${amount}`],
        ["member-status", status],
        ["registration-date", formatDate(joined)],
        ["withdrawal-upi", withdrawal || "—"],
        ["withdrawal-details", withdrawal || "—"]
      ].forEach(([k,v]) => text(k,v));

      document.querySelectorAll("[data-member-id]").forEach(el => el.textContent = id);
      document.querySelectorAll("[data-member-name]").forEach(el => el.textContent = name);
      document.querySelectorAll("[data-status]").forEach(el => el.textContent = status);

      // Referral link: keep it deterministic and client-side.
      const referral = id && id !== "Pending"
        ? `${location.origin}${location.pathname.replace(/[^/]*$/, "")}register.html?ref=${encodeURIComponent(id)}`
        : "";
      document.querySelectorAll("[data-referral-link]").forEach(el => el.textContent = referral || "—");
      const referralInput = $("referral-link");
      if (referralInput) referralInput.value = referral;

      $("dashboard-loading")?.classList.add("hidden");
      $("dashboard-content")?.classList.remove("hidden");

    } catch (e) {
      console.error("IOIS dashboard:", e);
      $("dashboard-loading")?.classList.add("hidden");
      $("dashboard-content")?.classList.remove("hidden");

      const message =
        e.message === "MEMBER_NOT_FOUND"
          ? "आपका Member record अभी उपलब्ध नहीं है। कृपया registration पूरा होने की पुष्टि करें।"
          : e.message === "SESSION_TIMEOUT"
          ? "Session check में समय लग रहा है। कृपया page refresh करें।"
          : "Member data load नहीं हो पाया।";

      toast(message, "error");
    }
  }

  window.handleIOISLogout = async () => {
    try {
      await window.IOISAuth?.getClient()?.auth.signOut();
    } finally {
      location.replace("login.html");
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
