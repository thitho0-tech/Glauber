import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { getKPIStatus } from "@/types/dashboard";
import { KPICard } from "../KPICard";
import { AlertsCard } from "../AlertsCard";
import { EventsCard } from "../EventsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/utils";

type Props = { kpis: ProjectKPIs; projectId?: string };

function useContratosPendentes(projectId?: string) {
  return useQuery({
    queryKey: ["dp-contratos", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos")
        .select("id, nome, tipo, valor, status")
        .eq("projeto_id", projectId!)
        .in("status", ["rascunho", "pendente_assinatura"])
        .order("criado_em", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
}

function useHeadcount(projectId?: string) {
  return useQuery({
    queryKey: ["dp-headcount", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("projeto_pessoas")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId!)
        .is("deleted_at", null);
      return count ?? 0;
    },
  });
}

export function DPView({ kpis, projectId }: Props) {
  const { data: contratos } = useContratosPendentes(projectId);
  const { data: headcount } = useHeadcount(projectId);

  return (
    <div className="space-y-4">
      {/* KPIs financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard
          label="Roteiro Filmado"
          value={kpis.roteiro_filmado_pct}
          status={
            kpis.roteiro_filmado_pct >= 75 ? "ok"
            : kpis.roteiro_filmado_pct >= 40 ? "warning"
            : "danger"
          }
          description={`Atualizado ${new Date(kpis.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
        />
        <KPICard
          label="Orçamento Comprometido"
          value={kpis.orcamento_comprometido_pct}
          status={getKPIStatus(kpis.orcamento_comprometido_pct, true)}
          description="do orçamento total"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Alertas de prazo */}
        <AlertsCard prazos={kpis.prazos_criticos} />

        {/* Contratos pendentes */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <FileSignature className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm font-semibold">Contratos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!contratos?.length ? (
              <p className="text-xs text-muted-foreground">Nenhum contrato pendente.</p>
            ) : (
              <ul className="space-y-2">
                {contratos.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatBRL(Number(c.valor ?? 0))}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 capitalize">
                      {c.status?.replace("_", " ") ?? "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {projectId && (
              <Link
                to={`/projetos/${projectId}/contrato`}
                className="text-xs text-primary underline underline-offset-2 mt-2 block"
              >
                Ver contratos →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Eventos */}
        <EventsCard eventos={kpis.proximos_eventos} />

        {/* Headcount */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold">Equipe do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-3xl font-bold text-blue-600">{headcount ?? "—"}</span>
              <span className="text-sm text-muted-foreground mb-0.5">membros</span>
            </div>
            {projectId && (
              <Link
                to={`/projetos/${projectId}/equipe`}
                className="text-xs text-primary underline underline-offset-2"
              >
                Gerenciar equipe →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
