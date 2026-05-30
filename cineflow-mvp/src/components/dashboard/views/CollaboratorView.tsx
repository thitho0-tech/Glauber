import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectKPIs } from "@/types/dashboard";
import { AlertsCard } from "../AlertsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, FileText, MapPin, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Props = { kpis: ProjectKPIs; projectId: string };

function useOdHoje(projectId: string) {
  return useQuery({
    queryKey: ["od-hoje", projectId],
    staleTime: 30_000,
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      // OD publicada vinculada a um dia de hoje
      const { data: vinculada } = await supabase
        .from("ordens_do_dia")
        .select(`
          id, titulo, versao, publicada_em, token_publico,
          dia:dias_filmagem(data, locacao:locacoes(nome, endereco, cidade))
        `)
        .eq("projeto_id", projectId)
        .not("publicada_em", "is", null)
        .order("publicada_em", { ascending: false })
        .limit(5);

      // Filtrar pelo dia de hoje
      const odHoje = (vinculada ?? []).find((od: any) => od.dia?.data === hoje);
      if (odHoje) return odHoje;

      // Fallback: OD autônoma com data = hoje
      const { data: autonoma } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, versao, publicada_em, token_publico, data")
        .eq("projeto_id", projectId)
        .eq("data", hoje)
        .not("publicada_em", "is", null)
        .maybeSingle();

      return autonoma ?? null;
    },
  });
}

function useCheckInHoje(projectId: string, userId?: string) {
  return useQuery({
    queryKey: ["checkin-hoje", projectId, userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async () => {
      if (!userId) return null;
      const hoje = new Date().toISOString().slice(0, 10);

      // Buscar projeto_pessoa_id do usuário logado via email match
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;

      const { data: pp } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas(email)")
        .eq("projeto_id", projectId)
        .is("deleted_at", null)
        .maybeSingle();

      // Filtrar por email do usuário logado
      const { data: pps } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas(email)")
        .eq("projeto_id", projectId)
        .is("deleted_at", null);

      const meu = (pps ?? []).find((p: any) =>
        p.pessoa?.email?.toLowerCase() === user.email!.toLowerCase()
      );
      if (!meu) return null;

      // Dia de hoje
      const { data: dia } = await supabase
        .from("dias_filmagem")
        .select("id")
        .eq("projeto_id", projectId)
        .eq("data", hoje)
        .maybeSingle();

      if (!dia) return { pp_id: meu.id, dia_id: null, checkin: null };

      // Check-in aberto hoje
      const { data: checkin } = await supabase
        .from("check_ins")
        .select("id, entrada, saida")
        .eq("projeto_pessoa_id", meu.id)
        .eq("dia_id", dia.id)
        .is("saida", null)
        .maybeSingle();

      return { pp_id: meu.id, dia_id: dia.id, checkin };
    },
  });
}

export function CollaboratorView({ kpis, projectId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: odHoje, isLoading: loadingOd } = useOdHoje(projectId);
  const { data: checkInData, isLoading: loadingCheckin } = useCheckInHoje(projectId, user?.id);

  const fazerCheckin = useMutation({
    mutationFn: async () => {
      if (!checkInData?.pp_id || !checkInData?.dia_id) throw new Error("Não há dia de filmagem hoje");
      const { error } = await supabase.from("check_ins").insert({
        projeto_pessoa_id: checkInData.pp_id,
        dia_id: checkInData.dia_id,
        entrada: new Date().toISOString(),
        registrado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in registrado!");
      qc.invalidateQueries({ queryKey: ["checkin-hoje", projectId, user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const locacao = (odHoje as any)?.dia?.locacao;
  const jaFezCheckin = !!checkInData?.checkin;
  const temDiaHoje = !!checkInData?.dia_id;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — OD do Dia */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm font-semibold">Ordem do Dia — Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOd ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : odHoje ? (
            <div className="space-y-2">
              <p className="font-medium text-sm">{(odHoje as any).titulo ?? "Sem título"}</p>
              <Badge variant="outline" className="text-xs">v{(odHoje as any).versao}</Badge>
              <div className="pt-1">
                <a
                  href={`/od/${(odHoje as any).token_publico}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline underline-offset-2"
                >
                  Ver OD completa →
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma OD publicada para hoje.</p>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Check-in */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          {jaFezCheckin
            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <Clock className="h-4 w-4 text-orange-500" />}
          <CardTitle className="text-sm font-semibold">Meu Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCheckin ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : jaFezCheckin ? (
            <div className="space-y-1">
              <p className="text-sm text-green-600 font-medium">✓ Presença confirmada</p>
              <p className="text-xs text-muted-foreground">
                Entrada: {new Date(checkInData.checkin!.entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ) : temDiaHoje ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Você ainda não confirmou presença hoje.</p>
              <Button size="sm" onClick={() => fazerCheckin.mutate()} disabled={fazerCheckin.isPending}>
                {fazerCheckin.isPending ? "Registrando..." : "Confirmar presença"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem dia de filmagem hoje.</p>
          )}
        </CardContent>
      </Card>

      {/* Card 3 — Locação do Dia */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <MapPin className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm font-semibold">Locação de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {locacao ? (
            <div className="space-y-1">
              <p className="font-medium text-sm">{locacao.nome}</p>
              {locacao.endereco && <p className="text-xs text-muted-foreground">{locacao.endereco}</p>}
              {locacao.cidade && <p className="text-xs text-muted-foreground">{locacao.cidade}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {odHoje ? "Locação não informada na OD." : "Nenhuma filmagem hoje."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 4 — Notificações */}
      <AlertsCard prazos={kpis.prazos_criticos} />
    </div>
  );
}
