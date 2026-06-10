import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProjectDeptAccess } from "@/hooks/useProjectDeptAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, CalendarDays, ChevronLeft, Pencil, Trash2, Clock,
  MapPin, Users, CheckCircle2, XCircle, CalendarClock,
  Wrench, Clapperboard, Scissors, Lightbulb, FileText,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ─── F15: tipos de compromisso com restrição por departamento ────────────────
type TipoEvento = {
  value: string;
  label: string;
  deptos: string[] | null; // null = todos podem criar
};

const TIPOS_EVENTO: TipoEvento[] = [
  { value: "reuniao",           label: "Reunião",                   deptos: null },
  { value: "tarefa",            label: "Tarefa",                    deptos: null },
  { value: "periodo_producao",  label: "Período de Produção",       deptos: ["producao"] },
  { value: "dia_gravacao",      label: "Dia de Gravação",           deptos: ["producao", "direcao"] },
  { value: "visita_locacao",    label: "Visita de Locação",         deptos: ["producao", "direcao"] },
  { value: "ensaio_elenco",     label: "Teste / Ensaio de Elenco",  deptos: ["elenco", "direcao", "producao"] },
];

function tiposPermitidos(dept: string, isSuperUser: boolean): TipoEvento[] {
  if (isSuperUser) return TIPOS_EVENTO;
  return TIPOS_EVENTO.filter(
    (t) => t.deptos === null || t.deptos.includes(dept)
  );
}

function labelTipo(value: string): string {
  return TIPOS_EVENTO.find((t) => t.value === value)?.label ?? value;
}

