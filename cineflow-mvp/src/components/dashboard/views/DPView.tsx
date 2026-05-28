import type { ProjectKPIs } from "@/types/dashboard";
import { getKPIStatus } from "@/types/dashboard";
import { KPICard } from "../KPICard";
import { AlertsCard } from "../AlertsCard";
import { EventsCard } from "../EventsCard";

type Props = { kpis: ProjectKPIs };

export function DPView({ kpis }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1 — Roteiro Filmado (maior = melhor) */}
        <KPICard
          label="Roteiro Filmado"
          value={kpis.roteiro_filmado_pct}
          status={
            kpis.roteiro_filmado_pct >= 75
              ? "ok"
              : kpis.roteiro_filmado_pct >= 40
              ? "warning"
              : "danger"
          }
          description={`Atualizado ${new Date(kpis.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
        />

        {/* KPI 2 — Orçamento Comprometido (maior = pior) */}
        <KPICard
          label="Orçamento Comprometido"
          value={kpis.orcamento_comprometido_pct}
          status={getKPIStatus(kpis.orcamento_comprometido_pct, true)}
          description="do orçamento total"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AlertsCard prazos={kpis.prazos_criticos} />
        <EventsCard eventos={kpis.proximos_eventos} />
      </div>
    </div>
  );
}
