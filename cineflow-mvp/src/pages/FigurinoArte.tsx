import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Shirt, Boxes, Trash2, Pencil, ImageIcon } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";

type Figurino = {
  id: string;
  descricao: string;
  tamanho: string | null;
  cor: string | null;
  fonte: string;
  valor_estimado: number | null;
  status: string;
  aprovacao_status: string | null;
  aprovacao_comentarios: string | null;
};

type ArteObj = {
  id: string;
  descricao: string;
  categoria: string | null;
  fonte: string;
  valor_estimado: number | null;
  status: string;
  aprovacao_status: string | null;
  aprovacao_comentarios: string | null;
  origem: string | null;
  origem_detalhe: string | null;
  personagem_id: string | null;
  foto_url: string | null;
};

const STATUS_FIG = ["previsto", "adquirido", "retirado", "devolvido"];
const STATUS_ARTE = ["previsto", "adquirido", "em_set", "devolvido"];
const FONTES = ["compra", "aluguel", "emprestimo", "producao"];
const ORIGENS_ARTE = [
  { value: "acervo", label: "Acervo" },
  { value: "aluguel", label: "Aluguel" },
  { value: "compra", label: "Compra" },
  { value: "emprestimo", label: "Empréstimo" },
];
const APROVACAO_STATUS = [
  { value: "em_analise", label: "Em análise" },
  { value: "visto_pelo_diretor", label: "Visto p/ Diretor" },
  { value: "aprovado", label: "Aprovado" },
  { value: "cancelado", label: "Cancelado" },
];
const APROVACAO_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  em_analise: "outline",
  visto_pelo_diretor: "secondary",
  aprovado: "default",
  cancelado: "destructive",
};

