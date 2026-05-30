import { useQuery } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Film, CalendarDays, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

type Props = { kpis: ProjectKPIs; projectId: string };

function useProximoEnsaio(projectId: string) {
  return useQuery({
    queryKey: ["diretor-ensaio", projectId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, data_inicio, local, descricao")
        .eq("projeto_id", projectId)
        .in("tipo", ["ensaio", "reuniao", "teste_figurino"])
        .eq("status", "agendado")
        .gte("data_inicio", new Date().toISOString())
        .is("deleted_at", null)
        .order("data_inicio")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

function useOdMaisRecente(projectId: string) {
  return useQuery({
    queryKey: ["diretor-od-recente", projectId],
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

function useStatusDecupagem(projectId: string) {
  return useQuery({
    queryKey: ["diretor-decupagem", projectId],
    staleTime: 120_000,
    queryFn: async () => {
      const { count: total } = await supabase
        .from("roteiro_cenas")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId);

      const { count: filmadas } = await supabase
        .from("roteiro_cenas")
        .select("id", { count: "exact", head: true })
        .eq("projeto_id", projectId)
        .not("cabecalho", "is", null); // cenas com cabeçalho = decupadas

      return { total: total ?? 0, decupadas: filmadas ?? 0 };
    },
  });
}

export function DirectorView({ kpis, projectId }: Props) {
  const { data: ensaio } = useProximoEnsaio(projectId);
  const { data: odRecente } = useOdMaisRecente(projectId);
  const { data: decupagem } = useStatusDecupagem(projectId);

  const pctDecupado = decupagem && decupagem.total > 0
    ? Math.round((decupagem.decupadas / decupagem.total) * 100)
    : kpis.roteiro_filmado_pct;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Próximo Ensaio / Evento Criativo */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Próximo Evento Criativo</CardTitle>
        </CardHeader>
        <CardContent>
          {ensaio ? (
            <div className="space-y-2">
              <p className="font-medium text-sm leading-snug">{ensaio.titulo}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">{ensaio.tipo}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(ensaio.data_inicio).toLocaleDateString("pt-BR", {
                    weekday: "short", day: "2-digit", month: "2-digit",
                  })}
                </span>
              </div>
              {ensaio.local && (
                <p className="text-xs text-muted-foreground">{ensaio.local}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum ensaio ou reunião agendado.</p>
              <Link
                to={`/projetos/${projectId}/agenda`}
                className="text-xs text-primary underline underline-offset-2 block"
              >
                Agendar evento →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — OD Mais Recente */}
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
              <Link
                to={`/projetos/${projectId}/ordens-do-dia/od/${odRecente.id}`}
                className="text-xs text-primary underline underline-offset-2 block"
              >
                Ver OD →
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma OD publicada ainda.</p>
          )}
        </CardContent>
      </Card>

      {/* Card 3 — Status da Decupagem */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Film className="h-4 w-4 text-pink-500" />
          <CardTitle className="text-sm font-semibold">Status da Decupagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {decupagem && decupagem.total > 0 ? (
              <>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-pink-600">{decupagem.decupadas}</span>
                  <span className="text-sm text-muted-foreground mb-0.5">/ {decupagem.total} cenas</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-pink-500 transition-all duration-500"
                    style={{ width: `${pctDecupado}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{pctDecupado}% decupado</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Roteiro não enviado ainda.{" "}
                <Link to={`/projetos/${projectId}/roteiro`} className="text-primary underline underline-offset-2">
                  Enviar →
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Referências / Lookbook */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CheckSquare className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Figurino &amp; Arte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Referências visuais, moodboard e figurinos do projeto.
          </p>
          <Link
            to={`/projetos/${projectId}/figurino-arte`}
            className="text-xs text-primary underline underline-offset-2"
          >
            Abrir Figurino &amp; Arte →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
