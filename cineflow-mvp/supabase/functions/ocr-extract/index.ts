// ============================================================
// CINEFLOW — Edge Function: ocr-extract
// ============================================================
// Recebe POST { documento_id, arquivo_url, tipo? } com header x-cineflow-secret.
// Chama Mistral OCR API e salva markdown extraido em documentos_pessoa.dados_ocr
// via service_role.
//
// Deploy: supabase functions deploy ocr-extract --no-verify-jwt
//
// Secrets necessarios:
//   MISTRAL_API_KEY  (criar em https://console.mistral.ai/api-keys)
//   EDGE_SHARED_SECRET (mesmo do send-email)
// ============================================================

// deno-lint-ignore-file no-explicit-any
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";
const EDGE_SHARED_SECRET = Deno.env.get("EDGE_SHARED_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

function detectarTipoArquivo(url: string): "document_url" | "image_url" {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "document_url";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return "image_url";
  // default: tenta como documento (Mistral aceita PDF + alguns formatos)
  return "document_url";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  if (!EDGE_SHARED_SECRET) return jsonResponse({ error: "edge_shared_secret_not_configured" }, 500);
  if (req.headers.get("x-cineflow-secret") !== EDGE_SHARED_SECRET) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  if (!MISTRAL_API_KEY) return jsonResponse({ error: "mistral_api_key_not_configured" }, 500);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "supabase_env_not_configured" }, 500);
  }

  let payload: { documento_id?: string; arquivo_url?: string; tipo?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const { documento_id, arquivo_url, tipo } = payload ?? {};
  if (!documento_id || !arquivo_url) {
    return jsonResponse({ error: "missing_fields", required: ["documento_id", "arquivo_url"] }, 400);
  }

  // 1) Chama Mistral OCR
  const docType = detectarTipoArquivo(arquivo_url);
  const mistralBody = {
    model: "mistral-ocr-latest",
    document: { type: docType, [docType]: arquivo_url },
  };

  let ocrData: any;
  try {
    const ocrResp = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mistralBody),
    });
    ocrData = await ocrResp.json().catch(() => ({}));
    if (!ocrResp.ok) {
      return jsonResponse({ error: "mistral_error", status: ocrResp.status, data: ocrData }, 502);
    }
  } catch (err: any) {
    return jsonResponse({ error: "mistral_fetch_failed", message: String(err?.message ?? err) }, 500);
  }

  // 2) Monta resultado
  const pages = (ocrData?.pages ?? []) as Array<{ index: number; markdown: string }>;
  const markdownCompleto = pages.map((p) => p.markdown).join("\n\n---\n\n");
  const dadosOcr = {
    extraido_em: new Date().toISOString(),
    modelo: ocrData?.model ?? "mistral-ocr-latest",
    paginas: pages.length,
    markdown: markdownCompleto,
    tipo_documento: tipo ?? null,
    usage: ocrData?.usage_info ?? null,
  };

  // 3) Salva no documento via service_role
  try {
    const updResp = await fetch(
      `${SUPABASE_URL}/rest/v1/documentos_pessoa?id=eq.${documento_id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ dados_ocr: dadosOcr, status: "recebido" }),
      }
    );
    if (!updResp.ok) {
      const errTxt = await updResp.text();
      return jsonResponse({ error: "supabase_update_failed", status: updResp.status, body: errTxt }, 502);
    }
  } catch (err: any) {
    return jsonResponse({ error: "supabase_fetch_failed", message: String(err?.message ?? err) }, 500);
  }

  return jsonResponse({ ok: true, paginas: pages.length, chars: markdownCompleto.length });
});
