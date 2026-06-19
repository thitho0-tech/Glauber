import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjectFunction } from "@/hooks/useProjectFunction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, Clock,
  MapPin, Users, CheckCircle2, XCircle, CalendarClock,
  Lightbulb, Wrench, Clapperboard, Scissors, FileText,
  UserCheck, Pencil, Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Categoria = "evento" | "periodo";
type Vista = "mes" | "semana" | "dia";

type CalItem = {
  _id: string;
  _cat: Categoria;
  _cor: string;
  titulo: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  hora?: string;      // HH:MM
  raw: any;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPOS_EVENTO = [
  { value: "reuniao",       label: "Reunião",            deptos: null },
  { value: "ensaio",        label: "Ensaio",             deptos: ["elenco","direcao","producao"] },
  { value: "visita_locacao",label: "Visita de Locação",  deptos: ["producao","direcao","locacoes"] },
  { value: "teste_elenco",  label: "Teste de Elenco",    deptos: ["elenco","direcao","producao"] },
  { value: "montagem",      label: "Montagem",           deptos: ["arte","producao"] },
  { value: "folga",         label: "Folga",              deptos: null },
];

const FASES = [
  { value: "pre_producao", label: "Pré-produção",    icon: Lightbulb,    cor: "bg-amber-500",  bordaCor: "border-l-amber-500",  textCor: "text-amber-700"  },
  { value: "producao",     label: "Produção",        icon: Wrench,       cor: "bg-sky-500",    bordaCor: "border-l-sky-500",    textCor: "text-sky-700"    },
  { value: "dia_gravacao", label: "Dia de Gravação", icon: Clapperboard, cor: "bg-rose-500",   bordaCor: "border-l-rose-500",   textCor: "text-rose-700"   },
  { value: "pos_producao", label: "Pós-produção",    icon: Scissors,     cor: "bg-violet-500", bordaCor: "border-l-violet-500", textCor: "text-violet-700" },
];

const COR_EVENTO = "bg-blue-500";
const BORDACOR_EVENTO = "border-l-blue-500";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType }> = {
  agendado:  { label: "Agendado",  variant: "secondary",   icon: CalendarClock },
  realizado: { label: "Realizado", variant: "default",     icon: CheckCircle2  },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle       },
};

const DIAS_SEMANA_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─── Helpers de calendário ───────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMesGrid(ref: Date): Date[][] {
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const offset = primeiro.getDay();
  const inicio = addDays(primeiro, -offset);
  const semanas: Date[][] = [];
  for (let s = 0; s < 6; s++) {
    const semana: Date[] = [];
    for (let d = 0; d < 7; d++) semana.push(addDays(inicio, s * 7 + d));
    semanas.push(semana);
  }
  return semanas;
}

function getSemanaGrid(ref: Date): Date[] {
  const dom = addDays(ref, -ref.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(dom, i));
}

function itensNoDia(itens: CalItem[], dia: Date): CalItem[] {
  const ds = toDateStr(dia);
  return itens.filter((it) => it.dataInicio <= ds && ds <= it.dataFim);
}

function labelFase(value: string): string {
  return FASES.find((f) => f.value === value)?.label ?? value;
}

function labelTipoEvento(value: string): string {
  return TIPOS_EVENTO.find((t) => t.value === value)?.label ?? value;
}

function corDia(tipo: string): string {
  return FASES.find((f) => f.value === tipo)?.cor ?? COR_EVENTO;
}

function bordaCorItem(item: CalItem): string {
  if (item._cat === "evento") return BORDACOR_EVENTO;
  return FASES.find((f) => f.value === item.raw.tipo)?.bordaCor ?? BORDACOR_EVENTO;
}

function eventoToCalItem(ev: any): CalItem {
  const dataStr = ev.data_inicio.slice(0, 10);
  const fimStr  = ev.data_fim ? ev.data_fim.slice(0, 10) : dataStr;
  return {
    _id: ev.id,
    _cat: "evento",
    _cor: COR_EVENTO,
    titulo: ev.titulo,
    dataInicio: dataStr,
    dataFim: fimStr,
    hora: ev.data_inicio.slice(11, 16) || undefined,
    raw: ev,
  };
}

