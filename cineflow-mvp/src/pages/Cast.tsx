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
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Drama, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Personagem = {
  id: string;
  nome: string;
  descricao: string | null;
  idade_aparente: string | null;
  caracteristicas: string | null;
};

type ProjetoPessoa = {
  id: string;
  personagem_id: string | null;
  pessoa: { nome: string };
};

export default function Cast() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState<Partial<Personagem>>({});
  const [editing, setEditing] = useState<Personagem | null>(null);

  const { data: personagens, isLoading } = useQuery({
    queryKey: ["personagens", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personagens")
        .select("id, nome, descricao, idade_aparente, caracteristicas")
        .eq("projeto_id", projetoId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Personagem[];
    },
  });

  const { data: elenco } = useQuery({
    queryKey: ["elenco-pp", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, personagem_id, pessoa:pessoas(nome)")
        .eq("projeto_id", projetoId!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        personagem_id: r.personagem_id,
        pessoa: { nome: r.pessoa?.nome ?? "—" },
      })) as ProjetoPessoa[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!novo.nome) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("personagens").insert({
        projeto_id: projetoId!,
        nome: novo.nome,
        descricao: novo.descricao || null,
        idade_aparente: novo.idade_aparente || null,
        caracteristicas: novo.caracteristicas || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personagem criado");
      setOpenNovo(false);
      setNovo({});
      qc.invalidateQueries({ queryKey: ["personagens", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("personagens").update({
        nome: editing.nome,
        descricao: editing.descricao,
        idade_aparente: editing.idade_aparente,
        caracteristicas: editing.caracteristicas,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personagem atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["personagens", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personagens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personagens", projetoId] }),
  });

  const escalarAtor = useMutation({
    mutationFn: async ({ personagemId, projetoPessoaId }: { personagemId: string; projetoPessoaId: string | null }) => {
      if (!projetoPessoaId) {
        // limpar atores deste personagem
        const { error } = await supabase
          .from("projeto_pessoas")
          .update({ personagem_id: null })
          .eq("personagem_id", personagemId);
        if (error) throw error;
      } else {
        // primeiro limpa qualquer ator que já estava nesse personagem
        await supabase.from("projeto_pessoas").update({ personagem_id: null }).eq("personagem_id", personagemId);
        const { error } = await supabase
          .from("projeto_pessoas")
          .update({ personagem_id: personagemId })
          .eq("id", projetoPessoaId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Escalação atualizada");
      qc.invalidateQueries({ queryKey: ["elenco-pp", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  const atoresDoProjeto = elenco ?? [];

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Drama className="h-6 w-6" /> Elenco
        </h1>
        <Button onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4" /> Novo personagem</Button>
      </div>

      {(!personagens || personagens.length === 0) ? (
        <Empty icon={<Drama className="h-5 w-5" />} title="Sem personagens"
               description="Cadastre os personagens do roteiro antes de escalar atores." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {personagens.map((p) => {
            const atorEscalado = atoresDoProjeto.find((a) => a.personagem_id === p.id);
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.nome}</CardTitle>
                    {p.idade_aparente && <p className="text-xs text-muted-foreground">Idade: {p.idade_aparente}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  {p.caracteristicas && <p className="text-xs italic text-muted-foreground">{p.caracteristicas}</p>}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Ator escalado</Label>
                    <select
                      value={atorEscalado?.id ?? ""}
                      onChange={(e) => escalarAtor.mutate({ personagemId: p.id, projetoPessoaId: e.target.value || null })}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">— sem ator —</option>
                      {atoresDoProjeto.map((a) => (
                        <option key={a.id} value={a.id} disabled={!!a.personagem_id && a.personagem_id !== p.id}>
                          {a.pessoa.nome}{a.personagem_id && a.personagem_id !== p.id ? " (escalado em outro)" : ""}
                        </option>
                      ))}
                    </select>
                    {atorEscalado && <Badge variant="outline">{atorEscalado.pessoa.nome}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo personagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Nome</Label>
              <Input id="pn" value={novo.nome ?? ""} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pi">Idade aparente</Label>
              <Input id="pi" value={novo.idade_aparente ?? ""} onChange={(e) => setNovo({ ...novo, idade_aparente: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd">Descrição</Label>
              <Textarea id="pd" value={novo.descricao ?? ""} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc">Características</Label>
              <Textarea id="pc" value={novo.caracteristicas ?? ""} onChange={(e) => setNovo({ ...novo, caracteristicas: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar personagem</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="en">Nome</Label>
                <Input id="en" value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ei">Idade aparente</Label>
                <Input id="ei" value={editing.idade_aparente ?? ""} onChange={(e) => setEditing({ ...editing, idade_aparente: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed">Descrição</Label>
                <Textarea id="ed" value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec">Características</Label>
                <Textarea id="ec" value={editing.caracteristicas ?? ""} onChange={(e) => setEditing({ ...editing, caracteristicas: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
