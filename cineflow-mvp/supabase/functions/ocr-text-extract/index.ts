// ============================================================
// CINEFLOW — Edge Function: ocr-text-extract
// ============================================================
// Versao generica do OCR: recebe um arquivo_url, chama Mistral OCR
// e DEVOLVE o markdown extraido (sem persistir em tabela nenhuma).
// Usado para importar equipe principal a partir de PDF/imagem
// no modal "Novo projeto".
//
// Deploy: supabase functions deploy ocr-text-extract --no-verify-jwt
//
// Secrets necessarios (mesmos do ocr-extract):
//   MISTRAL_API_KEY
//   EDGE_SHARED_SECRET
// ============================================================

// deno-lint-ignore-file no-explicit-any
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";

// Esta funcao eh chamada do FRONT (supabase.functions.invoke), entao a
// protecao eh via Supabase Auth (JWT do usuario logado). NAO usa
// x-cineflow-secret porque o secret nao pode ser exposto no JS do browser.
// Deploy: supabase functions deploy ocr-text-extract  (SEM --no-verify-jwt)

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  if (!MISTRAL_API_KEY) return jsonResponse({ error: "mistral_api_key_not_configured" }, 500);

  let payload: { arquivo_url?: string; arquivo_base64?: string; mime?: string };
  try { payload = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const { arquivo_url, arquivo_base64, mime } = payload ?? {};
  if (!arquivo_url && !arquivo_base64) {
    return jsonResponse({ error: "missing_fields", required: ["arquivo_url ou arquivo_base64"] }, 400);
  }

  // Se veio base64, monta data URI; caso contrário usa a URL.
  let docUrl = arquivo_url ?? "";
  let docType: "document_url" | "image_url";
  if (arquivo_base64) {
    const inferido = (mime ?? "application/pdf").toLowerCase();
    docUrl = `data:${inferido};base64,${arquivo_base64}`;
    docType = inferido.startsWith("image/") ? "image_url" : "document_url";
  } else {
    docType = detectarTipoArquivo(docUrl);
  }

  const mistralBody = {
    model: "mistral-ocr-latest",
    document: { type: docType, [docType]: docUrl },
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

  const pages = (ocrData?.pages ?? []) as Array<{ index: number; markdown: string }>;
  const markdown = pages.map((p) => p.markdown).join("\n\n---\n\n");

  return jsonResponse({
    ok: true,
    paginas: pages.length,
    chars: markdown.length,
    markdown,
  });
});
