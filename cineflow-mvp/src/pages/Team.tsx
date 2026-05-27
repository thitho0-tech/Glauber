import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, ChevronLeft, Trash2, UserPlus, Mail, Copy } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";
import { InviteButton } from "@/components/InviteButton";

const DEPT_LABEL: Record<string, string> = {
  desenvolvimento: "Desenvolvimento",
  direcao: "Direção",
  producao: "Produção",
  fotografia: "Fotografia",
  arte: "Arte",
  som: "Som",
  elenco: "Elenco",
  logistica: "Logística",
  pos_producao: "Pós-produção",
  figurino: "Figurino",
  maquiagem: "Maquiagem",
  pos: "Pós-produção",
  outros: "Outros",
};

function FuncaoAvSelect({ funcoes }: { funcoes: any[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="funcao_av_id">Função (organograma)</Label>
      <Select name="funcao_av_id">
        <SelectTrigger id="funcao_av_id"><SelectValue placeholder="Opcional" /></SelectTrigger>
        <SelectContent>
          {funcoes.map((f: any) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome} ({DEPT_LABEL[f.departamento] ?? f.departamento})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Team() {
  const { id: projetoId } = useParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"catalogo" | "nova">("catalogo");
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["projeto-pessoas", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("*, pessoa:pessoas(id, nome, email, telefone, departamento, funcao), funcao_av:funcoes_av(id, nome, departamento, nivel)")
        .eq("projeto_id", projetoId!)
        .order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  const { data: catalogo } = useQuery({
    queryKey: ["pessoas-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pessoas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoesAv } = useQuery({
    queryKey: ["funcoes-av"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcoes_av").select("*").order("departamento").order("nivel");
      if (error) throw error;
      return data;
    },
  });

  const idsVinculados = new Set((vinculos ?? []).map((v: any) => v.pessoa_id));
  const disponiveis = (catalogo ?? []).filter((p: any) => !idsVinculados.has(p.id));

  const vincular = useMutation({
    mutationFn: async (form: FormData) => {
      if (!projetoId) throw new Error("Projeto nao encontrado");
      const pessoa_id = String(form.get("pessoa_id") ?? "");
      if (!pessoa_id) throw new Error("Selecione uma pessoa");
      const payload: any = {
        projeto_id: projetoId,
        pessoa_id,
        funcao_av_id: form.get("funcao_av_id") || null,
        papel_descricao: form.get("papel_descricao") || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
      };
      const { error } = await supabase.from("projeto_pessoas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa adicionada ao projeto");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const criarEVincular = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !projetoId) throw new Error("Contexto invalido");
      const pessoaPayload: any = {
        org_id: orgId,
        nome: form.get("nome"),
        funcao: form.get("funcao") || null,
        departamento: form.get("departamento") || null,
        telefone: form.get("telefone") || null,
        email: form.get("email") || null,
      };
      const { data: pessoa, error: e1 } = await supabase
        .from("pessoas").insert(pessoaPayload).select().single();
      if (e1) throw e1;
      const vinculoPayload: any = {
        projeto_id: projetoId,
        pessoa_id: pessoa.id,
        funcao_av_id: form.get("funcao_av_id") || null,
        papel_descricao: form.get("papel_descricao") || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
      };
      const { error: e2 } = await supabase.from("projeto_pessoas").insert(vinculoPayload);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Pessoa criada e vinculada");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      qc.invalidateQueries({ queryKey: ["pessoas-catalogo"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desvincular = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase.from("projeto_pessoas").delete().eq("id", vinculoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa removida do projeto");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Equipe e Elenco do projeto</h1>
          <p className="text-sm text-muted-foreground">
            Cada projeto tem sua propria equipe. O catalogo da produtora fica disponivel para reaproveitar pessoas entre projetos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Adicionar ao projeto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar pessoa ao projeto</DialogTitle></DialogHeader>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="catalogo">Do catalogo</TabsTrigger>
                <TabsTrigger value="nova">Nova pessoa</TabsTrigger>
              </TabsList>

              <TabsContent value="catalogo">
                <form
                  onSubmit={(e) => { e.preventDefault(); vincular.mutate(new FormData(e.currentTarget)); }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="pessoa_id">Pessoa do catalogo</Label>
                    <Select name="pessoa_id">
                      <SelectTrigger id="pessoa_id"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {disponiveis.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            Todas as pessoas do catalogo ja estao no projeto.
                          </div>
                        ) : (
                          disponiveis.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}{p.funcao ? " - " + p.funcao : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FuncaoAvSelect funcoes={funcoesAv ?? []} />
                    <div className="space-y-1.5">
                      <Label htmlFor="valor_contratacao_c">Valor de contratacao (R$)</Label>
                      <Input id="valor_contratacao_c" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="papel_descricao_c">Papel no projeto (livre)</Label>
                    <Input id="papel_descricao_c" name="papel_descricao" placeholder="Ex.: Diretor de Fotografia substituto" />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={vincular.isPending}>
                      {vincular.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="nova">
                <form
                  onSubmit={(e) => { e.preventDefault(); criarEVincular.mutate(new FormData(e.currentTarget)); }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" name="nome" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="funcao">Funcao (livre)</Label>
                      <Input id="funcao" name="funcao" placeholder="Ex.: Diretor de Fotografia" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="departamento">Departamento</Label>
                      <Select name="departamento">
                        <SelectTrigger id="departamento"><SelectValue placeholder="--" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                          <SelectItem value="direcao">Direcao</SelectItem>
                          <SelectItem value="producao">Producao</SelectItem>
                          <SelectItem value="fotografia">Fotografia</SelectItem>
                          <SelectItem value="arte">Arte</SelectItem>
                          <SelectItem value="som">Som</SelectItem>
                          <SelectItem value="figurino">Figurino</SelectItem>
                          <SelectItem value="maquiagem">Maquiagem</SelectItem>
                          <SelectItem value="elenco">Elenco</SelectItem>
                          <SelectItem value="logistica">Logistica</SelectItem>
                          <SelectItem value="pos">Pos-producao</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" name="telefone" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FuncaoAvSelect funcoes={funcoesAv ?? []} />
                    <div className="space-y-1.5">
                      <Label htmlFor="valor_contratacao_n">Valor de contratacao (R$)</Label>
                      <Input id="valor_contratacao_n" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={criarEVincular.isPending}>
                      {criarEVincular.isPending ? "Criando..." : "Criar e adicionar"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {!vinculos?.length ? (
        <Empty
          icon={<Users className="h-5 w-5" />}
          title="Sem pessoas neste projeto"
          description="Adicione pessoas do catalogo da produtora ou crie novas. Elas ficam disponiveis para escala em planejamentos."
          action={
            <Button onClick={() => setOpen(true)}>
              <UserPlus className="h-4 w-4" /> Adicionar ao projeto
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Funcao no projeto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Contratacao</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v: any) => {
                  const dept = v.funcao_av?.departamento ?? v.pessoa?.departamento;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.pessoa?.nome ?? "--"}</TableCell>
                      <TableCell>{v.funcao_av?.nome ?? v.papel_descricao ?? v.pessoa?.funcao ?? "--"}</TableCell>
                      <TableCell>
                        {dept ? <Badge variant="outline">{DEPT_LABEL[dept] ?? dept}</Badge> : "--"}
                      </TableCell>
                      <TableCell>{v.pessoa?.telefone ?? "--"}</TableCell>
                      <TableCell className="text-right">{formatBRL(v.valor_contratacao)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <InviteButton
                            projetoPessoaId={v.id}
                            pessoaEmail={v.pessoa?.email}
                            pessoaNome={v.pessoa?.nome}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => desvincular.mutate(v.id)}
                            title="Remover do projeto (mantem no catalogo)"
                          >
                                                 <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