export default function FigurinoArte() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [openFig, setOpenFig] = useState(false);
  const [openArte, setOpenArte] = useState(false);
  const [novoFig, setNovoFig] = useState<Partial<Figurino>>({ status: "previsto", fonte: "compra" });
  const [novoArte, setNovoArte] = useState<Partial<ArteObj>>({ status: "previsto", fonte: "compra" });
  const [editFig, setEditFig] = useState<Figurino | null>(null);
  const [editArte, setEditArte] = useState<ArteObj | null>(null);

  const { data: figs, isLoading: lf } = useQuery({
    queryKey: ["figurinos", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("figurinos")
        .select("id, descricao, tamanho, cor, fonte, valor_estimado, status, aprovacao_status, aprovacao_comentarios")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Figurino[];
    },
  });

  const { data: artes, isLoading: la } = useQuery({
    queryKey: ["arte-objetos", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arte_objetos")
        .select("id, descricao, categoria, fonte, valor_estimado, status, aprovacao_status, aprovacao_comentarios, origem, origem_detalhe, personagem_id, foto_url")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArteObj[];
    },
  });

  const { data: personagens } = useQuery({
    queryKey: ["personagens", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personagens")
        .select("id, nome")
        .eq("projeto_id", projetoId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addFig = useMutation({
    mutationFn: async () => {
      if (!novoFig.descricao) throw new Error("Descrição obrigatória");
      const { error } = await supabase.from("figurinos").insert({
        projeto_id: projetoId!,
        descricao: novoFig.descricao,
        tamanho: novoFig.tamanho || null,
        cor: novoFig.cor || null,
        fonte: novoFig.fonte ?? "compra",
        valor_estimado: novoFig.valor_estimado ? Number(novoFig.valor_estimado) : null,
        status: novoFig.status ?? "previsto",
        aprovacao_status: "em_analise",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Figurino adicionado");
      setOpenFig(false);
      setNovoFig({ status: "previsto", fonte: "compra" });
      qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addArte = useMutation({
    mutationFn: async () => {
      if (!novoArte.descricao) throw new Error("Descrição obrigatória");
      const { error } = await supabase.from("arte_objetos").insert({
        projeto_id: projetoId!,
        descricao: novoArte.descricao,
        categoria: novoArte.categoria || null,
        fonte: novoArte.fonte ?? "compra",
        valor_estimado: novoArte.valor_estimado ? Number(novoArte.valor_estimado) : null,
        status: novoArte.status ?? "previsto",
        aprovacao_status: "em_analise",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objeto de arte adicionado");
      setOpenArte(false);
      setNovoArte({ status: "previsto", fonte: "compra" });
      qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFig = useMutation({
    mutationFn: async (f: Figurino) => {
      const { error } = await supabase.from("figurinos").update({
        descricao: f.descricao,
        tamanho: f.tamanho || null,
        cor: f.cor || null,
        fonte: f.fonte,
        status: f.status,
        valor_estimado: f.valor_estimado ? Number(f.valor_estimado) : null,
        aprovacao_status: f.aprovacao_status || null,
        aprovacao_comentarios: f.aprovacao_comentarios || null,
      }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Figurino atualizado");
      setEditFig(null);
      qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateArte = useMutation({
    mutationFn: async (a: ArteObj) => {
      const { error } = await supabase.from("arte_objetos").update({
        descricao: a.descricao,
        categoria: a.categoria || null,
        fonte: a.fonte,
        status: a.status,
        valor_estimado: a.valor_estimado ? Number(a.valor_estimado) : null,
        aprovacao_status: a.aprovacao_status || null,
        aprovacao_comentarios: a.aprovacao_comentarios || null,
        origem: a.origem || null,
        origem_detalhe: a.origem_detalhe || null,
        personagem_id: a.personagem_id === "__none__" ? null : (a.personagem_id || null),
        foto_url: a.foto_url || null,
      }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objeto atualizado");
      setEditArte(null);
      qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delFig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("figurinos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["figurinos", projetoId] }),
  });

  const delArte = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arte_objetos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] }),
  });

  async function uploadFotoArte(arteId: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `arte/${arteId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { error: e2 } = await supabase.from("arte_objetos").update({ foto_url: path }).eq("id", arteId);
    if (e2) throw e2;
    qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    if (editArte?.id === arteId) setEditArte({ ...editArte, foto_url: path });
    toast.success("Foto salva");
  }

  async function verFoto(path: string) {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Não foi possível gerar link");
  }

  if (lf || la) return <Loading />;

  const personagemNome = (pid: string | null) =>
    personagens?.find((p: any) => p.id === pid)?.nome ?? null;

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <h1 className="text-2xl font-bold">Figurino &amp; Arte</h1>

      {/* ── FIGURINOS ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5" /> Figurinos</CardTitle>
          <Button onClick={() => setOpenFig(true)}><Plus className="h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent>
          {(!figs || figs.length === 0) ? (
            <Empty icon={<Shirt className="h-5 w-5" />} title="Sem figurinos" description="Cadastre as peças de roupa do projeto." />
          ) : (
            <div className="space-y-2">
              {figs.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{f.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[f.tamanho, f.cor, f.fonte].filter(Boolean).join(" · ")}
                      {f.valor_estimado ? ` · ${formatBRL(f.valor_estimado)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.aprovacao_status && (
                      <Badge variant={APROVACAO_VARIANT[f.aprovacao_status] ?? "outline"} className="text-xs">
                        {APROVACAO_STATUS.find(a => a.value === f.aprovacao_status)?.label ?? f.aprovacao_status}
                      </Badge>
                    )}
                    <Badge variant="outline">{f.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => setEditFig(f)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => delFig.mutate(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ARTE ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" /> Objetos de arte</CardTitle>
          <Button onClick={() => setOpenArte(true)}><Plus className="h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent>
          {(!artes || artes.length === 0) ? (
            <Empty icon={<Boxes className="h-5 w-5" />} title="Sem objetos" description="Cadastre setdec, props e objetos cênicos." />
          ) : (
            <div className="space-y-2">
              {artes.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.descricao}</p>
                      {a.foto_url && (
                        <button onClick={() => verFoto(a.foto_url!)} title="Ver foto" className="text-muted-foreground hover:text-foreground">
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[a.categoria, a.fonte, a.origem].filter(Boolean).join(" · ")}
                      {a.valor_estimado ? ` · ${formatBRL(a.valor_estimado)}` : ""}
                      {a.personagem_id ? ` · ${personagemNome(a.personagem_id)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.aprovacao_status && (
                      <Badge variant={APROVACAO_VARIANT[a.aprovacao_status] ?? "outline"} className="text-xs">
                        {APROVACAO_STATUS.find(ap => ap.value === a.aprovacao_status)?.label ?? a.aprovacao_status}
                      </Badge>
                    )}
                    <Badge variant="outline">{a.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => setEditArte(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => delArte.mutate(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Novo figurino ──────────────────────────────── */}
      <Dialog open={openFig} onOpenChange={setOpenFig}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo figurino</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fdesc">Descrição</Label>
              <Input id="fdesc" value={novoFig.descricao ?? ""} onChange={(e) => setNovoFig({ ...novoFig, descricao: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ftam">Tamanho</Label>
                <Input id="ftam" value={novoFig.tamanho ?? ""} onChange={(e) => setNovoFig({ ...novoFig, tamanho: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fcor">Cor</Label>
                <Input id="fcor" value={novoFig.cor ?? ""} onChange={(e) => setNovoFig({ ...novoFig, cor: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <select value={novoFig.fonte} onChange={(e) => setNovoFig({ ...novoFig, fonte: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={novoFig.status} onChange={(e) => setNovoFig({ ...novoFig, status: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {STATUS_FIG.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fval">Valor R$</Label>
                <Input id="fval" type="number" step="0.01" value={novoFig.valor_estimado ?? ""}
                  onChange={(e) => setNovoFig({ ...novoFig, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFig(false)}>Cancelar</Button>
            <Button onClick={() => addFig.mutate()} disabled={addFig.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Novo objeto de arte ───────────────────────── */}
      <Dialog open={openArte} onOpenChange={setOpenArte}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo objeto de arte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adesc">Descrição</Label>
              <Input id="adesc" value={novoArte.descricao ?? ""} onChange={(e) => setNovoArte({ ...novoArte, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acat">Categoria</Label>
              <Input id="acat" placeholder="setdec, props, especiais..." value={novoArte.categoria ?? ""} onChange={(e) => setNovoArte({ ...novoArte, categoria: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <select value={novoArte.fonte} onChange={(e) => setNovoArte({ ...novoArte, fonte: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={novoArte.status} onChange={(e) => setNovoArte({ ...novoArte, status: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {STATUS_ARTE.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aval">Valor R$</Label>
                <Input id="aval" type="number" step="0.01" value={novoArte.valor_estimado ?? ""}
                  onChange={(e) => setNovoArte({ ...novoArte, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenArte(false)}>Cancelar</Button>
            <Button onClick={() => addArte.mutate()} disabled={addArte.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar figurino ────────────────────────────── */}
      <Dialog open={!!editFig} onOpenChange={(o) => { if (!o) setEditFig(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar figurino</DialogTitle></DialogHeader>
          {editFig && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={editFig.descricao} onChange={(e) => setEditFig({ ...editFig, descricao: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tamanho</Label>
                  <Input value={editFig.tamanho ?? ""} onChange={(e) => setEditFig({ ...editFig, tamanho: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <Input value={editFig.cor ?? ""} onChange={(e) => setEditFig({ ...editFig, cor: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Fonte</Label>
                  <select value={editFig.fonte} onChange={(e) => setEditFig({ ...editFig, fonte: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select value={editFig.status} onChange={(e) => setEditFig({ ...editFig, status: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {STATUS_FIG.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor R$</Label>
                  <Input type="number" step="0.01" value={editFig.valor_estimado ?? ""}
                    onChange={(e) => setEditFig({ ...editFig, valor_estimado: e.target.value as unknown as number })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Aprovação do Diretor</Label>
                <Select value={editFig.aprovacao_status ?? "em_analise"} onValueChange={(v) => setEditFig({ ...editFig, aprovacao_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APROVACAO_STATUS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Comentários de aprovação</Label>
                <Textarea rows={2} value={editFig.aprovacao_comentarios ?? ""} onChange={(e) => setEditFig({ ...editFig, aprovacao_comentarios: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFig(null)}>Cancelar</Button>
            <Button onClick={() => editFig && updateFig.mutate(editFig)} disabled={updateFig.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar objeto de arte ─────────────────────── */}
      <Dialog open={!!editArte} onOpenChange={(o) => { if (!o) setEditArte(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar objeto de arte</DialogTitle></DialogHeader>
          {editArte && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={editArte.descricao} onChange={(e) => setEditArte({ ...editArte, descricao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input placeholder="setdec, props, especiais..." value={editArte.categoria ?? ""} onChange={(e) => setEditArte({ ...editArte, categoria: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Fonte</Label>
                  <select value={editArte.fonte} onChange={(e) => setEditArte({ ...editArte, fonte: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select value={editArte.status} onChange={(e) => setEditArte({ ...editArte, status: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {STATUS_ARTE.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor R$</Label>
                  <Input type="number" step="0.01" value={editArte.valor_estimado ?? ""}
                    onChange={(e) => setEditArte({ ...editArte, valor_estimado: e.target.value as unknown as number })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select value={editArte.origem ?? "__none__"} onValueChange={(v) => setEditArte({ ...editArte, origem: v === "__none__" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não informada</SelectItem>
                      {ORIGENS_ARTE.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Detalhe da origem</Label>
                  <Input placeholder="De quem, onde, valor..." value={editArte.origem_detalhe ?? ""} onChange={(e) => setEditArte({ ...editArte, origem_detalhe: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personagem vinculado</Label>
                <Select value={editArte.personagem_id ?? "__none__"} onValueChange={(v) => setEditArte({ ...editArte, personagem_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum personagem</SelectItem>
                    {(personagens ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Aprovação do Diretor</Label>
                <Select value={editArte.aprovacao_status ?? "em_analise"} onValueChange={(v) => setEditArte({ ...editArte, aprovacao_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APROVACAO_STATUS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Comentários de aprovação</Label>
                <Textarea rows={2} value={editArte.aprovacao_comentarios ?? ""} onChange={(e) => setEditArte({ ...editArte, aprovacao_comentarios: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Foto do objeto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && editArte) {
                        try { await uploadFotoArte(editArte.id, file); }
                        catch (err: any) { toast.error(err.message); }
                      }
                    }}
                  />
                  {editArte.foto_url && (
                    <Button size="sm" variant="outline" onClick={() => verFoto(editArte.foto_url!)}>
                      <ImageIcon className="h-4 w-4 mr-1" /> Ver foto
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditArte(null)}>Cancelar</Button>
            <Button onClick={() => editArte && updateArte.mutate(editArte)} disabled={updateArte.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
