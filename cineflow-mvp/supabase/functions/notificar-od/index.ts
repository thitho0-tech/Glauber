// ============================================================
// Glauber — Edge Function: notificar-od
// Sprint 2A — Notificação por email quando OD é publicada
// ============================================================
//
// Acionada pelo CallSheetEditor.tsx ao publicar uma OD.
// Busca os membros do projeto que têm notif_od_email = true
// e envia email via a Edge Function send-email (Gmail SMTP).
//
// Deploy:
//   supabase functions deploy notificar-od --no-verify-jwt
//
// Secrets necessários (já configurados na send-email):
//   EDGE_SHARED_SECRET  — mesmo valor usado em send-email
//   SUPABASE_URL        — injetado automaticamente pelo Supabase
//   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente
//
// Payload esperado (POST):
//   { od_id: string }
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EDGE_SHARED_SECRET = Deno.env.get("EDGE_SHARED_SECRET") ?? "";

// URL interna da função send-email (mesma instância Supabase)
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-glauber-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Auth básica via shared secret
  const secret = req.headers.get("x-glauber-secret") ?? "";
  if (!EDGE_SHARED_SECRET || secret !== EDGE_SHARED_SECRET) {
    return json({ error: "forbidden" }, 403);
  }

  let payload: { od_id?: string };
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const { od_id } = payload ?? {};
  if (!od_id) return json({ error: "od_id_obrigatorio" }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Buscar dados da OD publicada
  const { data: od, error: odErr } = await sb
    .from("ordens_do_dia")
    .select(`
      id, titulo, data_filmagem, publicada_em, versao,
      projeto:projetos(id, nome),
      dia:dias_filmagem(data, locacao:locacoes(nome, endereco))
    `)
    .eq("id", od_id)
    .eq("publicada", true)
    .single();

  if (odErr || !od) {
    return json({ error: "od_nao_encontrada_ou_nao_publicada", detail: odErr?.message }, 404);
  }

  const projetoId = (od.projeto as any)?.id;
  const projetoNome = (od.projeto as any)?.nome ?? "Projeto";
  const dataFilmagem = od.data_filmagem ?? (od.dia as any)?.data ?? "—";
  const locacaoNome = (od.dia as any)?.locacao?.nome ?? "—";

  // 2. Buscar membros que querem notificação por email
  const { data: membros, error: membrosErr } = await sb
    .from("projeto_pessoas")
    .select(`
      id,
      notif_od_email,
      pessoa:pessoas(nome, email)
    `)
    .eq("projeto_id", projetoId)
    .eq("notif_od_email", true)
    .is("deleted_at", null);

  if (membrosErr) {
    return json({ error: "erro_ao_buscar_membros", detail: membrosErr.message }, 500);
  }

  if (!membros || membros.length === 0) {
    return json({ ok: true, enviados: 0, motivo: "nenhum_membro_com_notif_email_ativo" });
  }

  // 3. Montar link público da OD (token = od_id por enquanto, pode ser hash depois)
  const linkPublico = `${SUPABASE_URL.replace("supabase.co", "supabase.co").replace("https://", "https://glauber.app.br/od/")}${od_id}`;
  // Link real: glauber.app.br/od/:od_id (route pública que já existe)
  const linkOD = `https://glauber.app.br/od/${od_id}`;

  // 4. HTML do email
  const htmlEmail = (nome: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; }
      .header { background: #1A3C5E; padding: 24px 32px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; }
      .header p { color: #aac4e0; margin: 4px 0 0; font-size: 13px; }
      .body { padding: 24px 32px; }
      .info-box { background: #EBF5FB; border-left: 4px solid #2E75B6; padding: 16px; border-radius: 4px; margin: 16px 0; }
      .info-box p { margin: 4px 0; font-size: 14px; color: #1A3C5E; }
      .btn { display: inline-block; background: #2E75B6; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold; margin: 16px 0; }
      .footer { background: #f0f0f0; padding: 12px 32px; font-size: 11px; color: #999; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Ordem do Dia Publicada</h1>
          <p>${projetoNome}</p>
        </div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Uma nova Ordem do Dia foi publicada para o projeto <strong>${projetoNome}</strong>.</p>
          <div class="info-box">
            <p><strong>OD:</strong> ${od.titulo ?? "Sem título"}</p>
            <p><strong>Data de filmagem:</strong> ${dataFilmagem}</p>
            <p><strong>Locação:</strong> ${locacaoNome}</p>
            <p><strong>Versão:</strong> ${od.versao ?? 1}</p>
          </div>
          <a href="${linkOD}" class="btn">Ver Ordem do Dia</a>
          <p style="font-size:12px;color:#888;">Ou acesse: <a href="${linkOD}">${linkOD}</a></p>
        </div>
        <div class="footer">
          Você recebeu este email porque está na equipe do projeto ${projetoNome} no Glauber.
          Para desativar estas notificações, acesse Configurações → Notificações no Glauber.
        </div>
      </div>
    </body>
    </html>
  `;

  // 5. Enviar um email por membro
  const resultados: Array<{ email: string; ok: boolean; erro?: string }> = [];

  for (const m of membros) {
    const pessoa = (m.pessoa as any);
    const email = pessoa?.email;
    const nome = pessoa?.nome ?? "Membro";

    if (!email) {
      resultados.push({ email: "—", ok: false, erro: "sem_email" });
      continue;
    }

    try {
      const resp = await fetch(SEND_EMAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cineflow-secret": EDGE_SHARED_SECRET,
        },
        body: JSON.stringify({
          to: email,
          subject: `[Glauber] OD Publicada — ${od.titulo ?? projetoNome}`,
          html: htmlEmail(nome),
        }),
      });

      const resultado = await resp.json().catch(() => ({}));
      resultados.push({ email, ok: resp.ok, erro: resp.ok ? undefined : resultado?.error });
    } catch (err: any) {
      resultados.push({ email, ok: false, erro: String(err?.message ?? err) });
    }
  }

  const enviados = resultados.filter((r) => r.ok).length;
  const falhas = resultados.filter((r) => !r.ok).length;

  return json({ ok: true, enviados, falhas, resultados });
});
