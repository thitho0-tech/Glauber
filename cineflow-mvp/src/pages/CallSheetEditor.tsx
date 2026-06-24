import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, Send, Save, Plus, Trash2, ExternalLink,
  MapPin, Utensils, ShieldAlert, Sparkles, Car, FileText,
  Printer, Clock, Sun, Bell, Users, Radio, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

interface Contato { nome: string; funcao: string; telefone: string; }
interface HoraHora { inicio: string; fim: string; atividade: string; }
interface ElencoODItem {
  personagem: string; ator: string; cenas: string;
  chega: string; caracterizacao: string; figurino: string;
  pronta: string; prev_saida: string;
}
interface FiguracaoItem {
  qtd: string; descricao: string; cenas: string;
  chega: string; camarim: string; prontos: string; saida: string;
}

interface ODData {
  // Seção 1 — Cabeçalho adicional
  od_numero?: string;
  unidade_ciclo?: string;
  direcao_nome?: string;
  producao_nome?: string;
  // Seção 2 — Chamadas
  chamada_geral?: string;
  cafe_inicio?: string;
  cafe_fim?: string;
  cafe_local?: string;
  roda?: string;
  almoco_inicio?: string;
  almoco_fim?: string;
  almoco_local?: string;
  corta_camera?: string;
  fim_dia?: string;
  // Seção 3 — Previsão do tempo
  tempo_condicao?: string;
  tempo_min?: string;
  tempo_max?: string;
  tempo_chuva_pct?: string;
  tempo_nascer_sol?: string;
  tempo_por_sol?: string;
  // Seção 4 — Avisos do dia
  avisos?: string[];
  // Seção 5 — Bases
  base_camarim?: string;
  base_refeicao?: string;
  base_logger?: string;
  // Seção 6 — Hora a hora
  hora_a_hora?: HoraHora[];
  // Seção 8 — Elenco OD
  elenco_od?: ElencoODItem[];
  // Seção 9 — Figuração
  figuracao?: FiguracaoItem[];
  // Seção 12 — Contatos importantes
  contatos_emergencia_lista?: Contato[];
  // Seção 13 — Rodapé
  hospital?: string;
  canais_radio?: string;
  links_uteis?: string;
  notas_importantes?: string;
  resumo_dia_seguinte?: string;
  // Legado
  refeicoes?: { tipo: string; horario: string }[];
  bebidas?: string;
  estacionamento_local?: string;
  estacionamento_vagas?: string;
  estacionamento_observacoes?: string;
  bloqueio_ruas?: string;
  clima?: string;
  efeitos_especiais?: string;
  observacoes?: string;
  contatos_emergencia?: string;
}

const DEPARTAMENTOS = [
  { value: "direcao", label: "Direção" },
  { value: "producao", label: "Produção" },
  { value: "fotografia", label: "Fotografia" },
  { value: "arte", label: "Arte" },
  { value: "som", label: "Som" },
  { value: "elenco", label: "Elenco" },
  { value: "logistica", label: "Logística" },
  { value: "figurino", label: "Figurino" },
  { value: "maquiagem", label: "Maquiagem" },
  { value: "outros", label: "Outros" },
];
const DEPT_LABEL: Record<string, string> = Object.fromEntries(DEPARTAMENTOS.map((d) => [d.value, d.label]));
const TIPO_LABEL: Record<string, string> = {
  filmagem: "Filmagem", ensaio: "Ensaio", reuniao: "Reunião",
  pesquisa: "Pesquisa", outro: "Outro",
};
const APROVACAO_OD_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};
const APROVACAO_OD_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary",
  aprovada: "default",
  rejeitada: "destructive",
};