// ─── Planejamento (cronograma) ─────────────────────────────────────────────
const FASES = [
  { value: "pre_producao", label: "Pré-produção", icon: Lightbulb,    color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/20",   border: "border-amber-200" },
  { value: "producao",     label: "Produção",     icon: Wrench,       color: "text-sky-600",    bg: "bg-sky-50 dark:bg-sky-950/20",       border: "border-sky-200" },
  { value: "dia_filmagem", label: "Filmagem",     icon: Clapperboard, color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/20",     border: "border-rose-200" },
  { value: "pos_producao", label: "Pós-produção", icon: Scissors,     color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200" },
];

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType }> = {
  agendado:  { label: "Agendado",  variant: "secondary",   icon: CalendarClock },
  realizado: { label: "Realizado", variant: "default",     icon: CheckCircle2 },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle },
};

function formatDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export default function Agenda() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isSuperUser, dept, canEditSection } = useProjectDeptAccess(projetoId);

  // ─── Agenda tab state ────────────────────────────────────────────────────
  const [openEvento, setOpenEvento] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);

  // ─── Planejamento tab state ──────────────────────────────────────────────
  const [openPlan, setOpenPlan] = useState(false);
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("dia");

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: eventos, isLoading: lEventos } = useQuery({
    queryKey: ["agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select(`*, participantes:agenda_participantes(id, confirmado, projeto_pessoa:projeto_pessoas(id, pessoa:pessoas(nome)))`)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  const { data: equipe } = useQuery({
    queryKey: ["projeto-pessoas-agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas(nome)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  const { data: projeto } = useQuery({
    queryKey: ["projeto-periodo", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("periodo_inicio, periodo_fim, nome")
        .eq("id", projetoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: dias, isLoading: lDias } = useQuery({
    queryKey: ["dias", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dias_filmagem")
        .select("*, locacao:locacoes(nome)")
        .eq("projeto_id", projetoId!)
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  const { data: locacoes } = useQuery({
    queryKey: ["locacoes-list", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locacoes")
        .select("*")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const salvarEvento = useMutation({
    mutationFn: async (form: FormData) => {
      const tipo = String(form.get("tipo") || "reuniao");
      const payload: any = {
        projeto_id: projetoId,
        tipo,
        titulo: form.get("titulo"),
        data_inicio: form.get("data_inicio"),
        data_fim: form.get("data_fim") || null,
        local: form.get("local") || null,
        descricao: form.get("descricao") || null,
        deadline: form.get("deadline") || null,
        status: form.get("status") || "agendado",
        criado_por: user?.id,
      };

      let eventoId: string;
      if (editando) {
        const { error } = await supabase.from("agenda_eventos").update(payload).eq("id", editando.id);
        if (error) throw error;
        eventoId = editando.id;
        await supabase.from("agenda_participantes").delete().eq("evento_id", eventoId);
      } else {
        const { data, error } = await supabase.from("agenda_eventos").insert(payload).select().single();
        if (error) throw error;
        eventoId = data.id;
      }

      const participanteIds = form.getAll("participantes") as string[];
      if (participanteIds.length > 0) {
        const rows = participanteIds.map((ppId) => ({ evento_id: eventoId, projeto_pessoa_id: ppId }));
        await supabase.from("agenda_participantes").insert(rows);
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Evento atualizado" : "Evento criado");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
      setOpenEvento(false);
      setEditando(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluirEvento = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase
        .from("agenda_eventos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const criarPlanejamento = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        projeto_id: projetoId,
        tipo: form.get("tipo"),
        periodo: form.get("periodo"),
        data: form.get("data"),
        data_fim: form.get("data_fim") || null,
        chamada_geral: form.get("chamada_geral") || null,
        locacao_id: form.get("locacao_id") || null,
        observacoes: form.get("observacoes") || null,
      };
      const { error } = await supabase.from("dias_filmagem").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planejamento criado");
      qc.invalidateQueries({ queryKey: ["dias", projetoId] });
      setOpenPlan(false);
      setPeriodo("dia");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function abrirEdicaoEvento(ev: any) {
    setEditando(ev);
    setOpenEvento(true);
  }

  function fecharEvento() {
    setOpenEvento(false);
    setEditando(null);
  }

  const participantesEditando: string[] = editando
    ? (editando.participantes ?? []).map((p: any) => p.projeto_pessoa_id ?? p.projeto_pessoa?.id).filter(Boolean)
    : [];

  const porData: Record<string, any[]> = {};
  (eventos ?? []).forEach((ev: any) => {
    const chave = ev.data_inicio.slice(0, 10);
    if (!porData[chave]) porData[chave] = [];
    porData[chave].push(ev);
  });
  const datasOrdenadas = Object.keys(porData).sort();

  const porFase = FASES.reduce((acc: Record<string, any[]>, f) => {
    acc[f.value] = (dias ?? []).filter((d: any) => (d.tipo ?? "dia_filmagem") === f.value);
    return acc;
  }, {});

  const minData = projeto?.periodo_inicio ?? undefined;
  const maxData = projeto?.periodo_fim ?? undefined;

  const canEditAgenda = canEditSection("agenda");
  const tipos = tiposPermitidos(dept, isSuperUser);

  if (lEventos || lDias) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/projetos/${projetoId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-bold">Agenda</h1>
        {projeto?.periodo_inicio && (
          <p className="text-xs text-muted-foreground">
            Período do projeto: {formatDate(projeto.periodo_inicio)}
            {projeto.periodo_fim && <> a {formatDate(projeto.periodo_fim)}</>}
          </p>
        )}
      </div>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
        </TabsList>

        {/* ─── ABA AGENDA ──────────────────────────────────────────────── */}
        <TabsContent value="agenda" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canEditAgenda && (
              <Dialog open={openEvento} onOpenChange={(v) => { if (!v) fecharEvento(); else setOpenEvento(true); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditando(null)}>
                    <Plus className="h-4 w-4" /> Novo evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <form
                    onSubmit={(e) => { e.preventDefault(); salvarEvento.mutate(new FormData(e.currentTarget)); }}
                    className="space-y-4"
                  >
                    <DialogHeader>
                      <DialogTitle>{editando ? "Editar evento" : "Novo evento"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                      {/* Tipo (F15 — Select restrito por departamento) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="tipo">Tipo de evento</Label>
                        <Select name="tipo" defaultValue={editando?.tipo ?? tipos[0]?.value ?? "reuniao"}>
                          <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {tipos.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Título */}
                      <div className="space-y-1.5">
                        <Label htmlFor="titulo">Título</Label>
                        <Input id="titulo" name="titulo" required defaultValue={editando?.titulo ?? ""} placeholder="Ex.: Ensaio cena 12 — Ana e Pedro" />
                      </div>

                      {/* Datas */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="data_inicio">Início</Label>
                          <Input id="data_inicio" name="data_inicio" type="datetime-local" required defaultValue={formatDatetimeLocal(editando?.data_inicio)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="data_fim">Fim (opcional)</Label>
                          <Input id="data_fim" name="data_fim" type="datetime-local" defaultValue={formatDatetimeLocal(editando?.data_fim)} />
                        </div>
                      </div>

                      {/* Local + Deadline */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="local">Local</Label>
                          <Input id="local" name="local" placeholder="Ex.: Estúdio B" defaultValue={editando?.local ?? ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="deadline">Deadline (opcional)</Label>
                          <Input id="deadline" name="deadline" type="date" defaultValue={editando?.deadline ?? ""} />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="space-y-1.5">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue={editando?.status ?? "agendado"}>
                          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agendado">Agendado</SelectItem>
                            <SelectItem value="realizado">Realizado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Participantes */}
                      {(equipe ?? []).length > 0 && (
                        <div className="space-y-1.5">
                          <Label>Participantes (Ctrl/⌘ para múltiplos)</Label>
                          <select
                            name="participantes"
                            multiple
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                            defaultValue={participantesEditando}
                          >
                            {(equipe ?? []).map((pp: any) => (
                              <option key={pp.id} value={pp.id}>{pp.pessoa?.nome ?? pp.id}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Descrição */}
                      <div className="space-y-1.5">
                        <Label htmlFor="descricao">Descrição / notas</Label>
                        <Textarea id="descricao" name="descricao" rows={2} placeholder="Detalhes, materiais necessários, etc." defaultValue={editando?.descricao ?? ""} />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={fecharEvento}>Cancelar</Button>
                      <Button type="submit" disabled={salvarEvento.isPending}>
                        {salvarEvento.isPending ? "Salvando..." : editando ? "Salvar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {datasOrdenadas.length === 0 ? (
            <Empty
              icon={<CalendarDays className="h-5 w-5" />}
              title="Nenhum evento na agenda"
              description="Crie ensaios, reuniões e visitas de locação aqui. Dias de filmagem ficam na aba Planejamento."
              action={canEditAgenda ? <Button onClick={() => setOpenEvento(true)}><Plus className="h-4 w-4" /> Novo evento</Button> : undefined}
            />
          ) : (
            <div className="space-y-4">
              {datasOrdenadas.map((data) => (
                <div key={data}>
                  <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {formatDate(data)}
                  </h2>
                  <div className="space-y-2">
                    {porData[data].map((ev: any) => {
                      const cfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.agendado;
                      const StatusIcon = cfg.icon;
                      const nomes = (ev.participantes ?? [])
                        .map((p: any) => p.projeto_pessoa?.pessoa?.nome)
                        .filter(Boolean);
                      const horaInicio = ev.data_inicio?.slice(11, 16);
                      const horaFim = ev.data_fim?.slice(11, 16);

                      return (
                        <Card key={ev.id} className="transition-shadow hover:shadow-sm">
                          <CardContent className="flex items-start gap-3 p-4">
                            <div className="mt-0.5 flex flex-col items-center text-center w-12 shrink-0">
                              {horaInicio && (
                                <>
                                  <span className="text-sm font-bold">{horaInicio}</span>
                                  {horaFim && <span className="text-xs text-muted-foreground">→ {horaFim}</span>}
                                </>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{ev.titulo}</span>
                                <Badge variant="outline" className="text-xs">{labelTipo(ev.tipo)}</Badge>
                                <Badge variant={cfg.variant} className="text-xs gap-1">
                                  <StatusIcon className="h-3 w-3" /> {cfg.label}
                                </Badge>
                              </div>
                              {ev.local && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {ev.local}
                                </p>
                              )}
                              {nomes.length > 0 && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" /> {nomes.join(", ")}
                                </p>
                              )}
                              {ev.descricao && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ev.descricao}</p>
                              )}
                              {ev.deadline && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                                  <Clock className="h-3 w-3" /> Deadline: {formatDate(ev.deadline)}
                                </p>
                              )}
                            </div>
                            {canEditAgenda && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicaoEvento(ev)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => excluirEvento.mutate(ev.id)}
                                  disabled={excluirEvento.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA PLANEJAMENTO ────────────────────────────────────────── */}
        <TabsContent value="planejamento" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canEditAgenda && (
              <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" /> Planejamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <form
                    onSubmit={(e) => { e.preventDefault(); criarPlanejamento.mutate(new FormData(e.currentTarget)); }}
                    className="space-y-4"
                  >
                    <DialogHeader><DialogTitle>Novo planejamento</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="tipo_plan">Fase</Label>
                          <Select name="tipo" defaultValue="dia_filmagem">
                            <SelectTrigger id="tipo_plan"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FASES.map((f) => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="periodo_plan">Período</Label>
                          <Select name="periodo" defaultValue="dia" onValueChange={(v: any) => setPeriodo(v)}>
                            <SelectTrigger id="periodo_plan"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dia">Dia</SelectItem>
                              <SelectItem value="semana">Semana</SelectItem>
                              <SelectItem value="mes">Mês</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="data_plan">{periodo === "dia" ? "Data" : "Data inicial"}</Label>
                          <Input id="data_plan" name="data" type="date" required min={minData} max={maxData} />
                        </div>
                        {periodo !== "dia" ? (
                          <div className="space-y-1.5">
                            <Label htmlFor="data_fim_plan">Data final</Label>
                            <Input id="data_fim_plan" name="data_fim" type="date" required min={minData} max={maxData} />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <Label htmlFor="chamada_geral_plan">Chamada geral</Label>
                            <Input id="chamada_geral_plan" name="chamada_geral" type="time" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="locacao_plan">Locação principal</Label>
                        <Select name="locacao_id">
                          <SelectTrigger id="locacao_plan"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                          <SelectContent>
                            {(locacoes ?? []).map((l: any) => (
                              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="obs_plan">Observações</Label>
                        <Input id="obs_plan" name="observacoes" placeholder="Notas livres..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenPlan(false)}>Cancelar</Button>
                      <span title={!minData || !maxData ? "Defina as datas do projeto primeiro" : undefined}>
                        <Button type="submit" disabled={criarPlanejamento.isPending || !minData || !maxData}>
                          {criarPlanejamento.isPending ? "Criando..." : "Criar planejamento"}
                        </Button>
                      </span>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {(dias ?? []).length === 0 ? (
            <Empty
              icon={<CalendarDays className="h-5 w-5" />}
              title="Nenhum planejamento ainda"
              description="Adicione pré-produção, produção, dias de filmagem ou pós-produção."
              action={canEditAgenda ? <Button onClick={() => setOpenPlan(true)}><Plus className="h-4 w-4" /> Planejamento</Button> : undefined}
            />
          ) : (
            <>
              {/* Resumo por fase */}
              <div className="grid gap-3 md:grid-cols-4">
                {FASES.map((f) => {
                  const Icon = f.icon;
                  const count = porFase[f.value]?.length ?? 0;
                  return (
                    <Card key={f.value} className={count > 0 ? f.border : ""}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`rounded-md p-2 ${f.bg}`}>
                          <Icon className={`h-5 w-5 ${f.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{f.label}</p>
                          <p className="text-2xl font-bold">{count}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Tabela por fase */}
              <div className="space-y-6">
                {FASES.map((f) => {
                  const items = porFase[f.value] ?? [];
                  if (items.length === 0) return null;
                  const Icon = f.icon;
                  return (
                    <Card key={f.value}>
                      <CardHeader className="flex flex-row items-center gap-2 pb-3">
                        <div className={`rounded-md p-1.5 ${f.bg}`}>
                          <Icon className={`h-4 w-4 ${f.color}`} />
                        </div>
                        <CardTitle className="text-base">{f.label}</CardTitle>
                        <Badge variant="outline">{items.length}</Badge>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Período</TableHead>
                              <TableHead>Chamada</TableHead>
                              <TableHead>Locação</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Observações</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((d: any) => (
                              <TableRow key={d.id}>
                                <TableCell className="font-medium">
                                  {formatDate(d.data)}
                                  {d.data_fim && d.periodo !== "dia" && <> – {formatDate(d.data_fim)}</>}
                                  {d.periodo && d.periodo !== "dia" && (
                                    <Badge variant="outline" className="ml-2 text-xs">{d.periodo}</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{d.chamada_geral ?? "—"}</TableCell>
                                <TableCell>{d.locacao?.nome ?? "—"}</TableCell>
                                <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{d.observacoes ?? "—"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button asChild size="sm" variant="ghost">
                                      <Link to={`/projetos/${projetoId}/cronograma/${d.id}`}>
                                        <Users className="h-4 w-4" /> Escala
                                      </Link>
                                    </Button>
                                    {d.tipo === "dia_filmagem" && (
                                      <Button asChild size="sm" variant="ghost">
                                        <Link to={`/projetos/${projetoId}/ordens-do-dia/${d.id}`}>
                                          <FileText className="h-4 w-4" /> OD
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
