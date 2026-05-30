import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Plus, CalendarDays, ChevronLeft, Pencil, Trash2, Clock,
  MapPin, Users, CheckCircle2, XCircle, CalendarClock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const TIPO_SUGESTOES = [
  "Ensaio", "Reunião de produção", "Visita de locação",
  "Teste de figurino", "Teste de maquiagem", "Teste de luz",
  "Leitura de roteiro", "Mesa de trabalho", "Outro",
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType }> = {
  agendado:  { label: "Agendado",  variant: "secondary",    icon: CalendarClock },
  realizado: { label: "Realizado", variant: "default",      icon: CheckCircle2 },
  cancelado: { label: "Cancelado", variant: "destructive",  icon: XCircle },
};

function formatDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

export default function Agenda() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [tipoDigitado, setTipoDigitado] = useState("");

  // Busca eventos da agenda
  const { data: eventos, isLoading } = useQuery({
    queryKey: ["agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select(`
          *,
          participantes:agenda_participantes(
            id, confirmado,
            projeto_pessoa:projeto_pessoas(id, pessoa:pessoas(nome))
          )
        `)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  // Equipe do projeto para o multiselect
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

  const salvar = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        projeto_id: projetoId,
        tipo: String(form.get("tipo") || tipoDigitado || "Outro"),
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
        // Limpa participantes anteriores e reinserere
        await supabase.from("agenda_participantes").delete().eq("evento_id", eventoId);
      } else {
        const { data, error } = await supabase.from("agenda_eventos").insert(payload).select().single();
        if (error) throw error;
        eventoId = data.id;
      }

      // Participantes selecionados
      const participanteIds = form.getAll("participantes") as string[];
      if (participanteIds.length > 0) {
        const rows = participanteIds.map((ppId) => ({ evento_id: eventoId, projeto_pessoa_id: ppId }));
        await supabase.from("agenda_participantes").insert(rows);
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Evento atualizado" : "Evento criado");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
      setOpen(false);
      setEditando(null);
      setTipoDigitado("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase.rpc("soft_delete_item", { p_tabela: "agenda_eventos" as any, p_id: eventoId });
      // Fallback: soft-delete direto na tabela (agenda_eventos não está no helper, usamos update)
      if (error) {
        const { error: e2 } = await supabase
          .from("agenda_eventos")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", eventoId);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Evento removido");
      qc.invalidateQueries({ queryKey: ["agenda", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  // Agrupa por data
  const porData: Record<string, any[]> = {};
  (eventos ?? []).forEach((ev: any) => {
    const chave = ev.data_inicio.slice(0, 10);
    if (!porData[chave]) porData[chave] = [];
    porData[chave].push(ev);
  });
  const datasOrdenadas = Object.keys(porData).sort();

  function abrirEdicao(ev: any) {
    setEditando(ev);
    setTipoDigitado(ev.tipo ?? "");
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
    setEditando(null);
    setTipoDigitado("");
  }

  const participantesEditando: string[] = editando
    ? (editando.participantes ?? []).map((p: any) => p.projeto_pessoa_id ?? p.projeto_pessoa?.id).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Ensaios, reuniões, visitas de locação e outros eventos que não são dias de filmagem.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) fechar(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditando(null); setTipoDigitado(""); }}>
              <Plus className="h-4 w-4" /> Novo evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form
              onSubmit={(e) => { e.preventDefault(); salvar.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>{editando ? "Editar evento" : "Novo evento de agenda"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                {/* Tipo com sugestões */}
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo de evento</Label>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {TIPO_SUGESTOES.map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setTipoDigitado(s)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          tipoDigitado === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <Input
                    id="tipo"
                    name="tipo"
                    placeholder="Ou digite livremente..."
                    value={tipoDigitado}
                    onChange={(e) => setTipoDigitado(e.target.value)}
                  />
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
                    <Input id="data_inicio" name="data_inicio" type="datetime-local" required
                      defaultValue={formatDatetimeLocal(editando?.data_inicio)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data_fim">Fim (opcional)</Label>
                    <Input id="data_fim" name="data_fim" type="datetime-local"
                      defaultValue={formatDatetimeLocal(editando?.data_fim)} />
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
                    <Label>Participantes (segure Ctrl / ⌘ para selecionar vários)</Label>
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
                  <Textarea id="descricao" name="descricao" rows={2} placeholder="Detalhes, materiais necessários, etc."
                    defaultValue={editando?.descricao ?? ""} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending ? "Salvando..." : editando ? "Salvar alterações" : "Criar evento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {datasOrdenadas.length === 0 ? (
        <Empty
          icon={<CalendarDays className="h-5 w-5" />}
          title="Nenhum evento na agenda"
          description="Crie ensaios, reuniões e visitas de locação aqui. Dias de filmagem ficam no Cronograma."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo evento</Button>}
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
                            <Badge variant="outline" className="text-xs">{ev.tipo}</Badge>
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
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicao(ev)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => excluir.mutate(ev.id)}
                            disabled={excluir.isPending}
                            title="Excluir evento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
