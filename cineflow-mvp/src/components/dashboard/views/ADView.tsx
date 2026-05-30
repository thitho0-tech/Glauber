import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ListChecks, Users, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

type Props = { kpis: ProjectKPIs; projectId: string };

function useOdDoDia(projectId: string) {
  return useQuery({
    queryKey: ["ad-od-hoje", projectId],
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);

      // OD publicada vinculada a dia de hoje
      const { data } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, versao, publicada_em, data, dia:dias_filmagem(data)")
        .eq("projeto_id", projectId)
        .not("publicada_em", "is", null)
        .order("publicada_em", { ascending: false })
        .limit(10);

      const odHoje = (data ?? []).find(
        (od: any) => od.data === hoje || od.dia?.data === hoje
      );
      if (odHoje) return { od: odHoje, tipo: "hoje" };

      // Próxima OD publicada futura
      const proxima = (data ?? [])
        .filter((od: any) => {
          const d = od.data ?? od.dia?.data;
          return d && d > hoje;
        })
        .sort((a: any, b: any) => {
          const da = a.data ?? a.dia?.data ?? "";
          const db = b.data ?? b.dia?.data ?? "";
          return da.localeCompare(db);
        })[0];

      return proxima ? { od: proxima, tipo: "proxima" } : null;
    },
  });
}

function useEquipeHoje(projectId: string) {
  return useQuery({
    queryKey: ["ad-equipe-hoje", projectId],
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);

      // Dia de filmagem de hoje
      const { data: dia } = await supabase
        .from("dias_filmagem")
        .select("id")
        .eq("projeto_id", projectId)
        .eq("data", hoje)
        .maybeSingle();

      const totalEquipe = await supabase
        .from("projeto_pessoas")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId)
        .is("deleted_at", null);

      if (!dia) return { confirmados: 0, total: totalEquipe.count ?? 0, temDia: false };

      const { count: confirmados } = await supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("dia_id", dia.id)
        .is("saida", null);

      return {
        confirmados: confirmados ?? 0,
        total: totalEquipe.count ?? 0,
        temDia: true,
        diaId: dia.id,
      };
    },
  });
}

function useProximosEventos(projectId: string) {
  return useQuery({
    queryKey: ["ad-eventos", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, data_inicio, local, status")
        .eq("projeto_id", projectId)
        .eq("status", "agendado")
        .gte("data_inicio", new Date().toISOString())
        .is("deleted_at", null)
        .order("data_inicio")
        .limit(3);
      return data ?? [];
    },
  });
}

export function ADView({ kpis, projectId }: Props) {
  const { data: odData, isLoading: loadingOd } = useOdDoDia(projectId);
  const { data: equipe, isLoading: loadingEquipe } = useEquipeHoje(projectId);
  const { data: eventos } = useProximosEventos(projectId);

  const pct = equipe && equipe.total > 0
    ? Math.round((equipe.confirmados / equipe.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — OD do Dia */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            {odData?.tipo === "hoje" ? "OD de Hoje" : "Próxima OD"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOd ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : odData ? (
            <div className="space-y-2">
              <p className="font-medium text-sm leading-snug">{odData.od.titulo ?? "Sem título"}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">v{odData.od.versao}</Badge>
                {odData.tipo === "hoje" && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Hoje</Badge>
                )}
              </div>
              <Link
                to={`/projetos/${projectId}/ordens-do-dia`}
                className="text-xs text-primary underline underline-offset-2 block"
              >
                Ver todas as ODs →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Nenhuma OD publicada.</p>
              <Link
                to={`/projetos/${projectId}/ordens-do-dia`}
                className="text-xs text-primary underline underline-offset-2 block"
              >
                Criar OD →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Equipe Confirmada */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm font-semibold">Equipe Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEquipe ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : equipe?.temDia ? (
            <div className="space-y-2">
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-blue-600">{equipe.confirmados}</span>
                <span className="text-sm text-muted-foreground mb-0.5">/ {equipe.total} confirmados</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{pct}% da equipe no set</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-muted-foreground">{equipe?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">membros na equipe · sem filmagem hoje</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3 — Stripboard: % roteiro filmado */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-600" />
          <CardTitle className="text-sm font-semibold">Progresso do Roteiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-cyan-600">
                {kpis.roteiro_filmado_pct.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">filmado</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${kpis.roteiro_filmado_pct}%` }}
              />
            </div>
            <Link
              to={`/projetos/${projectId}/cronograma`}
              className="text-xs text-primary underline underline-offset-2 block"
            >
              Ver cronograma →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Próximos Eventos */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {!eventos?.length ? (
            <p className="text-xs text-muted-foreground">Nenhum evento agendado.</p>
          ) : (
            <ul className="space-y-2">
              {eventos.map((ev: any) => (
                <li key={ev.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ev.titulo}</p>
                    {ev.local && <p className="text-xs text-muted-foreground truncate">{ev.local}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ev.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
