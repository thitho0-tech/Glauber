import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Shirt, Boxes, Trash2 } from "lucide-react";
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
};
type ArteObj = {
  id: string;
  descricao: string;
  categoria: string | null;
  fonte: string;
  valor_estimado: number | null;
  status: string;
};

const STATUS_FIG = ["previsto", "adquirido", "retirado", "devolvido"];
const STATUS_ARTE = ["previsto", "adquirido", "em_set", "devolvido"];
const FONTES = ["compra", "aluguel", "emprestimo", "producao"];

export default function FigurinoArte() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [openFig, setOpenFig] = useState(false);
  const [openArte, setOpenArte] = useState(false);
  const [novoFig, setNovoFig] = useState<Partial<Figurino>>({ status: "previsto", fonte: "compra" });
  const [novoArte, setNovoArte] = useState<Partial<ArteObj>>({ status: "previsto", fonte: "compra" });

  const { data: figs, isLoading: lf } = useQuery({
    queryKey: ["figurinos", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("figurinos")
        .select("id, descricao, tamanho, cor, fonte, valor_estimado, status")
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
        .select("id, descricao, categoria, fonte, valor_estimado, status")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArteObj[];
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
        fonte: novoFig.fonte,
        valor_estimado: novoFig.valor_estimado ? Number(novoFig.valor_estimado) : null,
        status: novoFig.status,
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
        fonte: novoArte.fonte,
        valor_estimado: novoArte.valor_estimado ? Number(novoArte.valor_estimado) : null,
        status: novoArte.status,
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

  if (lf || la) return <Loading />;

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <h1 className="text-2xl font-bold">Figurino &amp; Arte</h1>

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
                  <div>
                    <p className="font-medium">{f.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[f.tamanho, f.cor, f.fonte].filter(Boolean).join(" · ")}
                      {f.valor_estimado ? ` · ${formatBRL(f.valor_estimado)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{f.status}</Badge>
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
                  <div>
                    <p className="font-medium">{a.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[a.categoria, a.fonte].filter(Boolean).join(" · ")}
                      {a.valor_estimado ? ` · ${formatBRL(a.valor_estimado)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.status}</Badge>
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
                <Input id="fval" type="number" step="0.01" value={novoFig.valor_estimado ?? ""} onChange={(e) => setNovoFig({ ...novoFig, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFig(false)}>Cancelar</Button>
            <Button onClick={() => addFig.mutate()} disabled={addFig.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Input id="aval" type="number" step="0.01" value={novoArte.valor_estimado ?? ""} onChange={(e) => setNovoArte({ ...novoArte, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenArte(false)}>Cancelar</Button>
            <Button onClick={() => addArte.mutate()} disabled={addArte.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
