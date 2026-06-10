import type { ProjectKPIs } from "@/types/dashboard";
import { AlertsCard } from "../AlertsCard";
import { EventsCard } from "../EventsCard";

type Props = { kpis: ProjectKPIs; projectId?: string };

export function DPView({ kpis }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AlertsCard prazos={kpis.prazos_criticos} />
        <EventsCard eventos={kpis.proximos_eventos} />
      </div>
    </div>
  );
}
