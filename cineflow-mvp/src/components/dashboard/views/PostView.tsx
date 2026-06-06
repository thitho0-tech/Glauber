import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Clock, FileText, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

type Props = { kpis: ProjectKPIs; projectId: string };

function useDiasFilmados(projectId: string) {
  return useQuery({
    queryKey: ["post-dias-filmados", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { count: total } = await supabase
        .from("dias_filmagem")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId);

      const { count: filmados } = await supabase
        .from("dias_filmagem")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId)
        .eq("status", "filmado");

      return { total: total ?? 0, filmados: filmados ?? 0 };
    },
  });
}

function usePrazos(projectId: string) {
  return useQuery({
    queryKey: ["post-prazos", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, data_inicio, status")
        .eq("projeto_id", projectId)
        .in("tipo", ["entrega", "reuniao", "outro"])
        .eq("status", "agendado")
        .gte("data_inicio", new Date().toISOString())
        .is("deleted_at", null)
        .order("data_inicio")
        .limit(4);
      return data ?? [];
    },
  });
}

function useOdMaisRecente(projectId: string) {
  return useQuery({
    queryKey: ["post-od", projectId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, versao, publicada_em, data")
        .eq("projeto_id", projectId)
        .not("publicada_em", "is", null)
        .order("publicada_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function PostView({ kpis, projectId }: Props) {
  const { data: dias } = useDiasFilmados(projectId);
  const { data: prazos } = usePrazos(projectId);
  const { data: odRecente } = useOdMaisRecente(projectId);

  const pctDias = dias && dias.total > 0 ? Math.round((dias.filmados / dias.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Material Entregue */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Film className="h-4 w-4 text-cyan-500" />
          <CardTitle className="text-sm font-semibold">Dias Filmados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-cyan-600">{dias?.filmados ?? 0}</span>
              <span className="text-sm text-muted-foreground mb-0.5">/ {dias?.total ?? 0} dias</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${pctDias}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{pctDias}% do material rodado</p>
            <Link to={`/projetos/${projectId}/cronograma`} className="text-xs text-primary underline underline-offset-2 block">
              Ver cronograma →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — % Roteiro */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Clock className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Roteiro Filmado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-violet-600">
                {kpis.roteiro_filmado_pct.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">das cenas</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${kpis.roteiro_filmado_pct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Próximos Prazos */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm font-semibold">Próximos Prazos</CardTitle>
        </CardHeader>
        <CardContent>
          {prazos && prazos.length > 0 ? (
            <ul className="space-y-2">
              {prazos.map((ev: any) => (
                <li key={ev.id} className="flex items-start justify-between gap-2">
                  <p className="text-sm truncate">{ev.titulo}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ev.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum prazo na agenda.</p>
              <Link to={`/projetos/${projectId}/agenda`} className="text-xs text-primary underline underline-offset-2 block">
                Criar evento →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 4 — Última OD / Referência */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-500" />
          <CardTitle className="text-sm font-semibold">Última OD Publicada</CardTitle>
        </CardHeader>
        <CardContent>
          {odRecente ? (
            <div className="space-y-2">
              <p className="font-medium text-sm leading-snug">{odRecente.titulo ?? "Sem título"}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">v{odRecente.versao}</Badge>
                {odRecente.data && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(odRecente.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <Link to={`/projetos/${projectId}/ordens-do-dia`} className="text-xs text-primary underline underline-offset-2 block">
                Ver ODs →
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma OD publicada ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
