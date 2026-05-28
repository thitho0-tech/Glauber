import type { ProjectKPIs } from "@/types/dashboard";
import { EventsCard } from "../EventsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Film, Image } from "lucide-react";

type Props = { kpis: ProjectKPIs; projectId: string };

export function DirectorView({ kpis, projectId }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Eventos criativos */}
      <EventsCard
        eventos={kpis.proximos_eventos}
        title="Próximos Eventos Criativos"
        filterTipo="evento_criativo"
      />

      {/* Card 2 — Tarefas pendentes (placeholder — virá de tabela tarefas) */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CheckSquare className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Tarefas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            As tarefas atribuídas a você aparecerão aqui.
          </p>
        </CardContent>
      </Card>

      {/* Card 3 — Status da Decupagem */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Film className="h-4 w-4 text-pink-500" />
          <CardTitle className="text-sm font-semibold">Status da Decupagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cenas decupadas</span>
              <span className="font-semibold">
                {kpis.roteiro_filmado_pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-500"
                style={{ width: `${kpis.roteiro_filmado_pct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Lookbook / Referências */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Image className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Lookbook & Referências</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Acesse as referências visuais do projeto em{" "}
            <a href={`/projetos/${projectId}/figurino-arte`} className="underline text-primary">
              Figurino &amp; Arte
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