function diaToCalItem(d: any): CalItem {
  return {
    _id: d.id,
    _cat: "periodo",
    _cor: corDia(d.tipo ?? "dia_gravacao"),
    titulo: d.titulo ?? labelFase(d.tipo ?? "dia_gravacao"),
    dataInicio: d.data,
    dataFim: d.data_fim ?? d.data,
    hora: d.chamada_geral || undefined,
    raw: d,
  };
}

function tiposPermitidos(dept: string, isSuperUser: boolean) {
  if (isSuperUser) return TIPOS_EVENTO;
  return TIPOS_EVENTO.filter((t) => t.deptos === null || t.deptos.includes(dept));
}

// ─── Sub-component: chip de evento no calendário ─────────────────────────────

function EventoChip({ item, onClick }: { item: CalItem; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate ${item._cor} hover:opacity-80`}
    >
      {item.hora ? `${item.hora} ` : ""}{item.titulo}
    </button>
  );
}

// ─── Sub-component: Calendário Mês ───────────────────────────────────────────

function CalMes({ dataAtual, itens, onDiaClick, onItemClick }: {
  dataAtual: Date;
  itens: CalItem[];
  onDiaClick: (d: Date) => void;
  onItemClick: (item: CalItem) => void;
}) {
  const semanas = useMemo(() => getMesGrid(dataAtual), [dataAtual]);
  const hoje = toDateStr(new Date());
  const mesAtual = dataAtual.getMonth();

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DIAS_SEMANA_PT.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {semanas.flat().map((dia) => {
          const ds = toDateStr(dia);
          const isMesAtual = dia.getMonth() === mesAtual;
          const isHoje = ds === hoje;
          const itensNeste = itensNoDia(itens, dia);
          return (
            <div
              key={ds}
              onClick={() => onDiaClick(dia)}
              className={`min-h-[90px] border-b border-r p-1 cursor-pointer hover:bg-muted/20 transition-colors ${!isMesAtual ? "opacity-40" : ""}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${isHoje ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                {dia.getDate()}
              </span>
              <div className="space-y-0.5">
                {itensNeste.slice(0, 3).map((it) => (
                  <EventoChip key={it._id} item={it} onClick={() => onItemClick(it)} />
                ))}
                {itensNeste.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{itensNeste.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-component: Calendário Semana ────────────────────────────────────────

function CalSemana({ dataAtual, itens, onItemClick }: {
  dataAtual: Date;
  itens: CalItem[];
  onItemClick: (item: CalItem) => void;
}) {
  const dias = useMemo(() => getSemanaGrid(dataAtual), [dataAtual]);
  const hoje = toDateStr(new Date());

  return (
    <div className="grid grid-cols-7 gap-1">
      {dias.map((dia) => {
        const ds = toDateStr(dia);
        const isHoje = ds === hoje;
        const itensNeste = itensNoDia(itens, dia);
        return (
          <div key={ds} className="border rounded-lg overflow-hidden">
            <div className={`py-2 text-center text-xs font-medium border-b ${isHoje ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
              <div>{DIAS_SEMANA_PT[dia.getDay()]}</div>
              <div className="text-sm font-bold">{dia.getDate()}</div>
            </div>
            <div className="p-1 space-y-1 min-h-[120px]">
              {itensNeste.map((it) => (
                <button
                  key={it._id}
                  onClick={() => onItemClick(it)}
                  className={`w-full text-left text-xs px-2 py-1 rounded border-l-2 ${bordaCorItem(it)} bg-muted/30 hover:bg-muted/60 truncate`}
                >
                  {it.hora ? <span className="font-medium">{it.hora} </span> : null}{it.titulo}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-component: Calendário Dia ───────────────────────────────────────────

function CalDia({ dataAtual, itens, onItemClick }: {
  dataAtual: Date;
  itens: CalItem[];
  onItemClick: (item: CalItem) => void;
}) {
  const itensNeste = itensNoDia(itens, dataAtual).sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""));

  if (itensNeste.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <CalendarDays className="h-8 w-8 opacity-30" />
        <p className="text-sm">Nenhuma atividade neste dia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {itensNeste.map((it) => {
        const cfg = STATUS_CONFIG[it.raw.status ?? "agendado"] ?? STATUS_CONFIG.agendado;
        const StatusIcon = cfg.icon;
        return (
          <button
            key={it._id}
            onClick={() => onItemClick(it)}
            className={`w-full text-left rounded-lg border border-l-4 ${bordaCorItem(it)} p-4 hover:bg-muted/30 transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center text-center w-14 shrink-0">
                {it.hora && <span className="text-sm font-bold">{it.hora}</span>}
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {it._cat === "periodo" ? labelFase(it.raw.tipo) : labelTipoEvento(it.raw.tipo)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{it.titulo}</p>
                {it.raw.local && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {it.raw.local}
                  </p>
                )}
                {it.raw.locacao?.nome && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {it.raw.locacao.nome}
                  </p>
                )}
                {it.raw.descricao && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.raw.descricao}</p>
                )}
              </div>
              <Badge variant={cfg.variant} className="shrink-0 gap-1 text-xs">
                <StatusIcon className="h-3 w-3" /> {cfg.label}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sub-component: Diálogo de detalhes ──────────────────────────────────────

function DetalheDialog({ item, meuPPId, onClose, onEditar, onExcluir, canEdit }: {
  item: CalItem | null;
  meuPPId: string | null;
  onClose: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  canEdit: boolean;
}) {
  const qc = useQueryClient();

  const confirmar = useMutation({
    mutationFn: async ({ apId }: { apId: string }) => {
      const { error } = await supabase
        .from("agenda_participantes")
        .update({ confirmado: true, confirmado_em: new Date().toISOString() })
        .eq("id", apId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visualização confirmada");
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["dias"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!item) return null;
  const ev = item.raw;
  const cfg = STATUS_CONFIG[ev.status ?? "agendado"] ?? STATUS_CONFIG.agendado;
  const StatusIcon = cfg.icon;

  const participantes: any[] = ev.participantes ?? [];
  const meuAP = participantes.find((p: any) => {
    const ppId = p.projeto_pessoa_id ?? p.projeto_pessoa?.id;
    return ppId === meuPPId;
  });
  const jaConfirmou = meuAP?.confirmado ?? false;

  const isPeriodo = item._cat === "periodo";

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {item.titulo}
            <Badge variant={cfg.variant} className="gap-1 text-xs">
              <StatusIcon className="h-3 w-3" /> {cfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>
              {formatDate(item.dataInicio)}
              {item.dataFim !== item.dataInicio && <> — {formatDate(item.dataFim)}</>}
              {item.hora && <span className="ml-2 font-medium text-foreground">{item.hora}</span>}
            </span>
          </div>

          {isPeriodo && ev.chamada_geral && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Chamada geral: <span className="text-foreground font-medium">{ev.chamada_geral}</span></span>
            </div>
          )}

          {(ev.local || ev.locacao?.nome) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{ev.local ?? ev.locacao?.nome}</span>
            </div>
          )}

          {!isPeriodo && ev.tipo && (
            <div className="text-muted-foreground">
              Tipo: <span className="text-foreground">{labelTipoEvento(ev.tipo)}</span>
            </div>
          )}

          {isPeriodo && ev.tipo && (
            <div className="text-muted-foreground">
              Fase: <span className="text-foreground">{labelFase(ev.tipo)}</span>
            </div>
          )}

          {ev.departamento && (
            <div className="text-muted-foreground">
              Departamento: <span className="text-foreground capitalize">{ev.departamento}</span>
            </div>
          )}

          {ev.descricao && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm">{ev.descricao}</p>
            </div>
          )}

          {ev.observacoes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm">{ev.observacoes}</p>
            </div>
          )}

          {participantes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Participantes
              </p>
              <div className="space-y-1.5">
                {participantes.map((p: any) => {
                  const nome = p.projeto_pessoa?.pessoa?.nome ?? "—";
                  const confirmado = p.confirmado;
                  const em = p.confirmado_em ? new Date(p.confirmado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      {confirmado
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                      }
                      <span className={confirmado ? "text-foreground" : "text-muted-foreground"}>{nome}</span>
                      {em && <span className="text-muted-foreground ml-auto">{em}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {meuAP && !jaConfirmou && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 w-full"
              disabled={confirmar.isPending}
              onClick={() => confirmar.mutate({ apId: meuAP.id })}
            >
              <UserCheck className="h-4 w-4" /> Confirmar visualização
            </Button>
          )}

          {isPeriodo && ev.tipo === "dia_gravacao" && (
            <Button asChild size="sm" variant="outline" className="gap-2 w-full">
              <Link to={`/projetos/${ev.projeto_id}/cronograma/${ev.id}`}>
                <FileText className="h-4 w-4" /> Ver Escala / Ordem do Dia
              </Link>
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={onEditar} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={onExcluir} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Agenda() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isSuperUser } = usePermissions(projetoId);
  const { funcao } = useProjectFunction(projetoId);

  // ── Vista ──────────────────────────────────────────────────────────────────
  const [vista, setVista] = useState<Vista>("mes");
  const [dataAtual, setDataAtual] = useState(new Date());

  // ── Detalhes ───────────────────────────────────────────────────────────────
  const [detalhe, setDetalhe] = useState<CalItem | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const [openForm, setOpenForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoCat, setEditandoCat] = useState<Categoria>("evento");
  const [fCategoria, setFCategoria] = useState<Categoria>("evento");
  const [fTipo, setFTipo] = useState("reuniao");
  const [fTitulo, setFTitulo] = useState("");
  const [fDataInicio, setFDataInicio] = useState("");
  const [fDataFim, setFDataFim] = useState("");
  const [fChamadaGeral, setFChamadaGeral] = useState("");
  const [fLocacaoId, setFLocacaoId] = useState("__nenhuma__");
  const [fLocalTexto, setFLocalTexto] = useState("");
  const [fDepartamento, setFDepartamento] = useState("");
  const [fParticipantes, setFParticipantes] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState("agendado");
  const [fDescricao, setFDescricao] = useState("");
  const [fObservacoes, setFObservacoes] = useState("");
  const [novoDiaId, setNovoDiaId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: eventos, isLoading: lEventos } = useQuery({
    queryKey: ["agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select(`*, participantes:agenda_participantes(id, confirmado, confirmado_em, projeto_pessoa_id, projeto_pessoa:projeto_pessoas(id, pessoa:pessoas(nome)))`)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("data_inicio");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dias, isLoading: lDias } = useQuery({
    queryKey: ["dias", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dias_filmagem")
        .select(`*, locacao:locacoes(nome), participantes:agenda_participantes!dia_id(id, confirmado, confirmado_em, projeto_pessoa_id, projeto_pessoa:projeto_pessoas(id, pessoa:pessoas(nome)))`)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("data");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: equipe } = useQuery({
    queryKey: ["projeto-pessoas-agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas(nome, email)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("criado_em");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: locacoes } = useQuery({
    queryKey: ["locacoes-list", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locacoes")
        .select("id, nome")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projeto } = useQuery({
    queryKey: ["projeto-periodo", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("periodo_inicio, periodo_fim")
        .eq("id", projetoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // meu projeto_pessoa_id (para confirmação)
  const meuPPId: string | null = useMemo(() => {
    if (!equipe || !user?.email) return null;
    const found = (equipe as any[]).find((pp: any) =>
      pp.pessoa?.email?.toLowerCase() === user.email!.toLowerCase()
    );
    return found?.id ?? null;
  }, [equipe, user?.email]);

  // minhas participações (set de evento_ids)
  const minhasParticipacoes = useMemo(() => {
    const set = new Set<string>();
    if (!meuPPId) return set;
    (eventos ?? []).forEach((ev: any) => {
      (ev.participantes ?? []).forEach((p: any) => {
        if ((p.projeto_pessoa_id ?? p.projeto_pessoa?.id) === meuPPId) set.add(ev.id);
      });
    });
    return set;
  }, [eventos, meuPPId]);

  // ── Visibilidade C3 ────────────────────────────────────────────────────────
  const eventosFiltrados = useMemo(() => {
    const lista = eventos ?? [];
    if (isSuperUser) return lista;
    return lista.filter((ev: any) =>
      ev.tipo === "ordem_do_dia" ||
      ev.departamento == null ||
      ev.departamento === (funcao?.departamento ?? null) ||
      minhasParticipacoes.has(ev.id)
    );
  }, [eventos, isSuperUser, funcao, minhasParticipacoes]);

  // ── Itens unificados para o calendário ────────────────────────────────────
  const allItens: CalItem[] = useMemo(() => [
    ...eventosFiltrados.map(eventoToCalItem),
    ...(dias ?? []).map(diaToCalItem),
  ], [eventosFiltrados, dias]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const salvarEvento = useMutation({
    mutationFn: async (): Promise<{ mostrarOD: boolean; diaId?: string }> => {
      const ehPeriodo = fCategoria === "periodo";
      let savedId: string;

      if (ehPeriodo) {
        const payload: any = {
          projeto_id: projetoId,
          tipo: fTipo,
          titulo: fTitulo || null,
          data: fDataInicio.slice(0, 10),
          data_fim: fDataFim ? fDataFim.slice(0, 10) : fDataInicio.slice(0, 10),
          chamada_geral: fTipo === "dia_gravacao" && fChamadaGeral ? fChamadaGeral : null,
          locacao_id: fLocacaoId && fLocacaoId !== "__nenhuma__" ? fLocacaoId : null,
          departamento: fDepartamento || null,
          status: fStatus,
          descricao: fDescricao || null,
          observacoes: fObservacoes || null,
        };
        if (editandoId && editandoCat === "periodo") {
          const { error } = await supabase.from("dias_filmagem").update(payload).eq("id", editandoId);
          if (error) throw error;
          savedId = editandoId;
          await supabase.from("agenda_participantes").delete().eq("dia_id", editandoId);
        } else {
          const { data, error } = await supabase.from("dias_filmagem").insert(payload).select("id").single();
          if (error) throw error;
          savedId = data.id;
        }
        if (fParticipantes.length > 0) {
          const rows = fParticipantes.map((ppId) => ({ dia_id: savedId, projeto_pessoa_id: ppId }));
          await supabase.from("agenda_participantes").insert(rows);
        }
        return { mostrarOD: fTipo === "dia_gravacao" && !editandoId, diaId: savedId };
      } else {
        const local = fLocacaoId && fLocacaoId !== "__nenhuma__"
          ? (locacoes ?? []).find((l: any) => l.id === fLocacaoId)?.nome ?? fLocalTexto
          : fLocalTexto;
        const payload: any = {
          projeto_id: projetoId,
          tipo: fTipo,
          titulo: fTitulo,
          data_inicio: fDataInicio,
          data_fim: fDataFim || null,
          local: local || null,
          departamento: fDepartamento || null,
          status: fStatus,
          descricao: fDescricao || null,
          observacoes: fObservacoes || null,
          criado_por: user?.id,
        };
        if (editandoId && editandoCat === "evento") {
          const { error } = await supabase.from("agenda_eventos").update(payload).eq("id", editandoId);
          if (error) throw error;
          savedId = editandoId;
          await supabase.from("agenda_participantes").delete().eq("evento_id", editandoId);
        } else {
          const { data, error } = await supabase.from("agenda_eventos").insert(payload).select("id").single();
          if (error) throw error;
          savedId = data.id;
        }
        if (fParticipantes.length > 0) {
          const rows = fParticipantes.map((ppId) => ({ evento_id: savedId, projeto_pessoa_id: ppId }));
          await supabase.from("agenda_participantes").insert(rows);
        }
        return { mostrarOD: false };
      }
    },
    onSuccess: ({ mostrarOD, diaId }) => {
      toast.success(editandoId ? "Atualizado com sucesso" : "Criado com sucesso");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
      qc.invalidateQueries({ queryKey: ["dias", projetoId] });
      setOpenForm(false);
      resetForm();
      if (mostrarOD && diaId) setNovoDiaId(diaId);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluirItem = useMutation({
    mutationFn: async ({ id, cat }: { id: string; cat: Categoria }) => {
      if (cat === "evento") {
        const { error } = await supabase.from("agenda_eventos")
          .update({ deleted_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dias_filmagem")
          .update({ deleted_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
      qc.invalidateQueries({ queryKey: ["dias", projetoId] });
      setDetalhe(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const criarOD = useMutation({
    mutationFn: async (diaId: string) => {
      const { data, error } = await supabase
        .from("ordens_do_dia")
        .insert({ dia_id: diaId, dados_json: {} })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (_, diaId) => {
      setNovoDiaId(null);
      navigate(`/projetos/${projetoId}/cronograma/${diaId}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Form helpers ──────────────────────────────────────────────────────────
  function resetForm() {
    setEditandoId(null);
    setEditandoCat("evento");
    setFCategoria("evento");
    setFTipo("reuniao");
    setFTitulo("");
    setFDataInicio("");
    setFDataFim("");
    setFChamadaGeral("");
    setFLocacaoId("__nenhuma__");
    setFLocalTexto("");
    setFDepartamento(funcao?.departamento ?? "");
    setFParticipantes([]);
    setFStatus("agendado");
    setFDescricao("");
    setFObservacoes("");
  }

  function abrirNovo(dataPreenchida?: Date) {
    resetForm();
    if (dataPreenchida) {
      const ds = toDateStr(dataPreenchida);
      setFDataInicio(ds + "T09:00");
      setFDataFim(ds + "T10:00");
    }
    setFDepartamento(funcao?.departamento ?? "");
    setOpenForm(true);
  }

  function abrirEditar(item: CalItem) {
    const ev = item.raw;
    setEditandoId(item._id);
    setEditandoCat(item._cat);
    setFCategoria(item._cat);
    if (item._cat === "evento") {
      setFTipo(ev.tipo ?? "reuniao");
      setFTitulo(ev.titulo ?? "");
      setFDataInicio(ev.data_inicio?.slice(0, 16) ?? "");
      setFDataFim(ev.data_fim?.slice(0, 16) ?? "");
      setFChamadaGeral("");
      setFLocacaoId("__nenhuma__");
      setFLocalTexto(ev.local ?? "");
    } else {
      setFTipo(ev.tipo ?? "dia_gravacao");
      setFTitulo(ev.titulo ?? "");
      setFDataInicio(ev.data + "T00:00");
      setFDataFim((ev.data_fim ?? ev.data) + "T00:00");
      setFChamadaGeral(ev.chamada_geral ?? "");
      setFLocacaoId(ev.locacao_id ?? "__nenhuma__");
      setFLocalTexto("");
    }
    setFDepartamento(ev.departamento ?? "");
    const ppIds = (ev.participantes ?? []).map((p: any) => p.projeto_pessoa_id ?? p.projeto_pessoa?.id).filter(Boolean);
    setFParticipantes(ppIds);
    setFStatus(ev.status ?? "agendado");
    setFDescricao(ev.descricao ?? "");
    setFObservacoes(ev.observacoes ?? "");
    setDetalhe(null);
    setOpenForm(true);
  }

  function toggleParticipante(ppId: string) {
    setFParticipantes((prev) =>
      prev.includes(ppId) ? prev.filter((id) => id !== ppId) : [...prev, ppId]
    );
  }

  function marcarTodos() {
    setFParticipantes((equipe ?? []).map((pp: any) => pp.id));
  }

  function validarForm(): string | null {
    if (!fTitulo.trim()) return "Título é obrigatório";
    if (!fDataInicio) return "Data de início é obrigatória";
    if (!fDataFim) return "Data de fim é obrigatória";
    if (fParticipantes.length === 0) return "Selecione ao menos um participante";
    if (meuPPId && fParticipantes.every((id) => id === meuPPId)) {
      return "Selecione ao menos 1 participante além do criador";
    }
    return null;
  }

  // ── Navegação do calendário ───────────────────────────────────────────────
  function navAnterior() {
    const d = new Date(dataAtual);
    if (vista === "mes") d.setMonth(d.getMonth() - 1);
    else if (vista === "semana") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setDataAtual(d);
  }

  function navProximo() {
    const d = new Date(dataAtual);
    if (vista === "mes") d.setMonth(d.getMonth() + 1);
    else if (vista === "semana") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setDataAtual(d);
  }

  function navHoje() { setDataAtual(new Date()); }

  function labelNavegacao(): string {
    if (vista === "mes") return `${MESES_PT[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`;
    if (vista === "semana") {
      const dias = getSemanaGrid(dataAtual);
      const ini = dias[0];
      const fim = dias[6];
      return `${ini.getDate()} ${MESES_PT[ini.getMonth()].slice(0,3)} — ${fim.getDate()} ${MESES_PT[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
    }
    return formatDate(toDateStr(dataAtual));
  }

  // ── Permissões ────────────────────────────────────────────────────────────
  const canEdit = isSuperUser;
  const tipos = tiposPermitidos(funcao?.departamento ?? "", isSuperUser);
  const minData = projeto?.periodo_inicio ?? undefined;
  const maxData = projeto?.periodo_fim ?? undefined;

  if (lEventos || lDias) return <Loading />;

  const formInvalid = !!validarForm();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-bold">Agenda</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Vista toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(["mes","semana","dia"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${vista === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={navHoje} className="text-xs">Hoje</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navProximo}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="font-semibold text-sm">{labelNavegacao()}</span>

        <div className="ml-auto">
          {canEdit && (
            <Button onClick={() => abrirNovo()} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Nova atividade
            </Button>
          )}
        </div>
      </div>

      {/* Calendário */}
      {allItens.length === 0 && !canEdit ? (
        <Empty
          icon={<CalendarDays className="h-5 w-5" />}
          title="Nenhuma atividade"
          description="Ainda não há eventos ou períodos de produção neste projeto."
        />
      ) : (
        <>
          {vista === "mes" && (
            <CalMes
              dataAtual={dataAtual}
              itens={allItens}
              onDiaClick={(d) => { setDataAtual(d); setVista("dia"); }}
              onItemClick={setDetalhe}
            />
          )}
          {vista === "semana" && (
            <CalSemana dataAtual={dataAtual} itens={allItens} onItemClick={setDetalhe} />
          )}
          {vista === "dia" && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground">{formatDate(toDateStr(dataAtual))}</h2>
              <CalDia dataAtual={dataAtual} itens={allItens} onItemClick={setDetalhe} />
            </>
          )}
        </>
      )}

      {/* Botão flutuante "+" na vista dia (se vazio) */}
      {vista === "dia" && canEdit && itensNoDia(allItens, dataAtual).length === 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => abrirNovo(dataAtual)} className="gap-1">
            <Plus className="h-4 w-4" /> Adicionar atividade em {formatDate(toDateStr(dataAtual))}
          </Button>
        </div>
      )}

      {/* Dialog "Criar OD" pós-salvamento de Dia de Gravação */}
      {novoDiaId && (
        <Dialog open onOpenChange={(v) => { if (!v) setNovoDiaId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dia de Gravação criado!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Deseja criar uma Ordem do Dia vinculada a este dia de gravação?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoDiaId(null)}>Depois</Button>
              <Button
                disabled={criarOD.isPending}
                onClick={() => criarOD.mutate(novoDiaId)}
                className="gap-1"
              >
                <FileText className="h-4 w-4" /> {criarOD.isPending ? "Criando..." : "Criar OD"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de detalhes */}
      {detalhe && (
        <DetalheDialog
          item={detalhe}
          meuPPId={meuPPId}
          onClose={() => setDetalhe(null)}
          onEditar={() => abrirEditar(detalhe)}
          onExcluir={() => excluirItem.mutate({ id: detalhe._id, cat: detalhe._cat })}
          canEdit={canEdit}
        />
      )}

      {/* Dialog de formulário */}
      <Dialog open={openForm} onOpenChange={(v) => { if (!v) { setOpenForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar atividade" : "Nova atividade"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1. Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={fCategoria} onValueChange={(v: Categoria) => {
                setFCategoria(v);
                setFTipo(v === "evento" ? "reuniao" : "dia_gravacao");
                setFDataInicio("");
                setFDataFim("");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">Evento</SelectItem>
                  {isSuperUser && <SelectItem value="periodo">Período de Produção</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Tipo / Fase */}
            <div className="space-y-1.5">
              <Label>{fCategoria === "evento" ? "Tipo de evento" : "Fase"}</Label>
              <Select value={fTipo} onValueChange={setFTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fCategoria === "evento"
                    ? tipos.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)
                    : FASES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>

            {/* 3. Título */}
            <div className="space-y-1.5">
              <Label htmlFor="f-titulo">Título</Label>
              <Input id="f-titulo" required value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="Ex.: Ensaio cena 12 — Ana e Pedro" />
            </div>

            {/* 4. Início e Fim */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-inicio">Início</Label>
                <Input
                  id="f-inicio"
                  type={fCategoria === "periodo" ? "date" : "datetime-local"}
                  required
                  value={fCategoria === "periodo" ? fDataInicio.slice(0, 10) : fDataInicio}
                  onChange={(e) => setFDataInicio(fCategoria === "periodo" ? e.target.value : e.target.value)}
                  min={minData}
                  max={maxData}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-fim">Fim</Label>
                <Input
                  id="f-fim"
                  type={fCategoria === "periodo" ? "date" : "datetime-local"}
                  required
                  value={fCategoria === "periodo" ? fDataFim.slice(0, 10) : fDataFim}
                  onChange={(e) => setFDataFim(fCategoria === "periodo" ? e.target.value : e.target.value)}
                  min={minData}
                  max={maxData}
                />
              </div>
            </div>

            {/* 5. Chamada geral — só para Dia de Gravação */}
            {fCategoria === "periodo" && fTipo === "dia_gravacao" && (
              <div className="space-y-1.5">
                <Label htmlFor="f-chamada">Chamada geral</Label>
                <Input id="f-chamada" type="time" value={fChamadaGeral} onChange={(e) => setFChamadaGeral(e.target.value)} />
              </div>
            )}

            {/* 6. Local / Locação */}
            <div className="space-y-1.5">
              <Label>Local / Locação</Label>
              <Select value={fLocacaoId} onValueChange={(v) => {
                setFLocacaoId(v);
                if (v !== "__nenhuma__") {
                  const loc = (locacoes ?? []).find((l: any) => l.id === v);
                  setFLocalTexto(loc?.nome ?? "");
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar locação cadastrada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhuma__">Nenhuma (texto livre)</SelectItem>
                  {(locacoes ?? []).map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fLocacaoId === "__nenhuma__") && (
                <Input
                  placeholder="Ou descreva o local livremente"
                  value={fLocalTexto}
                  onChange={(e) => setFLocalTexto(e.target.value)}
                />
              )}
            </div>

            {/* 7. Departamento */}
            <div className="space-y-1.5">
              <Label htmlFor="f-depto">Departamento (opcional)</Label>
              <Input
                id="f-depto"
                value={fDepartamento}
                onChange={(e) => setFDepartamento(e.target.value)}
                placeholder="Ex.: producao, arte, elenco..."
              />
            </div>

            {/* 8. Participantes */}
            {(equipe ?? []).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Participantes <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={marcarTodos}>
                    Marcar todos
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {(equipe ?? []).map((pp: any) => {
                    const checked = fParticipantes.includes(pp.id);
                    return (
                      <label key={pp.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipante(pp.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{pp.pessoa?.nome ?? pp.id}</span>
                      </label>
                    );
                  })}
                </div>
                {fParticipantes.length === 0 && (
                  <p className="text-xs text-destructive">Selecione ao menos um participante.</p>
                )}
              </div>
            )}

            {/* 9. Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 10. Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="f-desc">Descrição</Label>
              <Textarea id="f-desc" rows={2} value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} placeholder="Detalhes, roteiro, materiais..." />
            </div>

            {/* 11. Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="f-obs">Observações</Label>
              <Textarea id="f-obs" rows={2} value={fObservacoes} onChange={(e) => setFObservacoes(e.target.value)} placeholder="Notas adicionais, logística..." />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setOpenForm(false); resetForm(); }}>Cancelar</Button>
            <Button
              disabled={salvarEvento.isPending || formInvalid}
              onClick={() => salvarEvento.mutate()}
              title={validarForm() ?? undefined}
            >
              {salvarEvento.isPending ? "Salvando..." : editandoId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