export default function CallSheetEditor() {
  const { id: projetoId, odId, diaId } = useParams<{ id: string; odId?: string; diaId?: string }>();
  const qc = useQueryClient();
  const { can } = usePermissions(projetoId);
  const [dados, setDados] = useState<ODData>({ refeicoes: [{ tipo: "Almoço", horario: "13:00" }] });
  const [showRejeitarDialog, setShowRejeitarDialog] = useState(false);
  const [rejeitarComment, setRejeitarComment] = useState("");

  const { data: od, isLoading: lOd } = useQuery({
    queryKey: ["od-edit", odId ?? diaId],
    enabled: !!(odId || diaId),
    queryFn: async () => {
      if (odId) {
        const { data, error } = await supabase
          .from("ordens_do_dia")
          .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
          .eq("id", odId)
          .single();
        if (error) throw error;
        return data;
      }
      const { data: existente, error: e1 } = await supabase
        .from("ordens_do_dia")
        .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
        .eq("dia_id", diaId!)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e1) throw e1;
      if (existente) return existente;
      const { data: dia, error: eDia } = await supabase
        .from("dias_filmagem").select("projeto_id, data").eq("id", diaId!).single();
      if (eDia) throw eDia;
      const { data: nova, error: e2 } = await supabase
        .from("ordens_do_dia")
        .insert({ projeto_id: dia.projeto_id, dia_id: diaId, data: dia.data, tipo: "filmagem", titulo: "OD de " + dia.data, dados_json: {} })
        .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
        .single();
      if (e2) throw e2;
      return nova;
    },
  });

  useEffect(() => {
    if (od?.dados_json && typeof od.dados_json === "object") {
      setDados(od.dados_json as ODData);
    }
  }, [od]);

  const { data: secoes } = useQuery({
    queryKey: ["od-secoes", od?.id],
    enabled: !!od?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("od_secoes").select("*").eq("od_id", od!.id).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: cenas } = useQuery({
    queryKey: ["od-cenas", od?.id],
    enabled: !!od?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("od_cenas").select("*").eq("od_id", od!.id).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: escalas } = useQuery({
    queryKey: ["escalas-od", od?.dia_id],
    enabled: !!od?.dia_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas")
        .select("*, pessoa:pessoas(id, nome, funcao, departamento, telefone)")
        .eq("dia_id", od!.dia_id);
      if (error) throw error;
      return data;
    },
  });

  // Cenas do roteiro do projeto (para vincular à OD)
  const { data: roteiroCenas } = useQuery({
    queryKey: ["roteiro-cenas-od", od?.projeto_id],
    enabled: !!od?.projeto_id,
    queryFn: async () => {
      const { data: rot } = await supabase
        .from("roteiros")
        .select("id")
        .eq("projeto_id", od!.projeto_id)
        .maybeSingle();
      if (!rot) return [];
      const { data, error } = await supabase
        .from("roteiro_cenas")
        .select("id, numero_cena, cabecalho, sinopse, personagens")
        .eq("roteiro_id", rot.id)
        .order("ordem");
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

  // Personagens do projeto (para cruzar com nomes das cenas)
  const { data: personagensProjeto } = useQuery({
    queryKey: ["personagens-projeto", od?.projeto_id],
    enabled: !!od?.projeto_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("personagens")
        .select("id, nome")
        .eq("projeto_id", od!.projeto_id);
      return (data ?? []) as any[];
    },
  });

  // Elenco escalado (com personagem_id preenchido)
  const { data: elencoEscalado } = useQuery({
    queryKey: ["elenco-escalado", od?.projeto_id],
    enabled: !!od?.projeto_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("projeto_pessoas")
        .select("id, personagem_id, pessoa:pessoas(nome)")
        .eq("projeto_id", od!.projeto_id)
        .is("deleted_at", null)
        .not("personagem_id", "is", null);
      return (data ?? []) as any[];
    },
  });

  // Atores necessários para as cenas vinculadas à OD
  const atoresDasCenas = useMemo(() => {
    const cenasVinculadas = (cenas ?? []).filter((c: any) => c.roteiro_cena_id);
    if (cenasVinculadas.length === 0) return [];
    const idsRoteiro = cenasVinculadas.map((c: any) => c.roteiro_cena_id);
    const cenasRot = (roteiroCenas ?? []).filter((rc: any) => idsRoteiro.includes(rc.id));
    const nomesPersonagens = new Set<string>();
    cenasRot.forEach((rc: any) => {
      (rc.personagens ?? []).forEach((n: string) => nomesPersonagens.add(n.toUpperCase()));
    });
    const idsPersonagem = (personagensProjeto ?? [])
      .filter((p: any) => nomesPersonagens.has(p.nome.toUpperCase()))
      .map((p: any) => p.id);
    return (elencoEscalado ?? []).filter((pp: any) => idsPersonagem.includes(pp.personagem_id));
  }, [cenas, roteiroCenas, personagensProjeto, elencoEscalado]);

  const adicionarSecao = useMutation({
    mutationFn: async (departamento: string) => {
      if (!od?.id) throw new Error("OD não carregada");
      const { error } = await supabase.from("od_secoes").insert({ od_id: od.id, departamento, ordem: (secoes?.length ?? 0) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarSecao = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await supabase.from("od_secoes").update({ titulo: s.titulo, conteudo: s.conteudo }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Seção salva"); qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removerSecao = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("od_secoes").delete().eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }),
  });

  const adicionarCena = useMutation({
    mutationFn: async () => {
      if (!od?.id) throw new Error("OD não carregada");
      const { error } = await supabase.from("od_cenas").insert({ od_id: od.id, numero: "", descricao: "", ordem: (cenas?.length ?? 0) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarCena = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase
        .from("od_cenas")
        .update({ numero: c.numero, descricao: c.descricao, tempo_estimado_min: c.tempo_estimado_min ? Number(c.tempo_estimado_min) : null })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removerCena = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("od_cenas").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
  });

  const vincularRoteiroCena = useMutation({
    mutationFn: async (roteiroCenaId: string) => {
      if (!od?.id) throw new Error("OD não carregada");
      const { error } = await supabase.from("od_cenas").insert({
        od_id: od.id,
        roteiro_cena_id: roteiroCenaId,
        numero: "",
        descricao: "",
        ordem: (cenas?.length ?? 0),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const desvincularRoteiroCena = useMutation({
    mutationFn: async (odCenaId: string) => {
      const { error } = await supabase.from("od_cenas").delete().eq("id", odCenaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
  });

  const aprovarOD = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("OD não carregada");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ordens_do_dia").update({
        aprovacao_status: "aprovada",
        aprovado_por: u.user?.id,
        aprovado_em: new Date().toISOString(),
        aprovacao_comentarios: null,
      }).eq("id", od.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("OD aprovada!"); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const rejeitarOD = useMutation({
    mutationFn: async (comentario: string) => {
      if (!od) throw new Error("OD não carregada");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ordens_do_dia").update({
        aprovacao_status: "rejeitada",
        aprovado_por: u.user?.id,
        aprovado_em: new Date().toISOString(),
        aprovacao_comentarios: comentario.trim() || null,
      }).eq("id", od.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OD rejeitada.");
      setShowRejeitarDialog(false);
      setRejeitarComment("");
      qc.invalidateQueries({ queryKey: ["od-edit", od?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reenviarParaAprovacao = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("OD não carregada");
      const { error } = await supabase.from("ordens_do_dia")
        .update({ aprovacao_status: "pendente" })
        .eq("id", od.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OD reenviada para aprovação! Aprovadores notificados.");
      qc.invalidateQueries({ queryKey: ["od-edit", od?.id] });
      qc.invalidateQueries({ queryKey: ["ods", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("OD não carregada");
      const { error } = await supabase.from("ordens_do_dia").update({ dados_json: dados }).eq("id", od.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ordem do Dia salva"); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const republicar = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("OD não carregada");
      const { error: eSalvar } = await supabase.from("ordens_do_dia")
        .update({ dados_json: dados }).eq("id", od.id);
      if (eSalvar) throw eSalvar;
      const { error } = await supabase.from("ordens_do_dia")
        .update({ versao: (od.versao ?? 1) + 1, atualizada_em: new Date().toISOString() })
        .eq("id", od.id);
      if (error) throw error;
      await supabase.rpc("notificar_od_atualizada", {
        p_od_id: od.id, p_projeto_id: od.projeto_id, p_titulo_od: od.titulo ?? "Sem título",
      });
    },
    onSuccess: () => { toast.success("OD atualizada! Equipe notificada."); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("Salve antes de publicar");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ordens_do_dia")
        .update({ publicada_em: new Date().toISOString(), publicada_por: u.user?.id, versao: od.versao })
        .eq("id", od.id);
      if (error) throw error;
      await supabase.rpc("notificar_od_publicada", {
        p_od_id: od.id, p_projeto_id: od.projeto_id, p_titulo_od: od.titulo ?? "Sem titulo",
      });
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notificar-od`;
        const secret = import.meta.env.VITE_EDGE_SHARED_SECRET ?? "";
        if (secret) {
          await fetch(edgeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-glauber-secret": secret },
            body: JSON.stringify({ od_id: od.id }),
          });
        }
      } catch { /* Email falhou silenciosamente */ }
    },
    onSuccess: () => { toast.success("Publicada! Membros notificados."); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (lOd) return <Loading />;
  if (!od) return <div>OD não encontrada</div>;

  const linkPublico = od.token_publico ? `${window.location.origin}/od/${od.token_publico}` : null;
  const dataExibicao = od.data ?? od.dia?.data;
  const contatos = dados.contatos_emergencia_lista ?? [];
  const avisos = dados.avisos ?? [];
  const horaHora = dados.hora_a_hora ?? [];
  const elencoOd = dados.elenco_od ?? [];
  const figuracao = dados.figuracao ?? [];

  function setContato(i: number, patch: Partial<Contato>) {
    const list = [...contatos];
    list[i] = { ...list[i], ...patch };
    setDados({ ...dados, contatos_emergencia_lista: list });
  }
  function setHoraHora(i: number, patch: Partial<HoraHora>) {
    const list = [...horaHora];
    list[i] = { ...list[i], ...patch };
    setDados({ ...dados, hora_a_hora: list });
  }
  function setElencoOd(i: number, patch: Partial<ElencoODItem>) {
    const list = [...elencoOd];
    list[i] = { ...list[i], ...patch };
    setDados({ ...dados, elenco_od: list });
  }
  function setFiguracao(i: number, patch: Partial<FiguracaoItem>) {
    const list = [...figuracao];
    list[i] = { ...list[i], ...patch };
    setDados({ ...dados, figuracao: list });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/projetos/${projetoId}/ordens-do-dia`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{od.titulo ?? "Ordem do Dia"}</h1>
              <Badge variant="outline">{TIPO_LABEL[od.tipo ?? "filmagem"]}</Badge>
              {od.aprovacao_status && (
                <Badge variant={APROVACAO_OD_VARIANT[od.aprovacao_status] ?? "outline"}>
                  {APROVACAO_OD_LABEL[od.aprovacao_status] ?? od.aprovacao_status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {dataExibicao ? formatDate(dataExibicao) : "Sem data"}
              {od.dia?.chamada_geral ? " · Chamada " + od.dia.chamada_geral : ""}
              {od.dia?.locacao?.nome ? " · Locação: " + od.dia.locacao.nome : ""}
            </p>
            {od.publicada_em && (
              <p className="mt-1 text-xs text-emerald-600">
                Publicada v{od.versao} em {formatDateTime(od.publicada_em)}
              </p>
            )}
            {od.atualizada_em && (
              <p className="mt-0.5 text-xs font-semibold text-amber-700">
                ★ ORDEM DO DIA ATUALIZADA · {formatDateTime(od.atualizada_em)}
              </p>
            )}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {can("od", "aprovar") && od.aprovacao_status === "pendente" && (
              <>
                <Button variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => aprovarOD.mutate()} disabled={aprovarOD.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Aprovar
                </Button>
                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setShowRejeitarDialog(true)}>
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
              </>
            )}
            {od.publicada_em && can("od", "editar") && (
              <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={() => republicar.mutate()} disabled={republicar.isPending}>
                <RefreshCw className="h-4 w-4" /> {republicar.isPending ? "Atualizando..." : "Salvar e republicar"}
              </Button>
            )}
            {od.aprovacao_status === "rejeitada" && can("od", "editar") && (
              <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={() => reenviarParaAprovacao.mutate()} disabled={reenviarParaAprovacao.isPending}>
                <RefreshCw className="h-4 w-4" />
                {reenviarParaAprovacao.isPending ? "Reenviando..." : "Reenviar para aprovação"}
              </Button>
            )}
            <Button variant="outline" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button variant="outline" onClick={() => window.print()} title="Exportar como PDF">
              <Printer className="h-4 w-4" /> PDF
            </Button>
            <Button
              onClick={() => publicar.mutate()}
              disabled={publicar.isPending || od.aprovacao_status !== "aprovada"}
              title={od.aprovacao_status !== "aprovada" ? "Requer aprovação da Direção" : undefined}
            >
              <Send className="h-4 w-4" /> Publicar
            </Button>
          </div>
        </div>
      </div>

      {od.aprovacao_status === "rejeitada" && (
        <Card className="border-destructive/50 bg-destructive/5 no-print">
          <CardContent className="flex items-start gap-3 p-4">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">OD Rejeitada</p>
              {od.aprovacao_comentarios && (
                <p className="mt-1 text-sm text-muted-foreground">Motivo: {od.aprovacao_comentarios}</p>
              )}
              {can("od", "editar") && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Corrija o necessário, salve e clique em "Reenviar para aprovação".
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {linkPublico && (
        <Card className="no-print">
          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Link público (sem login)</p>
              <p className="break-all text-xs text-muted-foreground">{linkPublico}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(linkPublico); toast.success("Copiado!"); }}>
                Copiar link
              </Button>
              <Button size="sm" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent("OD: " + linkPublico)}`} target="_blank" rel="noreferrer">
                  Enviar via WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={linkPublico} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="geral">
        <TabsList className="no-print">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="chamadas">Chamadas</TabsTrigger>
          <TabsTrigger value="cenas">Cenas ({cenas?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="elenco_od">Elenco OD</TabsTrigger>
          <TabsTrigger value="departamentos">Departamentos ({secoes?.length ?? 0})</TabsTrigger>
          {od.dia_id && <TabsTrigger value="equipe">Equipe ({escalas?.length ?? 0})</TabsTrigger>}
        </TabsList>

        {/* ─── ABA GERAL ──────────────────────────────────────── */}
        <TabsContent value="geral" className="space-y-4">

          {/* Cabeçalho adicional */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Cabeçalho
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="od_numero">Nº da OD (ex: 3 de 12)</Label>
                <Input id="od_numero" value={dados.od_numero ?? ""} onChange={(e) => setDados({ ...dados, od_numero: e.target.value })} placeholder="3 de 12" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unidade_ciclo">Unidade / Ciclo</Label>
                <Input id="unidade_ciclo" value={dados.unidade_ciclo ?? ""} onChange={(e) => setDados({ ...dados, unidade_ciclo: e.target.value })} placeholder="Episódio 2, Bloco A..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="direcao_nome">Direção</Label>
                <Input id="direcao_nome" value={dados.direcao_nome ?? ""} onChange={(e) => setDados({ ...dados, direcao_nome: e.target.value })} placeholder="Nome do(a) diretor(a)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="producao_nome">Produção</Label>
                <Input id="producao_nome" value={dados.producao_nome ?? ""} onChange={(e) => setDados({ ...dados, producao_nome: e.target.value })} placeholder="Nome do(a) produtor(a)" />
              </div>
            </CardContent>
          </Card>

          {/* Locação — somente leitura do dia vinculado */}
          {od.dia?.locacao && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Locação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{od.dia.locacao.nome}</p>
                {od.dia.locacao.endereco && <p className="text-muted-foreground">{od.dia.locacao.endereco}</p>}
                {od.dia.locacao.maps_url && (
                  <a href={od.dia.locacao.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline no-print">
                    Abrir no Google Maps
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bases */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Bases do dia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="base_camarim">Camarim</Label>
                <Input id="base_camarim" value={dados.base_camarim ?? ""} onChange={(e) => setDados({ ...dados, base_camarim: e.target.value })} placeholder="Local, sala nº..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base_refeicao">Base refeição</Label>
                <Input id="base_refeicao" value={dados.base_refeicao ?? ""} onChange={(e) => setDados({ ...dados, base_refeicao: e.target.value })} placeholder="Tenda lateral, praça..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base_logger">Logger / PA</Label>
                <Input id="base_logger" value={dados.base_logger ?? ""} onChange={(e) => setDados({ ...dados, base_logger: e.target.value })} placeholder="Local do logger/som" />
              </div>
            </CardContent>
          </Card>

          {/* Estacionamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" /> Estacionamento</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="est_local">Local</Label>
                <Input id="est_local" value={dados.estacionamento_local ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_local: e.target.value })} placeholder="Pátio traseiro, rua lateral..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est_vagas">Vagas / valor</Label>
                <Input id="est_vagas" value={dados.estacionamento_vagas ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_vagas: e.target.value })} placeholder="10 vagas · gratuito" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="est_obs">Observações</Label>
                <Input id="est_obs" value={dados.estacionamento_observacoes ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_observacoes: e.target.value })} placeholder="Procurar Marcelo (zelador)..." />
              </div>
            </CardContent>
          </Card>

          {/* Alimentação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Utensils className="h-4 w-4" /> Alimentação extra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bebidas">Bebidas / lanches</Label>
                <Input id="bebidas" value={dados.bebidas ?? ""} onChange={(e) => setDados({ ...dados, bebidas: e.target.value })} placeholder="Café, água e fruta o dia todo · catering Maria" />
              </div>
              <div className="space-y-2">
                <Label>Outras refeições / horários</Label>
                {(dados.refeicoes ?? []).map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={r.tipo} onChange={(e) => {
                      const refs = [...(dados.refeicoes ?? [])];
                      refs[i] = { ...refs[i], tipo: e.target.value };
                      setDados({ ...dados, refeicoes: refs });
                    }} placeholder="Tipo (Café, Lanche...)" />
                    <Input value={r.horario} onChange={(e) => {
                      const refs = [...(dados.refeicoes ?? [])];
                      refs[i] = { ...refs[i], horario: e.target.value };
                      setDados({ ...dados, refeicoes: refs });
                    }} placeholder="Horário" />
                    <Button size="icon" variant="ghost" onClick={() => {
                      setDados({ ...dados, refeicoes: (dados.refeicoes ?? []).filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDados({ ...dados, refeicoes: [...(dados.refeicoes ?? []), { tipo: "", horario: "" }] })}>
                  <Plus className="h-4 w-4" /> Adicionar refeição
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Previsão do tempo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Sun className="h-4 w-4" /> Previsão do tempo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="tempo_condicao">Condição</Label>
                <Input id="tempo_condicao" value={dados.tempo_condicao ?? dados.clima ?? ""} onChange={(e) => setDados({ ...dados, tempo_condicao: e.target.value, clima: e.target.value })} placeholder="Sol forte, céu nublado, chuva à tarde..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempo_min">Mín (°C)</Label>
                <Input id="tempo_min" value={dados.tempo_min ?? ""} onChange={(e) => setDados({ ...dados, tempo_min: e.target.value })} placeholder="18" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempo_max">Máx (°C)</Label>
                <Input id="tempo_max" value={dados.tempo_max ?? ""} onChange={(e) => setDados({ ...dados, tempo_max: e.target.value })} placeholder="32" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempo_chuva">% Chuva</Label>
                <Input id="tempo_chuva" value={dados.tempo_chuva_pct ?? ""} onChange={(e) => setDados({ ...dados, tempo_chuva_pct: e.target.value })} placeholder="20%" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempo_nascer">Nascer do sol</Label>
                <Input id="tempo_nascer" type="time" value={dados.tempo_nascer_sol ?? ""} onChange={(e) => setDados({ ...dados, tempo_nascer_sol: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempo_por">Pôr do sol</Label>
                <Input id="tempo_por" type="time" value={dados.tempo_por_sol ?? ""} onChange={(e) => setDados({ ...dados, tempo_por_sol: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Avisos do dia */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Avisos do dia</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDados({ ...dados, avisos: [...avisos, ""] })}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {avisos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Informe avisos, alterações de última hora, restrições de locação...</p>
              ) : (
                avisos.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={a}
                      onChange={(e) => {
                        const list = [...avisos];
                        list[i] = e.target.value;
                        setDados({ ...dados, avisos: list });
                      }}
                      placeholder="Aviso..."
                    />
                    <Button size="icon" variant="ghost" onClick={() => setDados({ ...dados, avisos: avisos.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Efeitos especiais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Efeitos especiais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={dados.efeitos_especiais ?? ""} onChange={(e) => setDados({ ...dados, efeitos_especiais: e.target.value })} placeholder="Descrição do efeito · responsável · materiais · riscos · perímetro" />
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio">Bloqueio de ruas / autorizações</Label>
                <Input id="bloqueio" value={dados.bloqueio_ruas ?? ""} onChange={(e) => setDados({ ...dados, bloqueio_ruas: e.target.value })} placeholder="Bloqueio Rua X das 7h às 14h · CTTU notificado" />
              </div>
            </CardContent>
          </Card>

          {/* Contatos de emergência */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Contatos importantes</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDados({ ...dados, contatos_emergencia_lista: [...contatos, { nome: "", funcao: "", telefone: "" }] })}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {contatos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Prod. executivo, dir. de produção, segurança, hospital, bombeiros...</p>
              ) : (
                contatos.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-4" placeholder="Nome" value={c.nome} onChange={(e) => setContato(i, { nome: e.target.value })} />
                    <Input className="col-span-4" placeholder="Função" value={c.funcao} onChange={(e) => setContato(i, { funcao: e.target.value })} />
                    <Input className="col-span-3" placeholder="Telefone" value={c.telefone} onChange={(e) => setContato(i, { telefone: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => setDados({ ...dados, contatos_emergencia_lista: contatos.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Rodapé */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4" /> Rodapé / Informações finais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="hospital">Hospital mais próximo</Label>
                <Input id="hospital" value={dados.hospital ?? ""} onChange={(e) => setDados({ ...dados, hospital: e.target.value })} placeholder="Nome · endereço · telefone (192 SAMU)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canais_radio">Canais de rádio</Label>
                <Input id="canais_radio" value={dados.canais_radio ?? ""} onChange={(e) => setDados({ ...dados, canais_radio: e.target.value })} placeholder="Canal 1 — Direção · Canal 2 — Produção · Canal 3 — Segurança" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="links_uteis">Links úteis</Label>
                <Input id="links_uteis" value={dados.links_uteis ?? ""} onChange={(e) => setDados({ ...dados, links_uteis: e.target.value })} placeholder="Maps, forecast, drive de arte..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notas_importantes">Notas importantes</Label>
                <Textarea rows={3} id="notas_importantes" value={dados.notas_importantes ?? ""} onChange={(e) => setDados({ ...dados, notas_importantes: e.target.value })} placeholder="Avisos gerais, restrições, lembretes..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resumo_dia_seguinte">Resumo do dia seguinte</Label>
                <Textarea rows={2} id="resumo_dia_seguinte" value={dados.resumo_dia_seguinte ?? ""} onChange={(e) => setDados({ ...dados, resumo_dia_seguinte: e.target.value })} placeholder="Amanhã: Cenas 10-14, locação Armazém Norte, chamada geral 7h30..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA CHAMADAS ───────────────────────────────────── */}
        <TabsContent value="chamadas" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Chamadas do dia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="chamada_geral">Chamada geral</Label>
                <Input id="chamada_geral" type="time" value={dados.chamada_geral ?? ""} onChange={(e) => setDados({ ...dados, chamada_geral: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cafe_inicio">Café início</Label>
                <Input id="cafe_inicio" type="time" value={dados.cafe_inicio ?? ""} onChange={(e) => setDados({ ...dados, cafe_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cafe_fim">Café fim</Label>
                <Input id="cafe_fim" type="time" value={dados.cafe_fim ?? ""} onChange={(e) => setDados({ ...dados, cafe_fim: e.target.value })} />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="cafe_local">Local do café</Label>
                <Input id="cafe_local" value={dados.cafe_local ?? ""} onChange={(e) => setDados({ ...dados, cafe_local: e.target.value })} placeholder="Tenda de alimentação, corredor..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roda">Roda (RODA)</Label>
                <Input id="roda" type="time" value={dados.roda ?? ""} onChange={(e) => setDados({ ...dados, roda: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="almoco_inicio">Almoço início</Label>
                <Input id="almoco_inicio" type="time" value={dados.almoco_inicio ?? ""} onChange={(e) => setDados({ ...dados, almoco_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="almoco_fim">Almoço fim</Label>
                <Input id="almoco_fim" type="time" value={dados.almoco_fim ?? ""} onChange={(e) => setDados({ ...dados, almoco_fim: e.target.value })} />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="almoco_local">Local do almoço</Label>
                <Input id="almoco_local" value={dados.almoco_local ?? ""} onChange={(e) => setDados({ ...dados, almoco_local: e.target.value })} placeholder="Restaurante X, praça coberta..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corta_camera">Corta câmera</Label>
                <Input id="corta_camera" type="time" value={dados.corta_camera ?? ""} onChange={(e) => setDados({ ...dados, corta_camera: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fim_dia">Fim do dia</Label>
                <Input id="fim_dia" type="time" value={dados.fim_dia ?? ""} onChange={(e) => setDados({ ...dados, fim_dia: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          {/* Hora a hora */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Hora a hora</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDados({ ...dados, hora_a_hora: [...horaHora, { inicio: "", fim: "", atividade: "" }] })}>
                <Plus className="h-4 w-4" /> Adicionar linha
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {horaHora.length === 0 ? (
                <p className="text-xs text-muted-foreground">Café, preparação, RODA, almoço, desprodução, deslocamento, gravações...</p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span className="col-span-2">Início</span>
                    <span className="col-span-2">Fim</span>
                    <span className="col-span-7">Atividade</span>
                  </div>
                  {horaHora.map((h, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <Input className="col-span-2" type="time" value={h.inicio} onChange={(e) => setHoraHora(i, { inicio: e.target.value })} />
                      <Input className="col-span-2" type="time" value={h.fim} onChange={(e) => setHoraHora(i, { fim: e.target.value })} />
                      <Input className="col-span-7" placeholder="Atividade" value={h.atividade} onChange={(e) => setHoraHora(i, { atividade: e.target.value })} />
                      <Button size="icon" variant="ghost" onClick={() => setDados({ ...dados, hora_a_hora: horaHora.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA CENAS ──────────────────────────────────────── */}
        <TabsContent value="cenas" className="space-y-4">
          {/* Seletor de cenas do roteiro */}
          {roteiroCenas && roteiroCenas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Cenas do roteiro
                </CardTitle>
                <p className="text-xs text-muted-foreground">Marque as cenas que serão filmadas neste dia.</p>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-60 overflow-y-auto">
                {roteiroCenas.map((rc: any) => {
                  const linked = (cenas ?? []).find((c: any) => c.roteiro_cena_id === rc.id);
                  return (
                    <label key={rc.id} className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-primary"
                        checked={!!linked}
                        onChange={() => {
                          if (linked) desvincularRoteiroCena.mutate(linked.id);
                          else vincularRoteiroCena.mutate(rc.id);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {rc.numero_cena ? `Cena ${rc.numero_cena} — ` : ""}{rc.cabecalho ?? "Sem cabeçalho"}
                        </p>
                        {rc.sinopse && <p className="text-xs text-muted-foreground truncate">{rc.sinopse}</p>}
                        {(rc.personagens ?? []).length > 0 && (
                          <p className="text-xs text-muted-foreground">Personagens: {(rc.personagens as string[]).join(", ")}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </CardContent>
              {atoresDasCenas.length > 0 && (
                <div className="border-t px-6 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Atores necessários para as cenas marcadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {atoresDasCenas.map((pp: any) => (
                      <span key={pp.id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                        {pp.pessoa?.nome ?? "—"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Lista manual de cenas da OD */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cenas a filmar</CardTitle>
              <Button size="sm" onClick={() => adicionarCena.mutate()}><Plus className="h-4 w-4" /> Adicionar cena</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!cenas?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma cena adicionada. Use o seletor acima ou adicione manualmente.</p>
              ) : (
                cenas.map((c: any) => (
                  <div key={c.id} className="rounded-md border p-3">
                    {c.roteiro_cena_id && (
                      <p className="mb-1.5 text-xs text-primary font-medium">
                        ↳ Do roteiro: {roteiroCenas?.find((rc: any) => rc.id === c.roteiro_cena_id)?.cabecalho ?? c.roteiro_cena_id}
                      </p>
                    )}
                    <div className="grid grid-cols-12 gap-2">
                      <Input className="col-span-2" placeholder="Cena Nº" defaultValue={c.numero ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, numero: e.target.value })} />
                      <Input className="col-span-7" placeholder="Descrição" defaultValue={c.descricao ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, descricao: e.target.value })} />
                      <Input className="col-span-2" type="number" placeholder="min" defaultValue={c.tempo_estimado_min ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, tempo_estimado_min: e.target.value })} />
                      <Button size="icon" variant="ghost" onClick={() => removerCena.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA ELENCO OD ──────────────────────────────────── */}
        <TabsContent value="elenco_od" className="space-y-4">
          {/* Elenco do dia */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Elenco do dia</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDados({
                ...dados,
                elenco_od: [...elencoOd, { personagem: "", ator: "", cenas: "", chega: "", caracterizacao: "", figurino: "", pronta: "", prev_saida: "" }],
              })}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {elencoOd.length === 0 ? (
                <p className="text-xs text-muted-foreground">Adicione os atores com chamadas para o dia.</p>
              ) : (
                elencoOd.map((e, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                      <Button size="icon" variant="ghost" onClick={() => setDados({ ...dados, elenco_od: elencoOd.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Personagem</Label>
                        <Input value={e.personagem} onChange={(ev) => setElencoOd(i, { personagem: ev.target.value })} placeholder="João" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ator / Atriz</Label>
                        <Input value={e.ator} onChange={(ev) => setElencoOd(i, { ator: ev.target.value })} placeholder="Maria Silva" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cenas</Label>
                        <Input value={e.cenas} onChange={(ev) => setElencoOd(i, { cenas: ev.target.value })} placeholder="1, 3, 7" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Chega</Label>
                        <Input type="time" value={e.chega} onChange={(ev) => setElencoOd(i, { chega: ev.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Caracterização</Label>
                        <Input type="time" value={e.caracterizacao} onChange={(ev) => setElencoOd(i, { caracterizacao: ev.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Figurino</Label>
                        <Input type="time" value={e.figurino} onChange={(ev) => setElencoOd(i, { figurino: ev.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pronta</Label>
                        <Input type="time" value={e.pronta} onChange={(ev) => setElencoOd(i, { pronta: ev.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prev. saída</Label>
                        <Input type="time" value={e.prev_saida} onChange={(ev) => setElencoOd(i, { prev_saida: ev.target.value })} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Figuração */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Figuração</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDados({
                ...dados,
                figuracao: [...figuracao, { qtd: "", descricao: "", cenas: "", chega: "", camarim: "", prontos: "", saida: "" }],
              })}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {figuracao.length === 0 ? (
                <p className="text-xs text-muted-foreground">Adicione grupos de figuração com chamada e camarim.</p>
              ) : (
                figuracao.map((f, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Figuração #{i + 1}</span>
                      <Button size="icon" variant="ghost" onClick={() => setDados({ ...dados, figuracao: figuracao.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd</Label>
                        <Input value={f.qtd} onChange={(ev) => setFiguracao(i, { qtd: ev.target.value })} placeholder="10" />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-xs">Descrição</Label>
                        <Input value={f.descricao} onChange={(ev) => setFiguracao(i, { descricao: ev.target.value })} placeholder="Passantes, público de festa, militares..." />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cenas</Label>
                        <Input value={f.cenas} onChange={(ev) => setFiguracao(i, { cenas: ev.target.value })} placeholder="2, 5" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Chega</Label>
                        <Input type="time" value={f.chega} onChange={(ev) => setFiguracao(i, { chega: ev.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Camarim</Label>
                        <Input value={f.camarim} onChange={(ev) => setFiguracao(i, { camarim: ev.target.value })} placeholder="Sala 3" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prontos</Label>
                        <Input type="time" value={f.prontos} onChange={(ev) => setFiguracao(i, { prontos: ev.target.value })} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA DEPARTAMENTOS ──────────────────────────────── */}
        <TabsContent value="departamentos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Seções por departamento</CardTitle>
              <Select onValueChange={(v) => adicionarSecao.mutate(v)}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="+ Adicionar seção" /></SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              {!secoes?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Adicione uma seção (Arte, Câmera, Som...) para escrever instruções específicas de cada departamento.</p>
              ) : (
                secoes.map((s: any) => (
                  <div key={s.id} className="space-y-2 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{DEPT_LABEL[s.departamento] ?? s.departamento}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removerSecao.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input placeholder="Título da seção (opcional)" defaultValue={s.titulo ?? ""} onBlur={(e) => atualizarSecao.mutate({ ...s, titulo: e.target.value })} />
                    <Textarea rows={4} placeholder="Lista de material, instruções, observações..." defaultValue={s.conteudo ?? ""} onBlur={(e) => atualizarSecao.mutate({ ...s, conteudo: e.target.value })} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA EQUIPE ─────────────────────────────────────── */}
        {od.dia_id && (
          <TabsContent value="equipe">
            <Card>
              <CardHeader><CardTitle>Equipe escalada (do dia de filmagem)</CardTitle></CardHeader>
              <CardContent>
                {!escalas?.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma pessoa escalada no dia de filmagem.</p>
                ) : (
                  <ul className="divide-y">
                    {escalas.map((e: any) => (
                      <li key={e.id} className="py-2 text-sm">
                        <span className="font-medium">{e.pessoa?.nome}</span>
                        {e.pessoa?.departamento && <span className="text-muted-foreground"> · {e.pessoa.departamento}</span>}
                        {e.pessoa?.funcao && <span className="text-muted-foreground"> · {e.pessoa.funcao}</span>}
                        {e.pessoa?.telefone && <span className="text-muted-foreground"> · {e.pessoa.telefone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialog: Rejeitar OD ──────────────────────────────── */}
      <Dialog open={showRejeitarDialog} onOpenChange={(o) => { if (!o) { setShowRejeitarDialog(false); setRejeitarComment(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Ordem do Dia</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Informe o motivo da rejeição (opcional). O criador da OD será notificado.</p>
            <div className="space-y-1.5">
              <Label htmlFor="rejeitar_comment">Comentário</Label>
              <Textarea
                id="rejeitar_comment"
                rows={3}
                value={rejeitarComment}
                onChange={(e) => setRejeitarComment(e.target.value)}
                placeholder="Faltam informações sobre locação, chamada da figuração..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowRejeitarDialog(false); setRejeitarComment(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={() => rejeitarOD.mutate(rejeitarComment)} disabled={rejeitarOD.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> {rejeitarOD.isPending ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
