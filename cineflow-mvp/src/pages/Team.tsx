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
  outros: "Outros",
};

const REGIME_LABEL: Record<string, string> = {
  rpa: "RPA",
  clt: "CLT",
  mei: "MEI",
  pj: "PJ",
  diarista: "Diarista",
  voluntario: "Voluntário",
};

const REGIME_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rpa: "default",
  clt: "secondary",
  mei: "outline",
  pj: "outline",
  diarista: "secondary",
  voluntario: "outline",
};

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
  { value: "figurino",        label: "Figurino" },
  { value: "maquiagem",       label: "Maquiagem" },
  { value: "outros",          label: "Outros" },
];

function FuncoesProjetoSelect({
  funcoes,
  selected,
  principal,
  onToggle,
  onSetPrincipal,
}: {
  funcoes: any[];
  selected: string[];
  principal: string;
  onToggle: (id: string) => void;
  onSetPrincipal: (id: string) => void;
}) {
  if (funcoes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        Selecione um departamento para ver as funções disponíveis.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <Label>Funções no projeto</Label>
      <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
        {funcoes.map((f) => {
          const isSelected = selected.includes(f.id);
          const isPrincipal = principal === f.id;
          return (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                id={`fn-${f.id}`}
                checked={isSelected}
                onChange={() => onToggle(f.id)}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
              <label htmlFor={`fn-${f.id}`} className="text-sm flex-1 cursor-pointer">
                {f.nome}
              </label>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => onSetPrincipal(f.id)}
                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                    isPrincipal
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-border"
                  }`}
                  title={isPrincipal ? "Função principal (Command Center)" : "Marcar como principal"}
                >
                  {isPrincipal ? "★ principal" : "☆"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">Selecione ao menos uma função para o organograma.</p>
      )}
    </div>
  );
}

function getPrincipalFuncao(v: any): string | null {
  const lista: any[] = v.funcoes ?? [];
  const p = lista.find((f: any) => f.principal) ?? lista[0];
  return p?.funcao_av?.nome ?? v.pessoa?.funcao ?? null;
}

function getPrincipalDept(v: any): string | null {
  const lista: any[] = v.funcoes ?? [];
  const p = lista.find((f: any) => f.principal) ?? lista[0];
  return p?.funcao_av?.departamento ?? v.pessoa?.departamento ?? null;
}

export default function Team() {
  const { id: projetoId } = useParams();
  const { canEdit } = useProjectRole(projetoId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"catalogo" | "nova">("catalogo");
  const [openRegime, setOpenRegime] = useState<string | null>(null);

  // Catalog tab — multi-function state
  const [catDept, setCatDept] = useState("");
  const [catFuncoes, setCatFuncoes] = useState<string[]>([]);
  const [catPrincipal, setCatPrincipal] = useState("");

  // Nova pessoa tab — multi-function state
  const [deptNova, setDeptNova] = useState("");
  const [novaFuncoes, setNovaFuncoes] = useState<string[]>([]);
  const [novaPrincipal, setNovaPrincipal] = useState("");

  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  function toggleFuncao(
    id: string,
    selected: string[],
    setSelected: (v: string[]) => void,
    principal: string,
    setPrincipal: (v: string) => void,
  ) {
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      setSelected(next);
      if (principal === id) setPrincipal(next[0] ?? "");
    } else {
      const next = [...selected, id];
      setSelected(next);
      if (!principal) setPrincipal(id);
    }
  }

  function resetCatForm() {
    setCatDept(""); setCatFuncoes([]); setCatPrincipal("");
  }

  function resetNovaForm() {
    setDeptNova(""); setNovaFuncoes([]); setNovaPrincipal("");
  }

  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["projeto-pessoas", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select(`
          *,
          pessoa:pessoas(id, nome, email, telefone, departamento, funcao, user_id),
          funcoes:projeto_pessoa_funcoes(id, principal, funcao_av:funcoes_av(id, nome, departamento))
        `)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
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
      const { data, error } = await supabase
        .from("funcoes_av")
        .select("*")
        .order("departamento")
        .order("nivel");
      if (error) throw error;
      return data;
    },
  });

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
  const funcoesAvFiltCat = (funcoesAv ?? []).filter(
    (f: any) => !catDept || f.departamento === catDept
  );
  const funcoesAvFiltNova = (funcoesAv ?? []).filter(
    (f: any) => !deptNova || f.departamento === deptNova
  );

  async function insertFuncoes(ppId: string, funcoes: string[], principal: string) {
    if (funcoes.length === 0) return;
    const payload = funcoes.map((fid) => ({
      projeto_pessoa_id: ppId,
      funcao_av_id: fid,
      principal: fid === (principal || funcoes[0]),
    }));
    const { error } = await supabase.from("projeto_pessoa_funcoes").insert(payload);
    if (error) throw error;
  }

  const vincular = useMutation({
    mutationFn: async (form: FormData) => {
      if (!projetoId) throw new Error("Projeto não encontrado");
      const pessoa_id = String(form.get("pessoa_id") ?? "");
      if (!pessoa_id) throw new Error("Selecione uma pessoa");
      const payload: any = {
        projeto_id: projetoId,
        pessoa_id,
        funcao_av_id: catPrincipal || catFuncoes[0] || null,
        papel_descricao: form.get("papel_descricao") || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
      };
      const { data: pp, error } = await supabase
        .from("projeto_pessoas")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      await insertFuncoes(pp.id, catFuncoes, catPrincipal);
    },
    onSuccess: () => {
      toast.success("Pessoa adicionada ao projeto");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      setOpen(false);
      resetCatForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const criarEVincular = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !projetoId) throw new Error("Contexto inválido");
      const pessoaPayload: any = {
        org_id: orgId,
        nome: form.get("nome"),
        funcao: form.get("funcao") || null,
        departamento: deptNova || null,
        telefone: form.get("telefone") || null,
        email: form.get("email") || null,
      };
      const { data: pessoa, error: e1 } = await supabase
        .from("pessoas")
        .insert(pessoaPayload)
        .select()
        .single();
      if (e1) throw e1;
      const vinculoPayload: any = {
        projeto_id: projetoId,
        pessoa_id: pessoa.id,
        funcao_av_id: novaPrincipal || novaFuncoes[0] || null,
        papel_descricao: form.get("papel_descricao") || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
      };
      const { data: pp, error: e2 } = await supabase
        .from("projeto_pessoas")
        .insert(vinculoPayload)
        .select("id")
        .single();
      if (e2) throw e2;
      await insertFuncoes(pp.id, novaFuncoes, novaPrincipal);
    },
    onSuccess: () => {
      toast.success("Pessoa criada e vinculada ao projeto");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      qc.invalidateQueries({ queryKey: ["pessoas-catalogo"] });
      setOpen(false);
      resetNovaForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desvincular = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase.rpc("soft_delete_item", {
        p_tabela: "projeto_pessoas",
        p_id: vinculoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa movida para a lixeira. Acesse Configurações → Lixeira para restaurar.");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
    },
  });

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
          <Link
            to={`/projetos/${projetoId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Equipe e Elenco do projeto</h1>
          <p className="text-sm text-muted-foreground">
            Cada projeto tem sua própria equipe. O catálogo da produtora fica disponível para reaproveitar pessoas entre projetos.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (canEdit) { setOpen(v); if (!v) { resetCatForm(); resetNovaForm(); } }
          }}
        >
          <DialogTrigger asChild disabled={!canEdit}>
            <Button disabled={!canEdit}><Plus className="h-4 w-4" /> Adicionar ao projeto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar pessoa ao projeto</DialogTitle></DialogHeader>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="catalogo">Do catálogo</TabsTrigger>
                <TabsTrigger value="nova">Nova pessoa</TabsTrigger>
              </TabsList>

              {/* ── Catálogo ── */}
              <TabsContent value="catalogo">
                <form
                  onSubmit={(e) => { e.preventDefault(); vincular.mutate(new FormData(e.currentTarget)); }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="pessoa_id">Pessoa do catálogo</Label>
                    <Select name="pessoa_id">
                      <SelectTrigger id="pessoa_id"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {disponiveis.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            Todas as pessoas do catálogo já estão no projeto.
                          </div>
                        ) : (
                          disponiveis.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}{p.funcao ? " — " + p.funcao : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Select value={catDept} onValueChange={(v) => { setCatDept(v); setCatFuncoes([]); setCatPrincipal(""); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTAMENTOS_AV.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FuncoesProjetoSelect
                    funcoes={funcoesAvFiltCat}
                    selected={catFuncoes}
                    principal={catPrincipal}
                    onToggle={(id) => toggleFuncao(id, catFuncoes, setCatFuncoes, catPrincipal, setCatPrincipal)}
                    onSetPrincipal={setCatPrincipal}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="valor_contratacao_c">Valor de contratação (R$)</Label>
                      <Input id="valor_contratacao_c" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="papel_descricao_c">Papel livre (opcional)</Label>
                      <Input id="papel_descricao_c" name="papel_descricao" placeholder="Ex.: DF substituto" />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); resetCatForm(); }}>Cancelar</Button>
                    <Button type="submit" disabled={vincular.isPending}>
                      {vincular.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              {/* ── Nova pessoa ── */}
              <TabsContent value="nova">
                <form
                  onSubmit={(e) => { e.preventDefault(); criarEVincular.mutate(new FormData(e.currentTarget)); }}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input id="nome" name="nome" required />
                  </div>

                  {/* Departamento ANTES da Função — 3A.2 */}
                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Select value={deptNova} onValueChange={(v) => { setDeptNova(v); setNovaFuncoes([]); setNovaPrincipal(""); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTAMENTOS_AV.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="funcao">Função/título livre (opcional)</Label>
                    <Input id="funcao" name="funcao" placeholder="Ex.: Diretor de Fotografia" />
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

                  <FuncoesProjetoSelect
                    funcoes={funcoesAvFiltNova}
                    selected={novaFuncoes}
                    principal={novaPrincipal}
                    onToggle={(id) => toggleFuncao(id, novaFuncoes, setNovaFuncoes, novaPrincipal, setNovaPrincipal)}
                    onSetPrincipal={setNovaPrincipal}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="valor_contratacao_n">Valor de contratação (R$)</Label>
                      <Input id="valor_contratacao_n" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="papel_descricao_n">Papel livre (opcional)</Label>
                      <Input id="papel_descricao_n" name="papel_descricao" placeholder="Ex.: DF substituto" />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); resetNovaForm(); }}>Cancelar</Button>
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
          description="Adicione pessoas do catálogo da produtora ou crie novas."
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
            {/* Mobile: cards */}
            <div className="md:hidden divide-y">
              {vinculos.map((v: any) => {
                const dept = getPrincipalDept(v);
                const funcaoNome = getPrincipalFuncao(v);
                const todasFuncoes: any[] = v.funcoes ?? [];
                const regime = (regimes ?? []).find((r: any) => r.pessoa_id === v.pessoa?.id);
                return (
                  <div key={v.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{v.pessoa?.nome ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {funcaoNome ?? "—"}
                          {todasFuncoes.length > 1 && (
                            <span className="ml-1 text-muted-foreground/70">+{todasFuncoes.length - 1}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <InviteButton projetoPessoaId={v.id} pessoaEmail={v.pessoa?.email} pessoaNome={v.pessoa?.nome} />
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => desvincular.mutate(v.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {dept && <Badge variant="outline" className="text-xs">{DEPT_LABEL[dept] ?? dept}</Badge>}
                      {regime && <Badge variant={REGIME_VARIANT[regime.tipo] ?? "outline"} className="text-xs">{REGIME_LABEL[regime.tipo] ?? regime.tipo}</Badge>}
                      {v.pessoa?.user_id
                        ? <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Ativo</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">Sem acesso</Badge>}
                      <span className="text-xs text-muted-foreground">{formatBRL(v.valor_contratacao)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função no projeto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Contratação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v: any) => {
                  const dept = getPrincipalDept(v);
                  const funcaoNome = getPrincipalFuncao(v);
                  const todasFuncoes: any[] = v.funcoes ?? [];
                  const regime = (regimes ?? []).find((r: any) => r.pessoa_id === v.pessoa?.id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.pessoa?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>{funcaoNome ?? v.papel_descricao ?? "—"}</span>
                          {todasFuncoes.length > 1 && (
                            <Badge variant="outline" className="text-xs">+{todasFuncoes.length - 1}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {dept ? <Badge variant="outline">{DEPT_LABEL[dept] ?? dept}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {regime ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={REGIME_VARIANT[regime.tipo] ?? "outline"}>{REGIME_LABEL[regime.tipo] ?? regime.tipo}</Badge>
                            {regime.tipo === "rpa" && regime.valor_liquido > 0 && (
                              <span className="text-xs text-muted-foreground">{formatBRL(regime.valor_liquido)} liq.</span>
                            )}
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => setOpenRegime(v.pessoa?.id)}>+ Regime</Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.pessoa?.user_id
                          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Ativo</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Sem acesso</Badge>}
                      </TableCell>
                      <TableCell>{v.pessoa?.telefone ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatBRL(v.valor_contratacao)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {regime && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpenRegime(v.pessoa?.id)} title="Editar regime">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <InviteButton projetoPessoaId={v.id} pessoaEmail={v.pessoa?.email} pessoaNome={v.pessoa?.nome} />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => desvincular.mutate(v.id)}
                            disabled={!canEdit}
                            title={canEdit ? "Remover do projeto (mantém no catálogo)" : "Sem permissão"}
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

      {/* Dialog: Regime de contratação */}
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
                  <DialogTitle>Regime de contratação — {pessoa?.nome}</DialogTitle>
                </DialogHeader>
                <input type="hidden" name="_pessoa_id" value={openRegime} />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de contrato</Label>
                    <Select name="tipo" defaultValue={pessoaRegime?.tipo ?? "rpa"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rpa">RPA — Recibo de Pagamento Autônomo</SelectItem>
                        <SelectItem value="clt">CLT — Contrato com carteira</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="pj">PJ — Pessoa Jurídica</SelectItem>
                        <SelectItem value="diarista">Diarista</SelectItem>
                        <SelectItem value="voluntario">Voluntário</SelectItem>
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
                    <Label htmlFor="r_inss">INSS % (RPA, padrão 20)</Label>
                    <Input id="r_inss" name="inss_pct" type="number" step="0.1" min="0" max="100"
                      defaultValue={pessoaRegime?.dados_rpa?.inss_pct != null
                        ? Number(pessoaRegime.dados_rpa.inss_pct) * 100
                        : 20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_obs">Observação</Label>
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
