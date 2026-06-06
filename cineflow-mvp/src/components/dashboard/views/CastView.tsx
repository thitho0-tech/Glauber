import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, FileText, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

type Props = { kpis: ProjectKPIs; projectId: string };

function useProximaFilmagem(projectId: string) {
  return useQuery({
    queryKey: ["cast-proxima-filmagem", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("dias_filmagem")
        .select("id, data, locacao:locacoes(nome, endereco), chamada_geral")
        .eq("projeto_id", projectId)
        .gte("data", hoje)
        .order("data")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

function useOdHoje(projectId: string) {
  return useQuery({
    queryKey: ["cast-od-hoje", projectId],
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, versao, publicada_em, token_publico, data")
        .eq("projeto_id", projectId)
        .not("publicada_em", "is", null)
        .or(`data.eq.${hoje}`)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

function useProximosEnsaios(projectId: string) {
  return useQuery({
    queryKey: ["cast-ensaios", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, data_inicio, local")
        .eq("projeto_id", projectId)
        .in("tipo", ["ensaio", "teste_figurino", "reuniao"])
        .eq("status", "agendado")
        .gte("data_inicio", new Date().toISOString())
        .is("deleted_at", null)
        .order("data_inicio")
        .limit(3);
      return data ?? [];
    },
  });
}

export function CastView({ kpis, projectId }: Props) {
  const { data: proximaFilmagem } = useProximaFilmagem(projectId);
  const { data: odHoje } = useOdHoje(projectId);
  const { data: ensaios } = useProximosEnsaios(projectId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Próxima Filmagem */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-pink-500" />
          <CardTitle className="text-sm font-semibold">Próxima Filmagem</CardTitle>
        </CardHeader>
        <CardContent>
          {proximaFilmagem ? (
            <div className="space-y-2">
              <p className="font-bold text-lg text-pink-600">
                {new Date(proximaFilmagem.data + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "2-digit",
                })}
              </p>
              {(proximaFilmagem as any).chamada_geral && (
                <p className="text-xs text-muted-foreground">
                  Chamada geral: {(proximaFilmagem as any).chamada_geral}
                </p>
              )}
              {(proximaFilmagem as any).locacao?.nome && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {(proximaFilmagem as any).locacao.nome}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma filmagem agendada ainda.</p>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — OD do Dia */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm font-semibold">Ordem do Dia — Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {odHoje ? (
            <div className="space-y-2">
              <p className="font-medium text-sm">{(odHoje as any).titulo ?? "Sem título"}</p>
              <Badge variant="outline" className="text-xs">v{(odHoje as any).versao}</Badge>
              {(odHoje as any).token_publico && (
                <a
                  href={`/od/${(odHoje as any).token_publico}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline underline-offset-2 block"
                >
                  Ver OD completa →
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Nenhuma OD publicada para hoje.</p>
              <Link to={`/projetos/${projectId}/ordens-do-dia`} className="text-xs text-primary underline underline-offset-2 block">
                Ver todas as ODs →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3 — Próximos Ensaios */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Users className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Próximos Ensaios</CardTitle>
        </CardHeader>
        <CardContent>
          {ensaios && ensaios.length > 0 ? (
            <ul className="space-y-2">
              {ensaios.map((ev: any) => (
                <li key={ev.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ev.titulo}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">{ev.tipo}</Badge>
                      {ev.local && <p className="text-xs text-muted-foreground truncate">{ev.local}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ev.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum ensaio agendado.</p>
              <Link to={`/projetos/${projectId}/agenda`} className="text-xs text-primary underline underline-offset-2 block">
                Ver agenda →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 4 — Figurino & Arte */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Figurino &amp; Locações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link to={`/projetos/${projectId}/figurino-arte`} className="text-xs text-primary underline underline-offset-2 block">
            Figurino &amp; Arte →
          </Link>
          <Link to={`/projetos/${projectId}/locacoes`} className="text-xs text-primary underline underline-offset-2 block">
            Locações do projeto →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
