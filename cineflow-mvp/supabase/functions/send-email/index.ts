// ============================================================
// CINEFLOW — Edge Function: send-email (Gmail SMTP)
// ============================================================
// Recebe POST { to, subject, html } com header x-cineflow-secret
// e envia via SMTP do Gmail usando denomailer.
//
// Pre-requisito: criar uma "App password" do Gmail em
//   https://myaccount.google.com/apppasswords
// (com 2FA ativo, eh obrigatorio; nao da pra usar a senha normal)
//
// Deploy:
//   supabase functions deploy send-email --no-verify-jwt
//
// Secrets (configure no Dashboard ou via CLI):
//   supabase secrets set GMAIL_USER=thitho0@gmail.com
//   supabase secrets set GMAIL_APP_PASSWORD="aaaa bbbb cccc dddd"
//   supabase secrets set GMAIL_FROM_NAME="CINEFLOW"
//   supabase secrets set EDGE_SHARED_SECRET=... (ja existe)
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_APP_PASSWORD = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replace(/\s+/g, "");
const GMAIL_FROM_NAME = Deno.env.get("GMAIL_FROM_NAME") ?? "CINEFLOW";
const EDGE_SHARED_SECRET = Deno.env.get("EDGE_SHARED_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cineflow-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  if (!EDGE_SHARED_SECRET) return jsonResponse({ error: "edge_shared_secret_not_configured" }, 500);
  if ((req.headers.get("x-cineflow-secret") ?? "") !== EDGE_SHARED_SECRET) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return jsonResponse({ error: "gmail_credentials_not_configured" }, 500);
  }

  let payload: { to?: string; subject?: string; html?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const { to, subject, html } = payload ?? {};
  if (!to || !subject || !html) {
    return jsonResponse({ error: "missing_fields", required: ["to", "subject", "html"] }, 400);
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });

  try {
    await client.send({
      from: `${GMAIL_FROM_NAME} <${GMAIL_USER}>`,
      to,
      subject,
      content: "auto",
      html,
    });
    await client.close();
    return jsonResponse({ ok: true });
  } catch (err: any) {
    try { await client.close(); } catch { /* ignore */ }
    return jsonResponse({ error: "smtp_send_failed", message: String(err?.message ?? err) }, 502);
  }
});
