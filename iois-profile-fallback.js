/* IOIS PROFILE COMPATIBILITY LAYER
   Read-only compatibility helper for legacy members.
   Never exposes service-role credentials. */
(function(){
  "use strict";
  async function load(userId, client){
    if(!userId || !client) return null;
    const [p,m,r] = await Promise.allSettled([
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("members").select("*").eq("auth_user_id", userId).maybeSingle(),
      client.from("iois_member_registry").select("*").eq("user_id", userId).maybeSingle()
    ]);
    const profile = p.status === "fulfilled" && !p.value.error ? p.value.data : null;
    const member = m.status === "fulfilled" && !m.value.error ? m.value.data : null;
    const registry = r.status === "fulfilled" && !r.value.error ? r.value.data : null;
    // If the legacy registry row is not linked by UUID, use the
    // SECURITY DEFINER RPC which validates the authenticated user's email
    // server-side. Direct client-side email lookup is blocked by RLS.
    if(!registry && window.supabase && userId){
      try {
        const { data: legacy } = await client.rpc("iois_get_legacy_profile");
        if(legacy) registry = legacy;
      } catch (e) {
        console.warn("IOIS legacy profile RPC unavailable:", e);
      }
    }

    if(!profile && !member && !registry) return null;
    const user = window.__ioisCurrentAuthUser || null;
    return {
      ...(profile || {}),
      id: profile?.id || userId,
      auth_user_id: member?.auth_user_id || profile?.auth_user_id || userId,
      user_id: profile?.user_id || member?.iois_user_id || registry?.member_id || "",
      unique_user_id: profile?.unique_user_id || member?.iois_user_id || registry?.member_id || "",
      iois_user_id: member?.iois_user_id || registry?.member_id || profile?.iois_user_id || "",
      member_id: member?.iois_user_id || registry?.member_id || profile?.member_id || "",
      full_name: member?.full_name || registry?.full_name || profile?.full_name || user?.user_metadata?.full_name || "",
      email: member?.email || registry?.email || profile?.email || user?.email || "",
      phone: member?.mobile || registry?.phone || profile?.phone || profile?.whatsapp || "",
      whatsapp: member?.mobile || registry?.phone || profile?.whatsapp || profile?.phone || "",
      whatsapp_number: member?.mobile || registry?.phone || profile?.whatsapp_number || profile?.whatsapp || "",
      address: member?.address || registry?.address || profile?.address || "",
      sponsor_id: member?.sponsor_id || registry?.sponsor_id || profile?.sponsor_id || "",
      sponsor_name: registry?.sponsor_name || profile?.sponsor_name || "",
      membership_plan: member?.selected_plan || registry?.plan_name || registry?.plan_code || profile?.membership_plan || "",
      plan_name: registry?.plan_name || member?.selected_plan || profile?.plan_name || profile?.membership_name || "",
      plan_code: registry?.plan_code || profile?.plan_code || member?.selected_plan || "",
      plan_amount: member?.plan_amount ?? registry?.plan_amount ?? profile?.plan_amount ?? profile?.amount ?? null,
      amount: member?.plan_amount ?? registry?.plan_amount ?? profile?.amount ?? profile?.plan_amount ?? null,
      status: member?.status || registry?.status || profile?.status || "pending",
      withdrawal_upi: registry?.withdrawal_details || profile?.withdrawal_upi || "",
      withdrawal_details: registry?.withdrawal_details || profile?.withdrawal_details || "",
      created_at: member?.created_at || registry?.created_at || profile?.created_at || null
    };
  }
  window.IOISProfile = { load };
})();
