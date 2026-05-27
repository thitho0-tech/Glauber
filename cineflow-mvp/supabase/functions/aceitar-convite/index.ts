// ============================================================
// CINEFLOW — Edge Function: aceitar-convite
// ============================================================
// Aceita um convite criando a conta do usuario JA confirmada
// (bypass do email confirmation do Supabase Auth, que estava
// quebrando o fluxo: signUp criava o user mas nao logava,
// e aceitar_convite() falhava por nao ter auth.uid()).
//
// Fluxo:
//   1. Recebe { token, password }
//   2. Chama validar_convite() via REST pra pegar o e-mail do convite
//   3. Cria/atualiza o user via Admin API com email_confirm: true
//   4. Retorna { ok: true, email } - o front faz signInWithPassword
//      depois e chama aceitar_convite() ja autenticado
//
// Deploy: supabase functions deploy aceitar-convite  (SEM --no-verify-jwt)
//   Esta funcao precisa ser acessivel anonima (usuario NAO esta
//   logado quando recebe o convite), entao na real eh
//   --no-verify-jwt mesmo. Vamos validar pelo token do convite.
// ============================================================

// deno-lint-ignore-file no-explicit-any
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "supabase_env_not_configured" }, 500);
  }

  let payload: { token?: string; password?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const { token, password } = payload ?? {};
  if (!token || !password) {
    return jsonResponse({ error: "missing_fields", required: ["token", "password"] }, 400);
  }
  if (password.length < 8) {
    return jsonResponse({ error: "weak_password", message: "Senha precisa ter pelo menos 8 caracteres" }, 400);
  }

  // 1) valida o convite via RPC publica
  let conviteInfo: any;
  try {
    const valResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validar_convite`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
    });
    conviteInfo = await valResp.json();
    if (!valResp.ok) {
      return jsonResponse({ error: "validar_convite_failed", details: conviteInfo }, 502);
    }
  } catch (err: any) {
    return jsonResponse({ error: "validar_fetch_failed", message: String(err?.message ?? err) }, 500);
  }

  if (conviteInfo?.status !== "pendente") {
    return jsonResponse({
      error: "convite_indisponivel",
      mensagem: conviteInfo?.mensagem ?? "Convite nao esta mais pendente",
      status_convite: conviteInfo?.status,
    }, 400);
  }

  const email = String(conviteInfo.email ?? "").toLowerCase();
  if (!email) return jsonResponse({ error: "convite_sem_email" }, 400);

  // 2) tenta CRIAR o user (Admin API) ja com email confirmado
  const adminHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: conviteInfo.pessoa_nome ?? "" },
    }),
  });
  const createData: any = await createResp.json().catch(() => ({}));

  if (createResp.ok) {
    return jsonResponse({ ok: true, email, criado: true });
  }

  // Se ja existe (email_exists, user_already_exists, etc), tudo certo:
  // o front vai tentar signInWithPassword. Se a senha bater, prossegue.
  const msg = String(createData?.msg ?? createData?.message ?? createData?.error_description ?? "").toLowerCase();
  const code = String(createData?.error_code ?? createData?.code ?? "").toLowerCase();
  const jaExiste =
    msg.includes("already") || msg.includes("exists") ||
    code.includes("exists") || code.includes("registered") ||
    createResp.status === 422;

  if (jaExiste) {
    return jsonResponse({ ok: true, email, criado: false });
  }

  return jsonResponse({
    error: "admin_create_failed",
    status: createResp.status,
    data: createData,
  }, 502);
});
