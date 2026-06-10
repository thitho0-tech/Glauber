import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Trash2, Pencil, Printer, Bus, ArrowLeft, ExternalLink } from "lucide-react";
import { useProjectDeptAccess } from "@/hooks/useProjectDeptAccess";
import { toast } from "sonner";

type Mapa = {
  id: string;
  titulo: string;
  data: string | null;
  observacoes: string | null;
};

type Trecho = {
  id: string;
  mapa_id: string;
  ordem: number;
  veiculo: string | null;
  motorista: string | null;
  contato_motorista: string | null;
  passageiros: { pessoa_id: string; nome: string }[];
  origem: string | null;
  destino: string | null;
  origem_url: string | null;
  destino_url: string | null;
  hora_saida: string | null;
  hora_chegada: string | null;
  observacoes: string | null;
};

type ProjPessoa = { id: string; pessoa: { id: string; nome: string } };

function formatHora(h: string | null) {
  if (!h) return "";
  return h.slice(0, 5);
}

function TrechoForm({
  trecho,
  setTrecho,
  passageiros,
  pessoas,
  onToggle,
}: {
  trecho: Partial<Trecho>;
  setTrecho: (v: any) => void;
  passageiros: string[];
  pessoas: ProjPessoa[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ordem</Label>
          <Input type="number" min="1" value={trecho.ordem ?? 1}
            onChange={(e) => setTrecho({ ...trecho, ordem: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Veículo</Label>
          <Input placeholder="Sprinter, van, carro..." value={trecho.veiculo ?? ""}
            onChange={(e) => setTrecho({ ...trecho, veiculo: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Motorista</Label>
          <Input value={trecho.motorista ?? ""}
            onChange={(e) => setTrecho({ ...trecho, motorista: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Contato motorista</Label>
          <Input placeholder="(11) 9xxxx-xxxx" value={trecho.contato_motorista ?? ""}
            onChange={(e) => setTrecho({ ...trecho, contato_motorista: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Hora saída</Label>
          <Input type="time" value={trecho.hora_saida ?? ""}
            onChange={(e) => setTrecho({ ...trecho, hora_saida: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Hora chegada</Label>
          <Input type="time" value={trecho.hora_chegada ?? ""}
            onChange={(e) => setTrecho({ ...trecho, hora_chegada: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Origem</Label>
          <Input placeholder="Endereço de partida" value={trecho.origem ?? ""}
            onChange={(e) => setTrecho({ ...trecho, origem: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Link Maps (origem)</Label>
          <Input placeholder="https://maps.google.com/..." value={trecho.origem_url ?? ""}
            onChange={(e) => setTrecho({ ...trecho, origem_url: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Destino</Label>
          <Input placeholder="Endereço de chegada" value={trecho.destino ?? ""}
            onChange={(e) => setTrecho({ ...trecho, destino: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Link Maps (destino)</Label>
          <Input placeholder="https://maps.google.com/..." value={trecho.destino_url ?? ""}
            onChange={(e) => setTrecho({ ...trecho, destino_url: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Passageiros</Label>
        <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
          {pessoas.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sem pessoas cadastradas no projeto.</p>
          )}
          {pessoas.map((pp) => (
            <label key={pp.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30">
              <input type="checkbox" checked={passageiros.includes(pp.id)}
                onChange={() => onToggle(pp.id)} className="h-4 w-4 accent-primary" />
              <span className="text-sm">{pp.pessoa.nome}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea rows={2} value={trecho.observacoes ?? ""}
          onChange={(e) => setTrecho({ ...trecho, observacoes: e.target.value })} />
      </div>
    </div>
  );
}

export default function MapaTransporte() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { canEditSection, isLoading: authLoading } = useProjectDeptAccess(projetoId);
  const canEdit = canEditSection("mapa_transporte");
  const qc = useQueryClient();

  const [mapaId, setMapaId] = useState<string | null>(null);
  const [openNovoMapa, setOpenNovoMapa] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("Mapa de Transporte");
  const [novoData, setNovoData] = useState("");
  const [openNovoTrecho, setOpenNovoTrecho] = useState(false);
  const [novoTrecho, setNovoTrecho] = useState<Partial<Trecho>>({ ordem: 1 });
  const [passageirosNovo, setPassageirosNovo] = useState<string[]>([]);
  const [editTrecho, setEditTrecho] = useState<Trecho | null>(null);
  const [passageirosEdit, setPassageirosEdit] = useState<string[]>([]);

  const { data: mapas, isLoading: lm } = useQuery({
    queryKey: ["mapas-transporte", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mapas_transporte")
        .select("id, titulo, data, observacoes")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Mapa[];
    },
  });

  const { data: trechos, isLoading: lt } = useQuery({
    queryKey: ["transporte-trechos", mapaId],
    enabled: !!mapaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transporte_trechos")
        .select("*")
        .eq("mapa_id", mapaId!)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Trecho[];
    },
  });

  const { data: pessoas } = useQuery({
    queryKey: ["pp-transporte", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas(id, nome)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("criado_em");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        pessoa: { id: r.pessoa?.id ?? r.id, nome: r.pessoa?.nome ?? "—" },
      })) as ProjPessoa[];
    },
  });

  const mapaAtual = mapas?.find((m) => m.id === mapaId);

  const criarMapa = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("mapas_transporte")
        .insert({ projeto_id: projetoId!, titulo: novoTitulo || "Mapa de Transporte", data: novoData || null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Mapa criado");
      setOpenNovoMapa(false);
      setNovoTitulo("Mapa de Transporte");
      setNovoData("");
      qc.invalidateQueries({ queryKey: ["mapas-transporte", projetoId] });
      setMapaId(id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletarMapa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mapas_transporte")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mapa excluído");
      setMapaId(null);
      qc.invalidateQueries({ queryKey: ["mapas-transporte", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function buildPassageiros(ids: string[]) {
    return ids.map((ppId) => {
      const pp = pessoas?.find((p) => p.id === ppId);
      return { pessoa_id: pp?.pessoa.id ?? ppId, nome: pp?.pessoa.nome ?? ppId };
    });
  }

  const criarTrecho = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transporte_trechos").insert({
        mapa_id: mapaId!,
        ordem: novoTrecho.ordem ?? 1,
        veiculo: novoTrecho.veiculo || null,
        motorista: novoTrecho.motorista || null,
        contato_motorista: novoTrecho.contato_motorista || null,
        passageiros: buildPassageiros(passageirosNovo),
        origem: novoTrecho.origem || null,
        destino: novoTrecho.destino || null,
        origem_url: novoTrecho.origem_url || null,
        destino_url: novoTrecho.destino_url || null,
        hora_saida: novoTrecho.hora_saida || null,
        hora_chegada: novoTrecho.hora_chegada || null,
        observacoes: novoTrecho.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trecho adicionado");
      setOpenNovoTrecho(false);
      setNovoTrecho({ ordem: (trechos?.length ?? 0) + 2 });
      setPassageirosNovo([]);
      qc.invalidateQueries({ queryKey: ["transporte-trechos", mapaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarTrecho = useMutation({
    mutationFn: async (t: Trecho) => {
      const { error } = await supabase.from("transporte_trechos").update({
        ordem: t.ordem,
        veiculo: t.veiculo || null,
        motorista: t.motorista || null,
        contato_motorista: t.contato_motorista || null,
        passageiros: buildPassageiros(passageirosEdit),
        origem: t.origem || null,
        destino: t.destino || null,
        origem_url: t.origem_url || null,
        destino_url: t.destino_url || null,
        hora_saida: t.hora_saida || null,
        hora_chegada: t.hora_chegada || null,
        observacoes: t.observacoes || null,
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trecho atualizado");
      setEditTrecho(null);
      qc.invalidateQueries({ queryKey: ["transporte-trechos", mapaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletarTrecho = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transporte_trechos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transporte-trechos", mapaId] }),
  });

  function togglePassageiro(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function openEditDialog(t: Trecho) {
    setEditTrecho(t);
    const ppIds = (t.passageiros ?? []).map((p) => {
      const found = pessoas?.find((pp) => pp.pessoa.id === p.pessoa_id);
      return found?.id ?? p.pessoa_id;
    });
    setPassageirosEdit(ppIds);
  }

  if (authLoading || lm) return <Loading />;

  /* ── LISTA DE MAPAS ───────────────────────────────────────────── */
  if (!mapaId) {
    return (
      <div className="space-y-6">
        <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bus className="h-6 w-6" /> Mapa de Transporte
          </h1>
          {canEdit && (
            <Button onClick={() => setOpenNovoMapa(true)}><Plus className="h-4 w-4" /> Novo mapa</Button>
          )}
        </div>

        {(!mapas || mapas.length === 0) ? (
          <Empty icon={<Bus className="h-5 w-5" />} title="Sem mapas de transporte"
            description="Crie um mapa para cada dia de filmagem com trechos, veículos e passageiros."
            action={canEdit ? <Button onClick={() => setOpenNovoMapa(true)}><Plus className="h-4 w-4" /> Novo mapa</Button> : undefined} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mapas.map((m) => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setMapaId(m.id)}>
                <CardContent className="p-5 space-y-1">
                  <p className="font-semibold">{m.titulo}</p>
                  {m.data && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  )}
                  {m.observacoes && <p className="text-xs text-muted-foreground line-clamp-2">{m.observacoes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={openNovoMapa} onOpenChange={setOpenNovoMapa}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo mapa de transporte</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de filmagem</Label>
                <Input type="date" value={novoData} onChange={(e) => setNovoData(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNovoMapa(false)}>Cancelar</Button>
              <Button onClick={() => criarMapa.mutate()} disabled={criarMapa.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── EDITOR DE TRECHOS ────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print flex items-center justify-between">
        <button onClick={() => setMapaId(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Todos os mapas
        </button>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="text-destructive"
                onClick={() => deletarMapa.mutate(mapaId)}>
                <Trash2 className="h-4 w-4" /> Excluir mapa
              </Button>
              <Button onClick={() => {
                setNovoTrecho({ ordem: (trechos?.length ?? 0) + 1 });
                setPassageirosNovo([]);
                setOpenNovoTrecho(true);
              }}>
                <Plus className="h-4 w-4" /> Trecho
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{mapaAtual?.titulo ?? "Mapa"}</h1>
        {mapaAtual?.data && (
          <p className="text-sm text-muted-foreground">
            {new Date(mapaAtual.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        )}
      </div>

      {lt && <Loading />}

      {!lt && (!trechos || trechos.length === 0) && (
        <Empty icon={<Bus className="h-5 w-5" />} title="Sem trechos"
          description="Adicione trechos com veículo, motorista, passageiros e links de rota."
          action={canEdit ? <Button onClick={() => setOpenNovoTrecho(true)}><Plus className="h-4 w-4" /> Trecho</Button> : undefined} />
      )}

      {trechos && trechos.length > 0 && (
        <div className="space-y-4">
          {trechos.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base">
                  Trecho {t.ordem}{t.veiculo ? ` — ${t.veiculo}` : ""}
                </CardTitle>
                {canEdit && (
                  <div className="no-print flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deletarTrecho.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {t.motorista && (
                    <p><span className="text-muted-foreground">Motorista:</span> {t.motorista}{t.contato_motorista ? ` · ${t.contato_motorista}` : ""}</p>
                  )}
                  {(t.hora_saida || t.hora_chegada) && (
                    <p><span className="text-muted-foreground">Horário:</span> {formatHora(t.hora_saida)}{t.hora_chegada ? ` → ${formatHora(t.hora_chegada)}` : ""}</p>
                  )}
                  {t.origem && (
                    <p className="flex items-center gap-1">
                      <span className="text-muted-foreground">Origem:</span> {t.origem}
                      {t.origem_url && (
                        <a href={t.origem_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  )}
                  {t.destino && (
                    <p className="flex items-center gap-1">
                      <span className="text-muted-foreground">Destino:</span> {t.destino}
                      {t.destino_url && (
                        <a href={t.destino_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  )}
                </div>
                {t.passageiros && t.passageiros.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Passageiros ({t.passageiros.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {t.passageiros.map((p, i) => (
                        <span key={i} className="inline-flex rounded-full border px-2 py-0.5 text-xs">{p.nome}</span>
                      ))}
                    </div>
                  </div>
                )}
                {t.observacoes && <p className="text-xs text-muted-foreground italic">{t.observacoes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: novo trecho */}
      <Dialog open={openNovoTrecho} onOpenChange={setOpenNovoTrecho}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo trecho</DialogTitle></DialogHeader>
          <TrechoForm
            trecho={novoTrecho}
            setTrecho={setNovoTrecho}
            passageiros={passageirosNovo}
            pessoas={pessoas ?? []}
            onToggle={(id) => togglePassageiro(id, passageirosNovo, setPassageirosNovo)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovoTrecho(false)}>Cancelar</Button>
            <Button onClick={() => criarTrecho.mutate()} disabled={criarTrecho.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar trecho */}
      <Dialog open={!!editTrecho} onOpenChange={(o) => { if (!o) setEditTrecho(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar trecho</DialogTitle></DialogHeader>
          {editTrecho && (
            <TrechoForm
              trecho={editTrecho}
              setTrecho={(v: any) => setEditTrecho(v)}
              passageiros={passageirosEdit}
              pessoas={pessoas ?? []}
              onToggle={(id) => togglePassageiro(id, passageirosEdit, setPassageirosEdit)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrecho(null)}>Cancelar</Button>
            <Button onClick={() => editTrecho && atualizarTrecho.mutate(editTrecho)} disabled={atualizarTrecho.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
