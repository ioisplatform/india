import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status=200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({message:"Method not allowed"},405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY)
    return json({code:"AUTH_NOT_CONFIGURED", message:"Member login service is not configured."},500);

  let body: any;
  try { body = await req.json(); } catch { return json({message:"Invalid JSON."},400); }

  const memberId = String(body?.member_id || "").trim().toUpperCase();
  const password = String(body?.password || "");

  if (!memberId || !password) return json({message:"Member ID and password are required."},400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken:false, persistSession:false }
  });

  // Only the server can see the email mapping. It is never returned to the browser.
  const { data: member, error: memberError } = await admin
    .from("members")
    .select("auth_user_id,email,status,iois_user_id")
    .eq("iois_user_id", memberId)
    .maybeSingle();

  if (memberError) {
    console.error(memberError);
    return json({code:"SERVER_ERROR", message:"Member lookup failed."},500);
  }

  if (!member) return json({code:"MEMBER_NOT_FOUND", message:"Member ID not found."},404);

  const status = String(member.status || "").toLowerCase();
  if (["rejected","blocked","suspended","inactive"].includes(status))
    return json({code:"MEMBER_INACTIVE", message:"Member account is not active."},403);

  if (!member.email)
    return json({code:"AUTH_NOT_CONFIGURED", message:"Member authentication email is missing."},500);

  // Supabase Auth's token endpoint does not send an email; it simply verifies
  // the password and returns the normal Supabase session.
  const tokenResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:"POST",
    headers:{
      "apikey": ANON_KEY,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ email: member.email, password })
  });

  const token = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !token.access_token) {
    return json({code:"INVALID_PASSWORD", message:"Invalid Member ID or password."},401);
  }

  return json({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_in: token.expires_in,
    token_type: token.token_type,
    user: token.user ? { id: token.user.id } : undefined
  });
});
