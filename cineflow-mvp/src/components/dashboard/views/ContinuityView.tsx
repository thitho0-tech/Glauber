import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, ListChecks, CalendarDays, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

type Props = { kpis: ProjectKPIs; projectId: string };

function useCenas(projectId: string) {
  return useQuery({
    queryKey: ["continuity-cenas", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("roteiro_cenas")
        .select("id, numero_cena, cabecalho, dia_id")
        .eq("projeto_id", projectId)
        .order("ordem");
      return data ?? [];
    },
  });
}

function useOdRecente(projectId: string) {
  return useQuery({
    queryKey: ["continuity-od", projectId],
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

export function ContinuityView({ kpis, projectId }: Props) {
  const { data: cenas } = useCenas(projectId);
  const { data: odRecente } = useOdRecente(projectId);

  const total = cenas?.length ?? 0;
  const comDia = (cenas ?? []).filter((c: any) => c.dia_id).length;
  const pct = total > 0 ? Math.round((comDia / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Cenas no Stripboard */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Film className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Cenas no Stripboard</CardTitle>
        </CardHeader>
        <CardContent>
          {total > 0 ? (
            <div className="space-y-2">
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-violet-600">{comDia}</span>
                <span className="text-sm text-muted-foreground mb-0.5">/ {total} cenas agendadas</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{pct}% com dia marcado</p>
              <Link to={`/projetos/${projectId}/cronograma`} className="text-xs text-primary underline underline-offset-2 block">
                Abrir Stripboard →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Roteiro não enviado ainda.</p>
              <Link to={`/projetos/${projectId}/roteiro`} className="text-xs text-primary underline underline-offset-2 block">
                Enviar roteiro →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Progresso Filmagem */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <ListChecks className="h-4 w-4 text-emerald-500" />
          <CardTitle className="text-sm font-semibold">Progresso Filmagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-emerald-600">
                {kpis.roteiro_filmado_pct.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">filmado</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${kpis.roteiro_filmado_pct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Última OD */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
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

      {/* Card 4 — Acessos rápidos */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Acessos Rápidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link to={`/projetos/${projectId}/cronograma`} className="text-xs text-primary underline underline-offset-2 block">
            Cronograma de filmagem →
          </Link>
          <Link to={`/projetos/${projectId}/roteiro`} className="text-xs text-primary underline underline-offset-2 block">
            Roteiro / Decupagem →
          </Link>
          <Link to={`/projetos/${projectId}/agenda`} className="text-xs text-primary underline underline-offset-2 block">
            Agenda de eventos →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
