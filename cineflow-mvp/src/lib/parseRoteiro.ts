// ============================================================
// CINEFLOW — parseRoteiro
// ============================================================
// Lê arquivos de roteiro de diferentes formatos e devolve texto plano:
//   .pdf  → Mistral OCR (Edge Function ocr-text-extract)
//   .fdx  → parse XML no browser (Final Draft)
//   .docx → mammoth.js carregado via CDN
//   .doc  → orientação pra converter (formato antigo, sem suporte direto)
//   txt   → leitura direta
// ============================================================

import { supabase } from "@/lib/supabase";

export type RoteiroFormato = "pdf" | "fdx" | "docx" | "doc" | "txt";

export function detectarFormato(file: File): RoteiroFormato | null {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".pdf")) return "pdf";
  if (nome.endsWith(".fdx")) return "fdx";
  if (nome.endsWith(".docx")) return "docx";
  if (nome.endsWith(".doc")) return "doc";
  if (nome.endsWith(".txt") || nome.endsWith(".md")) return "txt";
  return null;
}

// ---------- .fdx (Final Draft) ----------

export function parseFDX(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const erro = doc.querySelector("parsererror");
  if (erro) throw new Error("FDX inválido");

  const paragrafos = Array.from(doc.querySelectorAll("Paragraph"));
  const linhas: string[] = [];
  for (const p of paragrafos) {
    const tipo = (p.getAttribute("Type") ?? "").toUpperCase();
    const textos = Array.from(p.querySelectorAll("Text")).map((t) => t.textContent ?? "").join("");
    const limpo = textos.trim();
    if (!limpo) continue;
    if (tipo === "SCENE HEADING") {
      linhas.push("\n" + limpo.toUpperCase() + "\n");
    } else if (tipo === "CHARACTER") {
      linhas.push("\n" + limpo);
    } else if (tipo === "PARENTHETICAL") {
      linhas.push("(" + limpo + ")");
    } else if (tipo === "ACTION" || tipo === "DIALOGUE" || tipo === "TRANSITION") {
      linhas.push(limpo);
    } else {
      linhas.push(limpo);
    }
  }
  return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------- .docx via mammoth (CDN) ----------

let mammothLoaded: Promise<any> | null = null;

function carregarMammoth(): Promise<any> {
  if ((globalThis as any).mammoth) return Promise.resolve((globalThis as any).mammoth);
  if (mammothLoaded) return mammothLoaded;
  mammothLoaded = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = () => {
      const m = (globalThis as any).mammoth;
      if (m) resolve(m); else reject(new Error("mammoth não carregou"));
    };
    script.onerror = () => reject(new Error("Falha ao baixar mammoth"));
    document.head.appendChild(script);
  });
  return mammothLoaded;
}

export async function parseDOCX(file: File): Promise<string> {
  const mammoth = await carregarMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer });
  return String(res?.value ?? "").trim();
}

// ---------- .pdf via Edge Function (Mistral OCR) ----------

export async function parsePDF(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("PDF maior que 8MB. Comprima ou divida em partes.");
  }
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const arquivo_base64 = btoa(binary);

  const { data, error } = await supabase.functions.invoke("ocr-text-extract", {
    body: { arquivo_base64, mime: file.type || "application/pdf" },
  });
  if (error) throw error;
  const res: any = data;
  if (res?.error) throw new Error(res.error);
  return String(res?.markdown ?? "").trim();
}

// ---------- Roteador principal ----------

export async function extrairTextoDoArquivo(file: File): Promise<{ texto: string; formato: RoteiroFormato }> {
  const formato = detectarFormato(file);
  if (!formato) throw new Error("Formato não suportado. Use .pdf, .docx, .fdx ou .txt");

  if (formato === "doc") {
    throw new Error(
      "Formato .doc (Word antigo) não é suportado diretamente. Abra o arquivo no Word e exporte como .docx ou .pdf."
    );
  }

  if (formato === "txt") return { texto: (await file.text()).trim(), formato };
  if (formato === "fdx") return { texto: parseFDX(await file.text()), formato };
  if (formato === "docx") return { texto: await parseDOCX(file), formato };
  if (formato === "pdf") return { texto: await parsePDF(file), formato };
  throw new Error("Formato desconhecido");
}

export function paginasEstimadas(texto: string): number {
  // Heurística simples — 1 página de roteiro padrão ~ 3000-3500 caracteres
  return Math.max(1, Math.round(texto.length / 3000));
}
