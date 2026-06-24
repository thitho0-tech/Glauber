// ============================================================
// CINEFLOW — parseTeamCsv
// ============================================================
// Parser leve (sem dependências) para texto colado de planilhas
// (CSV, TSV, copy/paste do Excel/Sheets) ou markdown de OCR.
//
// Detecta separador automaticamente (tab > ; > ,)
// Detecta header: se a primeira linha contém uma palavra que parece
// "nome"/"funcao"/"email", trata como cabeçalho e pula.
// ============================================================

export interface TeamRow {
  nome: string;
  funcao: string;
  funcao_av_id?: string;
  email: string;
  convidar: boolean;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectarSeparador(linha: string): string {
  if (linha.includes("\t")) return "\t";
  if (linha.includes(";")) return ";";
  if (linha.includes("|")) return "|";
  return ",";
}

function eHeader(linha: string[]): boolean {
  const join = linha.join(" ").toLowerCase();
  return /\b(nome|name)\b/.test(join) && /\b(email|e-mail)\b/.test(join);
}

function limpaCelula(s: string | undefined): string {
  if (!s) return "";
  return s.trim().replace(/^["']|["']$/g, "").trim();
}

function eMarkdownTabela(texto: string): boolean {
  // Detecta tabela em markdown:
  // | Nome | Função | E-mail |
  // |------|--------|--------|
  return /^\s*\|.+\|\s*$/m.test(texto) && /^\s*\|[\s\-:|]+\|\s*$/m.test(texto);
}

function parseMarkdownTabela(texto: string): TeamRow[] {
  const linhas = texto.split(/\r?\n/).filter((l) => /^\s*\|.+\|\s*$/.test(l));
  const rows: TeamRow[] = [];
  for (const linha of linhas) {
    // pula linha separadora |---|---|
    if (/^\s*\|[\s\-:|]+\|\s*$/.test(linha)) continue;
    const cells = linha.split("|").slice(1, -1).map(limpaCelula);
    if (cells.length < 2) continue;
    // pula header
    if (eHeader(cells)) continue;
    rows.push({
      nome: cells[0] ?? "",
      funcao: cells[1] ?? "",
      email: (cells[2] ?? "").toLowerCase(),
      convidar: true,
    });
  }
  return rows.filter((r) => r.nome);
}

export function parseTeamCsv(textoBruto: string): TeamRow[] {
  const texto = (textoBruto ?? "").trim();
  if (!texto) return [];

  // Caminho rápido para markdown de OCR
  if (eMarkdownTabela(texto)) {
    const r = parseMarkdownTabela(texto);
    if (r.length) return r;
  }

  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];

  const sep = detectarSeparador(linhas[0]);

  const rows: TeamRow[] = [];
  let comecou = false;
  for (const raw of linhas) {
    const cells = raw.split(sep).map(limpaCelula);
    if (!comecou && eHeader(cells)) {
      comecou = true;
      continue;
    }
    comecou = true;
    if (!cells[0]) continue;
    rows.push({
      nome: cells[0],
      funcao: cells[1] ?? "",
      email: (cells[2] ?? "").toLowerCase(),
      convidar: true,
    });
  }
  return rows;
}

export function validarEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_RX.test(email);
}

export function templateCsv(): string {
  return "Nome,Função,E-mail\nAna Silva,Diretora,ana@exemplo.com\nJoão Souza,Diretor de Fotografia,joao@exemplo.com\nMaria Costa,Produtora Executiva,maria@exemplo.com\n";
}
