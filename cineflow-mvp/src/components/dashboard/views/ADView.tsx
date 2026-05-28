import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ListChecks, GitBranch, ClipboardCheck } from "lucide-react";

type Props = { kpis: ProjectKPIs; projectId: string };

export function ADView({ kpis, projectId }: Props) {
  // Próximos 3 dias de filmagem — dados virão de dia_cenas via query futura
  // Por ora mostramos o status dos KPIs disponíveis

  const prazosOrdenados = [...kpis.prazos_criticos]
    .filter((p) => new Date(p) >= new Date())
    .sort()
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Stripboard próximos 3 dias */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-600" />
          <CardTitle className="text-sm font-semibold">Stripboard — Próximos 3 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Veja o planejamento detalhado em{" "}
            <a href={`/projetos/${projectId}/cronograma`} className="underline text-primary">
              Cronograma
            </a>
            .
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-cyan-700">
              {kpis.roteiro_filmado_pct.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">do roteiro filmado</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — OD Status */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">OD Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Acesse ordens do dia em{" "}
            <a href={`/projetos/${projectId}/ordens-do-dia`} className="underline text-primary">
              Ordens do Dia
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Card 3 — Dependências Equipe */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <GitBranch className="h-4 w-4 text-indigo-500" />
          <CardTitle className="text-sm font-semibold">Dependências Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {prazosOrdenados.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dependências críticas.</p>
          ) : (
            <ul className="space-y-1">
              {prazosOrdenados.map((p) => (
                <li key={p} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(p).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="outline">prazo</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Card 4 — Checklist Produção */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-sm font-semibold">Checklist Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span
                className={kpis.roteiro_filmado_pct > 0 ? "text-green-600" : "text-muted-foreground"}
              >
                {kpis.roteiro_filmado_pct > 0 ? "✓" : "○"}
              </span>
              Roteiro decupado
            </li>
            <li className="flex items-center gap-2">
              <span
                className={kpis.orcamento_comprometido_pct > 0 ? "text-green-600" : "text-muted-foreground"}
              >
                {kpis.orcamento_comprometido_pct > 0 ? "✓" : "○"}
              </span>
              Orçamento registrado
            </li>
            <li className="flex items-center gap-2">
              <span
                className={prazosOrdenados.length > 0 ? "text-green-600" : "text-muted-foreground"}
              >
                {prazosOrdenados.length > 0 ? "✓" : "○"}
              </span>
              Editais cadastrados
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
