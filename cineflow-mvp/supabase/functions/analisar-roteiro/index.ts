// ============================================================
// CINEFLOW — Edge Function: analisar-roteiro
// ============================================================
// Recebe { roteiro_id }, lê o texto via service_role, chama
// Mistral chat (modelo large) em JSON mode com um prompt que
// pede decupagem COMPLETA (cenas + personagens + arte + figurino
// + efeitos + planos sugeridos), e salva tudo em
//   roteiro_cenas + roteiro_planos_sugeridos
// atualizando roteiros.status -> 'decupado' (ou 'erro').
//
// Deploy: supabase functions deploy analisar-roteiro
//   (precisa de JWT do usuario logado pra rodar)
//
// Secrets necessarios:
//   MISTRAL_API_KEY  (ja existe)
// ============================================================

// deno-lint-ignore-file no-explicit-any
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

const SYSTEM_PROMPT = `Você é um assistente de direção de produção audiovisual brasileira.
Receba um roteiro e produza uma DECUPAGEM TÉCNICA COMPLETA em JSON.

Regras:
- Identifique cada cena pelo cabeçalho (INT./EXT., locação, dia/noite).
- Para cada cena, extraia: número, cabeçalho, ambiente (INT/EXT/INT-EXT), local, horário (DIA/NOITE/AMANHECER/etc), sinopse curta (1-2 frases), personagens presentes (lista de nomes próprios em maiúsculas como aparecem no roteiro), elementos de arte (objetos cênicos relevantes), figurino sugerido por personagem, efeitos especiais, sonoplastia/música, locação sugerida (descrição textual), duração estimada em minutos (1 página ≈ 1 min), e até 4 planos sugeridos (com tipo: PG/PM/PP/Close/Detalhe; movimento: estático/pan/tilt/travelling/dolly/grua/steadicam/mão/drone; lente sugerida e descrição breve).
- Use o vocabulário técnico do audiovisual brasileiro.
- Se uma informação não puder ser inferida, retorne string vazia ou array vazio.
- IMPORTANTE: a resposta DEVE ser um JSON válido seguindo o schema, sem texto extra.

Schema esperado:
{
  "cenas": [
    {
      "numero_cena": "1",
      "cabecalho": "INT. SALA DE ESTAR - DIA",
      "ambiente": "INT",
      "local": "Sala de estar",
      "horario": "DIA",
      "sinopse": "...",
      "personagens": ["MARIA", "JOAO"],
      "arte": ["sofá vermelho", "quadro abstrato"],
      "figurino": [{"personagem":"MARIA", "item":"vestido azul"}],
      "efeitos": [],
      "som": ["música ambiente"],
      "locacao_sugerida": "apartamento de classe média",
      "duracao_estimada_min": 2.5,
      "planos_sugeridos": [
        {"plano_numero":1, "tipo_plano":"PG", "movimento":"estatico", "lente":"35mm", "descricao":"Estabelece a sala"}
      ]
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  if (!MISTRAL_API_KEY) return jsonResponse({ error: "mistral_api_key_not_configured" }, 500);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "supabase_env_not_configured" }, 500);
  }

  let payload: { roteiro_id?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  const { roteiro_id } = payload ?? {};
  if (!roteiro_id) return jsonResponse({ error: "missing_roteiro_id" }, 400);

  const adminHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  // 1) marca status = analisando
  await fetch(`${SUPABASE_URL}/rest/v1/roteiros?id=eq.${roteiro_id}`, {
    method: "PATCH",
    headers: { ...adminHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ status: "analisando", mensagem_erro: null }),
  });

  try {
    // 2) carrega texto do roteiro
    const getResp = await fetch(`${SUPABASE_URL}/rest/v1/roteiros?id=eq.${roteiro_id}&select=texto`, {
      headers: adminHeaders,
    });
    const arr = await getResp.json().catch(() => []);
    const texto = arr?.[0]?.texto ?? "";
    if (!texto) throw new Error("Roteiro sem texto");

    // Trunca texto se for muito grande (Mistral large suporta 128k tokens; ~400k chars)
    const textoTrunc = texto.length > 350_000 ? texto.slice(0, 350_000) + "\n\n[...truncado]" : texto;

    // 3) chama Mistral
    const mistralResp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 16000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Roteiro:\n\n" + textoTrunc },
        ],
      }),
    });
    const mistralData = await mistralResp.json().catch(() => ({}));
    if (!mistralResp.ok) {
      throw new Error(`Mistral retornou ${mistralResp.status}: ${JSON.stringify(mistralData).slice(0, 500)}`);
    }
    const conteudo = mistralData?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(conteudo);
    } catch (e) {
      throw new Error("Mistral devolveu JSON invalido");
    }
    const cenas = Array.isArray(parsed?.cenas) ? parsed.cenas : [];
    if (!cenas.length) throw new Error("Mistral nao encontrou nenhuma cena");

    // 4) limpa cenas antigas (idempotente: re-decupar substitui)
    await fetch(`${SUPABASE_URL}/rest/v1/roteiro_cenas?roteiro_id=eq.${roteiro_id}`, {
      method: "DELETE",
      headers: { ...adminHeaders, Prefer: "return=minimal" },
    });

    // 5) insere cenas em batch
    const cenasPayload = cenas.map((c: any, idx: number) => ({
      roteiro_id,
      ordem: idx + 1,
      numero_cena: String(c.numero_cena ?? idx + 1),
      cabecalho: c.cabecalho ?? null,
      ambiente: c.ambiente ?? null,
      local: c.local ?? null,
      horario: c.horario ?? null,
      sinopse: c.sinopse ?? null,
      personagens: Array.isArray(c.personagens) ? c.personagens : [],
      arte: Array.isArray(c.arte) ? c.arte : [],
      figurino: Array.isArray(c.figurino) ? c.figurino : [],
      efeitos: Array.isArray(c.efeitos) ? c.efeitos : [],
      som: Array.isArray(c.som) ? c.som : [],
      locacao_sugerida: c.locacao_sugerida ?? null,
      duracao_estimada_min: typeof c.duracao_estimada_min === "number" ? c.duracao_estimada_min : null,
      pagina_inicio: typeof c.pagina_inicio === "number" ? c.pagina_inicio : null,
      pagina_fim: typeof c.pagina_fim === "number" ? c.pagina_fim : null,
    }));

    const insResp = await fetch(`${SUPABASE_URL}/rest/v1/roteiro_cenas`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify(cenasPayload),
    });
    const cenasInseridas = await insResp.json().catch(() => []);
    if (!insResp.ok) {
      throw new Error(`Erro inserindo cenas: ${JSON.stringify(cenasInseridas).slice(0, 500)}`);
    }

    // 6) insere planos sugeridos por cena
    const planosPayload: any[] = [];
    cenas.forEach((c: any, idx: number) => {
      const cenaInserida = cenasInseridas[idx];
      if (!cenaInserida) return;
      const planos = Array.isArray(c.planos_sugeridos) ? c.planos_sugeridos : [];
      planos.forEach((p: any, pidx: number) => {
        planosPayload.push({
          cena_id: cenaInserida.id,
          plano_numero: typeof p.plano_numero === "number" ? p.plano_numero : pidx + 1,
          tipo_plano: p.tipo_plano ?? null,
          movimento: p.movimento ?? null,
          lente: p.lente ?? null,
          equipamento: p.equipamento ?? null,
          descricao: p.descricao ?? null,
          duracao_estimada_seg: typeof p.duracao_estimada_seg === "number" ? p.duracao_estimada_seg : null,
        });
      });
    });

    if (planosPayload.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/roteiro_planos_sugeridos`, {
        method: "POST",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify(planosPayload),
      });
    }

    // 7) marca status decupado
    await fetch(`${SUPABASE_URL}/rest/v1/roteiros?id=eq.${roteiro_id}`, {
      method: "PATCH",
      headers: { ...adminHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "decupado",
        modelo_ia: "mistral-large-latest",
        decupado_em: new Date().toISOString(),
        mensagem_erro: null,
      }),
    });

    return jsonResponse({
      ok: true,
      cenas: cenas.length,
      planos: planosPayload.length,
    });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    await fetch(`${SUPABASE_URL}/rest/v1/roteiros?id=eq.${roteiro_id}`, {
      method: "PATCH",
      headers: { ...adminHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "erro", mensagem_erro: msg }),
    });
    return jsonResponse({ error: "analise_falhou", message: msg }, 500);
  }
});
