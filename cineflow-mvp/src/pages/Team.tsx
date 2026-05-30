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
import { Plus, Users, ChevronLeft, Trash2, UserPlus, Pencil } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { useProjectRole } from "@/hooks/useProjectRole";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";
import { InviteButton } from "@/components/InviteButton";

const DEPT_LABEL: Record<string, string> = {
  desenvolvimento: "Desenvolvimento",
  direcao: "Direcao",
  producao: "Producao",
  fotografia: "Fotografia",
  arte: "Arte",
  som: "Som",
  elenco: "Elenco",
  logistica: "Logistica",
  pos_producao: "Pos-producao",
  figurino: "Figurino",
  maquiagem: "Maquiagem",
  pos: "Pos-producao",
  outros: "Outros",
};

const REGIME_LABEL: Record<string, string> = {
  rpa: "RPA",
  clt: "CLT",
  mei: "MEI",
  pj: "PJ",
  diarista: "Diarista",
  voluntario: "Voluntario",
};

const REGIME_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rpa: "default",
  clt: "secondary",
  mei: "outline",
  pj: "outline",
  diarista: "secondary",
  voluntario: "outline",
};

function FuncaoAvSelect({ funcoes }: { funcoes: any[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="funcao_av_id">Funcao (organograma)</Label>
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

const DEPARTAMENTOS_AV = [
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "direcao",         label: "Direção" },
  { value: "producao",        label: "Produção" },
  { value: "fotografia",      label: "Fotografia" },
  { value: "arte",            label: "Arte" },
  { value: "som",             label: "Som" },
  { value: "elenco",          label: "Elenco" },
  { value: "logistica",       label: "Logística" },
  { value: "pos_producao",    label: "Pós-produção" },
];

export default function Team() {
  const { id: projetoId } = useParams();
  const { canEdit } = useProjectRole(projetoId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"catalogo" | "nova">("catalogo");
  const [openRegime, setOpenRegime] = useState<string | null>(null);
  // D5 — controle de função/depto no form "Nova pessoa"
  const [funcaoNova, setFuncaoNova] = useState("");
  const [deptNova, setDeptNova] = useState("");
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  // C5 — user_id incluido para badge de acesso
  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["projeto-pessoas", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("*, pessoa:pessoas(id, nome, email, telefone, departamento, funcao, user_id), funcao_av:funcoes_av(id, nome, departamento, nivel)")
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

  // Sprint 1B — regimes de contratacao
  const { data: regimes } = useQuery({
    queryKey: ["regimes-contratacao", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regimes_contratacao")
        .select("*")
        .eq("projeto_id", projetoId!);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
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
      const { error } = await supabase.rpc("soft_delete_item", { p_tabela: "projeto_pessoas", p_id: vinculoId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa movida para a lixeira. Acesse Configurações → Lixeira para restaurar.");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
    },
  });

  // C6 — calcula liquido RPA via RPC ao salvar regime
  const salvarRegime = useMutation({
    mutationFn: async (form: FormData) => {
      const pessoaId = String(form.get("_pessoa_id"));
      const bruto = Number(form.get("valor_bruto") ?? 0);
      const tipo = String(form.get("tipo"));
      const inss_pct = Number(form.get("inss_pct") ?? 20) / 100;

      let valorLiquido = bruto;
      if (tipo === "rpa") {
        const { data: liq } = await supabase.rpc("fn_calcular_liquido_rpa", {
          p_bruto: bruto,
          p_inss_pct: inss_pct,
        });
        if (liq !== null && liq !== undefined) valorLiquido = Number(liq);
      }

      const payload: any = {
        pessoa_id: pessoaId,
        projeto_id: projetoId,
        tipo,
        valor_bruto: bruto,
        valor_liquido: valorLiquido,
        dias_contrato: Number(form.get("dias_contrato") ?? 1),
        dados_rpa: tipo === "rpa" ? { inss_pct, observacao: form.get("observacao") ?? "" } : {},
      };
      const existente = (regimes ?? []).find((r: any) => r.pessoa_id === pessoaId);
      if (existente) {
        const { error } = await supabase.from("regimes_contratacao").update(payload).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("regimes_contratacao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Regime salvo");
      qc.invalidateQueries({ queryKey: ["regimes-contratacao", projetoId] });
      setOpenRegime(null);
    },
    onError: (e: any) => toast.error(e.message),
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
        <Dialog open={open} onOpenChange={canEdit ? setOpen : undefined}>
          <DialogTrigger asChild disabled={!canEdit}>
            <Button disabled={!canEdit}><Plus className="h-4 w-4" /> Adicionar ao projeto</Button>
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
                  onSubmit={(e) => {
                    e.preventDefault();
                    // D5 — departamento obrigatório se função informada
                    if (funcaoNova.trim() && !deptNova) {
                      toast.error("Departamento é obrigatório quando a função está preenchida.");
                      return;
                    }
                    criarEVincular.mutate(new FormData(e.currentTarget));
                  }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" name="nome" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="funcao">
                        Função (livre)
                        {funcaoNova.trim() && !deptNova && (
                          <span className="ml-1 text-destructive text-xs">→ informe o departamento</span>
                        )}
                      </Label>
                      <Input
                        id="funcao"
                        name="funcao"
                        placeholder="Ex.: Diretor de Fotografia"
                        value={funcaoNova}
                        onChange={(e) => setFuncaoNova(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="departamento">
                        Departamento
                        {funcaoNova.trim() && <span className="ml-1 text-destructive text-xs">*obrigatório</span>}
                      </Label>
                      <Select
                        name="departamento"
                        value={deptNova}
                        onValueChange={setDeptNova}
                        required={!!funcaoNova.trim()}
                      >
                        <SelectTrigger
                          id="departamento"
                          className={funcaoNova.trim() && !deptNova ? "border-destructive" : ""}
                        >
                          <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTAMENTOS_AV.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
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
                    <FuncaoAvSelect funcoes={(funcoesAv ?? []).filter((f: any) => !deptNova || f.departamento === deptNova)} />
                    <div className="space-y-1.5">
                      <Label htmlFor="valor_contratacao_n">Valor de contratacao (R$)</Label>
                      <Input id="valor_contratacao_n" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); setFuncaoNova(""); setDeptNova(""); }}>Cancelar</Button>
                    <Button type="submit" disabled={criarEVincular.isPending || (!!funcaoNova.trim() && !deptNova)}>
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
          description="Adicione pessoas do catalogo da produtora ou crie novas."
          action={
            canEdit ? (
              <Button onClick={() => setOpen(true)}>
                <UserPlus className="h-4 w-4" /> Adicionar ao projeto
              </Button>
            ) : undefined
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
                  <TableHead>Regime</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Contratacao</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v: any) => {
                  const dept = v.funcao_av?.departamento ?? v.pessoa?.departamento;
                  const regime = (regimes ?? []).find((r: any) => r.pessoa_id === v.pessoa?.id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.pessoa?.nome ?? "--"}</TableCell>
                      <TableCell>{v.funcao_av?.nome ?? v.papel_descricao ?? v.pessoa?.funcao ?? "--"}</TableCell>
                      <TableCell>
                        {dept ? <Badge variant="outline">{DEPT_LABEL[dept] ?? dept}</Badge> : "--"}
                      </TableCell>
                      <TableCell>
                        {regime ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={REGIME_VARIANT[regime.tipo] ?? "outline"}>
                              {REGIME_LABEL[regime.tipo] ?? regime.tipo}
                            </Badge>
                            {regime.tipo === "rpa" && regime.valor_liquido > 0 && (
                              <span className="text-xs text-muted-foreground">{formatBRL(regime.valor_liquido)} liq.</span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => setOpenRegime(v.pessoa?.id)}
                          >
                            + Regime
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.pessoa?.user_id
                          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Ativo</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Sem acesso</Badge>}
                      </TableCell>
                      <TableCell>{v.pessoa?.telefone ?? "--"}</TableCell>
                      <TableCell className="text-right">{formatBRL(v.valor_contratacao)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {regime && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setOpenRegime(v.pessoa?.id)}
                              title="Editar regime"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <InviteButton
                            projetoPessoaId={v.id}
                            pessoaEmail={v.pessoa?.email}
                            pessoaNome={v.pessoa?.nome}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => desvincular.mutate(v.id)}
                            disabled={!canEdit}
                            title={canEdit ? "Remover do projeto (mantem no catalogo)" : "Sem permissão"}
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

      {/* Dialog: Regime de contratacao */}
      <Dialog open={!!openRegime} onOpenChange={(v) => { if (!v) setOpenRegime(null); }}>
        <DialogContent>
          {openRegime && (() => {
            const pessoaRegime = (regimes ?? []).find((r: any) => r.pessoa_id === openRegime);
            const pessoa = vinculos?.find((v: any) => v.pessoa?.id === openRegime)?.pessoa;
            return (
              <form
                onSubmit={(e) => { e.preventDefault(); salvarRegime.mutate(new FormData(e.currentTarget)); }}
                className="space-y-4"
              >
                <DialogHeader>
                  <DialogTitle>Regime de contratacao — {pessoa?.nome}</DialogTitle>
                </DialogHeader>
                <input type="hidden" name="_pessoa_id" value={openRegime} />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de contrato</Label>
                    <Select name="tipo" defaultValue={pessoaRegime?.tipo ?? "rpa"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rpa">RPA — Recibo de Pagamento Autonomo</SelectItem>
                        <SelectItem value="clt">CLT — Contrato com carteira</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="pj">PJ — Pessoa Juridica</SelectItem>
                        <SelectItem value="diarista">Diarista</SelectItem>
                        <SelectItem value="voluntario">Voluntario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="r_bruto">Valor bruto (R$)</Label>
                      <Input id="r_bruto" name="valor_bruto" type="number" step="0.01" defaultValue={pessoaRegime?.valor_bruto ?? 0} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="r_dias">Dias de contrato</Label>
                      <Input id="r_dias" name="dias_contrato" type="number" min="1" defaultValue={pessoaRegime?.dias_contrato ?? 1} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_inss">INSS % (RPA, padrao 20)</Label>
                    <Input id="r_inss" name="inss_pct" type="number" step="0.1" min="0" max="100"
                      defaultValue={pessoaRegime?.dados_rpa?.inss_pct != null
                        ? Number(pessoaRegime.dados_rpa.inss_pct) * 100
                        : 20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_obs">Observacao</Label>
                    <Input id="r_obs" name="observacao" defaultValue={pessoaRegime?.dados_rpa?.observacao ?? ""} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenRegime(null)}>Cancelar</Button>
                  <Button type="submit" disabled={salvarRegime.isPending}>
                    {salvarRegime.isPending ? "Salvando..." : "Salvar regime"}
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
      