// ============================================================
// GLAUBER — Edge Function: analisar-contrato
// ============================================================
// Recebe { arquivo_url } (PDF/imagem, tipicamente uma signed URL do
// bucket "documentos"), roda Mistral OCR para extrair o texto e, em
// seguida, Mistral chat (JSON mode) para identificar de forma
// estruturada os campos de "enquadramento" do contrato:
//     { tipo, contratada, valor }
// Devolve o JSON ao front (NÃO persiste nada). O usuário sempre
// confirma/edita antes de salvar, e pode reeditar depois no formulário.
//
// Chamada do FRONT via supabase.functions.invoke("analisar-contrato").
// Proteção via Supabase Auth (JWT do usuário logado).
// Deploy: supabase functions deploy analisar-contrato   (SEM --no-verify-jwt)
//
// Secrets (mesmos do ocr-extract / ocr-text-extract):
//   MISTRAL_API_KEY
// ============================================================

// deno-lint-ignore-file no-explicit-any
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectarTipoArquivo(url: string): "document_url" | "image_url" {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "document_url";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return "image_url";
  return "document_url";
}

// Domínio de "tipo" aceito pelo app (espelha o CHECK da tabela contratos)
const TIPOS_VALIDOS = [
  "servicos_tecnicos",
  "roteirista",
  "direcao",
  "elenco",
  "fornecedor",
  "cessao_direitos",
  "coproducao",
  "outro",
];

// Converte "R$ 1.500,50" | "1500.50" | "mil e quinhentos" -> número
function parseValor(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && isFinite(v)) return v;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/r\$/gi, "").replace(/\s/g, "");
  // formato pt-BR: 1.234,56 -> remove pontos de milhar, vírgula vira ponto
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s.replace(/[^\d.\-]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!MISTRAL_API_KEY) return jsonResponse({ error: "mistral_api_key_not_configured" }, 500);

  let payload: { arquivo_url?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const arquivo_url = payload?.arquivo_url;
  if (!arquivo_url) {
    return jsonResponse({ error: "missing_fields", required: ["arquivo_url"] }, 400);
  }

  // 1) OCR via Mistral
  const docType = detectarTipoArquivo(arquivo_url);
  let markdown = "";
  try {
    const ocrResp = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: docType, [docType]: arquivo_url },
      }),
    });
    const ocrData = await ocrResp.json().catch(() => ({}));
    if (!ocrResp.ok) {
      return jsonResponse({ error: "mistral_ocr_error", status: ocrResp.status, data: ocrData }, 502);
    }
    const pages = (ocrData?.pages ?? []) as Array<{ markdown: string }>;
    markdown = pages.map((p) => p.markdown).join("\n\n");
  } catch (err: any) {
    return jsonResponse({ error: "mistral_ocr_fetch_failed", message: String(err?.message ?? err) }, 500);
  }

  if (!markdown.trim()) {
    return jsonResponse({ ok: true, tipo: null, contratada: null, valor: null, aviso: "texto_vazio" });
  }

  // Limita o texto enviado ao chat (contratos podem ser longos)
  const textoParaIA = markdown.slice(0, 12000);

  // 2) Extração estruturada via Mistral chat (JSON mode)
  const sistema =
    "Você é um assistente jurídico que lê contratos de produção audiovisual brasileiros " +
    "e extrai apenas três campos de enquadramento. Responda SOMENTE em JSON válido, " +
    "sem texto extra. Campos:\n" +
    '- "tipo": classifique o contrato em UM destes valores exatos: ' +
    TIPOS_VALIDOS.join(", ") +
    ". Use 'servicos_tecnicos' para prestação de serviços técnicos de equipe; " +
    "'roteirista' p/ roteiro; 'direcao' p/ direção (fotografia, arte, produção); " +
    "'elenco' p/ atores/atrizes; 'fornecedor' p/ locação/equipamento/serviço de terceiro; " +
    "'cessao_direitos' quando o objeto central é cessão de direitos; " +
    "'coproducao' p/ coprodução/apoio; 'outro' se não encaixar.\n" +
    '- "contratada": nome/razão social da CONTRATADA (a parte que presta o serviço/recebe), ' +
    "não a contratante/produtora. Texto puro.\n" +
    '- "valor": valor total bruto do contrato como número (ex.: 4000.00). Se não achar, null.\n' +
    'Se algum campo não for encontrado, use null. Formato: {"tipo": "...", "contratada": "...", "valor": 0}';

  let extraido: any = {};
  try {
    const chatResp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: "Contrato:\n\n" + textoParaIA },
        ],
      }),
    });
    const chatData = await chatResp.json().catch(() => ({}));
    if (!chatResp.ok) {
      return jsonResponse({ error: "mistral_chat_error", status: chatResp.status, data: chatData }, 502);
    }
    const content = chatData?.choices?.[0]?.message?.content ?? "{}";
    try { extraido = JSON.parse(content); } catch { extraido = {}; }
  } catch (err: any) {
    return jsonResponse({ error: "mistral_chat_fetch_failed", message: String(err?.message ?? err) }, 500);
  }

  // 3) Normaliza a saída
  let tipo = typeof extraido?.tipo === "string" ? extraido.tipo.trim() : null;
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) tipo = "outro";
  const contratada =
    typeof extraido?.contratada === "string" && extraido.contratada.trim()
      ? extraido.contratada.trim()
      : null;
  const valor = parseValor(extraido?.valor);

  return jsonResponse({ ok: true, tipo, contratada, valor });
});
