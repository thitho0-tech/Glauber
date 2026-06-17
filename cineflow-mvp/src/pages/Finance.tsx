import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, ChevronLeft, CheckCircle2, AlertCircle, XCircle, AlertTriangle, FileText, Search, X, Lock } from "lucide-react";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { useProjectRole } from "@/hooks/useProjectRole";
import { usePermissions } from "@/hooks/usePermissions";
import { FornecedorSelect } from "@/components/finance/FornecedorSelect";
import { UploadComprovante } from "@/components/finance/UploadComprovante";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  paga: "Paga",
};

const STATUS_CLASS: Record<string, string> = {
  pendente: "border text-muted-foreground",
  aprovada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0",
  rejeitada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0",
  paga: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
};

export default function Finance() {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useProjectRole(id);
  const { can, isLoading: permsLoading } = usePermissions(id);
  const canVer = can('financeiro', 'ver');
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();
  const [openLinha, setOpenLinha] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const [novaDespesaId, setNovaDespesaId] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string | undefined>();
  const [cnpjEmitente, setCnpjEmitente] = useState("");
  const [expandUpload, setExpandUpload] = useState<string | null>(null);

  // C2 — filtros locais
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroRubrica, setFiltroRubrica] = useState("todas");

  const { data: projeto } = useQuery({
    queryKey: ["projeto-fin", id],
    enabled: !!id && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*, edital:editais(nome, teto_global, teto_observacao, rubricas_edital(*))")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tetoCheck } = useQuery({
    queryKey: ["teto-check", id, projeto?.orcamento_total],
    enabled: !!id && canVer && !!projeto?.edital_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_orcamento_dentro_teto", { p_projeto_id: id! });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento", id],
    enabled: !!id && canVer,
    queryFn: async () => {
      let { data } = await supabase.from("orcamentos").select("*").eq("projeto_id", id!).maybeSingle();
      if (!data) {
        const { data: novo } = await supabase.from("orcamentos").insert({ projeto_id: id! }).select().single();
        data = novo;
      }
      return data;
    },
  });

  const { data: linhas } = useQuery({
    queryKey: ["linhas", orcamento?.id],
    enabled: !!orcamento?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("linhas_orcamento").select("*").eq("orcamento_id", orcamento!.id).order("rubrica_codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: despesas, isLoading: l3 } = useQuery({
    queryKey: ["despesas", id],
    enabled: !!id && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*, validacao:validacoes_edital(status, mensagem), linha:linhas_orcamento(rubrica_codigo, descricao), fornecedor:fornecedores(nome, cnpj, cpf)")
        .eq("projeto_id", id!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criarLinha = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orcamento?.id) throw new Error("Sem orcamento");
      const payload: any = {
        orcamento_id: orcamento.id,
        rubrica_codigo: form.get("rubrica_codigo"),
        descricao: form.get("descricao"),
        valor_previsto: Number(form.get("valor_previsto") ?? 0),
      };
      const { error } = await supabase.from("linhas_orcamento").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rubrica adicionada"); qc.invalidateQueries({ queryKey: ["linhas", orcamento?.id] }); setOpenLinha(false); },
    onError: (e: any) => toast.error(e.message),
  });

  // C1.1 — chamar validar_despesa() apos criar despesa
  const criarDespesa = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        projeto_id: id,
        linha_orcamento_id: form.get("linha_orcamento_id") || null,
        descricao: form.get("descricao"),
        valor: Number(form.get("valor")),
        data: form.get("data"),
        data_emissao_nf: form.get("data_emissao_nf") || null,
        forma_pagamento: form.get("forma_pagamento") || "transferencia",
        departamento: form.get("departamento") || null,
        cnpj_emitente: form.get("cnpj_emitente") || null,
        numero_nf: form.get("numero_nf") || null,
        fornecedor_id: fornecedorId || null,
      };
      const { data, error } = await supabase.from("despesas").insert(payload).select().single();
      if (error) throw error;
      // Validar imediatamente contra o edital
      await supabase.rpc("validar_despesa", { p_despesa_id: data.id });
      return data;
    },
    onSuccess: (nova) => {
      toast.success("Despesa registrada");
      qc.invalidateQueries({ queryKey: ["despesas", id] });
      setNovaDespesaId(nova.id);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ despesaId, status }: { despesaId: string; status: string }) => {
      const { error } = await supabase.from("despesas").update({ status }).eq("id", despesaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  function fecharDespesa() {
    setOpenDespesa(false);
    setNovaDespesaId(null);
    setFornecedorId(undefined);
    setCnpjEmitente("");
  }

  async function openSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 3600);
    if (error) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // C2 — filtros locais (memo para nao recalcular a cada render)
  const despesasFiltradas = useMemo(() => {
    if (!despesas) return [];
    return despesas.filter((d: any) => {
      const matchBusca = !busca || d.descricao?.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || d.status === filtroStatus;
      const matchRubrica = filtroRubrica === "todas" || d.linha?.rubrica_codigo === filtroRubrica;
      return matchBusca && matchStatus && matchRubrica;
    });
  }, [despesas, busca, filtroStatus, filtroRubrica]);

  const totalFiltrado = despesasFiltradas.reduce((s: number, d: any) => s + Number(d.valor), 0);

  const rubricasUnicas = useMemo(() => {
    const codigos = new Set((despesas ?? []).map((d: any) => d.linha?.rubrica_codigo).filter(Boolean));
    return Array.from(codigos) as string[];
  }, [despesas]);

  const temFiltro = busca || filtroStatus !== "todos" || filtroRubrica !== "todas";

  if (permsLoading) return <Loading />;
  if (!canVer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Lock className="h-10 w-10" />
      <p className="text-sm">Conteúdo restrito. Você não tem permissão para visualizar esta seção.</p>
    </div>
  );
  if (l3) return <Loading />;

  const totalRealizado = (despesas ?? []).reduce((s: number, d: any) => s + Number(d.valor), 0);
  const rubricasEdital = projeto?.edital?.rubricas_edital ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      {tetoCheck?.status === "warn" && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Orcamento ultrapassa o teto do edital</p>
              <p className="text-amber-800 dark:text-amber-300">
                Orcamento atual: <strong>{formatBRL(tetoCheck.atual)}</strong> · Teto do edital{projeto?.edital?.nome ? ` (${projeto.edital.nome})` : ""}: <strong>{formatBRL(tetoCheck.teto)}</strong>
              </p>
              {projeto?.edital?.teto_observacao && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{projeto.edital.teto_observacao}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Orcamento total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(projeto?.orcamento_total ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ja gasto</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(totalRealizado)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(Number(projeto?.orcamento_total ?? 0) - totalRealizado)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="orcamento">
        <TabsList>
          <TabsTrigger value="orcamento">Rubricas do orcamento</TabsTrigger>
          <TabsTrigger value="despesas">Lancamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamento">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rubricas</CardTitle>
              <Dialog open={openLinha} onOpenChange={setOpenLinha}>
                {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova rubrica</Button></DialogTrigger>}
                <DialogContent>
                  <form onSubmit={(e) => { e.preventDefault(); criarLinha.mutate(new FormData(e.currentTarget)); }} className="space-y-4" autoComplete="off">
                    <DialogHeader><DialogTitle>Nova rubrica do orcamento</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="rubrica_codigo">Codigo da rubrica</Label>
                        {rubricasEdital.length > 0 ? (
                          <Select name="rubrica_codigo">
                            <SelectTrigger><SelectValue placeholder="Selecione a rubrica do edital" /></SelectTrigger>
                            <SelectContent>
                              {rubricasEdital.map((r: any) => (
                                <SelectItem key={r.id} value={r.codigo}>{r.codigo} · {r.nome} (max {((r.perc_max ?? 0) * 100).toFixed(0)}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input name="rubrica_codigo" placeholder="Ex.: EQUIPE, ELENCO, EQUIP" />
                        )}
                      </div>
                      <div className="space-y-1.5"><Label htmlFor="descricao">Descricao</Label><Input id="descricao" name="descricao" required /></div>
                      <div className="space-y-1.5"><Label htmlFor="valor_previsto">Valor previsto (R$)</Label><Input id="valor_previsto" name="valor_previsto" type="number" step="0.01" required /></div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenLinha(false)}>Cancelar</Button>
                      <Button type="submit" disabled={criarLinha.isPending}>{criarLinha.isPending ? "Salvando..." : "Adicionar"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {!linhas?.length ? (
                <div className="p-6"><Empty icon={<Wallet className="h-5 w-5" />} title="Sem rubricas" description="Defina as rubricas do orcamento conforme o edital escolhido." /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Previsto</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l: any) => {
                      const realizado = (despesas ?? []).filter((d: any) => d.linha_orcamento_id === l.id).reduce((s: number, d: any) => s + Number(d.valor), 0);
                      return (
                        <TableRow key={l.id}>
                          <TableCell><Badge variant="outline">{l.rubrica_codigo}</Badge></TableCell>
                          <TableCell className="font-medium">{l.descricao}</TableCell>
                          <TableCell className="text-right">{formatBRL(l.valor_previsto)}</TableCell>
                          <TableCell className="text-right">{formatBRL(realizado)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Despesas lancadas</CardTitle>
              <Dialog open={openDespesa} onOpenChange={(v) => { if (!v) fecharDespesa(); else setOpenDespesa(true); }}>
                {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova despesa</Button></DialogTrigger>}
                <DialogContent className="max-w-lg">
                  {!novaDespesaId ? (
                    <form onSubmit={(e) => { e.preventDefault(); criarDespesa.mutate(new FormData(e.currentTarget)); }} className="space-y-4" autoComplete="off">
                      <DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1.5"><Label htmlFor="descricao">Descricao</Label><Input id="descricao" name="descricao" required /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label htmlFor="valor">Valor (R$)</Label><Input id="valor" name="valor" type="number" step="0.01" required /></div>
                          <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="linha_orcamento_id">Rubrica</Label>
                          <Select name="linha_orcamento_id">
                            <SelectTrigger><SelectValue placeholder="Sem rubrica" /></SelectTrigger>
                            <SelectContent>
                              {(linhas ?? []).map((l: any) => (
                                <SelectItem key={l.id} value={l.id}>{l.rubrica_codigo} · {l.descricao}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {orgId && (
                          <FornecedorSelect
                            orgId={orgId}
                            value={fornecedorId}
                            onChange={setFornecedorId}
                            onSelectFornecedor={(f) => setCnpjEmitente(f?.cnpj ?? f?.cpf ?? "")}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="cnpj_emitente">CNPJ / CPF emitente</Label>
                            <Input
                              id="cnpj_emitente"
                              name="cnpj_emitente"
                              placeholder="00.000.000/0000-00"
                              value={cnpjEmitente}
                              onChange={(e) => setCnpjEmitente(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5"><Label htmlFor="numero_nf">No da NF</Label><Input id="numero_nf" name="numero_nf" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="data_emissao_nf">Data de emissao da NF</Label>
                            <Input id="data_emissao_nf" name="data_emissao_nf" type="date" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
                            <Select name="forma_pagamento" defaultValue="transferencia">
                              <SelectTrigger id="forma_pagamento"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="transferencia">Transferencia</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="cartao_debito">Cartao de debito</SelectItem>
                                <SelectItem value="cartao_credito">Cartao de credito</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={fecharDespesa}>Cancelar</Button>
                        <Button type="submit" disabled={criarDespesa.isPending}>{criarDespesa.isPending ? "Lancando..." : "Lancar"}</Button>
                      </DialogFooter>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <DialogHeader>
                        <DialogTitle>Despesa registrada</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Deseja anexar o comprovante ou NF agora? (pode pular e fazer depois)
                      </p>
                      {orgId && (
                        <UploadComprovante
                          despesaId={novaDespesaId}
                          projectId={id!}
                          orgId={orgId}
                          onUploaded={() => qc.invalidateQueries({ queryKey: ["despesas", id] })}
                        />
                      )}
                      <DialogFooter>
                        <Button onClick={fecharDespesa}>Concluir</Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>

            {/* C2 — Barra de filtros */}
            {(despesas?.length ?? 0) > 0 && (
              <div className="border-b px-4 pb-3 pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar despesa..."
                      className="pl-8 h-8 text-sm"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="h-8 w-[130px] text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="rejeitada">Rejeitada</SelectItem>
                      <SelectItem value="paga">Paga</SelectItem>
                    </SelectContent>
                  </Select>
                  {rubricasUnicas.length > 0 && (
                    <Select value={filtroRubrica} onValueChange={setFiltroRubrica}>
                      <SelectTrigger className="h-8 w-[140px] text-sm">
                        <SelectValue placeholder="Rubrica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas rubricas</SelectItem>
                        {rubricasUnicas.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {temFiltro && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => { setBusca(""); setFiltroStatus("todos"); setFiltroRubrica("todas"); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {despesasFiltradas.length}/{despesas?.length ?? 0} · {formatBRL(totalFiltrado)}
                  </span>
                </div>
              </div>
            )}

            <CardContent className="p-0">
              {!despesas?.length ? (
                <div className="p-6"><Empty icon={<Wallet className="h-5 w-5" />} title="Sem despesas lancadas" /></div>
              ) : !despesasFiltradas.length ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma despesa corresponde aos filtros aplicados.</div>
              ) : (
                <>
                  {/* Mobile: cards */}
                  <div className="md:hidden divide-y">
                    {despesasFiltradas.map((d: any) => {
                      const val = d.validacao?.[0];
                      return (
                        <div key={d.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{d.descricao}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(d.data)} · {d.fornecedor?.nome ?? "—"}</p>
                            </div>
                            <p className="font-semibold text-sm shrink-0">{formatBRL(d.valor)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {d.linha?.rubrica_codigo && <Badge variant="outline" className="text-xs">{d.linha.rubrica_codigo}</Badge>}
                            {/* status editável / leitura */}
                            {canEdit ? (
                              <select
                                value={d.status ?? "pendente"}
                                onChange={(e) => atualizarStatus.mutate({ despesaId: d.id, status: e.target.value })}
                                className="text-xs rounded border bg-background px-1.5 py-0.5"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="aprovada">Aprovada</option>
                                <option value="rejeitada">Rejeitada</option>
                                <option value="paga">Paga</option>
                              </select>
                            ) : (
                              <Badge className={cn("text-xs", STATUS_CLASS[d.status ?? "pendente"])}>
                                {STATUS_LABEL[d.status ?? "pendente"]}
                              </Badge>
                            )}
                            {val?.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                            {val?.status === "fail" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                            {val?.status === "warn" && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                            {!d.comprovante_url && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs p-1 text-muted-foreground"
                                onClick={() => setExpandUpload(expandUpload === d.id ? null : d.id)}>+ Comprovante</Button>
                            )}
                          </div>
                          {expandUpload === d.id && orgId && (
                            <div className="pt-1">
                              <UploadComprovante despesaId={d.id} projectId={id!} orgId={orgId}
                                currentPath={d.comprovante_url}
                                onUploaded={() => { qc.invalidateQueries({ queryKey: ["despesas", id] }); setExpandUpload(null); }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop: tabela */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Rubrica</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Comprovante</TableHead>
                        <TableHead>Validação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesasFiltradas.map((d: any) => {
                        const val = d.validacao?.[0];
                        const icon = val?.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    : val?.status === "warn" ? <AlertCircle className="h-4 w-4 text-amber-500" />
                                    : val?.status === "fail" ? <XCircle className="h-4 w-4 text-destructive" />
                                    : null;
                        return (
                          <>
                            <TableRow key={d.id} className={expandUpload === d.id ? "border-b-0" : ""}>
                              <TableCell>{formatDate(d.data)}</TableCell>
                              <TableCell className="font-medium">{d.descricao}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{d.fornecedor?.nome ?? "—"}</TableCell>
                              <TableCell>{d.linha?.rubrica_codigo ? <Badge variant="outline">{d.linha.rubrica_codigo}</Badge> : "—"}</TableCell>
                              <TableCell className="text-right">{formatBRL(d.valor)}</TableCell>
                              {/* Status editável / leitura */}
                              <TableCell>
                                {canEdit ? (
                                  <select
                                    value={d.status ?? "pendente"}
                                    onChange={(e) => atualizarStatus.mutate({ despesaId: d.id, status: e.target.value })}
                                    className="text-xs rounded border bg-background px-2 py-1"
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="aprovada">Aprovada</option>
                                    <option value="rejeitada">Rejeitada</option>
                                    <option value="paga">Paga</option>
                                  </select>
                                ) : (
                                  <Badge className={cn("text-xs", STATUS_CLASS[d.status ?? "pendente"])}>
                                    {STATUS_LABEL[d.status ?? "pendente"]}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {d.comprovante_url ? (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSignedUrl(d.comprovante_url)} title="Ver comprovante">
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                                    onClick={() => setExpandUpload(expandUpload === d.id ? null : d.id)}>+ Anexar</Button>
                                )}
                              </TableCell>
                              <TableCell><div className="flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{val?.mensagem ?? "—"}</span></div></TableCell>
                            </TableRow>
                            {expandUpload === d.id && orgId && (
                              <TableRow key={d.id + "-upload"}>
                                <TableCell colSpan={8} className="pb-3 pt-0">
                                  <div className="pl-2 max-w-sm">
                                    <UploadComprovante despesaId={d.id} projectId={id!} orgId={orgId}
                                      currentPath={d.comprovante_url}
                                      onUploaded={() => { qc.invalidateQueries({ queryKey: ["despesas", id] }); setExpandUpload(null); }} />
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
