// ============================================================
// Types — Sprint 1A Command Center Dashboard
// ============================================================

export type ProximoEvento = {
  tipo: "edital" | "pagamento" | "evento_criativo";
  data: string;        // ISO date "YYYY-MM-DD"
  responsavel: string; // email ou nome
  titulo: string;
};

export type ProjectKPIs = {
  id: string;
  projeto_id: string;
  roteiro_filmado_pct: number;        // 0–100
  orcamento_comprometido_pct: number; // 0–100
  prazos_criticos: string[];          // ISO dates
  proximos_eventos: ProximoEvento[];
  updated_at: string;
  updated_by: string | null;
};

/** Roles do dashboard — mapeados de ProjectRole (useProjectRole) */
export type DashboardRole =
  | "dp"
  | "produtor"
  | "diretor"
  | "ad"
  | "colaborador";

/** Mapeamento ProjectRole → DashboardRole */
export function mapRoleToDashboard(
  role: "owner" | "admin" | "producao" | "departamento" | "leitor" | null
): DashboardRole {
  switch (role) {
    case "owner":
    case "admin":
      return "dp";
    case "producao":
      return "produtor";
    case "departamento":
      return "ad";
    case "leitor":
    default:
      return "colaborador";
  }
}

export type KPIStatus = "ok" | "warning" | "danger";

/** Retorna status visual baseado no percentual */
export function getKPIStatus(pct: number, invert = false): KPIStatus {
  const v = invert ? 100 - pct : pct;
  if (v >= 75) return "danger";
  if (v >= 50) return "warning";
  return "ok";
}
